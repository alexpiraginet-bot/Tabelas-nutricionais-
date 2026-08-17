const PLACEHOLDER_PATTERN = /\{\s*(?:nome|empresa|responsavel)\s*\}/i;
const TERRITORY_KEYS = Object.freeze(["ARRIVAL", "MOVEMENT", "HOSPITALITY", "CARE", "CREATION"]);
export const ALLOWED_MOVEMENT_SCENES = Object.freeze({
  influencer: Object.freeze(["INF-HERO", ...Array.from({ length: 14 }, (_, index) => `INF-${String(index + 1).padStart(2, "0")}`), ...TERRITORY_KEYS.map((key) => `INF-THEME-${key}`)]),
  partner: Object.freeze(["PAR-HERO", ...Array.from({ length: 16 }, (_, index) => `PAR-${String(index + 1).padStart(2, "0")}`), ...TERRITORY_KEYS.map((key) => `PAR-THEME-${key}`)]),
});

const FIELD_LIMITS = Object.freeze({
  eyebrow: [0, 60],
  title: [0, 140],
  body: [0, 360],
  altText: [24, 240],
});
const ALLOWED_OVERRIDE_FIELDS = new Set(["imageUrl", "mobileImageUrl", "imageOpacity", "backgroundColor", "titleScale", "bodyScale", "eyebrow", "title", "body", "altText"]);
// Multiplicador do tamanho padrão do código. A mesma faixa vive na constraint
// do banco (migração font_scales) — mudar aqui exige mudar lá.
export const MOVEMENT_FONT_SCALE_RANGE = Object.freeze({ minimum: 0.7, maximum: 1.5 });
const IMAGE_EXTENSION_PATTERN = /\.(?:jpe?g|png|webp|avif)$/i;
const BACKGROUND_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function normalizedText(value) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function hasPersonalPlaceholder(value) {
  return PLACEHOLDER_PATTERN.test(String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}

function configuredSupabaseOrigin(env) {
  try {
    const parsed = new URL(String(env?.SUPABASE_URL || ""));
    return parsed.protocol === "https:" ? parsed.origin : "";
  } catch {
    return "";
  }
}

export function validateMovementContentTarget(audienceType, sceneId) {
  const audience = String(audienceType || "");
  const scene = String(sceneId || "");
  if (!Object.hasOwn(ALLOWED_MOVEMENT_SCENES, audience)) return { ok: false, error: "Público do conteúdo inválido." };
  if (!ALLOWED_MOVEMENT_SCENES[audience].includes(scene)) return { ok: false, error: "Cena do conteúdo inválida." };
  return { ok: true, value: { audienceType: audience, sceneId: scene } };
}

export function isMovementThemeScene(sceneId) {
  return /^(?:INF|PAR)-THEME-(?:ARRIVAL|MOVEMENT|HOSPITALITY|CARE|CREATION)$/.test(String(sceneId || ""));
}

export function sanitizeMovementContentUrl(value, env) {
  if (value !== null && typeof value !== "string") return { ok: false, error: "Imagem inválida." };
  const candidate = normalizedText(value);
  if (!candidate) return { ok: true, value: null };
  if (candidate.startsWith("/")) {
    if (candidate.startsWith("//") || !candidate.startsWith("/movimento/") || candidate.includes("..") || /[%?#\\]/.test(candidate) || !IMAGE_EXTENSION_PATTERN.test(candidate)) {
      return { ok: false, error: "Imagem inválida." };
    }
    return { ok: true, value: candidate };
  }
  try {
    const parsed = new URL(candidate);
    const origin = configuredSupabaseOrigin(env);
    const bucket = String(env?.SUPABASE_BUCKET || "artes");
    const storagePrefix = `/storage/v1/object/public/${bucket}/movimento/`;
    if (!origin || parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash
      || /[%\\]/.test(parsed.pathname) || !parsed.pathname.startsWith(storagePrefix) || !IMAGE_EXTENSION_PATTERN.test(parsed.pathname)) {
      return { ok: false, error: "Imagem inválida." };
    }
    return { ok: true, value: parsed.toString() };
  } catch {
    return { ok: false, error: "Imagem inválida." };
  }
}

function sanitizeText(value, [minimum, maximum], label) {
  if (value === undefined) return { ok: true, present: false };
  if (value !== null && typeof value !== "string") return { ok: false, error: `${label} inválido.` };
  const text = normalizedText(value);
  if (!text) return { ok: true, present: true, value: null };
  if (text.length < minimum || text.length > maximum || /[<>]/.test(text) || hasPersonalPlaceholder(text)) {
    return { ok: false, error: `${label} inválido.` };
  }
  return { ok: true, present: true, value: text };
}

export function sanitizeMovementContentOverride(value, env) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Conteúdo inválido." };
  if (Object.keys(value).some((key) => !ALLOWED_OVERRIDE_FIELDS.has(key))) return { ok: false, error: "Conteúdo inválido." };
  const output = {};
  for (const [inputKey, outputKey] of [["imageUrl", "imageUrl"], ["mobileImageUrl", "mobileImageUrl"]]) {
    if (value[inputKey] === undefined) continue;
    const checked = sanitizeMovementContentUrl(value[inputKey], env);
    if (!checked.ok) return checked;
    output[outputKey] = checked.value;
  }
  if (value.imageOpacity !== undefined) {
    if (value.imageOpacity === null) {
      output.imageOpacity = null;
    } else {
      if (typeof value.imageOpacity !== "number" || !Number.isFinite(value.imageOpacity) || value.imageOpacity < 0 || value.imageOpacity > 1) return { ok: false, error: "Opacidade inválida." };
      output.imageOpacity = value.imageOpacity;
    }
  }
  for (const [key, label] of [["titleScale", "Tamanho do título"], ["bodyScale", "Tamanho do texto"]]) {
    if (value[key] === undefined) continue;
    if (value[key] === null) {
      output[key] = null;
      continue;
    }
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])
      || value[key] < MOVEMENT_FONT_SCALE_RANGE.minimum || value[key] > MOVEMENT_FONT_SCALE_RANGE.maximum) {
      return { ok: false, error: `${label} inválido.` };
    }
    // duas casas bastam para o deslizador e evitam ruído de ponto flutuante no banco
    output[key] = Math.round(value[key] * 100) / 100;
  }
  if (value.backgroundColor !== undefined) {
    if (value.backgroundColor === null) {
      output.backgroundColor = null;
    } else if (typeof value.backgroundColor !== "string" || !BACKGROUND_COLOR_PATTERN.test(value.backgroundColor.trim())) {
      return { ok: false, error: "Cor de fundo inválida." };
    } else {
      output.backgroundColor = value.backgroundColor.trim().toUpperCase();
    }
  }
  for (const [key, limits, label] of [["eyebrow", FIELD_LIMITS.eyebrow, "Texto superior"], ["title", FIELD_LIMITS.title, "Título"], ["body", FIELD_LIMITS.body, "Texto"], ["altText", FIELD_LIMITS.altText, "Texto alternativo"]]) {
    const checked = sanitizeText(value[key], limits, label);
    if (!checked.ok) return checked;
    if (checked.present) output[key] = checked.value;
  }
  if (!Object.keys(output).length) return { ok: false, error: "Informe ao menos uma alteração." };
  if ((output.imageUrl || output.mobileImageUrl) && typeof output.altText !== "string") {
    return { ok: false, error: "Descrição acessível obrigatória para imagem personalizada." };
  }
  return { ok: true, value: output };
}

