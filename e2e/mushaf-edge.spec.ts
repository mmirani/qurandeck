import { expect, test, type Page } from "@playwright/test";

// The dev server rate-limits /api per client address. Each spec file gets its own
// so one file's requests never throttle another's (live traffic is unaffected).
test.use({ extraHTTPHeaders: { "x-forwarded-for": "e2e-mushaf-edge" } });

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

async function stubSessionName(page: Page, name: string | null) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: name ? { name } : {},
        expires: "2099-12-31T00:00:00.000Z",
      }),
    });
  });
}

async function openEdge(page: Page, title = "Your Mushaf") {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("heading", { name: title }).scrollIntoViewIfNeeded();
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
  await expect(page.getByTestId("mushaf-edge-explore")).toHaveCount(0);
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

test("explore opens a close-up, zooms, turns, and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seed(page, "iris", denseLibrary());
  await openEdge(page);

  const explore = page.getByTestId("mushaf-edge-explore");
  await explore.click();
  const dialog = page.getByTestId("mushaf-explore-dialog");
  const book = page.getByTestId("mushaf-explore-book");
  await expect(dialog).toBeVisible();
  await expect(book).toHaveAttribute("data-angle", "three-quarter");
  await expect(book).toHaveAttribute("data-zoom", "1.00");
  await expect(book).toHaveAttribute("data-yaw", "-40");

  await dialog.getByRole("button", { name: "Zoom in" }).click();
  await expect(book).toHaveAttribute("data-zoom", "1.25");
  await page.keyboard.press("Equal");
  await expect(book).toHaveAttribute("data-zoom", "1.50");
  await page.keyboard.press("Minus");
  await expect(book).toHaveAttribute("data-zoom", "1.25");
  await page.keyboard.press("ArrowLeft");
  await expect(book).toHaveAttribute("data-yaw", "-48");

  await dialog.getByRole("button", { name: "Fore-edge" }).click();
  await expect(book).toHaveAttribute("data-angle", "fore-edge");
  // Edge-on, the page block is only as wide as the book is thick, so a magnified strip appears.
  const magnifier = dialog.getByTestId("mushaf-edge-magnifier");
  await expect(magnifier).toBeVisible();
  expect((await magnifier.boundingBox())?.width ?? 0).toBeGreaterThan(600);
  await expect(dialog.getByTestId("mushaf-magnifier-slice").first()).toBeVisible();
  await expect(book).toHaveAttribute("data-yaw", "-90");
  await expect(book).toHaveAttribute("data-pitch", "0");
  await expect(book).toHaveAttribute("data-zoom", "1.25");

  await dialog.getByRole("button", { name: "Three-quarter" }).click();
  await expect(book).toHaveAttribute("data-angle", "three-quarter");
  await dialog.getByRole("button", { name: "Reset zoom" }).click();
  await expect(book).toHaveAttribute("data-zoom", "1.00");

  const honey = dialog.getByRole("button", { name: /^Honey,/ });
  await expect(honey).toHaveAttribute("aria-pressed", "true");
  await honey.click();
  await expect(honey).toHaveAttribute("aria-pressed", "false");
  await dialog.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(dialog.getByTestId("mushaf-edge-flag")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Bookmarks", exact: true }).click();
  await expect(dialog.getByTestId("mushaf-edge-ribbon")).toHaveCount(0);

  await page.getByRole("slider", { name: "Surah along the page edge" }).fill("1000");
  await expect(dialog.getByText("An-Nas · 114:1 – 114:6")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(explore).toBeFocused();
});

test("clicking the book opens the same close-up", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seed(page, "obsidian", denseLibrary());
  await openEdge(page);
  const scene = page.getByTestId("mushaf-edge-book");
  const box = await scene.boundingBox();
  if (!box) throw new Error("missing book");
  await page.mouse.click(box.x + box.width * 0.32, box.y + box.height * 0.42);
  await expect(page.getByTestId("mushaf-explore-dialog")).toBeVisible();
  await expect(page.getByTestId("mushaf-explore-book")).toHaveAttribute("data-angle", "three-quarter");
});

test("a ribbon in the close-up names its place and opens that ayah", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seed(page, "iris", denseLibrary());
  await openEdge(page);
  await page.getByTestId("mushaf-edge-explore").click();
  const dialog = page.getByTestId("mushaf-explore-dialog");
  await dialog.getByRole("button", { name: "Fore-edge" }).click();
  await dialog.getByRole("button", { name: "Zoom in" }).click();
  const ribbon = dialog.getByRole("button", { name: /Bookmark,.*, 36:1/ });
  // Fore-edge packs marks onto the thin page block, so AABB centers can overlap
  // a neighbour. Aim at the left side of this ribbon, which stays unique.
  await ribbon.hover({ position: { x: 4, y: 28 } });
  await expect(page.getByRole("tooltip")).toContainText("36:1");
  await expect(page.getByRole("tooltip")).toContainText("Ya-Sin");
  await ribbon.click({ position: { x: 4, y: 28 } });
  await expect(page).toHaveURL(/\/surah\/36#ayah-1/);
});

test("signed-out homepage does not mount the edge", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Mushaf" })).toHaveCount(0);
  await expect(page.getByTestId("mushaf-edge")).toHaveCount(0);
});

