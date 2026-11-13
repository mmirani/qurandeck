import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const companion = readFileSync(new URL("../src/components/companion/sana-companion.tsx", import.meta.url), "utf8");
const voice = readFileSync(new URL("../src/lib/guide/voice.ts", import.meta.url), "utf8");

const CYCLE_S = 2.4;
const CYCLES = 2;

describe("Sana float", () => {
  it("bobs the desktop orb and the phone dock once, then rests", () => {
    assert.match(css, /\.nur-orb\.is-alive \{\s*animation: nur-bob 2\.4s ease-in-out 2;/);
    assert.match(css, /\.sana-dock \{[\s\S]*animation: sana-dock-bob 2\.4s ease-in-out 2;/);
    assert.match(css, /@keyframes nur-bob \{[\s\S]*translateY\(-7px\)/);
    assert.match(css, /@keyframes sana-dock-bob \{[\s\S]*translateY\(-4px\)/);
    assert.match(css, /@keyframes nur-bob \{[\s\S]*translateY\(0\)/);
    assert.match(css, /@keyframes sana-dock-bob \{[\s\S]*translateY\(0\)/);
    assert.ok(CYCLE_S * CYCLES < 5);
    assert.equal(css.includes("nur-bob 3.8s"), false);
    assert.equal(/\.nur-orb\.is-alive \{[^}]*infinite/.test(css), false);
    assert.equal(/sana-dock-bob[^;]*infinite/.test(css), false);
    assert.match(companion, /className="nur-orb is-alive"/);
    assert.match(css, /\.nur\.is-dragging \.nur-orb,\s*\.nur\.is-open \.nur-orb \{\s*animation-play-state: paused;/);
    assert.match(css, /\.sana-dock\.is-focus-dock \{/);
    assert.match(css, /\.sana-dock\.is-audio \{/);
    assert.match(css, /\.sana-dock\.is-ayah \{/);
  });

  it("turns the float off when motion is reduced", () => {
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    assert.match(reduced, /\.nur-orb\.is-alive,\s*\.sana-dock \{\s*animation: none;/);
    assert.match(reduced, /animation-iteration-count: 1 !important/);
  });

  it("leaves Sana voice off", () => {
    assert.match(voice, /export const SANA_VOICE_ENABLED = false/);
  });
});