function rowToOverride(row, env, includeRevision) {
  const target = validateMovementContentTarget(row?.audience_type, row?.scene_id);
  if (!target.ok) return null;
  const storedOpacity = row.image_opacity === null ? null : Number(row.image_opacity);
  // numeric do Postgres pode chegar como string pelo PostgREST — normaliza antes de validar
  const storedNumber = (value) => {
    if (value === null || value === undefined) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  };
  const source = {
    imageUrl: row.image_url,
    mobileImageUrl: row.mobile_image_url,
    imageOpacity: Number.isFinite(storedOpacity) ? storedOpacity : row.image_opacity,
    backgroundColor: row.background_color,
    titleScale: storedNumber(row.title_scale),
    bodyScale: storedNumber(row.body_scale),
    eyebrow: row.eyebrow,
    title: row.title,
    body: row.body,
    altText: row.alt_text,
  };
  const verified = sanitizeMovementContentOverride(source, env);
  if (!verified.ok) return null;
  const revision = Number(row.revision);
  if (!Number.isInteger(revision) || revision < 1) return null;
  return {
    audience: target.value.audienceType,
    sceneId: target.value.sceneId,
    ...(includeRevision ? { revision } : {}),
    override: {
      imageUrl: verified.value.imageUrl ?? null,
      mobileImageUrl: verified.value.mobileImageUrl ?? null,
      imageOpacity: verified.value.imageOpacity ?? null,
      ...(typeof verified.value.backgroundColor === "string" ? { backgroundColor: verified.value.backgroundColor } : {}),
      ...(typeof verified.value.titleScale === "number" ? { titleScale: verified.value.titleScale } : {}),
      ...(typeof verified.value.bodyScale === "number" ? { bodyScale: verified.value.bodyScale } : {}),
      eyebrow: verified.value.eyebrow ?? null,
      title: verified.value.title ?? null,
      body: verified.value.body ?? null,
      altText: verified.value.altText ?? null,
    },
  };
}

export function sanitizeMovementContentRows(rows, env, { includeRevision = true } = {}) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => rowToOverride(row, env, includeRevision)).filter(Boolean);
}

export function movementOverrideInsertRow(target, override) {
  return {
    audience_type: target.audienceType,
    scene_id: target.sceneId,
    image_url: override.imageUrl ?? null,
    mobile_image_url: override.mobileImageUrl ?? null,
    image_opacity: override.imageOpacity ?? null,
    background_color: override.backgroundColor ?? null,
    title_scale: override.titleScale ?? null,
    body_scale: override.bodyScale ?? null,
    eyebrow: override.eyebrow ?? null,
    title: override.title ?? null,
    body: override.body ?? null,
    alt_text: override.altText ?? null,
    revision: 1,
  };
}

export function movementOverridePatchRow(override, revision) {
  const row = { revision: revision + 1 };
  const columns = {
    imageUrl: "image_url",
    mobileImageUrl: "mobile_image_url",
    imageOpacity: "image_opacity",
    backgroundColor: "background_color",
    titleScale: "title_scale",
    bodyScale: "body_scale",
    eyebrow: "eyebrow",
    title: "title",
    body: "body",
    altText: "alt_text",
  };
  for (const [key, column] of Object.entries(columns)) if (Object.hasOwn(override, key)) row[column] = override[key];
  return row;
}
