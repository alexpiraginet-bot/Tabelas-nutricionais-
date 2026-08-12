import test from "node:test";
import assert from "node:assert/strict";

process.env.PANEL_KEY = "panel-test-key";
process.env.FICHAS_KEY = "fichas-test-key";
process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test-key";
process.env.SUPABASE_BUCKET = "artes";

const { default: uploadHandler } = await import(`../api/upload.js?upload-test=${Date.now()}`);

function req(body, token = "panel-test-key") {
  return {
    method: "POST",
    query: {},
    body,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}

function res() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    end() { return this; },
  };
}

function signedResponse(url = "/object/upload/sign/artes/movimento/signed") {
  return { ok: true, status: 200, json: async () => ({ url }) };
}

test("movement image signing rejects unsupported, empty, and oversized media before Storage", async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return signedResponse(); };
  try {
    const invalidBodies = [
      { action: "sign", purpose: "movimento", name: "logo.svg", type: "image/svg+xml", size: 1200 },
      { action: "sign", purpose: "movimento", name: "logo.svg", type: "image/jpeg", size: 1200 },
      { action: "sign", purpose: "movimento", name: "foto.avif", type: "image/jpeg", size: 1200 },
      { action: "sign", purpose: "movimento", name: "foto.jpg", type: "image/png", size: 1200 },
      { action: "sign", purpose: "movimento", name: "foto.jpg", type: "image/jpeg", size: 0 },
      { action: "sign", purpose: "movimento", name: "foto.jpg", type: "image/jpeg", size: 12 * 1024 * 1024 + 1 },
    ];

    for (const body of invalidBodies) {
      const out = res();
      await uploadHandler(req(body), out);
      assert.equal(out.statusCode, 400);
      assert.equal(out.payload.ok, false);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("movement image signing is restricted to the panel credential", async () => {
  const previousFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; return signedResponse(); };
  try {
    const out = res();
    await uploadHandler(req({
      action: "sign", purpose: "movimento", name: "foto.jpg", type: "image/jpeg", size: 1200,
    }, "fichas-test-key"), out);
    assert.equal(out.statusCode, 401);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("movement image signing creates a new versioned path for repeated filenames", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return signedResponse(`/object/upload/sign/artes/${url.split("/artes/").at(-1)}`);
  };
  try {
    const body = { action: "sign", purpose: "movimento", name: "Foto Capa.JPG", type: "image/jpeg", size: 2_000_000 };
    const first = res();
    const second = res();
    await uploadHandler(req(body), first);
    await uploadHandler(req(body), second);

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.notEqual(first.payload.path, second.payload.path);
    assert.match(first.payload.path, /^movimento\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}-foto-capa\.jpg$/);
    assert.match(second.payload.path, /^movimento\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}-foto-capa\.jpg$/);
    assert.equal(calls.length, 2);
    assert.equal(calls.every(({ options }) => options.method === "POST"), true);
    assert.equal(calls.every(({ options }) => options.headers.apikey === "service-test-key"), true);
    assert.equal(calls.every(({ options }) => options.headers.Authorization === "Bearer service-test-key"), true);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("signed uploads authenticate new Supabase secret keys through apikey without a bearer JWT", async () => {
  const previousFetch = globalThis.fetch;
  const previousServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const previousRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_KEY = "sb_secret_upload_test_key";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { default: secretKeyHandler } = await import(`../api/upload.js?secret-upload-test=${Date.now()}`);
  let storageRequest;
  globalThis.fetch = async (url, options) => {
    storageRequest = { url, options };
    return signedResponse();
  };
  try {
    const out = res();
    await secretKeyHandler(req({
      action: "sign", purpose: "movimento", name: "foto.jpg", type: "image/jpeg", size: 1200,
    }), out);
    assert.equal(out.statusCode, 200);
    assert.equal(storageRequest.options.headers.apikey, "sb_secret_upload_test_key");
    assert.equal("Authorization" in storageRequest.options.headers, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousServiceKey === undefined) delete process.env.SUPABASE_SERVICE_KEY;
    else process.env.SUPABASE_SERVICE_KEY = previousServiceKey;
    if (previousRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousRoleKey;
  }
});

test("legacy signed uploads keep their existing date and sanitized filename contract", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => signedResponse();
  try {
    const out = res();
    await uploadHandler(req({ action: "sign", name: "Ficha Técnica.PDF" }), out);
    assert.equal(out.statusCode, 200);
    assert.match(out.payload.path, /^\d{4}-\d{2}-\d{2}\/ficha-tecnica\.pdf$/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
