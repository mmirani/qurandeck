import { expect, test, type Page } from "@playwright/test";

// The dev server rate-limits /api per client address. Each spec file gets its own
// so one file's requests never throttle another's (live traffic is unaffected).
test.use({ extraHTTPHeaders: { "x-forwarded-for": "e2e-mobile-ayah-padding" } });

async function seedPhoneReader(page: Page, mode: "scroll" | "ayah") {
  await page.addInitScript((readingMode) => {
    localStorage.setItem(
      "al-mushaf-preferences",
      JSON.stringify({
        theme: "iris",
        mobileReadingMode: readingMode,
        traditionalPage: false,
        showIntroduction: false,
        showTafsir: false,
      }),
    );
    localStorage.setItem(
      "al-mushaf-guide",
      JSON.stringify({ version: 2, pendingWelcome: false, completedWelcome: true, seen: {} }),
    );
    localStorage.setItem("qurandeck-reader-hint", "1");
  }, mode);
  await page.route(/\/api\/(usage|feedback)\b/, (route) => route.abort());
}

async function openAyahView(page: Page, href: string, verseKey: string, ayahNumber: number) {
  await page.setViewportSize({ width: 390, height: 844 });
  // The first HTML payload only includes the opening ayahs. Open in scroll
  // mode so the rest of the surah can load, then switch to Ayah view.
  await seedPhoneReader(page, "scroll");
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await expect(page.locator(`#ayah-${ayahNumber}`)).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: "Ayah", exact: true }).click();
  const card = page.locator(".reader-ayah-body .verse-frame");
  await expect(card).toBeVisible();
  await expect(page.locator(`[data-verse-key="${verseKey}"]`)).toBeVisible();
  await expect(page.locator(".ayah-block-translation")).toBeVisible();
  return card;
}

async function translationInsets(page: Page) {
  return page.evaluate(() => {
    const card = document.querySelector(".reader-ayah-body .verse-frame");
    const text = document.querySelector(".ayah-block-translation .reading-text");
    const credit = document.querySelector(".ayah-block-translation p.text-ink-soft, .ayah-block-translation p.text-xs");
    if (!card || !text) return null;
    const cardRect = card.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    const creditRect = credit?.getBoundingClientRect();
    const pad = Number.parseFloat(getComputedStyle(card).paddingLeft);
    return {
      textLeft: textRect.left - cardRect.left,
      textRight: cardRect.right - textRect.right,
      creditLeft: creditRect ? creditRect.left - cardRect.left : null,
      pad,
    };
  });
}

test("phone ayah view insets the translation from the card border", async ({ page }) => {
  await openAyahView(page, "/surah/17#ayah-65", "17:65", 65);
  await expect.poll(async () => translationInsets(page), { timeout: 20_000 }).not.toBeNull();
  const metrics = await translationInsets(page);
  expect(metrics).not.toBeNull();
  // --card-pad is 20px on a 390px phone. Allow a little subpixel slack.
  expect(metrics!.pad).toBeGreaterThanOrEqual(16);
  expect(metrics!.textLeft).toBeGreaterThanOrEqual(16);
  expect(metrics!.textRight).toBeGreaterThanOrEqual(16);
  if (metrics!.creditLeft != null) {
    expect(metrics!.creditLeft).toBeGreaterThanOrEqual(16);
  }
});

test("phone scroll mode keeps translation inset inside the verse card", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedPhoneReader(page, "scroll");
  await page.goto("/surah/17#ayah-65", { waitUntil: "domcontentloaded" });
  const verse = page.locator("#ayah-65");
  await expect(verse).toBeVisible({ timeout: 90_000 });
  const metrics = await verse.evaluate((node) => {
    const card = node.querySelector(".verse-frame");
    const text = node.querySelector(".reading-text");
    if (!card || !text) return null;
    const cardRect = card.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    return {
      left: textRect.left - cardRect.left,
      right: cardRect.right - textRect.right,
      flush: card.classList.contains("verse-frame-flush"),
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.flush).toBe(false);
  expect(metrics!.left).toBeGreaterThanOrEqual(16);
  expect(metrics!.right).toBeGreaterThanOrEqual(16);
});

test("desktop scroll view keeps translation inset inside the verse card", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 830 });
  await seedPhoneReader(page, "scroll");
  await page.goto("/surah/17#ayah-65", { waitUntil: "domcontentloaded" });
  const verse = page.locator("#ayah-65");
  await expect(verse).toBeVisible({ timeout: 90_000 });
  await expect(page.locator(".reader-ayah-stage")).toHaveCount(0);
  const metrics = await verse.evaluate((node) => {
    const card = node.querySelector(".verse-frame");
    const text = node.querySelector(".reading-text");
    if (!card || !text) return null;
    const cardRect = card.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    return {
      left: textRect.left - cardRect.left,
      right: cardRect.right - textRect.right,
    };
  });
  expect(metrics).not.toBeNull();
  expect(metrics!.left).toBeGreaterThanOrEqual(16);
  expect(metrics!.right).toBeGreaterThanOrEqual(16);
});
