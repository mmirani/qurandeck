import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORK_TITLE } from "../src/lib/brand";
import { HOME_ARABIC, HOME_SHARE, renderHomeShareImage, renderSurahShareImage, shareImage } from "../src/lib/og/share-image";
import { arabicSvg } from "../src/lib/og/naskh";

function pngSize(buf: Buffer) {
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function pngOf(response: Response) {
  const buf = Buffer.from(await response.arrayBuffer());
  const size = pngSize(buf);
  assert.deepEqual(size, { width: 1200, height: 630 });
  assert.ok(buf.length < 300 * 1024, `png is ${buf.length} bytes`);
  return buf;
}

describe("share card copy", () => {
  it("keeps the home promise and the Quran's Arabic name", () => {
    assert.equal(HOME_SHARE.title, "A personal mushaf");
    assert.equal(HOME_SHARE.arabic, "القرآن الكريم");
    assert.equal(HOME_ARABIC, HOME_SHARE.arabic);
    assert.equal(HOME_SHARE.subtitle, `Free, private reading for ${WORK_TITLE}.`);
    const copy = `${HOME_SHARE.title} ${HOME_SHARE.subtitle}`;
    assert.equal(/\bAI\b|advert|ads\b/i.test(copy), false);
  });
});

describe("share card images", () => {
  it("shapes the home Arabic line as a Naskh drawing", async () => {
    const mark = await arabicSvg(HOME_ARABIC, "#5729a7", 84);
    assert.ok(mark);
    assert.ok(mark.width > 200 && mark.width < 1000);
    assert.ok(mark.height > 40);
    assert.equal(mark.src.startsWith("data:image/svg+xml;base64,"), true);
    const svg = Buffer.from(mark.src.slice("data:image/svg+xml;base64,".length), "base64").toString("utf8");
    assert.equal(svg.includes('fill="#5729a7"'), true);
    assert.ok(svg.includes("<path "), "naskh outline is present");
  });

  it("renders the home card at 1200x630 under 300KB", async () => {
    await pngOf(await renderHomeShareImage());
  });

  it("renders a surah card with its name, number, and ayah count", async () => {
    await pngOf(
      await shareImage({
        badge: "67",
        title: "Al-Mulk",
        arabic: "الملك",
        subtitle: "The Sovereignty · 30 ayahs",
      }),
    );
  });

  it("renders an unknown surah without fetching a chapter", async () => {
    await pngOf(await renderSurahShareImage("0"));
  });
});
