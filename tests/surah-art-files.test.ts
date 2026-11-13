import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { SURAH_ART } from "../src/lib/surah-art";

/** Read width and height from the first JPEG start-of-frame marker. */
function jpegSize(buf: Buffer): { width: number; height: number } {
  let i = 2;
  while (i < buf.length) {
    assert.equal(buf[i], 0xff, "JPEG marker expected");
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error("No JPEG frame header");
}

test("every surah has header art that is sharp enough for wide and retina screens", () => {
  for (let id = 1; id <= 114; id++) {
    const src = SURAH_ART[id];
    assert.ok(src, `surah ${id} has art`);
    const buf = readFileSync(join(process.cwd(), "public", src));
    const { width, height } = jpegSize(buf);
    assert.equal(width, 2880, `surah ${id} width`);
    assert.ok(width / height > 1.6 && width / height < 6, `surah ${id} aspect ${width}x${height}`);
    assert.ok(buf.length < 300 * 1024, `surah ${id} master is ${buf.length} bytes`);
  }
});
