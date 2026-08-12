export function normalizeSupabaseBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
}

export function supabaseServiceHeaders(key, extra = {}) {
  const headers = { apikey: key, "Content-Type": "application/json" };
  if (!String(key).startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  return { ...headers, ...extra };
}
