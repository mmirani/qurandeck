import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { bootBodyScript, bootHeadScript, companionFilterForTheme, focusOnForViewport } from "../src/lib/boot-appearance";
import { HOME_THEME, LUMEN_CANVAS, LUMEN_GOLD } from "../src/lib/appearance";
import { companionFilterFromGold } from "../src/lib/companion";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const provider = readFileSync(new URL("../src/components/providers/mushaf-provider.tsx", import.meta.url), "utf8");

function paint(theme: string) {
  const block = css.slice(css.indexOf(`[data-theme="${theme}"] {`));
  const canvas = /--canvas:\s*(#[0-9a-fA-F]+)/.exec(block)?.[1];
  const gold = /--gold:\s*(#[0-9a-fA-F]+)/.exec(block)?.[1];
  return { canvas, gold };
}

describe("boot appearance", () => {
  it("keeps Aurora's companion tint in step with the stylesheet", () => {
    const aurora = paint("aurora");
    assert.equal(aurora.gold, "#e879f9");
    assert.equal(aurora.canvas, "#07060c");
    assert.equal(companionFilterForTheme("aurora"), companionFilterFromGold(aurora.gold!, aurora.canvas!));
    assert.equal(companionFilterForTheme(HOME_THEME), companionFilterFromGold(LUMEN_GOLD, LUMEN_CANVAS));
    assert.notEqual(companionFilterForTheme("aurora"), companionFilterForTheme("iris"));
  });

  it("turns Focus off below md and leaves it on for a tablet", () => {
    assert.equal(focusOnForViewport(true, true), false);
    assert.equal(focusOnForViewport(true, false), true);
    assert.equal(focusOnForViewport(false, false), false);
    const head = bootHeadScript();
    assert.match(head, /max-width: 767px/);
    assert.match(head, /--companion-filter/);
    assert.match(head, /dataset\.focus/);
    assert.match(head, /aurora/);
    assert.match(bootBodyScript(), /\[data-focus\]/);
    assert.match(layout, /bootHeadScript\(\)/);
    assert.match(layout, /bootBodyScript\(\)/);
    assert.match(layout, /suppressHydrationWarning/);
    assert.match(provider, /useLayoutEffect/);
    assert.match(provider, /if \(!booted\) return/);
    assert.equal(provider.includes("setPreferences(loadPreferences())"), false);
  });

  it("styles Sana from the boot variable instead of an empty inline filter", () => {
    assert.match(css, /filter: var\(--companion-filter, none\)/);
    assert.match(css, /html\[data-focus="on"\] \[data-chrome="focus"\]/);
    assert.match(css, /html\[data-focus="on"\] \[data-chrome="reading"\]/);
    assert.match(css, /html\[data-theme="aurora"\] \[data-theme-name\]::before \{ content: "Aurora"; \}/);
  });
});
