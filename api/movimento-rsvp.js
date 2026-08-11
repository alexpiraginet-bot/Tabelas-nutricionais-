import { hashInviteToken, publicInvite, validateRsvpPayload, validateToken } from "../lib/movement-rsvp.mjs";
import { normalizeSupabaseBaseUrl } from "../lib/supabase-rest.mjs";

const ALLOWED_HOSTS = ["bentogelateria.com", "localhost", "127.0.0.1"];

function originOk(req) {
  const raw = req.headers?.origin || req.headers?.referer || "";
  if (!raw) return true;
  try {
    const host = new URL(raw).hostname;
    return ALLOWED_HOSTS.includes(host) || host.endsWith(".bentogelateria.com") || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { if (data.length < 32768) data += chunk; });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

function config(env) {
  return {
    url: normalizeSupabaseBaseUrl(env.SUPABASE_URL),
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "",
  };
}

function safeSupabaseInfo(url, key) {
  try {
    const parsed = new URL(url);
    const hostname = /^[a-z0-9.-]+$/i.test(parsed.hostname) ? parsed.hostname : "invalid";
    const pathname = /^\/[a-z0-9/_-]*$/i.test(parsed.pathname) ? parsed.pathname : "invalid";
    const keyKind = String(key).startsWith("sb_secret_") ? "secret" : String(key).startsWith("eyJ") ? "jwt" : "other";
    return { supabaseHost: hostname, supabasePath: pathname, keyKind };
  } catch {
    return { supabaseHost: "invalid", supabasePath: "invalid", keyKind: "unknown" };
  }
}

function cleanDiagnostic(value) {
  return String(value || "").replace(/[^\x20-\x7EÀ-ÿ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
}

async function supabaseFailure(response) {
  const body = await response.json().catch(() => ({}));
  const code = cleanDiagnostic(body?.code);
  const message = cleanDiagnostic(body?.message || body?.error);
  return new Error([`Supabase ${response.status}`, code, message].filter(Boolean).join(" · "));
}

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

function invitationIsActive(invite, now) {
  if (!invite || invite.status === "revoked" || invite.status === "expired") return false;
  const expires = Date.parse(invite.expires_at || "");
  return Number.isFinite(expires) && expires > now.getTime();
}

async function fetchInvite({ fetchImpl, cfg, token, now }) {
  const tokenCheck = validateToken(token);
  if (!tokenCheck.ok) return null;
  const tokenHash = hashInviteToken(tokenCheck.value);
  const select = "id,display_name,audience_type,status,expires_at";
  const url = `${cfg.url}/rest/v1/movement_invites?token_hash=eq.${tokenHash}&select=${select}&limit=1`;
  const response = await fetchImpl(url, { headers: headers(cfg.key) });
  if (!response.ok) throw await supabaseFailure(response);
  const rows = await response.json();
  const invite = Array.isArray(rows) ? rows[0] : null;
  return invitationIsActive(invite, now) ? invite : null;
}

async function fetchCurrentRsvp({ fetchImpl, cfg, inviteId }) {
  const select = "response,participation_mode,shirt_size,training_outfit_size,adult_companion_type,companion_count,child_count,child_kit_size,image_consent,privacy_version,updated_at";
  const url = `${cfg.url}/rest/v1/movement_rsvps?invite_id=eq.${encodeURIComponent(inviteId)}&select=${select}&limit=1`;
  const response = await fetchImpl(url, { headers: headers(cfg.key) });
  if (!response.ok) return null;
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || !row.response) return null;
  return {
    response: row.response,
    participationMode: row.participation_mode,
    shirtSize: row.shirt_size,
    trainingOutfitSize: row.training_outfit_size,
    adultCompanionType: row.adult_companion_type,
    companionCount: row.companion_count || 0,
    childCount: row.child_count || 0,
    childKitSize: row.child_kit_size,
    imageConsent: row.image_consent === true,
    privacyVersion: row.privacy_version,
    updatedAt: row.updated_at,
  };
}

export function createMovementHandler({ fetchImpl = fetch, env = process.env, now = () => new Date() } = {}) {
  return async function movementHandler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (req.method !== "GET" && req.method !== "POST") { res.status(405).end(); return; }
    if (!originOk(req)) { res.status(403).json({ ok: false, error: "Origem não autorizada." }); return; }

    const cfg = config(env);
    if (!cfg.url || !cfg.key) { res.status(503).json({ ok: false, error: "Confirmação temporariamente indisponível." }); return; }

    try {
      if (req.method === "GET") {
        const invite = await fetchInvite({ fetchImpl, cfg, token: req.query?.token, now: now() });
        if (!invite) { res.status(404).json({ ok: false, error: "Convite inválido ou expirado." }); return; }
        const currentRsvp = await fetchCurrentRsvp({ fetchImpl, cfg, inviteId: invite.id });
        res.status(200).json({ ok: true, invite: publicInvite(invite), currentRsvp });
        return;
      }

      const body = await readBody(req);
      if (body.siteUrl) { res.status(400).json({ ok: false, error: "Não foi possível registrar a resposta." }); return; }
      const invite = await fetchInvite({ fetchImpl, cfg, token: body.token, now: now() });
      if (!invite) { res.status(404).json({ ok: false, error: "Convite inválido ou expirado." }); return; }
      const valid = validateRsvpPayload(body);
      if (!valid.ok) { res.status(400).json({ ok: false, error: "Revise os campos indicados.", fields: valid.errors }); return; }

      const timestamp = now().toISOString();
      const row = {
        invite_id: invite.id,
        response: valid.value.response,
        participation_mode: valid.value.participationMode,
        shirt_size: valid.value.shirtSize,
        training_outfit_size: valid.value.trainingOutfitSize,
        adult_companion_type: valid.value.adultCompanionType,
        companion_count: valid.value.companionCount,
        child_count: valid.value.childCount,
        child_kit_size: valid.value.childKitSize,
        privacy_version: valid.value.privacyVersion,
        image_consent: valid.value.imageConsent,
        responded_at: timestamp,
        updated_at: timestamp,
      };
      const upsertUrl = `${cfg.url}/rest/v1/movement_rsvps?on_conflict=invite_id`;
      const persisted = await fetchImpl(upsertUrl, {
        method: "POST",
        headers: headers(cfg.key, { Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(row),
      });
      if (!persisted.ok) throw new Error(`Supabase ${persisted.status}`);
      res.status(200).json({ ok: true, reference: invite.id.slice(0, 8).toUpperCase(), response: valid.value.response, updatedAt: timestamp });
    } catch (error) {
      console.error("[movement-rsvp] upstream failure", {
        ...safeSupabaseInfo(cfg.url, cfg.key),
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(502).json({ ok: false, error: "Não foi possível registrar agora. Tente novamente." });
    }
  };
}

export default createMovementHandler();
