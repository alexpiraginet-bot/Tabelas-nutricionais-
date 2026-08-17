import test from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_MOVEMENT_SCENES,
  movementOverrideInsertRow,
  movementOverridePatchRow,
  sanitizeMovementContentOverride,
  sanitizeMovementContentRows,
  validateMovementContentTarget,
} from "../lib/movement-content-config.mjs";

const ENV = { SUPABASE_URL: "https://project.supabase.co/rest/v1", SUPABASE_BUCKET: "artes" };

test("movement content has a closed allowlist of the public presentation scenes", () => {
  assert.deepEqual(ALLOWED_MOVEMENT_SCENES.influencer, ["INF-HERO", ...Array.from({ length: 14 }, (_, index) => `INF-${String(index + 1).padStart(2, "0")}`), "INF-THEME-ARRIVAL", "INF-THEME-MOVEMENT", "INF-THEME-HOSPITALITY", "INF-THEME-CARE", "INF-THEME-CREATION"]);
  assert.deepEqual(ALLOWED_MOVEMENT_SCENES.partner, ["PAR-HERO", ...Array.from({ length: 16 }, (_, index) => `PAR-${String(index + 1).padStart(2, "0")}`), "PAR-THEME-ARRIVAL", "PAR-THEME-MOVEMENT", "PAR-THEME-HOSPITALITY", "PAR-THEME-CARE", "PAR-THEME-CREATION"]);
  assert.equal(validateMovementContentTarget("influencer", "INF-03").ok, true);
  assert.equal(validateMovementContentTarget("partner", "INF-03").ok, false);
  assert.equal(validateMovementContentTarget("guest", "INF-01").ok, false);
});

test("movement content validates and persists one background color per macro territory", () => {
  assert.deepEqual(sanitizeMovementContentOverride({ backgroundColor: "#e9e1d3" }, ENV), { ok: true, value: { backgroundColor: "#E9E1D3" } });
  for (const backgroundColor of ["#fff", "#12345678", "red", "var(--gold)", "#12GG56", 123456]) {
    assert.equal(sanitizeMovementContentOverride({ backgroundColor }, ENV).ok, false, String(backgroundColor));
  }

  const target = { audienceType: "partner", sceneId: "PAR-THEME-CARE" };
  assert.deepEqual(movementOverrideInsertRow(target, { backgroundColor: "#10291E" }), {
    audience_type: "partner", scene_id: "PAR-THEME-CARE", image_url: null, mobile_image_url: null,
    image_opacity: null, background_color: "#10291E", title_scale: null, body_scale: null, eyebrow: null, title: null, body: null, alt_text: null, revision: 1,
  });
  assert.deepEqual(movementOverridePatchRow({ backgroundColor: null }, 4), { background_color: null, revision: 5 });
});

test("movement content sanitizes only publishable scene overrides and blocks personal placeholders", () => {
  const valid = sanitizeMovementContentOverride({
    imageUrl: "/movimento/v2/inf-01.webp",
    mobileImageUrl: "https://project.supabase.co/storage/v1/object/public/artes/movimento/inf-01-mobile.webp",
    imageOpacity: 0.42,
    eyebrow: "Uma manhã para lembrar",
    title: "Movimento que permanece",
    body: "Uma descrição editorial curta, clara e pensada para o convite personalizado.",
    altText: "Convidadas em roupas de treino Bentô diante do Le Buffet Lounge preparado para o evento.",
  }, ENV);
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.value, {
    imageUrl: "/movimento/v2/inf-01.webp",
    mobileImageUrl: "https://project.supabase.co/storage/v1/object/public/artes/movimento/inf-01-mobile.webp",
    imageOpacity: 0.42,
    eyebrow: "Uma manhã para lembrar",
    title: "Movimento que permanece",
    body: "Uma descrição editorial curta, clara e pensada para o convite personalizado.",
    altText: "Convidadas em roupas de treino Bentô diante do Le Buffet Lounge preparado para o evento.",
  });

  for (const input of [
    { imageUrl: "javascript:alert(1)" },
    { imageUrl: "data:image/png;base64,abc" },
    { imageUrl: "http://project.supabase.co/storage/v1/object/public/artes/x.webp" },
    { imageUrl: "https://attacker.example/x.webp" },
    { imageUrl: "https://project.supabase.co/auth/v1/settings.jpg" },
    { imageUrl: "https://project.supabase.co/storage/v1/object/public/outro/movimento/x.webp" },
    { imageUrl: "https://project.supabase.co/storage/v1/object/public/artes/fora-do-movimento/x.webp" },
    { imageUrl: "https://project.supabase.co/storage/v1/object/public/artes/movimento/x.svg" },
    { imageUrl: "/movimento/v2/sem-extensao" },
    { title: "{Nome}, este convite é seu" },
    { eyebrow: "Para {Empresa}" },
    { body: "Olá, {Responsável}" },
    { altText: "curta" },
    { imageOpacity: 1.1 },
  ]) {
    assert.equal(sanitizeMovementContentOverride(input, ENV).ok, false, JSON.stringify(input));
  }
});

