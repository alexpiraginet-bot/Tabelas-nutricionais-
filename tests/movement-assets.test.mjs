import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const publicDir = path.resolve("public/movimento");

const sceneAssets = [
  "experience-training.jpg",
  "experience-mobility.jpg",
  "experience-breakfast.jpg",
  "experience-kids.jpg",
  "experience-recovery.jpg",
  "experience-backdrop.jpg",
];

function readJpegSize(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, "asset should be a JPEG");

  for (let offset = 2; offset < buffer.length;) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }

  throw new Error("JPEG dimensions not found");
}

test("immersive Movimento scenes are production-sized raster assets", async () => {
  for (const filename of sceneAssets) {
    const assetPath = path.join(publicDir, filename);
    const metadata = readJpegSize(await readFile(assetPath));

    assert.ok(metadata.width >= 1400, `${filename} should be at least 1400px wide`);
    assert.ok(metadata.height >= 780, `${filename} should be at least 780px tall`);
  }
});

test("shirt reference is large enough for the interactive sponsor mockup", async () => {
  const assetPath = path.join(publicDir, "camiseta-referencia.jpg");
  const metadata = readJpegSize(await readFile(assetPath));

  assert.ok(metadata.width >= 1000);
  assert.ok(metadata.height >= 1000);
});
