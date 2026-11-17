import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { normalizeLibrary, type LibrarySnapshot } from "../src/lib/library";
import { resolveIncoming } from "../src/lib/library-resolve";

// The dev server rate-limits /api per client address. Each spec file gets its own
// so one file's requests never throttle another's (live traffic is unaffected).
const CLIENT = { "x-forwarded-for": "e2e-stale-tab-place" };
const STAY_CLIENT = { "x-forwarded-for": "e2e-stay-here" };

/**
 * One account on two devices. The session and the library row are served from
 * this test, with the same merge rule the real /api/library PUT uses, so both
 * browsers share one "server" without a database or a real sign-in.
 */
function fakeAccount() {
  const row: { library: LibrarySnapshot | null; updatedAt: string | null; seq: number } = {
    library: null,
    updatedAt: null,
    seq: 0,
  };
  const session = {
    user: { id: "e2e-user", email: "e2e-stale-tab@example.com", name: "Reader" },
    expires: "2099-01-01T00:00:00.000Z",
  };

  async function attach(context: BrowserContext) {
    await context.route("**/api/auth/session", (route) => route.fulfill({ json: session }));
    await context.route("**/api/library", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ json: { library: row.library, updatedAt: row.updatedAt } });
        return;
      }
      const body = request.postDataJSON() as { library?: unknown; baseUpdatedAt?: unknown };
      const incoming = normalizeLibrary(body.library);
      if (!incoming) {
        await route.fulfill({ status: 400, json: { error: "Invalid library." } });
        return;
      }
      const stored = resolveIncoming(incoming, row.library, row.updatedAt, body.baseUpdatedAt);
      row.seq += 1;
      row.library = stored;
      row.updatedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, row.seq)).toISOString();
      await route.fulfill({
        json: { ok: true, updatedAt: row.updatedAt, library: stored === incoming ? undefined : stored },
      });
    });
  }

  return { row, attach };
}

async function readAyah(page: Page, path: string, ayah: number) {
  await page.goto(path);
  const node = page.locator(`#ayah-${ayah}`).first();
  await expect(node).toBeVisible();
  await node.click();
}

test("a stale desktop tab never overwrites the phone's newer place", async ({ browser }) => {
  const account = fakeAccount();

  // Desktop: reading Al-Baqarah 2:5, then left open and untouched.
  const desktop = await browser.newContext({ ...devices["Desktop Chrome"], extraHTTPHeaders: CLIENT });
  await account.attach(desktop);
  const desk = await desktop.newPage();
  await desk.clock.install();
  await readAyah(desk, "/surah/2#ayah-5", 5);
  await expect.poll(() => account.row.library?.progress.lastVerseKey, { timeout: 20_000 }).toBe("2:5");

  // Phone: moves to Al-Kahf 18:10 a little later.
  const phone = await browser.newContext({ ...devices["Pixel 7"], extraHTTPHeaders: CLIENT });
  await account.attach(phone);
  const mobile = await phone.newPage();
  await readAyah(mobile, "/surah/18#ayah-10", 10);
  await expect.poll(() => account.row.library?.progress.lastVerseKey, { timeout: 20_000 }).toBe("18:10");
  await phone.close();
  const phoneAt = account.row.library?.progress.lastActiveAt ?? 0;

  // An hour later the desktop tab asks whether they are still reading.
  await desk.clock.runFor(16 * 60_000);
  const dialog = desk.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Continue at Al-Kahf 18:10/ })).toBeVisible();

  // They choose to stop, then close anything left and go home.
  await dialog.getByRole("button", { name: "Stop for now" }).click();
  if (await desk.getByRole("dialog").isVisible()) await desk.keyboard.press("Escape");
  await expect(desk.getByRole("dialog")).toHaveCount(0);
  await desk.locator('a[href="/"]').first().click();
  await expect(desk).toHaveURL(/\/$/);
  await desk.clock.runFor(5_000);

  await expect(desk.getByText("Continue reading").first()).toBeVisible();
  await expect(desk.getByText("Ayah 18:10")).toBeVisible();

  // Hiding the tab flushes once more; the server still keeps the phone's place.
  await desk.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await desk.clock.runFor(5_000);
  expect(account.row.library?.progress.lastVerseKey).toBe("18:10");
  expect(account.row.library?.progress.lastActiveAt).toBe(phoneAt);
  await desktop.close();
});

