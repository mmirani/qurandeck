import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { Window } from "happy-dom";
import { wordTapShouldPlay } from "../src/lib/word-tap";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const search = readFileSync(new URL("../src/components/search/search-bar.tsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../src/components/modals/auth-modal.tsx", import.meta.url), "utf8");
const study = readFileSync(new URL("../src/components/sidebar/study-sidebar.tsx", import.meta.url), "utf8");
const note = readFileSync(new URL("../src/components/reader/verse-note-panel.tsx", import.meta.url), "utf8");
const player = readFileSync(new URL("../src/components/audio/audio-player.tsx", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../src/components/reader/mobile-reader-bar.tsx", import.meta.url), "utf8");
const themes = readFileSync(new URL("../src/components/modals/theme-picker.tsx", import.meta.url), "utf8");
const ayah = readFileSync(new URL("../src/components/reader/verse-card.tsx", import.meta.url), "utf8");

function mobileFieldRule() {
  const start = css.lastIndexOf("@media (max-width: 767px)");
  const end = css.indexOf("@media (prefers-reduced-motion", start);
  return css.slice(start, end);
}

function computedFieldPx(viewport: number) {
  const rule = mobileFieldRule();
  const window = new Window({ innerWidth: viewport, innerHeight: 800 });
  window.document.write(`<!doctype html><style>
    @layer utilities {
      .text-sm { font-size: 14px; }
      .text-xs { font-size: 12px; }
    }
    label.text-sm { font-size: 14px; }
    ${rule}
  </style>
  <input id="search" class="text-sm">
  <textarea id="note" class="text-sm"></textarea>
  <select id="auth" class="text-xs"></select>
  <label class="text-sm"><input id="inherit"></label>
  <div class="nur-ask"><input id="sana"></div>`);
  const px = (id: string) => parseFloat(window.getComputedStyle(window.document.getElementById(id)!).fontSize);
  const result = {
    search: px("search"),
    note: px("note"),
    auth: px("auth"),
    inherit: px("inherit"),
    sana: px("sana"),
  };
  window.close();
  return result;
}

describe("P3 mobile field size", () => {
  it("computes inputs, textareas, and selects to at least 16px at 390px", () => {
    const mobile = computedFieldPx(390);
    for (const [name, size] of Object.entries(mobile)) {
      assert.ok(size >= 16, `${name} computed to ${size}px`);
    }
    assert.equal(layout.includes("maximum-scale"), false);
    assert.equal(layout.includes("user-scalable"), false);
  });
});

describe("P3 search covers the whole Quran", () => {
  it("drops the filters button, modal, and curated theme list", () => {
    assert.equal(search.includes(">Filters<"), false);
    assert.equal(search.includes("filters"), false);
    assert.match(search, /Search words, surahs, 2:255/);
    assert.match(search, /h-12 w-full/);
    assert.equal(search.includes("Themes jump"), false);
    assert.equal(search.includes("blurSearchField()"), true);
  });
});

describe("P3 reader chrome", () => {
  it("names the sign-up passkey as one you already saved", () => {
    assert.match(auth, /Use a passkey you already saved/);
    assert.match(auth, /Sign in with a passkey/);
  });

  it("keeps one player and a 44px seek target", () => {
    assert.equal(study.includes("AudioPlayer"), false);
    assert.match(player, /className="qd-seek"/);
    assert.match(css, /\.qd-seek \{\s*display: block;\s*width: 100%;\s*height: 2\.75rem;/);
  });

  it("labels the note fields with the ayah", () => {
    assert.match(note, /htmlFor=\{fieldId\}[\s\S]*Note on \{verseKey/);
    assert.match(note, /id=\{fieldId\}/);
    assert.match(study, /fieldId="verse-note"/);
  });

  it("arms ayah-mode word taps and keeps the phone controls on one row", () => {
    assert.equal(wordTapShouldPlay("armed", false), false);
    assert.equal(wordTapShouldPlay("armed", true), true);
    assert.equal(wordTapShouldPlay("immediate", false), true);
    assert.match(ayah, /tapMode="armed"/);
    assert.equal(mobile.includes("Smaller text"), false);
    assert.match(mobile, /flex-nowrap/);
    assert.match(themes, /Smaller text/);
    assert.match(themes, /Larger text/);
  });
});
