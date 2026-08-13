import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

const repoRoot = path.resolve();
const manifestPath = path.join(repoRoot, "public/movimento/v2/manifest.json");
const publicDir = path.join(repoRoot, "public");
const masterDir = path.join(repoRoot, "assets/movimento-v2/masters");
const disclosure = "Visualização conceitual gerada por IA";

const expectedRoutes = {
  influencer: ["INF-HERO", ...Array.from({ length: 14 }, (_, index) => `INF-${String(index + 1).padStart(2, "0")}`)],
  partner: ["PAR-HERO", ...Array.from({ length: 16 }, (_, index) => `PAR-${String(index + 1).padStart(2, "0")}`)],
};

const routeBudgets = {
  influencer: 2_450 * 1024,
  partner: 2_850 * 1024,
};

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

test("V2 manifest contains the 32 editorial scene families in route order", async () => {
  const manifest = await readManifest();

  assert.equal(manifest.version, 2);
  assert.deepEqual(manifest.routes.influencer, expectedRoutes.influencer);
  assert.deepEqual(manifest.routes.partner, expectedRoutes.partner);
  assert.equal(Object.keys(manifest.assets).length, 32);
  assert.deepEqual(new Set([...manifest.routes.influencer, ...manifest.routes.partner]), new Set(Object.keys(manifest.assets)));

  const sourceHashes = Object.values(manifest.assets).map(({ sourceSha256 }) => sourceSha256);
  assert.equal(new Set(sourceHashes).size, 32, "every chapter needs a unique source family");
  assert.ok(sourceHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash)));

  const largestJpegHashes = Object.values(manifest.assets).flatMap((asset) => [
    asset.mobile.sources.jpg.at(-1).sha256,
    asset.desktop.sources.jpg.at(-1).sha256,
  ]);
  assert.equal(new Set(largestJpegHashes).size, largestJpegHashes.length, "no scene family may reuse an identical final raster");
});

test("chapter families use one source master while heroes keep native portrait art direction", async () => {
  const filenames = await readdir(masterDir);
  const allIds = [...expectedRoutes.influencer, ...expectedRoutes.partner];

  for (const id of allIds) {
    const matching = filenames.filter((filename) => new RegExp(`^${id}(?:-(?:mobile|desktop))?\\.(?:jpe?g|png)$`, "i").test(filename));

    if (id.endsWith("HERO")) {
      assert.equal(matching.length, 2, `${id} needs one native mobile and one native desktop master`);
      assert.ok(matching.some((filename) => new RegExp(`^${id}-mobile\\.(?:jpe?g|png)$`, "i").test(filename)));
      assert.ok(matching.some((filename) => new RegExp(`^${id}-desktop\\.(?:jpe?g|png)$`, "i").test(filename)));
    } else {
      assert.equal(matching.length, 1, `${id} must reuse one landscape master for both crops`);
      assert.match(matching[0], new RegExp(`^${id}\\.(?:jpe?g|png)$`, "i"));
    }
  }
});

test("every scene has meaningful accessibility copy and an explicit provenance disclosure", async () => {
  const manifest = await readManifest();

  for (const [id, asset] of Object.entries(manifest.assets)) {
    assert.equal(asset.id, id);
    assert.ok(asset.alt.length >= 40, `${id} alt text is too short`);
    assert.ok(asset.generated ? asset.disclosure.startsWith(disclosure) : true);
    assert.ok(asset.disclosure.length >= 24, `${id} needs visible provenance copy`);
    assert.match(asset.lqip.src, new RegExp(`^/movimento/v2/${id}-lqip\\.jpg$`));
    assert.ok(asset.lqip.bytes < 1_536, `${id} LQIP must stay under 1.5 KiB`);
  }

  for (const id of ["INF-06", "PAR-07"]) assert.match(manifest.assets[id].disclosure, /referência oficial de camiseta Bentô composta sem redesenho/i);
  assert.match(manifest.assets["PAR-08"].disclosure, /produto e embalagem do acervo real Bentô compostos sem redesenho/i);
  assert.match(manifest.assets["PAR-09"].disclosure, /wordmark oficial Bentô composto sem redesenho/i);
  for (const id of ["INF-10", "PAR-12"]) assert.match(manifest.assets[id].disclosure, /carrinho real Bentô preservado/i);
  for (const id of ["INF-05", "PAR-05", "PAR-06", "PAR-15"]) assert.doesNotMatch(manifest.assets[id].disclosure, /wordmark oficial Bentô composto sem redesenho/i);
});

