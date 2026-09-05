import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import OVERRIDES from "../src/data-overrides.js";
import { ALLERGENS, PRODUCTS } from "../src/data.js";

const repoRoot = path.resolve();
const legacyMark = ["fra", "nui"].join("");
const textExtensions = new Set([
  ".css", ".csv", ".html", ".js", ".json", ".jsx", ".md", ".mjs",
  ".svg", ".ts", ".tsx", ".txt", ".webmanifest",
]);

function fold(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

async function walk(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

test("Framboesa Duo keeps the published nutrition and RT audit metadata", () => {
  const mini = PRODUCTS.find(({ id }) => id === "bentole-framboesa-duo");
  const large = PRODUCTS.find(({ id }) => id === "bentole-framboesa-duo-g");

  assert.ok(mini, "missing Framboesa Duo mini product");
  assert.ok(large, "missing Framboesa Duo G product");
  assert.equal(mini.name, "Framboesa Duo");
  assert.equal(large.name, "Framboesa Duo G");
  assert.equal(mini.image, "/sabores/bentole-framboesa-duo.jpg");
  assert.deepEqual(mini.nutrition, {
    kcal: 42,
    carbs: 8.9,
    sugars: 1.4,
    addedSugars: 0,
    protein: 1.2,
    fat: 0.3,
    satFat: 0.1,
    transFat: 0,
    fiber: 7.7,
    sodium: 4.64,
  });
  assert.deepEqual(large.nutrition, {
    kcal: 174,
    carbs: 17.8,
    sugars: 2.8,
    addedSugars: 0,
    protein: 2.4,
    fat: 0.6,
    satFat: 0.2,
    transFat: 0,
    fiber: 15.4,
    sodium: 9.28,
  });
  assert.deepEqual(ALLERGENS[mini.id], ["LEITE", "SOJA"]);
  assert.deepEqual(ALLERGENS[large.id], ["LEITE", "SOJA"]);
  assert.deepEqual(OVERRIDES[large.id]?._pub, {
    by: "Lavínia Martinelli",
    at: "2026-07-28T16:00:07.675Z",
    rev: 1,
  });
});

test("public-facing sources and paths contain no legacy mark", async () => {
  const files = [
    "README.md",
    ...await walk("docs"),
    ...await walk("public"),
    ...await walk("scripts"),
    ...await walk("src"),
  ];

  for (const relativePath of files) {
    assert.ok(
      !fold(relativePath).includes(legacyMark),
      `legacy mark remains in path: ${relativePath}`,
    );
    if (!textExtensions.has(path.extname(relativePath).toLowerCase())) continue;
    const source = await readFile(path.join(repoRoot, relativePath), "utf8");
    assert.ok(
      !fold(source).includes(legacyMark),
      `legacy mark remains in public-facing content: ${relativePath}`,
    );
  }
});

test("the replacement Story is generated from the canonical product data", async () => {
  const { buildStorySvg } = await import("../scripts/generate-framboesa-duo-story.mjs");
  const product = PRODUCTS.find(({ id }) => id === "bentole-framboesa-duo");
  const svg = await buildStorySvg(product);
  const metadata = await sharp(Buffer.from(svg)).metadata();

  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1920);
  assert.match(svg, /Framboesa Duo/);
  assert.match(svg, /55 g \(mini picolé\)/);
  assert.match(svg, />42 kcal<\/text>/);
  assert.match(svg, />1,2 g de proteína · 7,7 g de fibras<\/text>/);
  assert.match(svg, /Contém açúcares próprios dos ingredientes\./);
  assert.match(svg, /ZERO LACTOSE/);
  assert.match(svg, /SEM ADIÇÃO DE AÇÚCARES/);

  const changedProduct = structuredClone(product);
  changedProduct.nutrition.kcal = 43;
  changedProduct.nutrition.protein = 1.3;
  changedProduct.nutrition.fiber = 7.8;
  const changedSvg = await buildStorySvg(changedProduct);
  assert.match(changedSvg, />43 kcal<\/text>/);
  assert.match(changedSvg, />1,3 g de proteína · 7,8 g de fibras<\/text>/);
  const expectedPng = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  const publishedPng = await readFile(path.join(repoRoot, "public/social/framboesa-duo-tabela-nutricional-story.png"));
  assert.deepEqual(publishedPng, expectedPng, "committed Story must match the canonical generator");
  assert.ok(!fold(svg).includes(legacyMark));
});

test("the replacement Bentole lineup is generated from canonical product data", async () => {
  const { buildLineupSvg } = await import("../scripts/generate-bentole-lineup.mjs");
  const svg = await buildLineupSvg();
  const metadata = await sharp(Buffer.from(svg)).metadata();

  assert.equal(metadata.width, 1448);
  assert.equal(metadata.height, 1086);
  for (const name of [
    "Framboesa Duo",
    "Snickers",
    "Prestígio",
    "Chocolate Dubai",
    "Opereta",
  ]) {
    assert.match(svg, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(svg, /Pistache &amp;/);
  assert.match(svg, /Choco Branco/);
  assert.match(svg, />42 kcal</);
  assert.match(svg, />1,2 g proteína</);
  const expectedJpeg = await sharp(Buffer.from(svg))
    .jpeg({ quality: 92, progressive: true, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
  for (const relativePath of [
    "public/movimento/picoles-lineup-real.jpg",
    "public/portfolio/picoles-lineup.jpg",
  ]) {
    const publishedJpeg = await readFile(path.join(repoRoot, relativePath));
    assert.deepEqual(publishedJpeg, expectedJpeg, `${relativePath} must match the canonical generator`);
  }
  assert.ok(!fold(svg).includes(legacyMark));
});

test("the stale institutional deck is retired in favor of the current portfolio", async () => {
  const [sharedSource, panelSource] = await Promise.all([
    readFile(path.join(repoRoot, "src/shared.jsx"), "utf8"),
    readFile(path.join(repoRoot, "public/painel.html"), "utf8"),
  ]);

  assert.match(sharedSource, /DECK_URL\s*=\s*["']\/portfolio-bento\.pdf["']/);
  assert.match(panelSource, /SITE\s*\+\s*["']\/portfolio-bento\.pdf["']/);
  await assert.rejects(
    access(path.join(repoRoot, "public/Bento-Functional-Nutrition.pdf")),
    (error) => error?.code === "ENOENT",
  );
});
