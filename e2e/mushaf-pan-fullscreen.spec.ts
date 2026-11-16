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

async function expectMarksTuckedIn(dialog: Locator, label: string) {
  const book = dialog.getByTestId("mushaf-explore-book");
  const faces = await Promise.all(
    [".mushaf-front", ".mushaf-back", ".mushaf-fore"].map((selector) => book.locator(selector).boundingBox()),
  );
  if (faces.some((box) => !box)) throw new Error(`missing book faces (${label})`);
  const left = Math.min(...faces.map((box) => box!.x));
  const right = Math.max(...faces.map((box) => box!.x + box!.width));
  const pieces = book.locator(".mushaf-tab-face, .mushaf-tab-back, .mushaf-tab-side, .mushaf-ribbon-tuck");
  const count = await pieces.count();
  expect(count, `tabs and ribbons should render (${label})`).toBeGreaterThan(0);
  const slop = 1.5;
  for (let i = 0; i < count; i += 1) {
    const box = await pieces.nth(i).boundingBox();
    if (!box) continue;
    expect(
      box.x >= left - slop && box.x + box.width <= right + slop,
      `a tab or ribbon pokes out past the covers (${label}): piece=${JSON.stringify(box)} book=${left}..${right}`,
    ).toBe(true);
  }
}

test("tabs and ribbons stay tucked between the covers edge-on, at 100% and 400%", async ({ page }) => {
  const dialog = await openExplore(page);
  await dialog.getByRole("button", { name: "Fore-edge" }).click();
  await expect(dialog.getByTestId("mushaf-explore-book")).toHaveAttribute("data-angle", "fore-edge");
  await expectMarksTuckedIn(dialog, "fore-edge 100%");

  await dialog.getByTestId("mushaf-explore-fullscreen").click();
  await expect(dialog).toHaveAttribute("data-fullscreen", "true");
  await zoomToMax(dialog);
  await expectMarksTuckedIn(dialog, "fore-edge 400% full screen");
});

async function bookFit(dialog: Locator) {
  const stage = await dialog.getByTestId("mushaf-explore-stage").boundingBox();
  // The float is the book's whole box: cover, tabs above and ribbons below.
  const book = await dialog.locator(".mushaf-float").boundingBox();
  if (!stage || !book) throw new Error("missing stage or book");
  return {
    dx: Math.abs(book.x + book.width / 2 - (stage.x + stage.width / 2)) / stage.width,
    dy: Math.abs(book.y + book.height / 2 - (stage.y + stage.height / 2)) / stage.height,
    fill: Math.max(book.width / stage.width, book.height / stage.height),
    inside:
      book.x >= stage.x - 1 &&
      book.y >= stage.y - 1 &&
      book.x + book.width <= stage.x + stage.width + 1 &&
      book.y + book.height <= stage.y + stage.height + 1,
  };
}

async function expectFitted(dialog: Locator, label: string) {
  await expect
    .poll(async () => {
      const fit = await bookFit(dialog);
      return fit.dx < 0.03 && fit.dy < 0.03 && fit.fill >= 0.75 && fit.inside;
    }, { message: `book should be centred and fill the stage (${label})`, timeout: 5_000 })
    .toBe(true);
}

for (const size of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`full screen fits and centres the whole book at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await seed(page, "iris", denseLibrary());
    await openEdge(page);
    await page.getByTestId("mushaf-edge-explore").click();
    const dialog = page.getByTestId("mushaf-explore-dialog");
    const book = dialog.getByTestId("mushaf-explore-book");
    await expectFitted(dialog, "windowed");
    const windowedFit = Number(await book.getAttribute("data-fit"));

    await dialog.getByRole("button", { name: "Zoom in" }).click();
    await dialog.getByTestId("mushaf-explore-fullscreen").click();
    await expect(dialog).toHaveAttribute("data-fullscreen", "true");
    await expect(book).toHaveAttribute("data-zoom", "1.00");
    await expect(dialog.getByText("100%")).toBeVisible();
    await expectFitted(dialog, "full screen");
    const fullFit = Number(await book.getAttribute("data-fit"));
    expect(fullFit, "full screen should make the book bigger").toBeGreaterThan(windowedFit);

    // Zoom and pan away, then Reset zoom comes back to the fitted, centred book.
    await dialog.getByRole("button", { name: "Zoom in" }).click();
    await dialog.getByRole("button", { name: "Zoom in" }).click();
    const stage = dialog.getByTestId("mushaf-explore-stage");
    await stage.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await dialog.getByRole("button", { name: "Reset zoom" }).click();
    await expect(book).toHaveAttribute("data-zoom", "1.00");
    await expectFitted(dialog, "after reset");

    // Fullscreen still reaches well past the old 400% of the windowed book.
    const zoomIn = dialog.getByRole("button", { name: "Zoom in" });
    for (let i = 0; i < 16 && (await zoomIn.isEnabled()); i += 1) await zoomIn.click();
    expect(Number(await book.getAttribute("data-zoom")) * fullFit).toBeGreaterThanOrEqual(4);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveAttribute("data-fullscreen", "false");
    await expect(book).toHaveAttribute("data-zoom", "1.00");
    await expectFitted(dialog, "back to windowed");
    await expect.poll(async () => Number(await book.getAttribute("data-fit"))).toBeCloseTo(windowedFit, 2);
  });
}

test("a drag can turn the book only within a believable range", async ({ page }) => {
  const dialog = await openExplore(page);
  const book = dialog.getByTestId("mushaf-explore-book");
  const stage = await dialog.getByTestId("mushaf-explore-stage").boundingBox();
  if (!stage) throw new Error("missing stage");
  const midY = stage.y + stage.height / 2;

  // Far toward the fore-edge and down: it gives a touch while held, then settles.
  await page.mouse.move(stage.x + stage.width - 20, midY);
  await page.mouse.down();
  await page.mouse.move(stage.x + 20, stage.y + stage.height - 10, { steps: 24 });
  await page.mouse.move(stage.x + 10, stage.y + stage.height - 5, { steps: 4 });
  const heldYaw = Number(await book.getAttribute("data-yaw"));
  expect(heldYaw).toBeGreaterThanOrEqual(-92);
  await page.mouse.up();
  await expect(book).toHaveAttribute("data-yaw", "-90");
  const settledPitch = Number(await book.getAttribute("data-pitch"));
  expect(settledPitch).toBeGreaterThanOrEqual(-10);
  expect(settledPitch).toBeLessThanOrEqual(0);
  await expect(dialog.getByRole("button", { name: "Turn left" })).toBeDisabled();

  // Twice across the other way and up: stops a touch past front-on, never tilted up.
  for (let pass = 0; pass < 2; pass += 1) {
    await page.mouse.move(stage.x + 20, midY);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width - 20, stage.y + 10, { steps: 24 });
    await page.mouse.up();
  }
  await expect(book).toHaveAttribute("data-yaw", "8");
  expect(Number(await book.getAttribute("data-pitch"))).toBeGreaterThanOrEqual(-10);
  expect(Number(await book.getAttribute("data-pitch"))).toBeLessThanOrEqual(0);
  await expect(dialog.getByRole("button", { name: "Turn right" })).toBeDisabled();

  // Presets still work inside the range.
  await dialog.getByRole("button", { name: "Fore-edge" }).click();
  await expect(book).toHaveAttribute("data-yaw", "-90");
  await dialog.getByRole("button", { name: "Three-quarter" }).click();
  await expect(book).toHaveAttribute("data-yaw", "-40");
});
