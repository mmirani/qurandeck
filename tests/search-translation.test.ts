import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { markedRuns, namedTranslation, quranSearchPath, runsToText } from "../src/lib/quran/search-text";

const server = readFileSync(new URL("../src/lib/quran/server.ts", import.meta.url), "utf8");
const search = readFileSync(new URL("../src/components/search/search-bar.tsx", import.meta.url), "utf8");

const pickthall = "He said: My Lord! Have <em>mercy</em> on me and on my brother.";
const saheeh = '[Moses] said, "My Lord, forgive me and my brother and admit us into Your <em>mercy</em>, for You are the most merciful of the merciful."';

describe("search translation wording", () => {
  it("asks Quran.com for the selected translation", () => {
    assert.equal(
      quranSearchPath("mercy", 20),
      "/search?q=mercy&size=20&page=1&translations=20",
    );
    assert.match(quranSearchPath("patience", Number.NaN), /translations=20/);
    assert.match(server, /quranSearchPath\(cleaned, translationId\)/);
    assert.equal(server.includes("/search?q="), false);
  });

  it("keeps the match and the edition name, and drops an unnamed snippet", () => {
    const named = namedTranslation(saheeh, "Saheeh International", 20, "mercy");
    assert.ok(named);
    assert.match(named.text, /forgive me and my brother/);
    assert.equal(named.text.includes("My Lord! Have"), false);
    assert.equal(named.translationName, "Saheeh International");
    assert.equal(named.translationId, 20);
    assert.deepEqual(
      named.runs.filter((run) => run.match).map((run) => run.text),
      ["mercy"],
    );
    assert.equal(runsToText(markedRuns(pickthall)).includes("Have mercy on me"), true);
    assert.equal(namedTranslation(pickthall, "  ", 19), null);
    assert.equal(namedTranslation("plain mercy", "M. Pickthall", 19, "mercy")?.runs.some((run) => run.match && run.text === "mercy"), true);
  });

  it("shows the translation name with the wording and not the wording alone", () => {
    assert.match(search, /hit\.translationName/);
    assert.match(search, /<mark/);
    assert.match(search, /if \(!hit\.translationName \|\| !hit\.textTranslation\) return null/);
    assert.match(search, /hit\.source === "jump"/);
  });
});