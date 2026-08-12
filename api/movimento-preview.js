import { readFile } from "node:fs/promises";
import { resolveMovementInvite } from "../lib/movement-invite.mjs";
import { normalizeSupabaseBaseUrl } from "../lib/supabase-rest.mjs";

const SITE = "https://bentogelateria.com";
const PUBLIC_MOVEMENT_URL = `${SITE}/movimento`;

function config(env) {
  return {
    url: normalizeSupabaseBaseUrl(env.SUPABASE_URL),
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || "",
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cleanIdentity(value, maxLength = 80) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function previewIdentity(invite) {
  if (invite.audienceType === "partner") {
    return cleanIdentity(invite.companyName || invite.displayName) || "Sua empresa";
  }
  const fullName = cleanIdentity(invite.recipientName || invite.displayName);
  return fullName.split(" ")[0] || "Convidada";
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`Personal preview shell is missing ${label}`);
  return html.replace(pattern, replacement);
}

function setMeta(html, attr, key, value) {
  const escaped = escapeHtml(value);
  return replaceRequired(
    html,
    new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
    `$1${escaped}$2`,
    `meta ${key}`,
  );
}

function personalizeShell(shell, invite) {
  const identity = previewIdentity(invite);
  const title = invite.audienceType === "partner"
    ? `${identity}, esta proposta é para vocês — Bentô Gelatos`
    : `${identity}, este convite é seu — Bentô Gelatos`;
  const image = invite.audienceType === "partner"
    ? `${SITE}/movimento/og-parceiros.jpg`
    : `${SITE}/movimento/og-influenciadoras.jpg`;

  let html = replaceRequired(shell, /<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`, "title");
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "name", "twitter:image", image);
  html = setMeta(html, "property", "og:url", PUBLIC_MOVEMENT_URL);
  html = replaceRequired(
    html,
    /(<link rel="canonical" href=")[^"]*(")/,
    `$1${PUBLIC_MOVEMENT_URL}$2`,
    "canonical link",
  );
  return html;
}

async function readPersonalShell() {
  return readFile(new URL("../dist/movimento/convite/index.html", import.meta.url), "utf8");
}

function setPrivateHeaders(res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
}

export function createMovementPreviewHandler({
  fetchImpl = fetch,
  env = process.env,
  now = () => new Date(),
  readShell = readPersonalShell,
} = {}) {
  return async function movementPreviewHandler(req, res) {
    setPrivateHeaders(res);
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      res.status(405).end();
      return;
    }

    let shell;
    try {
      shell = await readShell();
    } catch {
      res.status(503).send("<!doctype html><html lang=\"pt-BR\"><head><meta name=\"robots\" content=\"noindex, nofollow\"><title>Convite Bentô</title></head><body></body></html>");
      return;
    }

    const cfg = config(env);
    if (!cfg.url || !cfg.key) {
      res.status(200).send(shell);
      return;
    }

    try {
      const invite = await resolveMovementInvite({
        fetchImpl,
        cfg,
        token: req.query?.token,
        now: now(),
        markOpened: false,
      });
      res.status(200).send(invite ? personalizeShell(shell, invite) : shell);
    } catch (error) {
      console.error("[movement-preview] upstream failure", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(200).send(shell);
    }
  };
}

export default createMovementPreviewHandler();
