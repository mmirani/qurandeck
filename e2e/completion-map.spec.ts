import { devices, expect, test, type Page } from "@playwright/test";

// The dev server rate-limits /api per client address. Each spec file gets its own
// so one file's requests never throttle another's (live traffic is unaffected).
const CLIENT = { "x-forwarded-for": "e2e-completion-map" };
test.use({ extraHTTPHeaders: CLIENT });

const range = (chapter: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${chapter}:${from + i}`);

/** A demo reader: Al-Fatihah finished, Al-Baqarah 1–80, the last three surahs finished. */
const versesRead = [...range(1, 1, 7), ...range(2, 1, 80), "2:286", ...range(112, 1, 4), ...range(113, 1, 5), ...range(114, 1, 6)];

async function seed(page: Page, theme = "iris") {
  await page.addInitScript(
    ({ verses, nextTheme }) => {
      localStorage.setItem(
        "al-mushaf-session",
        JSON.stringify({ id: "e2e-completion", username: "e2e", displayName: "Amina", provider: "local" }),
      );
      localStorage.setItem("al-mushaf-preferences", JSON.stringify({ theme: nextTheme, showIntroduction: false }));
      localStorage.setItem(
        "al-mushaf-progress",
        JSON.stringify({
          versesRead: verses,
          // 2 was recorded by older builds for reaching 2:286 alone; it must not count.
          surahsRead: [1, 2, 112, 113, 114],
          surahCompletions: {},
          lastReadDay: null,
          streak: 0,
          totalSeconds: 0,
          verseVisits: {},
          lastVerseKey: "2:80",
          lastActiveAt: null,
          daily: {},
          historySince: null,
        }),
      );
    },
    { verses: versesRead, nextTheme: theme },
  );
  await page.route(/\/api\/(usage|feedback)\b/, (route) => route.abort());
}

async function openMap(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const map = page.getByTestId("completion-map");
  await expect(map).toBeVisible({ timeout: 60_000 });
  await map.scrollIntoViewIfNeeded();
  return map;
}

const viewport = (page: Page) => page.getByTestId("completion-viewport").first();

test("desktop: wheel zoom on the cursor, drag to pan, click a surah, go read what is left", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page);
  const map = await openMap(page);
  await expect(map.getByTestId("completion-summary")).toContainText("4 of 114 surahs finished");

  const vp = viewport(page);
  await expect(vp).toHaveAttribute("data-level", "quran");
  await expect(vp.locator("[data-index]")).toHaveCount(160);

  // Ctrl + wheel near the start zooms in, anchored on the cursor.
  const box = (await vp.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height / 2);
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -120);
    await page.keyboard.up("Control");
    await page.waitForTimeout(50);
  }
  await expect(vp).toHaveAttribute("data-level", "surah");
  await expect(page.getByTestId("completion-overview")).toBeVisible();

  // Drag left pans right along the Quran.
  const before = Number(await vp.getAttribute("data-start"));
  await page.mouse.move(box.x + 600, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 450, box.y + 30, { steps: 6 });
  await page.mouse.move(box.x + 300, box.y + 30, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number(await vp.getAttribute("data-start"))).toBeGreaterThan(before);

  // A plain vertical wheel still scrolls the page.
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.move(box.x + 300, box.y + 30);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);

  // Back to the start at surah level and open Al-Baqarah.
  await page.getByRole("button", { name: "Whole Quran", exact: true }).click();
  await page.getByRole("button", { name: "Surahs", exact: true }).click();
  await expect(vp).toHaveAttribute("data-level", "surah");
  const baqarah = vp.locator('[data-index="1"]');
  await baqarah.hover();
  await expect(page.getByTestId("completion-tooltip")).toContainText("Al-Baqarah, 286 ayahs, 28% read");
  await baqarah.click();
  const popover = page.getByTestId("completion-popover");
  await expect(popover).toContainText("Surah 2 · 81 of 286 read");
  await expect(popover.getByRole("button", { name: "Read the 205 left" })).toBeFocused();
  await popover.getByRole("button", { name: "Read the 205 left" }).click();
  await expect(page).toHaveURL(/\/surah\/2(#ayah-81)?/);
});

test("desktop: deep zoom shows each ayah, read ones lit", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, "obsidian");
  await openMap(page);
  const vp = viewport(page);
  await page.getByRole("button", { name: "Ayahs", exact: true }).click();
  await expect(vp).toHaveAttribute("data-level", "ayah");
  await expect(vp.getByRole("button", { name: "Al-Fatihah 1:1, read" })).toBeVisible();
  // Only a window of ayahs is on the page, never all 6,236.
  expect(await vp.locator("[data-index]").count()).toBeLessThan(400);
  // Zoom in to the limit with +.
  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  for (let i = 0; i < 6 && (await zoomIn.isEnabled()); i += 1) {
    try {
      await zoomIn.click({ timeout: 2_000 });
    } catch {
      break;
    }
    await page.waitForTimeout(260);
  }
  await expect(zoomIn).toBeDisabled();
  const cell = vp.locator('[data-index="0"]');
  expect((await cell.boundingBox())!.width).toBeGreaterThanOrEqual(44);
});

test("keyboard: arrows move, Home/End jump, + zooms, Enter opens, Escape closes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page);
  await openMap(page);
  const vp = viewport(page);
  await page.getByRole("button", { name: "Surahs", exact: true }).click();
  await expect(vp).toHaveAttribute("data-level", "surah");

  // Exactly one sliver is in the tab order (roving tabindex).
  await expect(vp.locator('[data-index][tabindex="0"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Zoom in" }).focus();
  await page.keyboard.press("Tab");
  await expect(vp.locator('[data-index="0"]')).toBeFocused();
  await expect(vp.locator('[data-index="0"]')).toHaveAttribute("aria-label", "Al-Fatihah, 7 ayahs, 100% read, finished");

  await page.keyboard.press("ArrowRight");
  await expect(vp.locator('[data-index="1"]')).toBeFocused();
  await page.keyboard.press("End");
  await expect(vp.locator('[data-index="113"]')).toBeFocused();
  await expect(vp.locator('[data-index="113"]')).toHaveAttribute("aria-label", /An-Nas, 6 ayahs, 100% read, finished/);
  await page.keyboard.press("Home");
  await expect(vp.locator('[data-index="0"]')).toBeFocused();

  // + zooms on the focused surah until each ayah is its own sliver; focus stays on Al-Fatihah.
  for (let i = 0; i < 6 && (await vp.getAttribute("data-level")) !== "ayah"; i += 1) {
    await page.keyboard.press("+");
    await page.waitForTimeout(260);
  }
  await expect(vp).toHaveAttribute("data-level", "ayah");
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", /^Al-Fatihah 1:\d, read$/);

  await page.keyboard.press("Enter");
  const popover = page.getByTestId("completion-popover");
  await expect(popover).toBeVisible();
  await expect(popover.getByRole("button", { name: /^Open 1:\d$/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", /^Al-Fatihah 1:\d, read$/);
});

test.describe("phone", () => {
  // Chromium with the iPhone 14 screen, touch and user agent (the suite runs one browser).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...iPhone14 } = devices["iPhone 14"];
  test.use({ ...iPhone14, extraHTTPHeaders: CLIENT });

  test("tap opens the explorer; swipe, pinch, tap a sliver, read", async ({ page }) => {
    await seed(page);
    await openMap(page);
    await page.getByTestId("completion-preview").tap();
    const dialog = page.getByRole("dialog", { name: "Your map of the Quran" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" }).first()).toBeFocused();

    const vp = dialog.getByTestId("completion-viewport");
    const box = (await vp.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const y = box.y + box.height / 2;
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", points: { x: number; y: number }[]) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map((p, id) => ({ ...p, id })) });

    // Pinch out to zoom in.
    const mid = box.x + box.width / 2;
    await touch("touchStart", [{ x: mid - 20, y }, { x: mid + 20, y }]);
    for (let step = 1; step <= 8; step += 1) await touch("touchMove", [{ x: mid - 20 - step * 18, y }, { x: mid + 20 + step * 18, y }]);
    await touch("touchEnd", []);
    await expect.poll(async () => Number(await vp.getAttribute("data-ppa"))).toBeGreaterThan(0.3);

    // Swipe left moves along the Quran.
    const before = Number(await vp.getAttribute("data-start"));
    await touch("touchStart", [{ x: box.x + box.width - 40, y }]);
    for (let step = 1; step <= 8; step += 1) await touch("touchMove", [{ x: box.x + box.width - 40 - step * 25, y }]);
    await touch("touchEnd", []);
    await expect.poll(async () => Number(await vp.getAttribute("data-start"))).toBeGreaterThan(before);
    // Let the swipe's glide come to rest (a tap during a fling is eaten by headless Chromium).
    let last = "";
    await expect
      .poll(async () => {
        const now = await vp.getAttribute("data-start");
        const settled = now === last;
        last = now ?? "";
        return settled;
      }, { intervals: [200] })
      .toBe(true);

    // Ayah level: every cell is a 44 px+ target.
    await dialog.getByRole("button", { name: "Whole Quran", exact: true }).tap();
    await dialog.getByRole("button", { name: "Ayahs", exact: true }).tap();
    await expect(vp).toHaveAttribute("data-level", "ayah");
    await expect.poll(async () => Number(await vp.getAttribute("data-ppa"))).toBeGreaterThanOrEqual(46);
    const first = (await vp.locator('[data-index][tabindex="0"]').boundingBox())!;
    expect(first.width + 2).toBeGreaterThanOrEqual(44);
    expect(first.height).toBeGreaterThanOrEqual(44);

    await dialog.getByRole("button", { name: "Surahs", exact: true }).tap();
    await expect(vp).toHaveAttribute("data-level", "surah");
    // Al-Baqarah is wider than the phone; tap its visible start.
    await vp.locator('[data-index="1"]').tap({ position: { x: 30, y: 30 } });
    const popover = dialog.getByTestId("completion-popover");
    await expect(popover).toContainText("81 of 286 read");
    for (const button of await popover.getByRole("button").all()) {
      const b = (await button.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
    await popover.getByRole("button", { name: "Read the 205 left" }).tap();
    await expect(page).toHaveURL(/\/surah\/2/);
    await expect(page.getByRole("dialog", { name: "Your map of the Quran" })).toHaveCount(0);
  });

  test("Escape and Close leave the explorer and the page scrolls again", async ({ page }) => {
    await seed(page);
    await openMap(page);
    await page.getByTestId("completion-preview").tap();
    const dialog = page.getByRole("dialog", { name: "Your map of the Quran" });
    await expect(dialog).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    await page.getByTestId("completion-preview").tap();
    await dialog.getByRole("button", { name: "Close" }).first().tap();
    await expect(dialog).toHaveCount(0);
  });

  test("the color key wraps under the zoom controls and touch targets stay 44 px", async ({ page }) => {
    await seed(page, "aurora");
    await openMap(page);
    await expect(page.getByTestId("completion-preview")).toBeVisible();
    await expect(page.getByTestId("completion-map").getByTestId("completion-key")).toHaveCount(0);
    await page.getByTestId("completion-preview").tap();
    const dialog = page.getByRole("dialog", { name: "Your map of the Quran" });
    const key = dialog.getByTestId("completion-key");
    await expect(key).toBeVisible();
    await expect(key).toContainText("Not started");
    await expect(key).toContainText("Finished");

    const seg = dialog.getByRole("group", { name: "Zoom level" });
    const zoomIn = dialog.getByRole("button", { name: "Zoom in" });
    const zoomOut = dialog.getByRole("button", { name: "Zoom out" });
    const keyBox = (await key.boundingBox())!;
    const segBox = (await seg.boundingBox())!;
    const zoomBox = (await zoomIn.boundingBox())!;
    expect(keyBox.y).toBeGreaterThan(segBox.y + segBox.height - 8);
    expect(Math.abs(zoomBox.y - segBox.y)).toBeLessThan(12);
    for (const button of [zoomIn, zoomOut, ...await seg.getByRole("button").all()]) {
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });
});

const CONTRAST_THEMES = [
  "manuscript", "emerald", "ottoman", "ivory", "iris", "pastels", "blush", "sepia", "contrast",
  "aurora", "obsidian", "midnight", "slate", "forest", "amethyst", "rose", "cyan",
] as const;

async function cssColor(page: Page, token: string, host = "body") {
  return page.evaluate(
    ({ name, hostSel }) => {
      const el = document.createElement("span");
      el.style.color = `var(${name})`;
      (document.querySelector(hostSel) ?? document.body).append(el);
      const value = getComputedStyle(el).color;
      el.remove();
      return value;
    },
    { name: token, hostSel: host },
  );
}

function parseRgb(value: string) {
  const rgb = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(value);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] as const;
  const srgb = /color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/.exec(value);
  if (srgb) {
    return [Math.round(Number(srgb[1]) * 255), Math.round(Number(srgb[2]) * 255), Math.round(Number(srgb[3]) * 255)] as const;
  }
  throw new Error(`not a color: ${value}`);
}

function contrastRatio(a: readonly [number, number, number], b: readonly [number, number, number]) {
  const lum = (rgb: readonly [number, number, number]) => {
    const to = (channel: number) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * to(rgb[0]) + 0.7152 * to(rgb[1]) + 0.0722 * to(rgb[2]);
  };
  const l1 = lum(a);
  const l2 = lum(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

test("desktop: the color key is visible and labels stay AA across themes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, "iris");
  const map = await openMap(page);
  const key = map.getByTestId("completion-key");
  await expect(key).toBeVisible();
  await expect(key).toContainText("Not started");
  await expect(key).toContainText("In progress");
  await expect(key).toContainText("Finished");

  const failures: string[] = [];
  for (const theme of CONTRAST_THEMES) {
    await page.evaluate((next) => {
      document.documentElement.dataset.theme = next;
    }, theme);
    const inkSoft = parseRgb(await cssColor(page, "--ink-soft"));
    const ink = parseRgb(await cssColor(page, "--ink"));
    const surface = parseRgb(await cssColor(page, "--surface"));
    const base = parseRgb(await cssColor(page, "--map-base"));
    // Labels on the map read the panel's own ink, whatever the theme.
    const panel = '[data-testid="completion-map"] .completion-panel-ink';
    const panelInk = parseRgb(await cssColor(page, "--ink", panel));
    const panelInkSoft = parseRgb(await cssColor(page, "--ink-soft", panel));
    const pairs: [string, typeof ink, typeof surface][] = [
      ["ink-soft / surface", inkSoft, surface],
      ["ink / surface", ink, surface],
      ["panel ink-soft / map-base", panelInkSoft, base],
      ["panel ink / map-base", panelInk, base],
    ];
    for (const [name, fg, bg] of pairs) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < 4.5) failures.push(`${theme} ${name}: ${ratio.toFixed(2)}:1`);
    }
  }
  expect(failures, failures.join("; ")).toEqual([]);
});


test.describe("phone landscape", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...iPhone14 } = devices["iPhone 14"];
  test.use({ ...iPhone14, viewport: { width: 844, height: 390 }, extraHTTPHeaders: CLIENT });

  for (const theme of ["aurora", "iris"]) {
    test(`${theme}: the sliver popover opens above the bar, fully on screen, no scrolling`, async ({ page }) => {
      await seed(page, theme);
      await openMap(page);
      await page.getByTestId("completion-preview").tap();
      const dialog = page.getByRole("dialog", { name: "Your map of the Quran" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Surahs", exact: true }).tap();
      const vp = dialog.getByTestId("completion-viewport");
      await expect(vp).toHaveAttribute("data-level", "surah");

      // Tap Al-Baqarah where it already shows, with a raw touch so nothing scrolls first.
      const scrollBefore = await dialog.evaluate((el) => el.scrollTop);
      const bar = (await vp.boundingBox())!;
      const baqarah = (await vp.locator('[data-index="1"]').boundingBox())!;
      const x = Math.max(baqarah.x, 0) + 30;
      const y = bar.y + 40;
      expect(y).toBeLessThan(390);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 0 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

      const popover = dialog.getByTestId("completion-popover");
      await expect(popover).toContainText("81 of 286 read");
      await expect(popover).toHaveAttribute("data-side", "above");
      await expect(popover.getByRole("button", { name: "Read the 205 left" })).toBeFocused();
      expect(await dialog.evaluate((el) => el.scrollTop)).toBe(scrollBefore);

      const box = (await popover.boundingBox())!;
      const barNow = (await vp.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(844);
      expect(box.y + box.height).toBeLessThanOrEqual(390);
      // Sits above the bar and never covers the tapped sliver.
      expect(box.y + box.height).toBeLessThanOrEqual(barNow.y);
      for (const button of await popover.getByRole("button").all()) {
        const b = (await button.boundingBox())!;
        expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.y + b.height).toBeLessThanOrEqual(390);
      }

      await page.keyboard.press("Escape");
      await expect(popover).toHaveCount(0);
      await expect(dialog).toBeVisible();
      await expect(page.locator(":focus")).toHaveAttribute("data-index", "1");
    });
  }
});

test("desktop: the explorer popover opens above the bar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seed(page);
  const map = await openMap(page);
  await map.getByRole("button", { name: "Full screen" }).click();
  const dialog = page.getByRole("dialog", { name: "Your map of the Quran" });
  await dialog.getByRole("button", { name: "Surahs", exact: true }).click();
  const vp = dialog.getByTestId("completion-viewport");
  await expect(vp).toHaveAttribute("data-level", "surah");
  await vp.locator('[data-index="1"]').click({ position: { x: 30, y: 30 } });
  const popover = dialog.getByTestId("completion-popover");
  await expect(popover).toHaveAttribute("data-side", "above");
  const box = (await popover.boundingBox())!;
  const bar = (await vp.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(bar.y);
});

test("desktop: the map is the same dark panel on light and dark themes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page, "iris");
  const map = await openMap(page);
  const panel = map.getByTestId("completion-viewport");
  const bg = async () => panel.evaluate((el) => getComputedStyle(el).backgroundImage);
  const iris = await bg();
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "aurora";
  });
  expect(await bg()).toBe(iris);
  // Day theme: finished glows brighter than the track behind it.
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "sepia";
  });
  const lum = (rgb: readonly [number, number, number]) => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  expect(lum(parseRgb(await cssColor(page, "--map-done")))).toBeGreaterThan(lum(parseRgb(await cssColor(page, "--map-base"))) + 100);
});
