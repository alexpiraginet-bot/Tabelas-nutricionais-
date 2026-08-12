import test from "node:test";
import assert from "node:assert/strict";
import { verifyMovementMediaUrl } from "../lib/movement-media-verification.mjs";

const PREFIX = "https://project.supabase.co/storage/v1/object/public/artes/movimento/2026-08-12/media";

const MEDIA = [
  ["jpg", "image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
  ["png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["webp", "image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ["avif", "image/avif", [0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]],
];

function rangeResponse(type, prefix, total = 2048) {
  const bytes = new Uint8Array(32);
  bytes.set(prefix);
  return new Response(bytes, {
    status: 206,
    headers: {
      "Content-Type": type,
      "Content-Length": "32",
      "Content-Range": `bytes 0-31/${total}`,
    },
  });
}

test("movement media verifier recognizes JPEG, PNG, WebP, and AVIF from bounded range bytes", async () => {
  for (const [extension, type, prefix] of MEDIA) {
    const calls = [];
    const result = await verifyMovementMediaUrl(`${PREFIX}.${extension}`, {
      fetchImpl: async (_url, options) => {
        calls.push(options);
        if (options.method === "HEAD") return new Response(null, { status: 200, headers: { "Content-Type": type, "Content-Length": "2048" } });
        return rangeResponse(type, prefix);
      },
      timeoutMs: 100,
    });
    assert.equal(result.ok, true, extension);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].headers.Range, "bytes=0-31");
  }
});

test("movement media verifier aborts a stalled HEAD request", async () => {
  const result = await verifyMovementMediaUrl(`${PREFIX}.jpg`, {
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }),
  });
  assert.deepEqual(result, { ok: false, error: "Não foi possível validar a imagem enviada." });
});

test("movement media verifier rejects missing length and a range whose total changed", async () => {
  const missingLength = await verifyMovementMediaUrl(`${PREFIX}.jpg`, {
    fetchImpl: async () => new Response(null, { status: 200, headers: { "Content-Type": "image/jpeg" } }),
  });
  assert.equal(missingLength.ok, false);

  const changed = await verifyMovementMediaUrl(`${PREFIX}.jpg`, {
    fetchImpl: async (_url, options) => options.method === "HEAD"
      ? new Response(null, { status: 200, headers: { "Content-Type": "image/jpeg", "Content-Length": "2048" } })
      : rangeResponse("image/jpeg", [0xff, 0xd8, 0xff], 4096),
  });
  assert.equal(changed.ok, false);
});
