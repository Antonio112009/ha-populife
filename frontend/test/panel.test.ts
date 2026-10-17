import { describe, expect, it } from "vitest";

import { createMockHass } from "../dev/mock-hass";
import type { PopulifeHoldButton } from "../src/hold-button";
import type { PopulifePasscodeDialog } from "../src/passcode-dialog";
import "../src/populife-panel";
import type { PopulifePanel } from "../src/populife-panel";
import type { PopulifeSafeView } from "../src/safe-view";

async function mount(options: Parameters<typeof createMockHass>[0] = {}) {
  const hass = createMockHass(options);
  const panel = document.createElement("populife-panel") as PopulifePanel;
  panel.hass = hass;
  document.body.replaceChildren(panel);
  // Wait for the safes, then the passcodes and history the safe view loads.
  await new Promise((resolve) => setTimeout(resolve, 600));
  const safe = panel.shadowRoot?.querySelector("populife-safe") as PopulifeSafeView;
  await safe.updateComplete;
  return { hass, panel, safe, root: safe.shadowRoot as ShadowRoot };
}

const text = (root: ParentNode, selector: string) =>
  [...root.querySelectorAll(selector)].map((el) => el.textContent.replace(/\s+/g, " ").trim());

describe("panel", () => {
  it("shows the safe, its passcodes by name and the activity", async () => {
    const { root } = await mount();
    expect(text(root, ".state")).toEqual(["Locked"]);
    expect(text(root, ".passcodes .name")).toEqual([
      "Mama",
      "Guest this weekend",
      "Plumber",
      "Unnamed",
    ]);
    // Codes are masked until revealed.
    expect(text(root, ".passcodes .code")[0]).toBe("••••16");
    expect(root.querySelectorAll(".activity li").length).toBe(7);
    expect(text(root, ".passcodes .chip")).toContain("Expired");
  });

  it("unlocks from the hold button, and shows who opened it last", async () => {
    const { hass, safe, root } = await mount();
    const hold = root.querySelector("populife-hold-button") as PopulifeHoldButton;
    expect(hold.hold).toBe(true);
    hold.dispatchEvent(new CustomEvent("activate"));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(hass.calls.at(-1)).toEqual({
      domain: "lock",
      service: "unlock",
      data: { entity_id: "lock.s8534_549605" },
    });
    await safe.updateComplete;
    // Unlocked now: a plain tap locks.
    expect(hold.hold).toBe(false);
    expect(text(root, ".stat")).toContain("Auto-lock 5 s");
  });

  it("names the Home Assistant user behind an app unlock", async () => {
    const { root } = await mount();
    const byAnton = [...root.querySelectorAll(".activity .op")].find(
      (op) => op.querySelector(".who span")?.textContent === "Anton",
    );
    expect(byAnton?.querySelector(".op-title")?.textContent).toBe("Opened");
    expect(text(byAnton as Element, ".small")[0]).toMatch(/^App · via Home Assistant · /);
    expect(text(root, ".passcodes .used")[0]).toMatch(/^used /);
  });

  it("reveals a code on request", async () => {
    const { safe, root } = await mount();
    (root.querySelector(".passcodes .row-actions button") as HTMLButtonElement).click();
    await safe.updateComplete;
    expect(text(root, ".passcodes .code")[0]).toBe("482916");
  });

  it("copies a code when it is tapped", async () => {
    // happy-dom isn't a secure context; Home Assistant over https is.
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    const { safe, root } = await mount();
    (root.querySelector(".passcodes button.code") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await safe.updateComplete;
    expect(await navigator.clipboard.readText()).toBe("482916");
    expect(root.querySelector(".passcodes button.code")?.classList.contains("copied")).toBe(true);
  });

  it("filters the activity", async () => {
    const { safe, root } = await mount();
    const failed = root.querySelector<HTMLButtonElement>(".filter.failed");
    expect(text(root, ".filter.failed")).toEqual(["1 Failed"]);
    failed?.click();
    await safe.updateComplete;
    expect(root.querySelectorAll(".activity li").length).toBe(1);
  });

  it("shows only an explanation to people who may not operate the safe", async () => {
    const { root } = await mount({ canOperate: false });
    expect(root.querySelector("populife-hold-button")).toBeNull();
    expect(root.querySelector(".passcodes")).toBeNull();
    expect(text(root, ".card.wide.empty")[0]).toMatch(/may not operate/);
  });

  it("groups the activity by day and shows the safe's vitals", async () => {
    const { root } = await mount();
    expect(text(root, ".day-label")[0]).toBe("Today");
    expect(text(root, ".stat .stat-label")).toEqual(["Battery", "Signal", "Clock", "Auto-lock"]);
    expect(root.querySelectorAll(".passcodes .avatar:not(.unnamed)").length).toBe(3);
  });

  it("speaks Russian to Russian users", async () => {
    const { root } = await mount({ language: "ru" });
    expect(text(root, ".state")).toEqual(["Заперт"]);
  });

  it("adds a passcode with a generated code and offers to share it", async () => {
    const { hass, safe, root } = await mount();
    const dialog = root.querySelector("populife-passcode-dialog") as PopulifePasscodeDialog;
    dialog.open();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const dlg = dialog.shadowRoot as ShadowRoot;
    const code = (dlg.querySelector(".code") as HTMLInputElement).value;
    expect(code).toMatch(/^\d{6}$/);
    const name = dlg.querySelector("#name") as HTMLInputElement;
    name.value = "Guest";
    name.dispatchEvent(new Event("input"));
    await dialog.updateComplete;
    expect(text(dlg, ".summary")[0]).toBe(`Guest can open the safe with ${code} at any time.`);

    (dlg.querySelector("button[type=submit]") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await dialog.updateComplete;
    expect(hass.calls.at(-1)).toEqual({
      domain: "populife",
      service: "add_passcode",
      data: { entity_id: "lock.s8534_549605", code, name: "Guest" },
    });
    expect(text(dlg, ".big-code")).toEqual([code]);
    await safe.updateComplete;
    expect(text(root, ".passcodes .name")).toContain("Guest");
  });

  it("offers presets for a temporary code", async () => {
    const { root } = await mount();
    const dialog = root.querySelector("populife-passcode-dialog") as PopulifePasscodeDialog;
    dialog.open();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const dlg = dialog.shadowRoot as ShadowRoot;
    dlg.querySelectorAll<HTMLButtonElement>(".segmented button")[1].click();
    await dialog.updateComplete;
    expect(text(dlg, ".presets button")).toEqual([
      "24 hours",
      "Today",
      "This weekend",
      "A week",
      "Custom",
    ]);
    expect(dlg.querySelector("input[type=datetime-local]")).toBeNull();
    expect(text(dlg, ".duration")).toEqual(["Works for 1 day"]);
    [...dlg.querySelectorAll<HTMLButtonElement>(".presets button")].at(-1)?.click();
    await dialog.updateComplete;
    // Custom: starts right away, so only the end is asked for, as a date and a time.
    expect(text(dlg, ".mini-segmented button.selected")).toEqual(["Right away"]);
    expect(dlg.querySelector("#start-date")).toBeNull();
    expect(dlg.querySelector("#end-date")).not.toBeNull();
    expect(dlg.querySelector("#end-time")).not.toBeNull();
    dlg.querySelectorAll<HTMLButtonElement>(".mini-segmented button")[1].click();
    await dialog.updateComplete;
    expect(dlg.querySelector("#start-date")).not.toBeNull();
  });
});
