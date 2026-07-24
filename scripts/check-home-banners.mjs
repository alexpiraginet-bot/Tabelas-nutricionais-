import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BANNERS_VALIDOS } from "../api/destaque.js";

const expected = [
  "eventos",
  "studio",
  "bytes",
  "tabelas",
  "cardapio",
  "delivery",
  "parceiro",
  "conheca",
  "carreira",
];

const [app, index, panel] = await Promise.all([
  readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/painel.html", import.meta.url), "utf8"),
]);

const order = app
  .match(/const ORDEM_PADRAO=\[([^\]]+)\]/)?.[1]
  ?.match(/"([^"]+)"/g)
  ?.map((value) => value.slice(1, -1));
assert.deepEqual(order, expected, "ORDEM_PADRAO divergiu da lista canônica de banners");
assert.deepEqual(BANNERS_VALIDOS, expected, "BANNERS_VALIDOS divergiu da lista canônica de banners");

for (const id of expected) {
  assert.match(index, new RegExp(`\\b${id}: 1\\b`), `preload não reconhece o banner ${id}`);
  assert.match(panel, new RegExp(`\\["${id}","`), `painel não oferece o banner ${id}`);
}

const studioUrl = "https://totem.bentogelateria.com/meu-studio";
assert.match(app, new RegExp(studioUrl.replaceAll(".", "\\.")), "card Meu Studio aponta para URL incorreta");
assert.match(panel, /TOTEM\+"\/meu-studio"/, "link rápido do painel para Meu Studio está ausente");

const studioAsset = fileURLToPath(new URL("../public/banners/studio.webp", import.meta.url));
const metadata = await sharp(studioAsset).metadata();
assert.equal(metadata.format, "webp", "banner Meu Studio deve ser WebP");
assert.equal(metadata.width, 1600, "banner Meu Studio deve ter 1600 px de largura");
assert.equal(metadata.height, 686, "banner Meu Studio deve ter 686 px de altura");

console.log("Home banners sincronizados: 9/9; Meu Studio 1600×686 WebP.");
