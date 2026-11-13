import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const companion = readFileSync(new URL("../src/components/companion/sana-companion.tsx", import.meta.url), "utf8");
const voice = readFileSync(new URL("../src/lib/guide/voice.ts", import.meta.url), "utf8");

const HOVER_S = 4.6;
const SINE = "cubic-bezier(0.37, 0, 0.63, 1)";

describe("Sana float", () => {
  it("hovers the desktop orb and the phone dock once, then rests", () => {
    assert.match(
      css,
      new RegExp(`\\.nur-orb\\.is-alive \\{\\s*animation: nur-hover ${HOVER_S}s ${SINE.replace(/[().]/g, "\\$&")} 0\\.5s both;`),
    );
    assert.match(css, /\.sana-dock \{[\s\S]*animation: sana-dock-bob 4\.6s cubic-bezier\(0\.37, 0, 0\.63, 1\) 0\.5s both;/);
    assert.match(css, /\.nur-orb\.is-alive \{[^}]*will-change: transform;/);
    assert.match(css, /\.sana-dock \{[\s\S]*will-change: transform;/);
    assert.match(css, /@keyframes nur-hover \{[\s\S]*translate3d\(0, -6px, 0\)/);
    assert.match(css, /@keyframes sana-dock-bob \{[\s\S]*translate3d\(0, -4px, 0\)/);
    assert.match(css, /@keyframes nur-hover \{[\s\S]*25%[\s\S]*50%[\s\S]*75%[\s\S]*100%/);
    assert.match(css, /@keyframes nur-hover \{[\s\S]*translate3d\(0, 0, 0\)/);
    assert.match(css, /@keyframes sana-dock-bob \{[\s\S]*translate3d\(0, 0, 0\)/);
    const hover = css.slice(css.indexOf("@keyframes nur-hover"), css.indexOf("@keyframes sana-dock-bob"));
    const dock = css.slice(css.indexOf("@keyframes sana-dock-bob"), css.indexOf("@keyframes nur-floor-float"));
    assert.equal(hover.split(SINE).length - 1, 4);
    assert.equal(dock.split(SINE).length - 1, 4);
    assert.ok(HOVER_S < 5);
    assert.equal(/\.nur-orb\.is-alive \{[^}]*infinite/.test(css), false);
    assert.equal(/sana-dock-bob[^;]*infinite/.test(css), false);
    assert.match(companion, /className="nur-orb is-alive"/);
    assert.match(css, /\.nur\.is-dragging \.nur-orb,\s*\.nur\.is-open \.nur-orb \{\s*animation-play-state: paused;/);
    assert.match(css, /\.nur\.is-dragging \.nur-floor,\s*\.nur\.is-open \.nur-floor \{\s*animation-play-state: paused;/);
    assert.match(css, /\.nur \.nur-floor \{\s*animation: nur-floor-float 4\.6s cubic-bezier\(0\.37, 0, 0\.63, 1\) 0\.5s both;/);
    assert.match(css, /\.sana-dock\.is-focus-dock \{/);
    assert.match(css, /\.sana-dock\.is-audio \{/);
    assert.match(css, /\.sana-dock\.is-ayah \{/);
    assert.match(css, /\.nur-stage\.is-demo-interactive \.nur-orb\.is-demo-idle \{\s*animation: nur-bob 8s ease-in-out infinite;/);
  });

  it("turns the float off when motion is reduced", () => {
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    assert.match(reduced, /\.nur-orb\.is-alive,\s*\.sana-dock,\s*\.nur \.nur-floor \{\s*animation: none;/);
    assert.match(reduced, /animation-iteration-count: 1 !important/);
  });

  it("leaves Sana voice off", () => {
    assert.match(voice, /export const SANA_VOICE_ENABLED = false/);
  });
});
