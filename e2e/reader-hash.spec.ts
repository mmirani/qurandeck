import { expect, test, type Page } from "@playwright/test";

async function shellMetrics(page: Page) {
  return page.evaluate(() => {
    const shell = document.getElementById("main-content");
    const reader = document.getElementById("main-reader");
    const column = document.querySelector(".reader-column");
    if (!shell || !reader || !column) return null;
    const shellRect = shell.getBoundingClientRect();
    const readerRect = reader.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    const ayah = document.getElementById("ayah-2");
    const ayahRect = ayah?.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      shellTop: shellRect.top,
      shellHeight: shellRect.height,
      shellScroll: shell.scrollTop,
      innerHeight: window.innerHeight,
      columnTop: columnRect.top,
      columnBottom: columnRect.bottom,
      readerTop: readerRect.top,
      readerBottom: readerRect.bottom,
      ayahTop: ayahRect?.top ?? null,
      ayahSelected: ayah?.classList.contains("is-live") ?? false,
      maxShell: (window as Window & { __qdMaxShell?: number }).__qdMaxShell ?? 0,
      maxY: (window as Window & { __qdMaxY?: number }).__qdMaxY ?? 0,
    };
  }).catch(() => null);
}

function installScrollProbe(page: Page) {
  return page.addInitScript(() => {
    const w = window as Window & { __qdMaxShell?: number; __qdMaxY?: number };
    w.__qdMaxShell = 0;
    w.__qdMaxY = 0;
    document.addEventListener(
      "scroll",
      () => {
        const shell = document.getElementById("main-content");
        w.__qdMaxShell = Math.max(w.__qdMaxShell ?? 0, shell?.scrollTop ?? 0);
        w.__qdMaxY = Math.max(w.__qdMaxY ?? 0, window.scrollY);
      },
      true,
    );
  });
}

async function expectShellFillsViewport(page: Page) {
  await expect.poll(async () => shellMetrics(page), { timeout: 20_000 }).not.toBeNull();
  await expect
    .poll(async () => {
      const metrics = await shellMetrics(page);
      if (!metrics) return false;
      return (
        metrics.scrollY === 0 &&
        Math.abs(metrics.shellTop) < 1 &&
        Math.abs(metrics.shellHeight - metrics.innerHeight) < 2 &&
        metrics.shellScroll === 0 &&
        metrics.columnTop >= -1 &&
        metrics.columnBottom <= metrics.innerHeight + 1 &&
        metrics.maxY === 0 &&
        metrics.maxShell === 0
      );
    })
    .toBe(true);
}

async function expectAyahInReader(page: Page, ayahNumber: number) {
  const ayah = page.locator(`#ayah-${ayahNumber}`).first();
  await expect(ayah).toBeVisible();
  await expect(ayah).toHaveClass(/is-live/);
  await expect
    .poll(async () => {
      return page.evaluate((number) => {
        const node = document.getElementById(`ayah-${number}`);
        const reader = document.getElementById("main-reader");
        if (!node || !reader) return false;
        const verse = node.getBoundingClientRect();
        const pane = reader.getBoundingClientRect();
        return verse.top >= pane.top - 24 && verse.top < pane.bottom - 8;
      }, ayahNumber);
    })
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await installScrollProbe(page);
});

test("deep link keeps the shell fixed and shows ayah 2 in the pane", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 830 });
  await page.goto("/surah/1#ayah-2", { waitUntil: "domcontentloaded" });
  await expectShellFillsViewport(page);
  await expectAyahInReader(page, 2);
});

test("plain surah load does not scroll the shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/surah/1", { waitUntil: "domcontentloaded" });
  await expectShellFillsViewport(page);
  await expect(page.locator("#ayah-1")).toBeVisible();
});

test("phone hash link keeps the shell in the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/surah/1#ayah-2", { waitUntil: "domcontentloaded" });
  await expectShellFillsViewport(page);
  await expectAyahInReader(page, 2);
});

test("juz hash link scrolls the pane and not the shell", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 830 });
  await page.goto("/juz/1#ayah-2", { waitUntil: "domcontentloaded" });
  await expectShellFillsViewport(page);
  await expectAyahInReader(page, 2);
});

test("back and forward keep the shell put", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 830 });
  await page.goto("/surah/1", { waitUntil: "domcontentloaded" });
  await expectShellFillsViewport(page);
  await page.goto("/surah/2#ayah-3", { waitUntil: "domcontentloaded" });
  await expectShellFillsViewport(page);
  await expectAyahInReader(page, 3);
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/surah\/1$/);
  await expectShellFillsViewport(page);
  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/surah\/2#ayah-3$/);
  await expectShellFillsViewport(page);
  await expectAyahInReader(page, 3);
});