test("the book heading uses the signed-in first name", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubSessionName(page, "Mansur Mirani");
  await seed(page, "iris", denseLibrary());
  await openEdge(page, "Mansur's Mushaf");

  const cover = page.getByTestId("mushaf-edge-book").locator(".mushaf-cover-title");
  await expect(cover.locator(".mushaf-cover-owner")).toHaveText("Mansur's");
  await expect(cover.locator(".mushaf-cover-book")).toHaveText("Mushaf");
  await page.getByTestId("mushaf-edge-explore").click();
  const dialog = page.getByTestId("mushaf-explore-dialog");
  await expect(dialog.getByRole("heading", { name: "Mansur's Mushaf" })).toBeVisible();
  await expect(dialog.getByLabel("Mansur's Mushaf on the desk")).toBeVisible();
  const exploreCover = dialog.locator(".mushaf-cover-title");
  await expect(exploreCover.locator(".mushaf-cover-owner")).toHaveText("Mansur's");
  await expect(exploreCover.locator(".mushaf-cover-book")).toHaveText("Mushaf");
});

test("the book heading falls back to Your Mushaf when the session has no name", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubSessionName(page, null);
  await seed(page, "iris", denseLibrary());
  await openEdge(page, "Your Mushaf");

  const cover = page.getByTestId("mushaf-edge-book").locator(".mushaf-cover-title");
  await expect(cover.locator(".mushaf-cover-owner")).toHaveText("Your");
  await expect(cover.locator(".mushaf-cover-book")).toHaveText("Mushaf");
  await page.getByTestId("mushaf-edge-explore").click();
  const dialog = page.getByTestId("mushaf-explore-dialog");
  await expect(dialog.getByRole("heading", { name: "Your Mushaf" })).toBeVisible();
  await expect(dialog.getByLabel("Your Mushaf on the desk")).toBeVisible();
});

test("a long first name falls back to Your Mushaf everywhere", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubSessionName(page, "Christopher Wren");
  await seed(page, "iris", denseLibrary());
  await openEdge(page, "Your Mushaf");

  const cover = page.getByTestId("mushaf-edge-book").locator(".mushaf-cover-title");
  await expect(cover.locator(".mushaf-cover-owner")).toHaveText("Your");
  await expect(cover.locator(".mushaf-cover-book")).toHaveText("Mushaf");
  await expect(page.getByRole("heading", { name: "Christopher's Mushaf" })).toHaveCount(0);
  await page.getByTestId("mushaf-edge-explore").click();
  const dialog = page.getByTestId("mushaf-explore-dialog");
  await expect(dialog.getByRole("heading", { name: "Your Mushaf" })).toBeVisible();
  await expect(dialog.getByLabel("Your Mushaf on the desk")).toBeVisible();
});
