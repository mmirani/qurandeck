import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { appliedTheme, themeColorScheme } from "../src/lib/appearance";
import { performHelper, type HelperHost } from "../src/lib/guide/perform";
import { matchHelper } from "../src/lib/guide/commands";
import { introductionCredit, readChapterInfo } from "../src/lib/quran/chapter-info";
import { moveSearchIndex } from "../src/lib/search-status";

const pane = readFileSync(new URL("../src/components/reader/reader-pane.tsx", import.meta.url), "utf8");
const mobileBar = readFileSync(new URL("../src/components/reader/mobile-reader-bar.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("../src/components/reader/reader-toolbar.tsx", import.meta.url), "utf8");
const search = readFileSync(new URL("../src/components/search/search-bar.tsx", import.meta.url), "utf8");
const themes = readFileSync(new URL("../src/components/modals/theme-picker.tsx", import.meta.url), "utf8");
const verse = readFileSync(new URL("../src/components/reader/verse-card.tsx", import.meta.url), "utf8");
const account = readFileSync(new URL("../src/components/account/account-dashboard.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/app/api/quran/surah/[id]/route.ts", import.meta.url), "utf8");

describe("P2 introduction source", () => {
  it("keeps the API source and hides an empty one", () => {
    const info = readChapterInfo(
      {
        chapter_info: {
          short_text: "A preface.",
          source: "Sayyid Abul Ala Maududi - Tafhim al-Qur'an - The Meaning of the Quran",
        },
      },
      (value) => value,
    );
    assert.equal(info.text, "A preface.");
    assert.equal(
      introductionCredit(info.source),
      "Source: Sayyid Abul Ala Maududi, Tafhim al-Qur'an",
    );
    assert.equal(introductionCredit("  "), null);
    assert.match(pane, /introductionCredit\(source\)/);
    assert.match(route, /introductionSource: info\.source/);
  });
});

describe("P2 home theme", () => {
  it("uses the saved theme on the home page and keeps Noor before a choice", () => {
    assert.equal(appliedTheme("/", "obsidian"), "obsidian");
    assert.equal(appliedTheme("/", "iris"), "iris");
    assert.equal(appliedTheme("/read", "emerald"), "emerald");
    assert.equal(appliedTheme("/", "not-a-theme" as "iris"), "iris");
    assert.equal(themeColorScheme("obsidian"), "dark");
    assert.equal(themeColorScheme("iris"), "light");
    assert.equal(layout.includes("var home=location.pathname==='/'"), false);
  });
});

describe("P2 search keys", () => {
  it("moves a selected hit and wraps", () => {
    assert.equal(moveSearchIndex(-1, 3, "next"), 0);
    assert.equal(moveSearchIndex(0, 3, "prev"), 2);
    assert.equal(moveSearchIndex(2, 3, "next"), 0);
    assert.equal(moveSearchIndex(-1, 0, "next"), -1);
    assert.match(search, /ArrowDown/);
    assert.match(search, /aria-activedescendant/);
  });
});

describe("P2 reader chrome", () => {
  it("collapses the introduction, names Themes, and offers Saved and Focus", () => {
    assert.match(pane, /aria-expanded=\{open\}/);
    assert.equal(pane.includes("mobile ? ("), false);
    assert.match(mobileBar, /Themes\. \$\{themeName\}/);
    assert.match(mobileBar, />\s*Focus\s*</);
    assert.equal(mobileBar.includes(">Saved<"), false);
    assert.match(toolbar, /Themes, \$\{themeName\}/);
    assert.equal(toolbar.includes(">Saved<"), false);
    assert.match(themes, /aria-pressed=\{active\}/);
    assert.match(themes, /Word by word/);
    assert.match(themes, /Auto-follow the ayah being recited/);
  });

  it("gives ayah tools a visible word and treats Saved here as status", () => {
    assert.match(verse, />Star</);
    assert.match(verse, />Mark</);
    assert.match(verse, />Copy</);
    assert.match(verse, />Share</);
    assert.match(account, /You're on this ayah\./);
    assert.equal(account.includes("Saved here"), false);
  });

  it("tells Sana that extra controls step back", () => {
    const host = { focusMode: false, updatePreferences: () => undefined } as unknown as HelperHost;
    assert.equal(
      performHelper(matchHelper("focus"), host),
      "Focus is on. The extra controls step back.",
    );
    assert.equal(performHelper(matchHelper("focus"), { ...host, focusMode: true }), "Leaving focus.");
  });
});
