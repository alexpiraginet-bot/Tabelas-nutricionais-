import crypto from "node:crypto";
import { readMovementJsonBody } from "../lib/movement-invite.mjs";
import {
  movementOverrideInsertRow,
  movementOverridePatchRow,
  isMovementThemeScene,
  sanitizeMovementContentOverride,
  sanitizeMovementContentRows,
  validateMovementContentTarget,
} from "../lib/movement-content-config.mjs";
import { verifyMovementMediaUrl } from "../lib/movement-media-verification.mjs";
import { normalizeSupabaseBaseUrl, supabaseServiceHeaders } from "../lib/supabase-rest.mjs";

const TABLE = "movement_presentation_content";
const SELECT = "audience_type,scene_id,image_url,mobile_image_url,image_opacity,background_color,title_scale,body_scale,eyebrow,title,body,alt_text,revision";
// Se a migração font_scales ainda não rodou, o SELECT novo toma 400 do
// PostgREST. Sem este fallback, a página pública perderia TODAS as
// personalizações já salvas até alguém rodar a migração — inaceitável.
const LEGACY_SELECT = "audience_type,scene_id,image_url,mobile_image_url,image_opacity,background_color,eyebrow,title,body,alt_text,revision";
// Cena -THEME- guarda só o visual do card do território: cor de fundo e escalas de fonte.
const THEME_SCENE_FIELDS = new Set(["backgroundColor", "titleScale", "bodyScale"]);

function panelAuthorized(req, env) {
  const expected = String(env.PANEL_KEY || "");
  const authorization = String(req.headers?.authorization || "");
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !provided) return false;
  const expectedHash = crypto.createHash("sha256").update(expected, "utf8").digest();
  const providedHash = crypto.createHash("sha256").update(provided, "utf8").digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}

function config(env) {
  return {
    url: normalizeSupabaseBaseUrl(env.SUPABASE_URL),
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "",
  };
}

function validRevision(value) {
  return Number.isInteger(value) && value >= 0 && value <= 2147483646;
}

async function readOverrides(fetchImpl, cfg, audience = "") {
  const filter = audience ? `&audience_type=eq.${encodeURIComponent(audience)}` : "";
  const read = (select) => fetchImpl(`${cfg.url}/rest/v1/${TABLE}?select=${select}${filter}&order=audience_type.asc,scene_id.asc`, {
    headers: supabaseServiceHeaders(cfg.key),
  });
  let response = await read(SELECT);
  if (response.status === 400) response = await read(LEGACY_SELECT);
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.json();
}

async function readTargetRows(fetchImpl, cfg, target) {
  const url = `${cfg.url}/rest/v1/${TABLE}?select=audience_type,scene_id,revision&audience_type=eq.${encodeURIComponent(target.audienceType)}&scene_id=eq.${encodeURIComponent(target.sceneId)}&limit=1`;
  const response = await fetchImpl(url, { headers: supabaseServiceHeaders(cfg.key) });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function responseOverride(rows, env) {
  return sanitizeMovementContentRows(rows, env, { includeRevision: true })[0] || null;
}

function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
}

