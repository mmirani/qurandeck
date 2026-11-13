import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { formatIntroductionSource, introductionCredit } from "../src/lib/quran/chapter-info";
import {
  SEARCH_DEBOUNCE_MS,
  searchGenerationWins,
  shouldCountSearch,
  shouldLiveSearch,
} from "../src/lib/search-status";
import { rowFits } from "../src/lib/toolbar-fit";

const pane = readFileSync(new URL("../src/components/reader/reader-pane.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../src/components/sidebar/surah-sidebar.tsx", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../src/components/reader/mobile-reader-bar.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("../src/components/reader/reader-toolbar.tsx", import.meta.url), "utf8");
const perform = readFileSync(new URL("../src/lib/guide/perform.ts", import.meta.url), "utf8");
const voice = readFileSync(new URL("../src/lib/guide/voice.ts", import.meta.url), "utf8");
const sana = readFileSync(new URL("../src/components/guide/sana-guide-panel.tsx", import.meta.url), "utf8");
const provider = readFileSync(new URL("../src/components/providers/mushaf-provider.tsx", import.meta.url), "utf8");

describe("search as you type", () => {
  it("starts at 2 latin characters, or 1 for Arabic and a verse key", () => {
    assert.equal(SEARCH_DEBOUNCE_MS, 300);
    assert.equal(shouldLiveSearch("d"), false);
    assert.equal(shouldLiveSearch("do"), true);
    assert.equal(shouldLiveSearch("dog"), true);
    assert.equal(shouldLiveSearch("ا"), true);
    assert.equal(shouldLiveSearch("2"), false);
    assert.equal(shouldLiveSearch("2:255"), true);
  });

  it("ignores a stale in-flight response", () => {
    assert.equal(searchGenerationWins(1, 2), false);
    assert.equal(searchGenerationWins(2, 2), true);
  });

  it("counts one search event for a settled query, not each keystroke", () => {
    const typed = ["d", "do", "dog"];
    const settled = typed.filter(shouldLiveSearch).at(-1) ?? "";
    let last: string | null = null;
    let events = 0;
    for (const query of [settled, settled]) {
      if (shouldCountSearch(last, query)) {
        events += 1;
        last = query;
      }
    }
    assert.equal(events, 1);
    assert.equal(shouldCountSearch("dog", "dogs"), true);
    const run = provider.slice(provider.indexOf("const runSearch"));
    assert.match(run, /feature: "search_performed"/);
    assert.equal(/trackUsage\(\{[^}]*query/.test(run), false);
  });
});

describe("reader chrome fit", () => {
  it("keeps phone toolbars inside 320 to 430px", () => {
    const padding = 32;
    const gap = 8;
    const reading = [64, 56, 60, 44];
    const focusExit = [148];
    for (const viewport of [320, 360, 390, 430]) {
      assert.equal(rowFits(viewport, reading, gap, padding), true, `reading ${viewport}`);
      assert.equal(rowFits(viewport, focusExit, gap, padding), true, `focus ${viewport}`);
    }
    assert.match(toolbar, /data-focus-bar/);
    assert.match(toolbar, /overflow-x-hidden/);
    assert.match(toolbar, /min-w-0 flex-1/);
    assert.equal(mobile.includes(">Saved<"), false);
  });

  it("puts Saved in the menu and points Sana there", () => {
    assert.match(sidebar, /openModal\("saved"\)/);
    assert.match(sidebar, /Bookmarks, notes, and highlights/);
    assert.match(perform, /Saved is in the menu/);
    assert.match(perform, /openModal\("saved"\)/);
  });
});

describe("Sana text only", () => {
  it("hides the mic and does not construct speech recognition while voice is off", () => {
    assert.match(voice, /export const SANA_VOICE_ENABLED = false/);
    assert.match(sana, /SANA_VOICE_ENABLED && speech/);
    assert.match(sana, /if \(!SANA_VOICE_ENABLED\) return/);
    assert.match(sana, /SANA_VOICE_ENABLED \? speechCtor\(\)/);
    assert.match(sana, /Send to \$\{COMPANION_NAME\}/);
    assert.equal(sana.includes("coming soon"), false);
    assert.equal(sana.includes("tap the mic"), false);
  });
});

describe("introduction source", () => {
  it("hides the credit until the intro is open and tidies the API source", () => {
    const api = "Sayyid Abul Ala Maududi - Tafhim al-Qur'an - The Meaning of the Quran";
    assert.equal(formatIntroductionSource(api), "Sayyid Abul Ala Maududi, Tafhim al-Qur'an");
    assert.equal(introductionCredit(api), "Source: Sayyid Abul Ala Maududi, Tafhim al-Qur'an");
    assert.equal(formatIntroductionSource("A scholar - A commentary - A note"), "A scholar, A commentary, A note");
    assert.equal(introductionCredit(""), null);
    const openBlock = pane.slice(pane.indexOf("{open ? ("));
    assert.match(openBlock, /\{credit/);
    assert.equal(pane.includes("{credit ?"), true);
  });
});
