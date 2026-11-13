import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { headerShowsHomeLogo, NAV_SIDEBAR_QUERY } from "../src/lib/use-media-query";

const mobile = readFileSync(new URL("../src/components/reader/mobile-reader-bar.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("../src/components/reader/reader-toolbar.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/components/shell/app-shell.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../src/components/sidebar/surah-sidebar.tsx", import.meta.url), "utf8");

describe("reader header home control", () => {
  it("uses the logo as the only way home on the phone bar", () => {
    assert.equal(mobile.includes("Back to home"), false);
    assert.equal(mobile.includes("ChevronLeft"), false);
    assert.equal(mobile.includes('aria-label="QuranDeck home"'), true);
    assert.match(mobile, /aria-label="QuranDeck home"[\s\S]*min-h-11 min-w-11/);
  });

  it("keeps the desktop logo at a 44px target and does not add a back arrow", () => {
    assert.equal(toolbar.includes("Back to home"), false);
    assert.equal(toolbar.includes("ChevronLeft"), false);
    assert.equal(toolbar.includes('aria-label="QuranDeck home"'), true);
    assert.match(toolbar, /aria-label="QuranDeck home"[\s\S]*min-h-11 min-w-11/);
  });

  it("keeps a single home link: sidebar logo on a wide screen, header logo otherwise", () => {
    assert.equal(NAV_SIDEBAR_QUERY, "(min-width: 1280px)");
    assert.equal(headerShowsHomeLogo(false, true), true);
    assert.equal(headerShowsHomeLogo(true, false), true);
    assert.equal(headerShowsHomeLogo(true, true), false);
    assert.match(toolbar, /headerShowsHomeLogo\(sidebarColumn, preferences\.showNavRail\)/);
    assert.match(toolbar, /showHeaderHome \? \(/);
    assert.match(shell, /NAV_SIDEBAR_QUERY/);
    assert.match(shell, /<SurahSidebar homeLink=\{false\} \/>/);
    assert.match(sidebar, /homeLink = true/);
    assert.match(sidebar, /aria-label=\{`\$\{PRODUCT_DISPLAY\} home`\}/);
  });
});
