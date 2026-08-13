import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.env.BENTO_MOVEMENT_AUDIT_ROOT || path.join(SCRIPT_DIR, ".."));
const MANIFEST_PATH = path.join(ROOT, "public/movimento/v2/manifest.json");
const PUBLIC_DIR = path.join(ROOT, "public");

const EXPECTED_ROUTES = {
  influencer: ["INF-HERO", ...Array.from({ length: 14 }, (_, index) => `INF-${String(index + 1).padStart(2, "0")}`)],
  partner: ["PAR-HERO", ...Array.from({ length: 16 }, (_, index) => `PAR-${String(index + 1).padStart(2, "0")}`)],
};
const COMPLETE_BUDGETS = { influencer: 2_450 * 1024, partner: 2_850 * 1024 };
const INITIAL_BUDGET = 690 * 1024;
const OLD_ASSETS = [
  "experience-training.jpg",
  "experience-mobility.jpg",
  "experience-breakfast.jpg",
  "experience-kids.jpg",
  "experience-recovery.jpg",
  "experience-backdrop.jpg",
  "camiseta-referencia.jpg",
  "picoles-lineup-real.jpg",
];
const FORBIDDEN_COPY = /projeto de 12 meses|projeto de um ano|plataforma anual|ciclo anual|jornada anual|programa anual/i;
const PROSPECT_BRANDS = /Grand Cave|Fiore|Magia do Mar|True Suplementos|Viva Tru|Academia Lifft|Café Pocar|Luciana Melo|Lexus|Denza/i;
const GENERATED_PATTERN = /^(?:INF|PAR)-(?:HERO|0[1-9]|1[0-6])-(?:mobile|desktop)-\d+\.(?:avif|webp|jpg)$|^(?:INF|PAR)-(?:HERO|0[1-9]|1[0-6])-lqip\.jpg$|^manifest\.json$/;
const PERSONAL_IDENTITY_PATTERNS = /Ana Exemplo|Empresa Exemplo|Responsável Exemplo|TOKEN-SEGREDO/i;

function invariant(condition, message) {
  if (!condition) throw new Error(`Movimento V2: ${message}`);
}

