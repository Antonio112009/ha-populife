import { describe, expect, it } from "vitest";

import { createMockHass } from "../dev/mock-hass";
import type { PopulifeConfirm } from "../src/confirm-dialog";
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

  it("asks before unlocking, then unlocks", async () => {
    const { hass, safe, root } = await mount();
    (root.querySelector(".status-actions button") as HTMLButtonElement).click();
    await safe.updateComplete;
    const confirm = root.querySelector("populife-confirm") as PopulifeConfirm;
    await confirm.updateComplete;
    expect(confirm.shadowRoot?.querySelector("h2")?.textContent).toBe("Unlock S8534_549605?");
    (confirm.shadowRoot?.querySelector(".actions .primary") as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(hass.calls.at(-1)).toEqual({
      domain: "lock",
      service: "unlock",
      data: { entity_id: "lock.s8534_549605" },
    });
  });

  it("reveals a code on request", async () => {
    const { safe, root } = await mount();
    (root.querySelector(".passcodes .row-actions button") as HTMLButtonElement).click();
    await safe.updateComplete;
    expect(text(root, ".passcodes .code")[0]).toBe("482916");
  });

  it("filters the activity", async () => {
    const { safe, root } = await mount();
    const failed = [...root.querySelectorAll<HTMLButtonElement>(".filters button")].find(
      (button) => button.textContent.trim() === "Failed",
    );
    failed?.click();
    await safe.updateComplete;
    expect(root.querySelectorAll(".activity li").length).toBe(1);
  });

  it("shows only an explanation to people who may not operate the safe", async () => {
    const { root } = await mount({ canOperate: false });
    expect(root.querySelector(".status-actions button")).toBeNull();
    expect(root.querySelector(".passcodes")).toBeNull();
    expect(text(root, ".card.wide.muted")[0]).toMatch(/may not operate/);
  });

  it("speaks Russian to Russian users", async () => {
    const { root } = await mount({ language: "ru" });
    expect(text(root, ".state")).toEqual(["Заперт"]);
  });
});