test("closing the other-device offer is not 'Stay here'", async ({ browser }) => {
  const account = fakeAccount();
  const desktop = await browser.newContext({ ...devices["Desktop Chrome"], extraHTTPHeaders: CLIENT });
  await account.attach(desktop);
  const desk = await desktop.newPage();
  await desk.clock.install();
  await readAyah(desk, "/surah/2#ayah-5", 5);
  await expect.poll(() => account.row.library?.progress.lastVerseKey, { timeout: 20_000 }).toBe("2:5");

  const phone = await browser.newContext({ ...devices["Pixel 7"], extraHTTPHeaders: CLIENT });
  await account.attach(phone);
  const mobile = await phone.newPage();
  await readAyah(mobile, "/surah/18#ayah-10", 10);
  await expect.poll(() => account.row.library?.progress.lastVerseKey, { timeout: 20_000 }).toBe("18:10");
  await phone.close();

  // Back on the desktop after a while: the pull brings the newer place and offers it.
  await desk.clock.runFor(60_000);
  await desk.mouse.move(200, 300);
  await desk.mouse.move(260, 340);
  const dialog = desk.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: /Continue at Al-Kahf 18:10/ })).toBeVisible();
  await desk.keyboard.press("Escape");
  await expect(desk.getByRole("dialog")).toHaveCount(0);
  await desk.clock.runFor(5_000);
  await desk.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await desk.clock.runFor(5_000);
  expect(account.row.library?.progress.lastVerseKey).toBe("18:10");
  await desktop.close();
});

test("'Stay here' on the phone sticks: no re-offer of the same place", async ({ browser }) => {
  const account = fakeAccount();

  // Desktop reads Al-Muzzammil 73:10.
  const desktop = await browser.newContext({ ...devices["Desktop Chrome"], extraHTTPHeaders: STAY_CLIENT });
  await account.attach(desktop);
  const desk = await desktop.newPage();
  await readAyah(desk, "/surah/73#ayah-10", 10);
  await expect.poll(() => account.row.library?.progress.lastVerseKey, { timeout: 20_000 }).toBe("73:10");

  // Phone opens Al-Hijr and is offered 73:10.
  const phone = await browser.newContext({ ...devices["iPhone 14"], extraHTTPHeaders: STAY_CLIENT });
  await account.attach(phone);
  const mobile = await phone.newPage();
  // The phone's clock runs five minutes behind the desktop's: "Stay here" must
  // still win over the desktop's (later-stamped) place.
  await mobile.clock.setSystemTime(Date.now() - 5 * 60_000);
  await mobile.goto("/surah/15#ayah-1");
  const offer = mobile.getByRole("dialog");
  await expect(offer.getByRole("button", { name: /Continue at Al-Muzzammil 73:10/ })).toBeVisible({ timeout: 20_000 });
  await offer.getByRole("button", { name: "Stay here" }).click();
  await expect(mobile.getByRole("dialog")).toHaveCount(0);

  // The server now holds this page as the place.
  await expect.poll(() => account.row.library?.progress.lastVerseKey, { timeout: 20_000 }).toMatch(/^15:/);

  // Focus, visibility, a page change and a reload never bring the same offer back.
  for (let round = 0; round < 3; round += 1) {
    await mobile.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("qurandeck:library-pull"));
    });
    await mobile.waitForTimeout(1_500);
    await expect(mobile.getByRole("dialog")).toHaveCount(0);
  }
  await mobile.waitForTimeout(11_000);
  await mobile.goto("/surah/15#ayah-3");
  await mobile.waitForTimeout(4_000);
  await expect(mobile.getByRole("dialog")).toHaveCount(0);
  await mobile.reload();
  await mobile.waitForTimeout(4_000);
  await expect(mobile.getByRole("dialog")).toHaveCount(0);
  expect(account.row.library?.progress.lastVerseKey).toMatch(/^15:/);

  // The desktop, back after a while, is offered the phone's place.
  await desk.waitForTimeout(11_000);
  await desk.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("qurandeck:library-pull"));
  });
  await expect(desk.getByRole("dialog").getByRole("button", { name: /Continue at Al-Hijr 15:/ })).toBeVisible({ timeout: 20_000 });
  await phone.close();
  await desktop.close();
});
