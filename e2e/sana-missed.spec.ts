import { expect, test } from "@playwright/test";

test.describe("Sana missed-command shapes", () => {
  test("accepts a safe shape and no-ops without the table", async ({ request }) => {
    const ok = await request.post("/api/sana/missed", { data: { shape: "go to page [n]" } });
    expect(ok.status()).toBe(204);
  });

  test("refuses raw text or extra fields", async ({ request }) => {
    const raw = await request.post("/api/sana/missed", { data: { shape: "remind amina at 5" } });
    expect(raw.status()).toBe(400);
    const extra = await request.post("/api/sana/missed", { data: { shape: "go to page [n]", text: "go to page 5" } });
    expect(extra.status()).toBe(400);
  });

  test("hides the admin list from people who are not admins", async ({ page }) => {
    const response = await page.goto("/admin/sana");
    expect(response?.status()).toBe(404);
  });
});