async function readText(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function assertGeneratedMedia(manifest) {
  invariant(manifest.version === 2, "manifest version must be 2");
  invariant(JSON.stringify(manifest.routes) === JSON.stringify(EXPECTED_ROUTES), "route families or ordering changed");
  const ids = [...EXPECTED_ROUTES.influencer, ...EXPECTED_ROUTES.partner];
  invariant(Object.keys(manifest.assets).length === 32, "manifest must contain exactly 32 families");
  invariant(new Set(Object.values(manifest.assets).map(({ sourceSha256 }) => sourceSha256)).size === 32, "source family hashes must be unique");

  const declaredFiles = new Set(["manifest.json"]);
  const renditionHashes = new Map();
  for (const id of ids) {
    const asset = manifest.assets[id];
    invariant(asset?.id === id, `${id} is missing or malformed`);
    invariant(asset.alt?.length >= 40, `${id} alt is too short`);
    invariant(asset.disclosure?.startsWith("Visualização conceitual gerada por IA"), `${id} disclosure is missing`);
    invariant(asset.lqip?.bytes < 1_536, `${id} LQIP exceeds 1.5 KiB`);

    for (const rendition of [asset.lqip, ...Object.values(asset.mobile.sources).flat(), ...Object.values(asset.desktop.sources).flat()]) {
      const relative = rendition.src.replace(/^\//, "");
      const absolute = path.join(PUBLIC_DIR, relative);
      declaredFiles.add(path.basename(relative));
      invariant((await stat(absolute)).size === rendition.bytes, `${rendition.src} byte count differs from manifest`);
      const hash = await sha256(absolute);
      invariant(hash === rendition.sha256, `${rendition.src} hash differs from manifest`);
      const previous = renditionHashes.get(hash);
      invariant(!previous || previous === id, `${id} duplicates media from ${previous}`);
      renditionHashes.set(hash, id);
    }
  }

  const outputFiles = await readdir(path.join(PUBLIC_DIR, "movimento/v2"));
  for (const filename of outputFiles) {
    invariant(GENERATED_PATTERN.test(filename), `unexpected output file ${filename}`);
    invariant(declaredFiles.has(filename), `undeclared output file ${filename}`);
  }
  invariant(outputFiles.length === declaredFiles.size, "manifest declares missing output files");

  for (const [route, idsForRoute] of Object.entries(EXPECTED_ROUTES)) {
    const bytesFor = (id) => manifest.assets[id].mobile.sources.avif.at(-1).bytes;
    const initialBytes = idsForRoute.slice(0, 2).reduce((sum, id) => sum + bytesFor(id), 0);
    const completeBytes = idsForRoute.reduce((sum, id) => sum + bytesFor(id), 0);
    invariant(initialBytes <= INITIAL_BUDGET, `${route} initial media exceeds 690 KiB`);
    invariant(completeBytes <= COMPLETE_BUDGETS[route], `${route} media exceeds route budget`);
  }
}

function headerValue(headers, key) {
  return headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;
}

async function assertRoutingAndShareShells() {
  const config = JSON.parse(await readText("vercel.json"));
  const rewrites = config.rewrites || [];
  const sources = rewrites.map(({ source }) => source);
  const personalIndex = sources.indexOf("/movimento/convite/:token");
  invariant(personalIndex >= 0, "personal invitation rewrite is missing");
  invariant(personalIndex < sources.indexOf("/movimento/parceiros") && personalIndex < sources.indexOf("/movimento"), "personal rewrite must precede generic routes");

  const personalHeaders = (config.headers || []).find(({ source }) => source === "/movimento/convite(.*)")?.headers || [];
  invariant(headerValue(personalHeaders, "X-Robots-Tag") === "noindex, nofollow", "personal noindex header is missing");
  invariant(/no-store/.test(headerValue(personalHeaders, "Cache-Control") || ""), "personal no-store header is missing");
  invariant(headerValue(personalHeaders, "Referrer-Policy") === "no-referrer", "personal no-referrer header is missing");

  const shells = {
    influencer: await readText("dist/movimento/index.html"),
    partner: await readText("dist/movimento/parceiros/index.html"),
    personal: await readText("dist/movimento/convite/index.html"),
  };
  invariant(/INF-HERO/.test(shells.influencer) && !/PAR-HERO/.test(shells.influencer), "influencer shell preloads the wrong hero");
  invariant(/PAR-HERO/.test(shells.partner) && !/INF-HERO/.test(shells.partner), "partner shell preloads the wrong hero");
  invariant(!/(?:INF|PAR)-HERO|rel="preload"[^>]*as="image"/.test(shells.personal), "personal shell must not guess an audience hero");
  invariant(/name="robots" content="noindex, nofollow"/.test(shells.personal), "personal robots meta is missing");
  invariant(/name="referrer" content="no-referrer"/.test(shells.personal), "personal referrer meta is missing");
  invariant(/og:url" content="https:\/\/bentogelateria\.com\/movimento"/.test(shells.personal), "personal OG URL is not privacy-safe");
  invariant(/canonical" href="https:\/\/bentogelateria\.com\/movimento"/.test(shells.personal), "personal canonical is not privacy-safe");
  invariant(!/\/movimento\/convite\//.test(shells.personal), "personal shell contains an invitation route or token location");
  invariant(!PERSONAL_IDENTITY_PATTERNS.test(shells.personal), "personal shell contains recipient identity");
  invariant(!/\{(?:Nome|Empresa|Responsável)\}/i.test(shells.personal), "personal shell contains an identity placeholder");
  invariant(!/bento-logo\.webp|bento:destaque/.test(Object.values(shells).join("\n")), "Movement shells retain home image preloads");

  for (const [name, html] of Object.entries(shells)) {
    invariant(!FORBIDDEN_COPY.test(html), `${name} shell contains rejected annual copy`);
    invariant(!PROSPECT_BRANDS.test(html), `${name} shell contains a prospect brand`);
  }
}

async function assertSourceAndBuild() {
  const movementSite = await readText("src/movimento/MovementSite.jsx");
  const movementContent = await readText("src/movimento/movement-content.js");
  const movementAtlas = await readText("src/movimento/MovementStoryAtlas.jsx");
  const source = `${movementSite}\n${movementContent}\n${movementAtlas}`;
  invariant(!FORBIDDEN_COPY.test(source), "runtime source contains rejected annual copy");
  invariant(!PROSPECT_BRANDS.test(source), "runtime source contains a prospect brand");
  for (const oldAsset of OLD_ASSETS) invariant(!source.includes(oldAsset), `runtime references rejected asset ${oldAsset}`);

  const contentModuleUrl = pathToFileURL(path.join(ROOT, "src/movimento/movement-content.js"));
  contentModuleUrl.searchParams.set("audit", String(Date.now()));
  const contentModule = await import(contentModuleUrl.href);
  invariant(contentModule.MOVEMENT_TERRITORIES?.length === 5, "atlas must expose five territories");
  invariant(contentModule.PARTNER_FEATURED_GUESTS?.length === 6, "partner guest proof must expose six featured names");
  invariant(contentModule.PARTNER_GUESTS?.length === 36, "partner guest list must expose 36 names");
  for (const [audience, scenes] of [["influencer", contentModule.INFLUENCER_SCENES], ["partner", contentModule.PARTNER_SCENES]]) {
    const groupedIds = contentModule.buildMovementTerritories(audience, scenes)
      .flatMap(({ scenes: groupedScenes }) => groupedScenes.map(({ assetId }) => assetId));
    invariant(groupedIds.length === scenes.length && new Set(groupedIds).size === scenes.length, `${audience} atlas must map every scene exactly once`);
  }
  invariant(/role="dialog" aria-modal="true"/.test(movementAtlas), "atlas detail must remain modal and accessible");
  invariant(/PARTNER_GUESTS\.map/.test(movementAtlas), "partner guest list must remain rendered from curated content");

  const influencerSource = movementContent.split("export const PARTNER_SCENES")[0];
  invariant(!/Sua marca aqui|patrocin/i.test(influencerSource), "influencer content contains sponsor language");

  const ogHashes = [];
  for (const og of ["og-influenciadoras.jpg", "og-parceiros.jpg"]) {
    const ogPath = path.join(PUBLIC_DIR, "movimento", og);
    const metadata = await sharp(ogPath).metadata();
    invariant(metadata.format === "jpeg", `${og} must be JPEG`);
    invariant(metadata.width === 1200 && metadata.height === 630, `${og} must be 1200x630`);
    ogHashes.push(await sha256(ogPath));
  }
  invariant(new Set(ogHashes).size === 2, "generic OG cards must be distinct");

  const distAssetsDir = path.join(ROOT, "dist/assets");
  const distAssetFiles = await readdir(distAssetsDir);
  const builtAssets = await Promise.all(distAssetFiles
    .filter((filename) => /\.(?:js|css)$/.test(filename))
    .map(async (filename) => ({ filename, text: await readFile(path.join(distAssetsDir, filename), "utf8") })));
  const allBuiltChunks = builtAssets.map(({ text }) => text).join("\n");
  const movementChunks = builtAssets
    .filter(({ filename, text }) => /^MovementSite-.*\.(?:js|css)$/.test(filename) || text.includes("INF-HERO") || text.includes("PAR-HERO"))
    .map(({ text }) => text);
  invariant(movementChunks.length > 0, "built Movement chunk is missing");
  const chunks = movementChunks.join("\n");
  invariant(!FORBIDDEN_COPY.test(chunks), "built chunks contain rejected annual copy");
  invariant(!PROSPECT_BRANDS.test(chunks), "built chunks contain a prospect brand");
  for (const oldAsset of OLD_ASSETS) invariant(!chunks.includes(oldAsset), `built Movement chunks reference rejected asset ${oldAsset}`);
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
await assertGeneratedMedia(manifest);
await assertRoutingAndShareShells();
await assertSourceAndBuild();
console.log("OK  Movimento V2: 32 famílias, privacidade, rotas, mídia e budgets auditados");
