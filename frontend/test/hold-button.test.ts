import { describe, expect, it } from "vitest";

import "../src/hold-button";
import type { PopulifeHoldButton } from "../src/hold-button";

async function button(hold: boolean) {
  const element = document.createElement("populife-hold-button") as PopulifeHoldButton;
  element.hold = hold;
  element.duration = 60;
  element.label = "Unlock";
  document.body.replaceChildren(element);
  await element.updateComplete;
  let fired = 0;
  element.addEventListener("activate", () => (fired += 1));
  const inner = element.shadowRoot?.querySelector("button") as HTMLButtonElement;
  return { element, inner, fired: () => fired };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("hold button", () => {
  it("fires only after being held for the whole duration", async () => {
    const { inner, fired } = await button(true);
    inner.dispatchEvent(new PointerEvent("pointerdown"));
    await wait(20);
    inner.dispatchEvent(new PointerEvent("pointerup"));
    await wait(100);
    expect(fired()).toBe(0);

    inner.dispatchEvent(new PointerEvent("pointerdown"));
    await wait(200);
    expect(fired()).toBe(1);
  });

  it("fires at once without hold, and never when disabled", async () => {
    const { element, inner, fired } = await button(false);
    inner.dispatchEvent(new PointerEvent("pointerdown"));
    expect(fired()).toBe(1);
    element.disabled = true;
    await element.updateComplete;
    inner.dispatchEvent(new PointerEvent("pointerdown"));
    expect(fired()).toBe(1);
  });

  it("can be held with the keyboard", async () => {
    const { inner, fired } = await button(true);
    inner.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    await wait(200);
    inner.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    expect(fired()).toBe(1);
  });
});
