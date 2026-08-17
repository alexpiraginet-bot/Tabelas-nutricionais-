// Tamanho de fonte editável por cena e por território.
//
// POR QUE ESTE ARQUIVO EXISTE: o painel ganhou deslizadores de escala de
// título e de texto. A escala é um multiplicador do padrão do código
// (1 = padrão), validado em três camadas: cliente, API e constraint do
// banco. Estes testes travam a faixa, o arredondamento, o caminho até o
// CSS e a regra de quais campos valem em cena -THEME-.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MOVEMENT_FONT_SCALE_RANGE,
  movementOverrideInsertRow,
  movementOverridePatchRow,
  sanitizeMovementContentOverride,
  sanitizeMovementContentRows,
} from "../lib/movement-content-config.mjs";
import { applyMovementContentOverrides } from "../src/movimento/useMovementContent.js";
import { createMovementContentHandler } from "../api/movimento-content.js";

const ENV = { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-test-key", PANEL_KEY: "panel-test-key" };

function req(body) {
  return { method: "POST", headers: { authorization: "Bearer panel-test-key" }, query: {},
    body: JSON.stringify(body) };
}
function res() {
  return { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; }, json(p) { this.payload = p; }, end() {} };
}

test("a escala de fonte aceita a faixa 0.7–1.5, arredonda a duas casas e recusa o resto", () => {
  assert.deepEqual(sanitizeMovementContentOverride({ titleScale: 1.25 }, ENV),
    { ok: true, value: { titleScale: 1.25 } });
  assert.deepEqual(sanitizeMovementContentOverride({ bodyScale: 0.7 }, ENV),
    { ok: true, value: { bodyScale: 0.7 } });
  // o deslizador manda passos de 0.05, mas ponto flutuante não é confiável
  assert.deepEqual(sanitizeMovementContentOverride({ titleScale: 1.1500000000000001 }, ENV),
    { ok: true, value: { titleScale: 1.15 } });
  // null limpa a personalização e volta ao padrão do código
  assert.deepEqual(sanitizeMovementContentOverride({ titleScale: null, bodyScale: null }, ENV),
    { ok: true, value: { titleScale: null, bodyScale: null } });
  for (const invalid of [0.69, 1.51, 0, -1, "1.2", Number.NaN, Number.POSITIVE_INFINITY, {}, true]) {
    assert.equal(sanitizeMovementContentOverride({ titleScale: invalid }, ENV).ok, false, String(invalid));
    assert.equal(sanitizeMovementContentOverride({ bodyScale: invalid }, ENV).ok, false, String(invalid));
  }
  // a faixa exportada é a mesma da constraint do banco (migração font_scales)
  assert.deepEqual(MOVEMENT_FONT_SCALE_RANGE, { minimum: 0.7, maximum: 1.5 });
});

test("as escalas viajam até o banco e voltam para o visitante", () => {
  const target = { audienceType: "influencer", sceneId: "INF-03" };
  const insert = movementOverrideInsertRow(target, { titleScale: 1.2, bodyScale: 0.9 });
  assert.equal(insert.title_scale, 1.2);
  assert.equal(insert.body_scale, 0.9);
  assert.deepEqual(movementOverridePatchRow({ titleScale: null }, 2), { title_scale: null, revision: 3 });

  // PostgREST pode devolver numeric como string — a linha volta íntegra
  const rows = sanitizeMovementContentRows([{
    audience_type: "influencer", scene_id: "INF-03", image_url: null, mobile_image_url: null,
    image_opacity: null, background_color: null, title_scale: "1.2", body_scale: 0.9,
    eyebrow: null, title: null, body: null, alt_text: null, revision: 4,
  }], ENV);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].override.titleScale, 1.2);
  assert.equal(rows[0].override.bodyScale, 0.9);
});

test("cena -THEME- aceita cor e escalas do card, e nada além disso", async () => {
  const handler = createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => ({
      ok: true, status: 201,
      json: async () => [{ audience_type: "partner", scene_id: "PAR-THEME-CARE", image_url: null,
        mobile_image_url: null, image_opacity: null, background_color: null, title_scale: 1.1,
        body_scale: null, eyebrow: null, title: null, body: null, alt_text: null, revision: 1,
        _body: options.body }],
    }),
  });

  const ok = res();
  await handler(req({ action: "save", audience: "partner", sceneId: "PAR-THEME-CARE", revision: 0,
    override: { titleScale: 1.1 } }), ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.payload.item.override.titleScale, 1.1);

  // texto continua proibido em cena de território
  const blockedText = res();
  await handler(req({ action: "save", audience: "partner", sceneId: "PAR-THEME-CARE", revision: 0,
    override: { titleScale: 1.1, title: "não pode" } }), blockedText);
  assert.equal(blockedText.statusCode, 400);

  // e cor de fundo continua proibida em cena comum
  const blockedColor = res();
  await handler(req({ action: "save", audience: "partner", sceneId: "PAR-03", revision: 0,
    override: { backgroundColor: "#10291E", titleScale: 1.1 } }), blockedColor);
  assert.equal(blockedColor.statusCode, 400);
});