test("movement content rejects unknown fields and coercive field types", () => {
  for (const input of [
    { title: "Título válido", unexpected: "ignored" },
    { title: { injected: true } },
    { body: 123 },
    { imageOpacity: "0.5" },
    { imageOpacity: true },
  ]) {
    assert.equal(sanitizeMovementContentOverride(input, ENV).ok, false, JSON.stringify(input));
  }
});

test("movement content requires accessible copy in a final state with custom media", () => {
  assert.equal(sanitizeMovementContentOverride({ imageUrl: "/movimento/v2/nova.webp" }, ENV).ok, false);
  assert.equal(sanitizeMovementContentOverride({ imageUrl: "/movimento/v2/nova.webp" }, ENV, { partial: true }).ok, false);
  assert.equal(sanitizeMovementContentOverride({ mobileImageUrl: "/movimento/v2/nova-mobile.webp", altText: "Descrição curta" }, ENV).ok, false);
  assert.equal(sanitizeMovementContentOverride({
    imageUrl: "/movimento/v2/nova.webp",
    altText: "Convidadas chegando ao lounge para a celebração do primeiro aniversário Bentô.",
  }, ENV).ok, true);
});

test("movement content never exposes corrupted database rows to public visitors", () => {
  const rows = sanitizeMovementContentRows([
    {
      audience_type: "influencer", scene_id: "INF-01", image_url: "/movimento/v2/inf-01.webp", mobile_image_url: null,
      image_opacity: "0.6", background_color: "#E9E1D3", eyebrow: "Chegada", title: "A manhã começa aqui", body: "Uma experiência de movimento e hospitalidade pensada para celebrar a Bentô.",
      alt_text: "Convidadas chegando ao Le Buffet Lounge em uma manhã clara de celebração Bentô.", revision: 3,
    },
    {
      audience_type: "influencer", scene_id: "INF-99", image_url: "/movimento/v2/bad.webp", image_opacity: 0.6, revision: 1,
    },
    {
      audience_type: "partner", scene_id: "PAR-01", image_url: "https://attacker.example/a.webp", image_opacity: 0.6, revision: 1,
    },
    {
      audience_type: "partner", scene_id: "PAR-02", image_url: "/movimento/v2/custom.webp", image_opacity: 0.6, alt_text: null, revision: 1,
    },
  ], ENV);
  assert.deepEqual(rows, [{
    audience: "influencer", sceneId: "INF-01", revision: 3,
    override: {
      imageUrl: "/movimento/v2/inf-01.webp", mobileImageUrl: null, imageOpacity: 0.6, backgroundColor: "#E9E1D3", eyebrow: "Chegada",
      title: "A manhã começa aqui", body: "Uma experiência de movimento e hospitalidade pensada para celebrar a Bentô.",
      altText: "Convidadas chegando ao Le Buffet Lounge em uma manhã clara de celebração Bentô.",
    },
  }]);
});

test("movement content preserves an unset opacity as unset instead of turning it into a black overlay", () => {
  const [item] = sanitizeMovementContentRows([{
    audience_type: "partner", scene_id: "PAR-01", image_url: null, mobile_image_url: null, image_opacity: null,
    eyebrow: null, title: "Sua marca pode estar aqui", body: null, alt_text: null, revision: 1,
  }], ENV);
  assert.equal(item.override.imageOpacity, null);
});