test("responsive derivatives are valid, dimensioned, hashed and never upscale their master", async () => {
  const manifest = await readManifest();
  const expectedFormats = ["avif", "webp", "jpg"];

  for (const [id, asset] of Object.entries(manifest.assets)) {
    assert.ok(asset.master.desktop.width >= 1440, `${id} desktop master is too narrow for the required crop`);
    assert.ok(asset.master.desktop.height >= 810, `${id} desktop master is too short for the required crop`);
    assert.ok(asset.master.mobile.width >= (id.endsWith("HERO") ? 768 : 752), `${id} mobile master is too narrow for the required crop`);
    assert.ok(asset.master.mobile.height >= (id.endsWith("HERO") ? 1365 : 940), `${id} mobile master is too short for the required crop`);

    for (const direction of ["mobile", "desktop"]) {
      const variant = asset[direction];
      assert.ok(variant.aspectRatio > 0);
      assert.deepEqual(Object.keys(variant.sources), expectedFormats);

      for (const format of expectedFormats) {
        const expectedMime = format === "jpg" ? "image/jpeg" : `image/${format}`;
        const renditions = variant.sources[format];
        assert.ok(renditions.length >= 2, `${id} ${direction}/${format} needs a responsive srcset`);

        for (const rendition of renditions) {
          const filePath = path.join(publicDir, rendition.src.replace(/^\//, ""));
          const [metadata, fileStat, fileHash] = await Promise.all([
            sharp(filePath).metadata(),
            stat(filePath),
            sha256(filePath),
          ]);
          const detectedMime = metadata.format === "jpeg"
            ? "image/jpeg"
            : metadata.format === "heif" && metadata.compression === "av1"
              ? "image/avif"
              : `image/${metadata.format}`;
          assert.equal(detectedMime, expectedMime);
          assert.equal(metadata.width, rendition.width);
          assert.equal(metadata.height, rendition.height);
          assert.equal(fileStat.size, rendition.bytes);
          assert.equal(fileHash, rendition.sha256);
          assert.ok(rendition.width <= asset.master[direction].width, `${id} must not upscale ${direction} width`);
          assert.ok(rendition.height <= asset.master[direction].height, `${id} must not upscale ${direction} height`);
        }
      }
    }

    const lqipPath = path.join(publicDir, asset.lqip.src.replace(/^\//, ""));
    assert.equal((await stat(lqipPath)).size, asset.lqip.bytes);
    assert.equal(await sha256(lqipPath), asset.lqip.sha256);
  }
});

test("mobile AVIF route payloads and active heroes remain inside the approved budgets", async () => {
  const manifest = await readManifest();

  for (const [route, ids] of Object.entries(expectedRoutes)) {
    const selectedBytes = ids.reduce((total, id) => {
      const renditions = manifest.assets[id].mobile.sources.avif;
      return total + renditions.at(-1).bytes;
    }, 0);
    const initialBytes = ids.slice(0, 2).reduce((total, id) => total + manifest.assets[id].mobile.sources.avif.at(-1).bytes, 0);
    assert.ok(initialBytes <= 690 * 1024, `${route} hero and first chapter exceed the initial-load ceiling`);
    assert.ok(selectedBytes <= routeBudgets[route], `${route} route exceeds its complete mobile media budget`);
  }
});

test("runtime uses art-directed picture sources with exactly one priority hero", async () => {
  const [site, content] = await Promise.all([
    readFile(path.join(repoRoot, "src/movimento/MovementSite.jsx"), "utf8"),
    readFile(path.join(repoRoot, "src/movimento/movement-content.js"), "utf8"),
  ]);

  assert.match(site, /function ScenePicture\(\{ asset, priority = false/);
  assert.match(site, /const displaySizes = priority \? "100vw" : "\(max-width: 1600px\) 60vw, 960px";/);
  assert.match(site, /<source media="\(max-width: 900px\)" type="image\/avif"/);
  assert.match(site, /<source media="\(max-width: 900px\)" type="image\/webp"/);
  assert.match(site, /<source type="image\/avif"/);
  assert.match(site, /<source type="image\/webp"/);
  assert.match(site, /loading=\{priority \? "eager" : "lazy"\}/);
  assert.match(site, /fetchpriority=\{priority \? "high" : undefined\}/);
  assert.match(site, /decoding="async"/);
  assert.match(site, /const \[mediaReady, setMediaReady\] = useState\(priority\);/);
  assert.match(site, /new IntersectionObserver\(/);
  assert.match(site, /rootMargin: "320px 0px"/);
  assert.match(site, /\{mediaReady && <>/);
  assert.match(site, /role=\{mediaReady \? undefined : "img"\}/);
  assert.equal(site.match(/<ScenePicture[^>]*\bpriority\b[^>]*\/>/g)?.length, 1);
  assert.doesNotMatch(site, /document\.createElement\("link"\)/, "a useEffect preload runs too late to improve the active hero request");

  for (const oldAsset of [
    "experience-training.jpg",
    "experience-mobility.jpg",
    "experience-breakfast.jpg",
    "experience-kids.jpg",
    "experience-recovery.jpg",
    "experience-backdrop.jpg",
    "camiseta-referencia.jpg",
    "picoles-lineup-real.jpg",
  ]) {
    assert.doesNotMatch(site, new RegExp(oldAsset.replace(".", "\\.")));
    assert.doesNotMatch(content, new RegExp(oldAsset.replace(".", "\\.")));
  }
});

test("manifest is portable and contains no nondeterministic build metadata", async () => {
  const source = await readFile(manifestPath, "utf8");

  assert.doesNotMatch(source, /\/Users\//);
  assert.doesNotMatch(source, /(?:created|generated|updated)At/i);
  assert.doesNotMatch(source, /20\d{2}-\d{2}-\d{2}T\d{2}:/);
});

test("pipeline composes approved identity assets without flattening products over workshop photography", async () => {
  const pipeline = await readFile(path.join(repoRoot, "scripts/build-movement-assets.mjs"), "utf8");

  assert.match(pipeline, /public\/movimento\/camiseta-referencia\.jpg/);
  assert.match(pipeline, /public\/movimento\/picoles-lineup-real\.jpg/);
  assert.match(pipeline, /"INF-06": \{ kind: "shirt"/);
  assert.match(pipeline, /"PAR-07": \{ kind: "shirt"/);
  assert.match(pipeline, /"PAR-08": \{ kind: "product"/);
  for (const id of ["INF-04", "PAR-06"]) assert.doesNotMatch(pipeline, new RegExp(`"${id}": \\{[\\s\\S]*?kind: "product"`));
  assert.match(pipeline, /sharp\(master\.buffer/);
  assert.match(pipeline, /\.composite\(\[\{ input: inset/);
  assert.doesNotMatch(pipeline, /composeWorkshopProducts|productIsolated/);
  assert.match(pipeline, /async function createEditorialBoard/);
  for (const id of ["INF-06", "PAR-07", "PAR-08"]) assert.match(pipeline, new RegExp(`"${id}": \\{ kind: "(?:shirt|product)", mode: "editorial-board"`));
  assert.match(pipeline, /const maxInsetHeight = Math\.round\(master\.height \* placement\.maxHeight\);/);
  assert.match(pipeline, /\.resize\(\{ width: insetWidth, height: maxInsetHeight, fit: "inside", withoutEnlargement: true \}\)/);
  assert.doesNotMatch(pipeline, /BRAND_APPLICATIONS|composeBrandApplications|tintOfficialWordmark/);
  assert.match(pipeline, /const CART_SOURCE_IDS = new Set\(\["INF-10", "PAR-12"\]\)/);
  assert.match(pipeline, /carrinho real Bentô preservado/);
  assert.match(pipeline, /function cropPosition/);
  assert.doesNotMatch(pipeline, /if \(id === "PAR-05"\) return "right"/, "partner recovery must keep the operational center in the mobile crop");
  assert.match(pipeline, /const stem = isHero\(id\) \? `\$\{id\}-\$\{direction\}` : id;/);
  assert.match(pipeline, /for \(const extension of \["jpg", "jpeg", "png"\]\)/);
});

test("presentation keeps all brand applications inside the audited image assets", async () => {
  const [site, content] = await Promise.all([
    readFile(path.join(repoRoot, "src/movimento/MovementSite.jsx"), "utf8"),
    import(new URL(`../src/movimento/movement-content.js?asset-test=${Date.now()}`, import.meta.url)),
  ]);
  assert.doesNotMatch(site, /function ShirtSponsorCallout/);
  assert.doesNotMatch(site, /mv-shirt-sponsor-callout/);
  assert.doesNotMatch(site, /mv-brand-composition/);
  assert.doesNotMatch(site, /mv-shirt-sponsor-zone/);
  assert.doesNotMatch(JSON.stringify(content.INFLUENCER_SCENES), /Sua marca aqui/i);
  assert.doesNotMatch(site, /PartnerBackdropWall|PartnerCartPlacement/);
  assert.doesNotMatch(site, /1 ANO BENTÔ|SUA MARCA AQUI/);
});

test("pipeline builds in staging, promotes the directory and can be invoked from any working directory", async () => {
  const pipeline = await readFile(path.join(repoRoot, "scripts/build-movement-assets.mjs"), "utf8");

  assert.match(pipeline, /const MANAGED_OUTPUT_PATTERN =/);
  assert.match(pipeline, /const STAGING_DIR =/);
  assert.match(pipeline, /if \(!finalExists && backupExists\) \{[\s\S]*?await rename\(backupDirectory, finalDirectory\);[\s\S]*?return "restored-backup";/);
  assert.match(pipeline, /validateDirectory = assertGeneratedDirectory/);
  assert.match(pipeline, /if \(finalExists && backupExists\) \{[\s\S]*?validateDirectory\(finalDirectory\);[\s\S]*?return "validated-final-with-backup";/);
  assert.match(pipeline, /await recoverInterruptedPromotion\(\);[\s\S]*?await clearGeneratedDirectory\(STAGING_DIR\);/);
  assert.match(pipeline, /await rename\(FINAL_OUTPUT_DIR, BACKUP_DIR\)/);
  assert.match(pipeline, /await rename\(STAGING_DIR, FINAL_OUTPUT_DIR\)/);
  assert.match(pipeline, /await rename\(BACKUP_DIR, FINAL_OUTPUT_DIR\)/);
  assert.match(pipeline, /path\.dirname\(fileURLToPath\(import\.meta\.url\)\)/);
  assert.doesNotMatch(pipeline, /process\.cwd\(\)/);

  const promotion = pipeline.slice(pipeline.indexOf("async function promoteStaging"), pipeline.indexOf("async function main"));
  const validatesCurrentFinal = promotion.indexOf("await assertGeneratedDirectory(FINAL_OUTPUT_DIR)");
  const removesOrphanedBackup = promotion.indexOf("await clearGeneratedDirectory(BACKUP_DIR)");
  assert.ok(validatesCurrentFinal >= 0 && validatesCurrentFinal < removesOrphanedBackup, "the current final must be validated before an orphaned backup is removed");
});

test("interrupted-promotion recovery validates the new final and preserves the old backup", async () => {
  const pipelineUrl = new URL(`../scripts/build-movement-assets.mjs?recovery-test=${Date.now()}`, import.meta.url);
  const { recoverInterruptedPromotion } = await import(pipelineUrl);
  const tempRoot = await mkdtemp(path.join(tmpdir(), "movement-v2-recovery-"));
  const finalDirectory = path.join(tempRoot, "final");
  const backupDirectory = path.join(tempRoot, "backup");

  try {
    await Promise.all([mkdir(finalDirectory), mkdir(backupDirectory)]);
    await Promise.all([
      writeFile(path.join(finalDirectory, "current.txt"), "current"),
      writeFile(path.join(backupDirectory, "previous.txt"), "previous"),
    ]);
    const validated = [];
    const result = await recoverInterruptedPromotion(finalDirectory, backupDirectory, async (directory) => {
      validated.push(directory);
      assert.equal(await readFile(path.join(directory, "current.txt"), "utf8"), "current");
    });

    assert.equal(result, "validated-final-with-backup");
    assert.deepEqual(validated, [finalDirectory]);
    assert.equal(await readFile(path.join(backupDirectory, "previous.txt"), "utf8"), "previous");

    await rm(finalDirectory, { recursive: true });
    assert.equal(await recoverInterruptedPromotion(finalDirectory, backupDirectory), "restored-backup");
    assert.equal(await readFile(path.join(finalDirectory, "previous.txt"), "utf8"), "previous");
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
});

test("movement typography transfers no full TTF when a deterministic WOFF2 subsetter is unavailable", async () => {
  const css = await readFile(path.join(repoRoot, "src/movimento/movement.css"), "utf8");
  assert.doesNotMatch(css, /@font-face/);
  assert.doesNotMatch(css, /\.(?:ttf|woff2?)/i);
  assert.match(css, /ui-serif|Georgia/);
  assert.match(css, /ui-sans-serif|system-ui/);
});

test("scene disclosures meet AA contrast on both presentation surfaces", async () => {
  const css = await readFile(path.join(repoRoot, "src/movimento/movement.css"), "utf8");
  assert.match(css, /\.mv-scene-disclosure\{[^}]*color:#5f5a50/);
});

test("partner scenes do not fake brand applications with floating HTML cards", async () => {
  const [site, css] = await Promise.all([
    readFile(path.join(repoRoot, "src/movimento/MovementSite.jsx"), "utf8"),
    readFile(path.join(repoRoot, "src/movimento/movement.css"), "utf8"),
  ]);

  assert.doesNotMatch(site, /PartnerBackdropWall|PartnerCartPlacement/);
  assert.doesNotMatch(css, /\.mv-partner-brand-wall|\.mv-partner-cart-placement/);
});