export function createMovementContentHandler({ fetchImpl = fetch, env = process.env, mediaTimeoutMs = 5000 } = {}) {
  return async function movementContentHandler(req, res) {
    if (req.method !== "GET" && req.method !== "POST") { res.status(405).end(); return; }
    const fresh = req.method === "GET" && req.query?.fresh !== undefined;
    const needsAdmin = req.method === "POST" || fresh;
    if (needsAdmin) noStore(res);
    else res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    if (needsAdmin && !panelAuthorized(req, env)) { res.status(401).json({ ok: false, error: "Não autorizado." }); return; }

    const cfg = config(env);
    if (!cfg.url || !cfg.key) {
      if (req.method === "GET" && !fresh) { res.status(200).json({ ok: true, items: [] }); return; }
      res.status(503).json({ ok: false, error: "Conteúdo do Movimento temporariamente indisponível." });
      return;
    }

    if (req.method === "GET") {
      const audience = req.query?.audience === undefined ? "" : String(req.query.audience || "");
      if (audience && !Object.hasOwn({ influencer: true, partner: true }, audience)) {
        res.status(400).json({ ok: false, error: "Público do conteúdo inválido." });
        return;
      }
      try {
        const rows = await readOverrides(fetchImpl, cfg, audience);
        const items = sanitizeMovementContentRows(rows, env, { includeRevision: fresh });
        res.status(200).json({ ok: true, items });
      } catch {
        if (!fresh) { res.status(200).json({ ok: true, items: [] }); return; }
        res.status(502).json({ ok: false, error: "Não foi possível carregar o conteúdo do Movimento agora." });
      }
      return;
    }

    const bodyResult = await readMovementJsonBody(req);
    if (!bodyResult.ok) { res.status(413).json({ ok: false, error: "Envio muito grande." }); return; }
    const body = bodyResult.value;
    const target = validateMovementContentTarget(body.audience ?? body.audienceType, body.sceneId);
    if (!target.ok) { res.status(400).json({ ok: false, error: target.error }); return; }
    if (!validRevision(body.revision)) { res.status(400).json({ ok: false, error: "Versão do conteúdo inválida." }); return; }

    if (body.action === "reset") {
      try {
        if (body.revision === 0) {
          const current = await readTargetRows(fetchImpl, cfg, target.value);
          if (current.length) { res.status(409).json({ ok: false, error: "Este conteúdo foi alterado em outra sessão. Atualize antes de salvar." }); return; }
          res.status(200).json({ ok: true, audience: target.value.audienceType, sceneId: target.value.sceneId, revision: 0 });
          return;
        }
        const url = `${cfg.url}/rest/v1/${TABLE}?audience_type=eq.${encodeURIComponent(target.value.audienceType)}&scene_id=eq.${encodeURIComponent(target.value.sceneId)}&revision=eq.${body.revision}`;
        const deleted = await fetchImpl(url, {
          method: "DELETE",
          headers: supabaseServiceHeaders(cfg.key, { Prefer: "return=representation" }),
        });
        if (!deleted.ok) throw new Error(`Supabase ${deleted.status}`);
        const rows = await deleted.json();
        if (!Array.isArray(rows) || rows.length !== 1) { res.status(409).json({ ok: false, error: "Este conteúdo foi alterado em outra sessão. Atualize antes de salvar." }); return; }
        res.status(200).json({ ok: true, audience: target.value.audienceType, sceneId: target.value.sceneId, revision: 0 });
      } catch {
        res.status(502).json({ ok: false, error: "Não foi possível salvar o conteúdo do Movimento agora." });
      }
      return;
    }

    if (body.action !== "save") { res.status(400).json({ ok: false, error: "Ação inválida." }); return; }
    const override = sanitizeMovementContentOverride(body.override, env, { partial: body.revision > 0 });
    if (!override.ok) { res.status(400).json({ ok: false, error: override.error }); return; }
    const overrideFields = Object.keys(override.value);
    if (isMovementThemeScene(target.value.sceneId) ? overrideFields.some((field) => !THEME_SCENE_FIELDS.has(field)) : overrideFields.includes("backgroundColor")) {
      res.status(400).json({ ok: false, error: "Configuração de território inválida." });
      return;
    }

    const remoteMedia = [...new Set([override.value.imageUrl, override.value.mobileImageUrl]
      .filter((url) => typeof url === "string" && url.startsWith("https://")))];
    for (const mediaUrl of remoteMedia) {
      const media = await verifyMovementMediaUrl(mediaUrl, { fetchImpl, timeoutMs: mediaTimeoutMs });
      if (!media.ok) { res.status(400).json({ ok: false, error: media.error }); return; }
    }

    try {
      let response;
      if (body.revision === 0) {
        response = await fetchImpl(`${cfg.url}/rest/v1/${TABLE}?on_conflict=audience_type,scene_id`, {
          method: "POST",
          headers: supabaseServiceHeaders(cfg.key, { Prefer: "return=representation" }),
          body: JSON.stringify(movementOverrideInsertRow(target.value, override.value)),
        });
      } else {
        const url = `${cfg.url}/rest/v1/${TABLE}?audience_type=eq.${encodeURIComponent(target.value.audienceType)}&scene_id=eq.${encodeURIComponent(target.value.sceneId)}&revision=eq.${body.revision}`;
        response = await fetchImpl(url, {
          method: "PATCH",
          headers: supabaseServiceHeaders(cfg.key, { Prefer: "return=representation" }),
          body: JSON.stringify(movementOverridePatchRow(override.value, body.revision)),
        });
      }
      if (!response.ok) {
        if (response.status === 409) { res.status(409).json({ ok: false, error: "Este conteúdo foi alterado em outra sessão. Atualize antes de salvar." }); return; }
        if (response.status === 400) { res.status(400).json({ ok: false, error: "Conteúdo inválido." }); return; }
        throw new Error(`Supabase ${response.status}`);
      }
      const saved = responseOverride(await response.json(), env);
      if (!saved) { res.status(409).json({ ok: false, error: "Este conteúdo foi alterado em outra sessão. Atualize antes de salvar." }); return; }
      res.status(200).json({ ok: true, item: saved });
    } catch {
      res.status(502).json({ ok: false, error: "Não foi possível salvar o conteúdo do Movimento agora." });
    }
  };
}

export default createMovementContentHandler();
