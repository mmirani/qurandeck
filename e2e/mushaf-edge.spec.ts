import { expect, test, type Page } from "@playwright/test";

const swatches = [
  { id: "honey", name: "Honey", color: "#F5D76E" },
  { id: "garden", name: "Garden", color: "#86EFAC" },
  { id: "sky", name: "Sky", color: "#7DD3FC" },
  { id: "rose", name: "Rose", color: "#F9A8D4" },
];

const pens = ["honey", "garden", "sky", "rose"] as const;

function highlight(id: string, verseKey: string, swatchId: string) {
  return {
    id,
    verseKey,
    layer: "ayah",
    swatchId,
    text: `SHOULD-NOT-SHOW ${id}`,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function note(verseKey: string, secret: string) {
  return {
    id: `note-${verseKey}`,
    verseKey,
    body: `Remember the opening words of this passage and the rest is private ${secret}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function bookmark(id: string, verseKey: string, label: string) {
  return {
    id,
    type: "verse",
    verseKey,
    label,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function denseLibrary() {
  const highlights = [];
  for (let ayah = 1; ayah <= 40; ayah += 1) {
    highlights.push(highlight(`b-${ayah}`, `2:${ayah}`, pens[ayah % pens.length]));
  }
  for (let ayah = 1; ayah <= 8; ayah += 1) highlights.push(highlight(`k-${ayah}`, `18:${ayah}`, "sky"));
  highlights.push(highlight("y-1", "36:1", "rose"));
  highlights.push(highlight("n-1", "112:1", "honey"));

  const notes = [];
  for (let ayah = 1; ayah <= 12; ayah += 1) notes.push(note(`2:${ayah}`, `SECRETTEXT-${ayah}`));
  notes.push(note("18:10", "SECRETTEXT-CAVE"));
  notes.push(note("55:1", "SECRETTEXT-RAHMAN"));

  const bookmarks = [
    bookmark("ya-sin", "36:1", "Ya-Sin start"),
    bookmark("mulk", "67:1", "Mulk"),
    ...[20, 21, 22, 23, 24].map((ayah) => bookmark(`bkm-${ayah}`, `2:${ayah}`, `Baqarah ${ayah}`)),
  ];

  const versesRead = ["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7"];
  for (let ayah = 1; ayah <= 80; ayah += 1) versesRead.push(`2:${ayah}`);

  return { highlights, notes, bookmarks, versesRead };
}

async function seed(page: Page, theme: "iris" | "obsidian", library: ReturnType<typeof denseLibrary> | null) {
  const marks = library ?? { highlights: [], notes: [], bookmarks: [], versesRead: [] };
  await page.addInitScript(
    ({ theme: nextTheme, marks: nextMarks, swatches: nextSwatches }) => {
      localStorage.setItem(
        "al-mushaf-session",
        JSON.stringify({
          id: "e2e-mushaf",
          username: "e2e",
          displayName: "Mansur",
          provider: "local",
        }),
      );
      localStorage.setItem("al-mushaf-preferences", JSON.stringify({ theme: nextTheme }));
      localStorage.setItem("al-mushaf-swatches", JSON.stringify(nextSwatches));
      localStorage.setItem("al-mushaf-highlights", JSON.stringify(nextMarks.highlights));
      localStorage.setItem("al-mushaf-notes", JSON.stringify(nextMarks.notes));
      localStorage.setItem("al-mushaf-bookmarks", JSON.stringify(nextMarks.bookmarks));
      localStorage.setItem(
        "al-mushaf-progress",
        JSON.stringify({
          versesRead: nextMarks.versesRead,
          surahsRead: [],
          surahCompletions: {},
          lastReadDay: null,
          streak: 0,
          totalSeconds: 0,
          verseVisits: {},
          lastVerseKey: "1:1",
          lastActiveAt: null,
          daily: {},
          historySince: null,
        }),
      );
    },
    { theme, marks, swatches },
  );
}

async function openEdge(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Your Mushaf" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("heading", { name: "Your Mushaf" }).scrollIntoViewIfNeeded();
  await expect(page.getByTestId("mushaf-edge-book")).toBeVisible();
}

test("desktop edge shows one tooltip and opens a clustered note", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, "iris", denseLibrary());
  await openEdge(page);

  await expect(page.getByText("SECRETTEXT")).toHaveCount(0);
  await expect(page.getByText("SHOULD-NOT-SHOW")).toHaveCount(0);

  const ribbon = page.getByRole("button", { name: /Bookmark,.*, 36:1/ });
  await ribbon.hover();
  await expect(page.getByRole("tooltip")).toContainText("36:1");
  await expect(page.getByRole("tooltip")).toHaveCount(1);

  const flag = page.getByRole("button", { name: /Note,.*, 2:1/ });
  await flag.hover();
  await expect(page.getByRole("tooltip")).toHaveCount(1);
  await expect(page.getByRole("tooltip")).toContainText("Remember the opening");
  await expect(page.getByRole("tooltip")).toContainText("Honey");
  await expect(page.getByRole("tooltip")).not.toContainText("SECRETTEXT");

  await flag.click();
  const menu = page.getByTestId("mushaf-edge-menu");
  await expect(menu).toBeVisible();
  await expect(menu).not.toContainText("SECRETTEXT");
  await menu.getByRole("button", { name: /2:1\b/ }).click();
  await expect(page).toHaveURL(/\/surah\/2#ayah-1/);
});

test("a single bookmark opens that ayah", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, "iris", denseLibrary());
  await openEdge(page);
  await page.getByRole("button", { name: /Bookmark,.*, 36:1/ }).click();
  await expect(page).toHaveURL(/\/surah\/36#ayah-1/);
});

test("keyboard focus shows the tooltip", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, "iris", denseLibrary());
  await openEdge(page);
  const ribbon = page.getByRole("button", { name: /Bookmark,.*, 36:1/ });
  await ribbon.focus();
  await expect(page.getByRole("tooltip")).toContainText("36:1");
});

test("the edge is hidden on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, "iris", denseLibrary());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("mushaf-edge-hint")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("mushaf-edge-book")).toBeHidden();
});

test("an empty mushaf invites the reader to highlight", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, "obsidian", null);
  await openEdge(page);
  await expect(page.getByTestId("mushaf-edge-empty")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start highlighting" })).toHaveAttribute("href", "/read");
  await expect(page.getByTestId("mushaf-edge-flag")).toHaveCount(0);
  await expect(page.getByTestId("mushaf-edge-ribbon")).toHaveCount(0);
});

test("signed-out homepage does not mount the edge", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Mushaf" })).toHaveCount(0);
  await expect(page.getByTestId("mushaf-edge")).toHaveCount(0);
});
