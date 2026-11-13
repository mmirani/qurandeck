import "./register-dom.ts";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguagePickerView, type LanguagePickerPrefs } from "../src/components/reader/language-picker";
import { withTranslationIds } from "../src/lib/quran/languages";
import type { Preferences, TranslationResource } from "../src/lib/quran/types";

const resources: TranslationResource[] = [
  { id: 20, name: "Saheeh International", authorName: "Saheeh", languageName: "english", slug: "en-sahih" },
  { id: 19, name: "Pickthall", authorName: "Marmaduke Pickthall", languageName: "english", slug: "en-pickthall" },
  { id: 131, name: "Urdu", authorName: "", languageName: "urdu", slug: "ur" },
];

const initial: LanguagePickerPrefs = {
  showArabic: true,
  showTranslation: true,
  showTransliteration: false,
  translationIds: [20],
  traditionalPage: false,
  focusMode: false,
};

function apply(current: LanguagePickerPrefs, partial: Partial<Preferences>): LanguagePickerPrefs {
  const next = { ...current, ...partial };
  if (partial.translationIds) return { ...next, ...withTranslationIds(partial.translationIds) };
  return next;
}

function Harness({
  start = initial,
  transliterationAvailable = true,
}: {
  start?: LanguagePickerPrefs;
  transliterationAvailable?: boolean;
}) {
  const [preferences, setPreferences] = useState(start);
  return (
    <LanguagePickerView
      preferences={preferences}
      translations={resources}
      transliterationAvailable={transliterationAvailable}
      onChange={(partial) => setPreferences((current) => apply(current, partial))}
    />
  );
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(node);
  });
}

function button(label: string, scope: ParentNode = document) {
  const found = [...scope.querySelectorAll("button")].find((item) => item.getAttribute("aria-label") === label || item.textContent?.trim() === label);
  assert.ok(found, `missing button ${label}`);
  return found;
}

async function click(label: string, scope?: ParentNode) {
  const target = button(label, scope);
  await act(async () => {
    target.click();
  });
}

describe("reading language chips", () => {
  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
    document.body.replaceChildren();
  });

  it("removes a translation from its own control, separate from the edition menu", async () => {
    await render(<Harness />);
    const choose = button("Choose English translation");
    const remove = button("Remove English");
    assert.equal(choose.contains(remove), false);
    assert.equal(remove.parentElement, choose.parentElement);
    assert.equal(choose.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING, Node.DOCUMENT_POSITION_FOLLOWING);
    assert.match(remove.className, /\bh-11\b/);
    assert.match(remove.className, /\bmin-w-6\b/);
    assert.match(remove.className, /\bw-10\b/);
    assert.ok(remove.querySelector("svg")?.classList.contains("h-4"));
    assert.equal(remove.getAttribute("aria-disabled"), null);

    await click("Remove English");

    assert.equal(document.querySelector('[aria-label="Remove English"]'), null);
    assert.equal(document.querySelector('[role="status"]')?.textContent, "English removed");
    assert.ok(button("Remove Arabic"));
    assert.ok([...document.querySelectorAll("button")].some((item) => item.textContent?.includes("Mushaf View")));
  });

  it("removes Arabic and offers it again from the languages menu", async () => {
    await render(<Harness />);
    await click("Remove Arabic");

    assert.equal(document.querySelector('[aria-label="Remove Arabic"]'), null);
    assert.equal(document.querySelector('[role="status"]')?.textContent, "Arabic removed");
    assert.equal(button("Remove English").getAttribute("aria-disabled"), "true");
    assert.equal(button("Remove English").getAttribute("title"), "At least one language stays on");

    await click("Languages");
    const dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.match(dialog.textContent ?? "", /Transliteration/);
    const addArabic = [...dialog.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Arabic");
    assert.ok(addArabic);
    await act(async () => {
      addArabic.click();
    });

    assert.ok(button("Remove Arabic"));
    assert.equal(document.querySelector('[role="status"]')?.textContent, "Arabic added");
    assert.equal(button("Remove English").getAttribute("aria-disabled"), null);
  });

  it("keeps the last layer on", async () => {
    await render(
      <Harness
        start={{
          ...initial,
          showTranslation: false,
          translationIds: [],
        }}
      />,
    );
    const remove = button("Remove Arabic");
    assert.equal(remove.getAttribute("aria-disabled"), "true");
    assert.equal(remove.querySelector("[role='tooltip']")?.textContent, "At least one language stays on");
    await click("Remove Arabic");
    assert.ok(button("Remove Arabic"));
    assert.equal(document.querySelector('[role="status"]')?.textContent, "");
    assert.equal([...document.querySelectorAll("button")].some((item) => item.textContent?.includes("Mushaf View")), true);
  });
});
