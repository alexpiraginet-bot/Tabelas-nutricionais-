import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url);
const BASE_HTML = `<!doctype html><html><head>
<title>Base</title>
<meta name="description" content="Base">
<meta property="og:title" content="Base">
<meta property="og:description" content="Base">
<meta property="og:url" content="https://bentogelateria.com">
<meta property="og:image" content="https://bentogelateria.com/base.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:title" content="Base">
<meta name="twitter:description" content="Base">
<meta name="twitter:image" content="https://bentogelateria.com/base.jpg">
<link rel="canonical" href="https://bentogelateria.com">
</head><body><div id="root"></div></body></html>`;

test("WhatsApp receives a dedicated image and metadata for both Movement links", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "bento-movement-preview-"));
  try {
    mkdirSync(join(fixture, "dist"), { recursive: true });
    writeFileSync(join(fixture, "dist", "index.html"), BASE_HTML);

    execFileSync(process.execPath, ["scripts/generate-share-pages.mjs"], {
      cwd: ROOT,
      env: { ...process.env, BENTO_SHARE_ROOT: fixture },
      stdio: "pipe",
    });

    const influencerFile = join(fixture, "dist", "movimento", "index.html");
    const partnerFile = join(fixture, "dist", "movimento", "parceiros", "index.html");
    assert.equal(existsSync(influencerFile), true, "missing influencer share page");
    assert.equal(existsSync(partnerFile), true, "missing partner share page");

    const influencer = readFileSync(influencerFile, "utf8");
    const partner = readFileSync(partnerFile, "utf8");
    assert.match(influencer, /og:title" content="Bentô em Movimento — Convite 2026"/);
    assert.match(influencer, /og:image" content="https:\/\/bentogelateria\.com\/movimento\/og-influenciadoras\.jpg"/);
    assert.match(influencer, /og:url" content="https:\/\/bentogelateria\.com\/movimento"/);
    assert.match(partner, /og:title" content="Bentô em Movimento — Parcerias"/);
    assert.match(partner, /og:image" content="https:\/\/bentogelateria\.com\/movimento\/og-parceiros\.jpg"/);
    assert.match(partner, /og:url" content="https:\/\/bentogelateria\.com\/movimento\/parceiros"/);

    const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
    const rewrites = config.rewrites ?? [];
    assert.deepEqual(rewrites.find(({ source }) => source === "/movimento")?.destination, "/movimento/index.html");
    assert.deepEqual(rewrites.find(({ source }) => source === "/movimento/parceiros")?.destination, "/movimento/parceiros/index.html");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
