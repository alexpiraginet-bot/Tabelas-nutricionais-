import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { createMovementPreviewHandler } from "../api/movimento-preview.js";

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
<link rel="preload" as="image" href="/bento-logo.webp" fetchpriority="high">
<script>try { localStorage.getItem("bento:destaque"); } catch (error) {}</script>
</head><body><div id="root"></div></body></html>`;

const VALID_TOKEN = "invite_abcdefghijklmnopqrstuvwxyz_2026";
const PREVIEW_ENV = { SUPABASE_URL: "https://project.supabase.co/rest/v1", SUPABASE_SERVICE_ROLE_KEY: "test-service-key" };

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function previewResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    send(value) { this.body = value; return this; },
    end(value = "") { this.body = value; return this; },
  };
}

function generateFixture(baseHtml = BASE_HTML) {
  const fixture = mkdtempSync(join(tmpdir(), "bento-movement-preview-"));
  mkdirSync(join(fixture, "dist"), { recursive: true });
  writeFileSync(join(fixture, "dist", "index.html"), baseHtml);

  execFileSync(process.execPath, ["scripts/generate-share-pages.mjs"], {
    cwd: ROOT,
    env: { ...process.env, BENTO_SHARE_ROOT: fixture },
    stdio: "pipe",
  });

  return fixture;
}

test("WhatsApp receives first-anniversary metadata and only the active generic hero preload", () => {
  const fixture = generateFixture();
  try {
    const influencer = readFileSync(join(fixture, "dist", "movimento", "index.html"), "utf8");
    const partner = readFileSync(join(fixture, "dist", "movimento", "parceiros", "index.html"), "utf8");

    assert.match(influencer, /og:title" content="1º aniversário Bentô Gelatos — Convite"/);
    assert.match(influencer, /og:description" content="[^\"]*12 de setembro de 2026[^\"]*Le Buffet Lounge/);
    assert.match(influencer, /og:image" content="https:\/\/bentogelateria\.com\/movimento\/og-influenciadoras\.jpg"/);
    assert.match(influencer, /og:url" content="https:\/\/bentogelateria\.com\/movimento"/);
    assert.match(partner, /og:title" content="1º aniversário Bentô Gelatos — Parcerias"/);
    assert.match(partner, /og:description" content="[^\"]*12 de setembro de 2026[^\"]*Le Buffet Lounge/);
    assert.match(partner, /og:image" content="https:\/\/bentogelateria\.com\/movimento\/og-parceiros\.jpg"/);
    assert.match(partner, /og:url" content="https:\/\/bentogelateria\.com\/movimento\/parceiros"/);

    for (const [html, expectedHero, rejectedHero] of [
      [influencer, "INF-HERO", "PAR-HERO"],
      [partner, "PAR-HERO", "INF-HERO"],
    ]) {
      assert.doesNotMatch(html, /bento-logo\.webp|bento:destaque/);
      const preloads = [...html.matchAll(/<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>/g)].map(([tag]) => tag);
      assert.equal(preloads.length, 2, "portrait and landscape preloads must reference one active hero family");
      assert.ok(preloads.every((tag) => tag.includes(expectedHero)));
      assert.ok(preloads.every((tag) => !tag.includes(rejectedHero)));
    }

    assert.doesNotMatch(influencer + partner, /projeto de 12 meses|plataforma anual|projeto de um ano/i);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("share page generation fails closed when the base document no longer exposes required metadata", () => {
  assert.throws(
    () => generateFixture(BASE_HTML.replace('<meta property="og:title" content="Base">', "")),
    /meta og:title.*não encontrada/i,
  );
});

test("personal invitation shell is privacy-safe and never guesses the audience hero", () => {
  const fixture = generateFixture();
  try {
    const personalFile = join(fixture, "dist", "movimento", "convite", "index.html");
    assert.equal(existsSync(personalFile), true, "missing privacy-safe personal share page");

    const personal = readFileSync(personalFile, "utf8");
    assert.match(personal, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(personal, /<meta name="referrer" content="no-referrer">/);
    assert.match(personal, /og:title" content="Convite pessoal — 1º aniversário Bentô Gelatos"/);
    assert.match(personal, /og:url" content="https:\/\/bentogelateria\.com\/movimento"/);
    assert.match(personal, /canonical" href="https:\/\/bentogelateria\.com\/movimento"/);
    assert.doesNotMatch(personal, /rel="preload"[^>]*as="image"/);
    assert.doesNotMatch(personal, /bento-logo\.webp|bento:destaque|INF-HERO|PAR-HERO/);

    const forbiddenIdentity = ["TOKEN-SEGREDO", "Ana Exemplo", "Empresa Exemplo", "Responsável Exemplo"];
    for (const value of forbiddenIdentity) assert.doesNotMatch(personal, new RegExp(value, "i"));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("personal preview uses the guest first name without marking the invitation as opened", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return response([{
      id: "84ccf9b6-b170-4212-9f3d-1ce53901ca18",
      display_name: "Raíssa Nunes",
      recipient_name: "Raíssa Nunes",
      company_name: null,
      audience_type: "influencer",
      status: "sent",
      opened_at: null,
      expires_at: "2026-09-20T12:00:00.000Z",
    }]);
  };
  const out = previewResponse();
  await createMovementPreviewHandler({
    env: PREVIEW_ENV,
    fetchImpl,
    now: () => new Date("2026-08-12T12:00:00.000Z"),
    readShell: async () => BASE_HTML,
  })({ method: "GET", query: { token: VALID_TOKEN } }, out);

  assert.equal(out.statusCode, 200);
  assert.match(out.headers["Content-Type"], /text\/html/);
  assert.equal(out.headers["Cache-Control"], "private, no-store, max-age=0");
  assert.equal(out.headers["X-Robots-Tag"], "noindex, nofollow");
  assert.equal(out.headers["Referrer-Policy"], "no-referrer");
  assert.match(out.body, /og:title" content="Raíssa, este convite é seu — Bentô Gelatos"/);
  assert.match(out.body, /twitter:title" content="Raíssa, este convite é seu — Bentô Gelatos"/);
  assert.match(out.body, /og:image" content="https:\/\/bentogelateria\.com\/movimento\/og-influenciadoras\.jpg"/);
  assert.match(out.body, /og:url" content="https:\/\/bentogelateria\.com\/movimento"/);
  assert.doesNotMatch(out.body, new RegExp(VALID_TOKEN));
  assert.equal(calls.some(({ options }) => options.method === "PATCH"), false);
});

test("personal preview uses the full partner company and falls back safely for an invalid invite", async () => {
  const partner = previewResponse();
  await createMovementPreviewHandler({
    env: PREVIEW_ENV,
    fetchImpl: async () => response([{
      id: "fa4ce3a4-bdb7-4612-b9d8-4959099d2684",
      display_name: "Studio Aurora",
      recipient_name: "Bia",
      company_name: "Studio Aurora",
      audience_type: "partner",
      status: "sent",
      opened_at: null,
      expires_at: "2026-09-20T12:00:00.000Z",
    }]),
    now: () => new Date("2026-08-12T12:00:00.000Z"),
    readShell: async () => BASE_HTML,
  })({ method: "GET", query: { token: VALID_TOKEN } }, partner);
  assert.match(partner.body, /og:title" content="Studio Aurora, esta proposta é para vocês — Bentô Gelatos"/);
  assert.match(partner.body, /og:image" content="https:\/\/bentogelateria\.com\/movimento\/og-parceiros\.jpg"/);

  const invalid = previewResponse();
  await createMovementPreviewHandler({
    env: PREVIEW_ENV,
    fetchImpl: async () => response([]),
    now: () => new Date("2026-08-12T12:00:00.000Z"),
    readShell: async () => BASE_HTML,
  })({ method: "GET", query: { token: VALID_TOKEN } }, invalid);
  assert.equal(invalid.body, BASE_HTML);
  assert.doesNotMatch(invalid.body, /Studio Aurora|Raíssa/);
});

test("Vercel resolves personal invitations before generic Movement routes with private headers", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const rewrites = config.rewrites ?? [];
  const personalIndex = rewrites.findIndex(({ source }) => source === "/movimento/convite/:token");
  const personalBaseIndex = rewrites.findIndex(({ source }) => source === "/movimento/convite");
  const partnerIndex = rewrites.findIndex(({ source }) => source === "/movimento/parceiros");
  const influencerIndex = rewrites.findIndex(({ source }) => source === "/movimento");

  assert.ok(personalIndex >= 0, "missing personal invitation rewrite");
  assert.ok(personalBaseIndex >= 0, "missing tokenless invitation rewrite");
  assert.equal(rewrites[personalIndex].destination, "/api/movimento-preview?token=:token");
  assert.equal(rewrites[personalBaseIndex].destination, "/movimento/convite/index.html");
  assert.ok(personalIndex < partnerIndex && personalIndex < influencerIndex, "personal rewrite must precede generic Movement rewrites");
  assert.ok(personalBaseIndex < partnerIndex && personalBaseIndex < influencerIndex, "tokenless rewrite must precede generic Movement rewrites");
  assert.equal(rewrites.find(({ source }) => source === "/movimento/parceiros")?.destination, "/movimento/parceiros/index.html");
  assert.equal(rewrites.find(({ source }) => source === "/movimento")?.destination, "/movimento/index.html");
  assert.equal(config.functions?.["api/movimento-preview.js"]?.includeFiles, "dist/movimento/convite/index.html");

  const personalHeaders = (config.headers ?? []).find(({ source }) => source === "/movimento/convite(.*)")?.headers ?? [];
  const headerValue = (key) => personalHeaders.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;
  assert.equal(headerValue("X-Robots-Tag"), "noindex, nofollow");
  assert.match(headerValue("Cache-Control") ?? "", /private/);
  assert.match(headerValue("Cache-Control") ?? "", /no-store/);
  assert.equal(headerValue("Referrer-Policy"), "no-referrer");
});

test("the deterministic Movement audit rejects forbidden build output and leaked personal identity", () => {
  const fixture = generateFixture();
  try {
    cpSync(new URL("../public/movimento/v2", import.meta.url), join(fixture, "public", "movimento", "v2"), { recursive: true });
    mkdirSync(join(fixture, "src", "movimento"), { recursive: true });
    copyFileSync(new URL("../vercel.json", import.meta.url), join(fixture, "vercel.json"));
    copyFileSync(new URL("../public/movimento/og-influenciadoras.jpg", import.meta.url), join(fixture, "public", "movimento", "og-influenciadoras.jpg"));
    copyFileSync(new URL("../public/movimento/og-parceiros.jpg", import.meta.url), join(fixture, "public", "movimento", "og-parceiros.jpg"));
    for (const name of ["MovementSite.jsx", "movement-content.js"]) {
      copyFileSync(new URL(`../src/movimento/${name}`, import.meta.url), join(fixture, "src", "movimento", name));
    }
    mkdirSync(join(fixture, "dist", "assets"), { recursive: true });
    writeFileSync(join(fixture, "dist", "assets", "movement.js"), `${readFileSync(new URL("../src/movimento/MovementSite.jsx", import.meta.url))}\n${readFileSync(new URL("../src/movimento/movement-content.js", import.meta.url))}`);
    writeFileSync(join(fixture, "dist", "assets", "MovementSite-fixture.css"), ".mv-root{color:#fff}");
    writeFileSync(join(fixture, "dist", "assets", "unrelated.js"), "const legalRetention = 'programa anual'; const homeAsset = '/experience-training.jpg';");

    const auditEnv = { ...process.env, BENTO_MOVEMENT_AUDIT_ROOT: fixture };
    const result = execFileSync(process.execPath, ["scripts/check-movement-v2.mjs"], {
      cwd: ROOT,
      env: auditEnv,
      encoding: "utf8",
    });
    assert.match(result, /OK\s+Movimento V2/);

    const movementCss = join(fixture, "dist", "assets", "MovementSite-fixture.css");
    writeFileSync(movementCss, ".mv-root{background:url('/experience-training.jpg')}");
    assert.throws(() => {
      execFileSync(process.execPath, ["scripts/check-movement-v2.mjs"], {
        cwd: ROOT,
        env: auditEnv,
        stdio: "pipe",
      });
    }, /Command failed/);
    writeFileSync(movementCss, ".mv-root{color:#fff}");

    const movementChunk = join(fixture, "dist", "assets", "movement.js");
    const cleanMovementChunk = readFileSync(movementChunk, "utf8");
    writeFileSync(movementChunk, `${cleanMovementChunk}\nconst rejectedNarrative = 'plataforma anual';`);
    assert.throws(() => {
      execFileSync(process.execPath, ["scripts/check-movement-v2.mjs"], {
        cwd: ROOT,
        env: auditEnv,
        stdio: "pipe",
      });
    }, /Command failed/);
    writeFileSync(movementChunk, cleanMovementChunk);

    const personalFile = join(fixture, "dist", "movimento", "convite", "index.html");
    writeFileSync(personalFile, readFileSync(personalFile, "utf8").replace("</title>", " — Ana Exemplo</title>"));
    assert.throws(() => {
      execFileSync(process.execPath, ["scripts/check-movement-v2.mjs"], {
        cwd: ROOT,
        env: auditEnv,
        stdio: "pipe",
      });
    }, /Command failed/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("package builds a fresh artifact before every deterministic Movement audit", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(
    pkg.scripts["test:movimento"],
    "node --test tests/movement-*.test.mjs && npm run build",
  );
  assert.match(pkg.scripts.build, /node scripts\/generate-share-pages\.mjs && node scripts\/check-movement-v2\.mjs$/);
});

test("production build bypasses only Vite's blocked config bundler", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const buildScript = readFileSync(new URL("../scripts/build-vite.mjs", import.meta.url), "utf8");

  assert.match(pkg.scripts.build, /node scripts\/build-vite\.mjs/);
  assert.doesNotMatch(pkg.scripts.build, /(?:^|&&\s*)vite build(?:\s*&&|$)/);
  assert.match(buildScript, /import viteConfig from "\.\.\/vite\.config\.js"/);
  assert.match(buildScript, /await build\(\{ \.\.\.viteConfig, configFile: false \}\)/);
});

test("both generic Movement cards are distinct 1200 by 630 JPEG files", async () => {
  const files = [
    new URL("../public/movimento/og-influenciadoras.jpg", import.meta.url),
    new URL("../public/movimento/og-parceiros.jpg", import.meta.url),
  ];
  const [influencer, partner] = await Promise.all(files.map(async (file) => ({
    metadata: await sharp(fileURLToPath(file)).metadata(),
    bytes: readFileSync(file),
  })));

  for (const { metadata } of [influencer, partner]) {
    assert.equal(metadata.format, "jpeg");
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
  }
  assert.notDeepEqual(influencer.bytes, partner.bytes);
});
