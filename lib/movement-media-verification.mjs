const MAX_MOVEMENT_MEDIA_BYTES = 12 * 1024 * 1024;
const RANGE_BYTES = 32;

const MEDIA_BY_EXTENSION = Object.freeze({
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
});

function expectedMediaType(url) {
  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
    return match ? MEDIA_BY_EXTENSION[match[1].toLowerCase()] || "" : "";
  } catch {
    return "";
  }
}

function normalizedContentType(response) {
  return String(response.headers?.get?.("content-type") || "").split(";", 1)[0].trim().toLowerCase();
}

function positiveIntegerHeader(response, name) {
  const raw = String(response.headers?.get?.(name) || "").trim();
  if (!/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

async function timedFetch(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readBoundedBody(response) {
  const reader = response.body?.getReader?.();
  if (!reader) return null;
  const output = new Uint8Array(RANGE_BYTES);
  let offset = 0;
  try {
    while (offset < RANGE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || offset + value.byteLength > RANGE_BYTES) return null;
      output.set(value, offset);
      offset += value.byteLength;
    }
    const extra = await reader.read();
    if (!extra.done) return null;
    return output.slice(0, offset);
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function matchesMagicBytes(bytes, contentType) {
  if (!(bytes instanceof Uint8Array)) return false;
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (contentType === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  if (contentType === "image/avif") {
    if (bytes.length < 12 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") return false;
    const brands = String.fromCharCode(...bytes.slice(8));
    return brands.includes("avif") || brands.includes("avis");
  }
  return false;
}

export async function verifyMovementMediaUrl(url, { fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  const expectedType = expectedMediaType(url);
  if (!expectedType) return { ok: false, error: "Não foi possível validar a imagem enviada." };
  try {
    const head = await timedFetch(fetchImpl, url, { method: "HEAD", redirect: "error" }, timeoutMs);
    const totalBytes = positiveIntegerHeader(head, "content-length");
    if (!head.ok || normalizedContentType(head) !== expectedType || totalBytes < RANGE_BYTES || totalBytes > MAX_MOVEMENT_MEDIA_BYTES) {
      return { ok: false, error: "Não foi possível validar a imagem enviada." };
    }

    const range = await timedFetch(fetchImpl, url, {
      method: "GET",
      redirect: "error",
      headers: { Range: `bytes=0-${RANGE_BYTES - 1}` },
    }, timeoutMs);
    const rangeLength = positiveIntegerHeader(range, "content-length");
    const contentRange = String(range.headers?.get?.("content-range") || "").trim();
    const rangeMatch = contentRange.match(/^bytes 0-(\d+)\/(\d+)$/i);
    if (range.status !== 206 || normalizedContentType(range) !== expectedType || !rangeMatch) {
      return { ok: false, error: "Não foi possível validar a imagem enviada." };
    }
    const rangeEnd = Number(rangeMatch[1]);
    const rangeTotal = Number(rangeMatch[2]);
    if (!Number.isInteger(rangeEnd) || rangeEnd < 0 || rangeEnd >= RANGE_BYTES || rangeLength !== rangeEnd + 1 || rangeTotal !== totalBytes) {
      return { ok: false, error: "Não foi possível validar a imagem enviada." };
    }
    const prefix = await readBoundedBody(range);
    if (!prefix || prefix.length !== rangeLength || !matchesMagicBytes(prefix, expectedType)) {
      return { ok: false, error: "Não foi possível validar a imagem enviada." };
    }
    return { ok: true, contentType: expectedType, size: totalBytes };
  } catch {
    return { ok: false, error: "Não foi possível validar a imagem enviada." };
  }
}
