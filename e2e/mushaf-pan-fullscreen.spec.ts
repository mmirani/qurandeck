import { expect, test, type Locator, type Page } from "@playwright/test";

// The dev server rate-limits /api per client address. Each spec file gets its own
// so one file's requests never throttle another's (live traffic is unaffected).
test.use({ extraHTTPHeaders: { "x-forwarded-for": "e2e-mushaf-pan" } });

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


async function openExplore(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, "iris", denseLibrary());
  await openEdge(page);
  await page.getByTestId("mushaf-edge-explore").click();
  const dialog = page.getByTestId("mushaf-explore-dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function zoomTo260(dialog: Locator) {
  const zoomIn = dialog.getByRole("button", { name: "Zoom in" });
  for (let i = 0; i < 8; i += 1) {
    if ((await zoomIn.getAttribute("disabled")) !== null) break;
    await zoomIn.click();
  }
  await expect(dialog.getByTestId("mushaf-explore-book")).toHaveAttribute("data-zoom", "2.60");
}


function boxesTouchOrOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  slop = 1,
) {
  const apart =
    a.x + a.width < b.x - slop ||
    b.x + b.width < a.x - slop ||
    a.y + a.height < b.y - slop ||
    b.y + b.height < a.y - slop;
  return !apart;
}

async function zoomToMax(dialog: Locator, expected = "4.00") {
  const zoomIn = dialog.getByRole("button", { name: "Zoom in" });
  for (let i = 0; i < 16; i += 1) {
    if ((await zoomIn.getAttribute("disabled")) !== null) break;
    await zoomIn.click();
  }
  await expect(dialog.getByTestId("mushaf-explore-book")).toHaveAttribute("data-zoom", expected);
}

test("at 260% zoom a drag pans the book", async ({ page }) => {
  const dialog = await openExplore(page);
  await zoomTo260(dialog);
  const book = dialog.getByTestId("mushaf-explore-book");
  await expect(book).toHaveAttribute("data-pan-x", "0");
  await expect(book).toHaveAttribute("data-pan-y", "0");

  const stage = dialog.getByTestId("mushaf-explore-stage");
  await stage.focus();
  const box = await stage.boundingBox();
  if (!box) throw new Error("missing stage");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5 - 200, box.y + box.height * 0.55 - 160, { steps: 12 });
  await page.mouse.up();

  const panX = Number(await book.getAttribute("data-pan-x"));
  const panY = Number(await book.getAttribute("data-pan-y"));
  expect(Math.abs(panX) + Math.abs(panY)).toBeGreaterThan(20);
  const transform = await dialog.getByTestId("mushaf-explore-zoom").evaluate((node) => getComputedStyle(node).transform);
  expect(transform).not.toBe("none");
  expect(transform).not.toBe("matrix(1, 0, 0, 1, 0, 0)");

  const beforeX = panX;
  await page.keyboard.press("ArrowRight");
  const afterX = Number(await book.getAttribute("data-pan-x"));
  expect(afterX).not.toBe(beforeX);
});

test("full screen toggles and Escape exits it without closing the close-up", async ({ page }) => {
  const dialog = await openExplore(page);
  const toggle = dialog.getByTestId("mushaf-explore-fullscreen");
  await expect(toggle).toHaveAttribute("aria-label", "Full screen");
  const size = await toggle.boundingBox();
  expect(size?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);

  await toggle.click();
  await expect(dialog).toHaveAttribute("data-fullscreen", "true");
  await expect(toggle).toHaveAttribute("aria-label", "Exit full screen");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await expect(dialog).toHaveAttribute("data-fullscreen", "false");
  await expect(toggle).toHaveAttribute("aria-label", "Full screen");
  await expect(dialog).toBeVisible();

  await toggle.click();
  await expect(dialog).toHaveAttribute("data-fullscreen", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-fullscreen", "false");
  await expect(toggle).toBeFocused();
});

test("spine and cover stay joined at 400% in three-quarter and fore-edge views", async ({ page }) => {
  const dialog = await openExplore(page);
  await dialog.getByTestId("mushaf-explore-fullscreen").click();
  await expect(dialog).toHaveAttribute("data-fullscreen", "true");
  await zoomToMax(dialog);

  for (const name of ["Three-quarter", "Fore-edge"] as const) {
    await dialog.getByRole("button", { name }).click();
    const book = dialog.getByTestId("mushaf-explore-book");
    await expect(book).toHaveAttribute("data-angle", name === "Fore-edge" ? "fore-edge" : "three-quarter");
    const spine = await book.locator(".mushaf-spine").boundingBox();
    const cover = await book.locator(".mushaf-front").boundingBox();
    if (!spine || !cover) throw new Error(`missing book faces in ${name}`);
    expect(
      boxesTouchOrOverlap(spine, cover),
      `spine and cover should meet in ${name} at 400% (spine=${JSON.stringify(spine)} cover=${JSON.stringify(cover)})`,
    ).toBe(true);
  }
});