test("no cliente, as escalas chegam ao herói, à cena e ao território — e valor fora da faixa é contido", () => {
  const base = {
    hero: { asset: { id: "INF-HERO", alt: "Hero" }, kicker: "K", fallbackTitle: "T", text: "X" },
    scenes: [{ id: "welcome", assetId: "INF-01", eyebrow: "E", title: "T", text: "X", alt: "A", asset: { id: "INF-01", alt: "A" } }],
  };
  const merged = applyMovementContentOverrides(base, [
    { sceneId: "INF-HERO", revision: 1, override: { titleScale: 1.3 } },
    { sceneId: "INF-01", revision: 1, override: { titleScale: 9, bodyScale: 0.1 } },
    { sceneId: "INF-THEME-MOVEMENT", revision: 1, override: { titleScale: 0.9, bodyScale: 1.2 } },
  ]);
  assert.equal(merged.hero.titleScale, 1.3);
  assert.equal(merged.hero.bodyScale, undefined);
  // um valor corrompido no transporte nunca vira texto gigante nem ilegível
  assert.equal(merged.scenes[0].titleScale, 1.5);
  assert.equal(merged.scenes[0].bodyScale, 0.7);
  assert.deepEqual(merged.territoryTypeScales, { movement: { title: 0.9, body: 1.2 } });
});

test("o CSS multiplica o padrão pela escala em todos os pontos editáveis", async () => {
  const css = await readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8");
  // card do território, desktop e celular
  assert.match(css, /\.mv-territory-copy h2\{[^}]*font-size:calc\(clamp\(27px,2\.5vw,38px\) \* var\(--mv-fs-t,1\)\)/);
  assert.match(css, /\.mv-territory-copy>p\{[^}]*font-size:calc\(clamp\(10px,\.9vw,13px\) \* var\(--mv-fs-b,1\)\)/);
  assert.match(css, /\.mv-territory-copy h2\{[^}]*font-size:calc\(clamp\(18px,5vw,22px\) \* var\(--mv-fs-t,1\)\)/);
  assert.match(css, /\.mv-territory-copy>p\{[^}]*font-size:calc\(8\.5px \* var\(--mv-fs-b,1\)\)/);
  // diálogo de detalhes: manchete do território e cenas com escala própria
  assert.match(css, /\.mv-story-detail>h2\{[^}]*font-size:calc\(clamp\(42px,6vw,68px\) \* var\(--mv-fs-t,1\)\)/);
  assert.match(css, /\.mv-story-detail-scenes h3\{[^}]*font-size:calc\(27px \* var\(--mv-scene-fs-t,1\)\)/);
  assert.match(css, /\.mv-story-detail-scenes p\{[^}]*font-size:calc\(14px \* var\(--mv-scene-fs-b,1\)\)/);
  // texto de apoio do herói
  assert.match(css, /\.mv-hero-support\{[^}]*font-size:calc\(clamp\(16px,1\.6vw,21px\) \* var\(--mv-fs-b,1\)\)/);
});

test("a apresentação usa as fontes da marca que a página já carrega", async () => {
  const css = await readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  // Fraunces no display, DM Sans no texto — o mesmo par do resto do site
  assert.match(css, /\.mv-root\{[^}]*font-family:'DM Sans',ui-sans-serif/);
  assert.match(css, /font-family:Fraunces,ui-serif,Georgia,serif/);
  // e nenhum resto da fonte de sistema sozinha no lugar do display
  assert.doesNotMatch(css, /font-family:ui-serif/);
  // o index.html realmente entrega as duas famílias
  assert.match(html, /family=Fraunces[^"]*family=DM\+Sans/);
});

test("a migração cria as colunas com a mesma faixa validada na API", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260817170000_bento_movement_font_scales.sql", import.meta.url), "utf8");
  assert.match(sql, /add column if not exists title_scale numeric/i);
  assert.match(sql, /add column if not exists body_scale numeric/i);
  assert.match(sql, /title_scale is null or \(title_scale >= 0\.7 and title_scale <= 1\.5\)/i);
  assert.match(sql, /body_scale is null or \(body_scale >= 0\.7 and body_scale <= 1\.5\)/i);
  assert.match(sql, /notify pgrst, 'reload schema'/i);
});

test("com a migração ainda não aplicada, a leitura cai no SELECT antigo e nada some do site", async () => {
  const selects = [];
  const handler = createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url) => {
      const select = new URL(url).searchParams.get("select") || "";
      selects.push(select);
      // banco sem as colunas novas: recusa o SELECT que as menciona
      if (select.includes("title_scale")) return { ok: false, status: 400, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => [{
        audience_type: "influencer", scene_id: "INF-01", image_url: null, mobile_image_url: null,
        image_opacity: null, background_color: null, eyebrow: null, title: "Título salvo",
        body: null, alt_text: null, revision: 2,
      }] };
    },
  });
  const out = res();
  await handler({ method: "GET", headers: {}, query: { audience: "influencer" } }, out);
  assert.equal(out.statusCode, 200);
  assert.equal(selects.length, 2);
  assert.match(selects[0], /title_scale/);
  assert.doesNotMatch(selects[1], /title_scale/);
  // a personalização já publicada continua chegando ao visitante
  assert.equal(out.payload.items.length, 1);
  assert.equal(out.payload.items[0].override.title, "Título salvo");
});
