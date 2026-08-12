import { hashInviteToken, validateAudienceType, validateToken } from "./movement-rsvp.mjs";

export const MOVEMENT_BODY_LIMIT_BYTES = 32 * 1024;

const ACTIVE_INVITE_STATUSES = new Set(["sent", "opened", "responded"]);

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
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

function parseJson(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function readMovementJsonBody(req, limitBytes = MOVEMENT_BODY_LIMIT_BYTES) {
  const declaredLength = Number(req.headers?.["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > limitBytes) return { ok: false, tooLarge: true };

  if (req.body !== undefined && req.body !== null) {
    let serialized;
    try {
      serialized = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    } catch {
      serialized = "{}";
    }
    if (Buffer.byteLength(serialized, "utf8") > limitBytes) return { ok: false, tooLarge: true };
    return { ok: true, value: typeof req.body === "string" ? parseJson(req.body) : req.body };
  }

  return new Promise((resolve) => {
    const chunks = [];
    let bytes = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > limitBytes) {
        tooLarge = true;
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (tooLarge) {
        resolve({ ok: false, tooLarge: true });
        return;
      }
      resolve({ ok: true, value: parseJson(Buffer.concat(chunks).toString("utf8")) });
    });
    req.on("error", () => resolve({ ok: true, value: {} }));
  });
}

export async function updateMovementInviteStatus({ fetchImpl, cfg, inviteId, status, now }) {
  const timestamp = now.toISOString();
  const response = await fetchImpl(`${cfg.url}/rest/v1/movement_invites?id=eq.${encodeURIComponent(inviteId)}&status=in.(sent,opened,responded)&revoked_at=is.null`, {
    method: "PATCH",
    headers: headers(cfg.key),
    body: JSON.stringify({ status, updated_at: timestamp }),
  });
  if (!response.ok) throw await supabaseFailure(response);
}

export async function resolveMovementInvite({ fetchImpl, cfg, token, now, markOpened = false }) {
  const tokenCheck = validateToken(token);
  if (!tokenCheck.ok) return null;

  const tokenHash = hashInviteToken(tokenCheck.value);
  const select = "id,display_name,audience_type,recipient_name,company_name,status,expires_at,opened_at";
  const url = `${cfg.url}/rest/v1/movement_invites?token_hash=eq.${tokenHash}&select=${select}&limit=1`;
  const response = await fetchImpl(url, { headers: headers(cfg.key) });
  if (!response.ok) throw await supabaseFailure(response);
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  const audience = validateAudienceType(row?.audience_type);
  const expiresAtMs = Date.parse(row?.expires_at || "");
  if (!row || !audience.ok || !ACTIVE_INVITE_STATUSES.has(row.status) || !Number.isFinite(expiresAtMs) || expiresAtMs <= now.getTime()) return null;

  let status = row.status;
  if (markOpened && row.opened_at == null) {
    const timestamp = now.toISOString();
    const opening = { opened_at: timestamp, updated_at: timestamp };
    if (status === "sent") {
      opening.status = "opened";
      status = "opened";
    }
    const opened = await fetchImpl(`${cfg.url}/rest/v1/movement_invites?id=eq.${encodeURIComponent(row.id)}&opened_at=is.null&status=eq.${row.status}`, {
      method: "PATCH",
      headers: headers(cfg.key),
      body: JSON.stringify(opening),
    });
    if (!opened.ok) throw await supabaseFailure(opened);
  }

  return {
    id: row.id,
    displayName: row.display_name || (audience.value === "partner" ? row.company_name : row.recipient_name) || "Convidada",
    audienceType: audience.value,
    recipientName: row.recipient_name || null,
    companyName: row.company_name || null,
    status,
    expiresAt: row.expires_at,
  };
}
