import { expect, test, type Page } from "@playwright/test";

const CLIENT = { "x-forwarded-for": "e2e-finish-moment" };
test.use({ extraHTTPHeaders: CLIENT });

const COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227,
  93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78,
  96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22,
  17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

const allVerses = COUNTS.flatMap((count, index) =>
  Array.from({ length: count }, (_, verse) => `${index + 1}:${verse + 1}`),
);

async function seedFinished(page: Page, theme = "iris", seen = false) {
  await page.addInitScript(
    ({ verses, nextTheme, alreadySeen }) => {
      localStorage.setItem(
        "al-mushaf-session",
        JSON.stringify({ id: "e2e-finish", username: "e2e", displayName: "Amina", provider: "local" }),
      );
      localStorage.setItem("al-mushaf-preferences", JSON.stringify({ theme: nextTheme, showIntroduction: false }));
      localStorage.setItem(
        "al-mushaf-progress",
        JSON.stringify({
          versesRead: verses,
          surahsRead: Array.from({ length: 114 }, (_, i) => i + 1),
          surahCompletions: {},
          lastReadDay: "2026-11-22",
          streak: 10,
          totalSeconds: 1000,
          verseVisits: {},
          lastVerseKey: "114:6",
          lastActiveAt: null,
          daily: {},
          historySince: "2026-03-12",
          readingCycle: 1,
          readingStartedOn: "2026-03-12",
          finishedReadings: [
            {
              id: "fr-cycle-1",
              index: 1,
              startedOn: "2026-03-12",
              finishedOn: "2026-11-22",
              days: 256,
              ayahs: 6236,
              surahs: 114,
              seenAt: alreadySeen ? Date.now() : null,
            },
          ],
        }),
      );
    },
    { verses: allVerses, nextTheme: theme, alreadySeen: seen },
  );
  await page.route(/\/api\/(usage|feedback)\b/, (route) => route.abort());
}

test("shows the finish moment on the homepage, then lists the reading in Progress", async ({ page }) => {
  await seedFinished(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const moment = page.getByTestId("finish-moment");
  await expect(moment).toBeVisible({ timeout: 60_000 });
  await expect(moment.getByRole("heading", { name: "You finished the Quran" })).toBeVisible();
  await expect(moment.getByText("May Allah accept it.")).toBeVisible();
  await expect(moment.getByRole("button", { name: "Keep my map" })).toBeVisible();
  await expect(moment.getByRole("button", { name: "Start again" })).toBeVisible();
  await expect(moment.getByRole("button", { name: "Save a card" })).toBeVisible();
  await moment.getByRole("button", { name: "Keep my map" }).click();
  await expect(moment).toHaveCount(0);

  await expect(page.getByTestId("finish-sana-note")).toBeVisible();
  await page.getByRole("button", { name: /Amina/ }).click();
  await expect(page.getByRole("tab", { name: "Progress" })).toBeVisible();
  const list = page.getByTestId("readings-finished");
  await expect(list).toBeVisible();
  await expect(list.getByText("Reading 1")).toBeVisible();
  await expect(list.getByText(/Started 12 March 2026/)).toBeVisible();
  await expect(list.getByText(/Finished 22 November 2026/)).toBeVisible();
  await expect(list.getByText(/256 days/)).toBeVisible();
});

test("does not show the finish moment again after it has been seen", async ({ page }) => {
  await seedFinished(page, "iris", true);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("completion-map")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("finish-moment")).toHaveCount(0);
  await expect(page.getByTestId("finish-sana-note")).toBeVisible();
});
