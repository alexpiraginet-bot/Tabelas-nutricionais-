import test from "node:test";
import assert from "node:assert/strict";
import { createMovementContentHandler } from "../api/movimento-content.js";

const ENV = {
  PANEL_KEY: "panel-test-key",
  SUPABASE_URL: "https://project.supabase.co/rest/v1",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  SUPABASE_BUCKET: "artes",
};

function response(data, status = 200, headers = {}) {
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), json: async () => data };
}

function req(method = "GET", { token = "", query = {}, body = null } = {}) {
  return { method, query, body, headers: token ? { authorization: `Bearer ${token}` } : {} };
}

function res() {
  return {
    statusCode: 200, headers: {}, payload: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    end() { return this; },
  };
}

const ROW = {
  audience_type: "influencer", scene_id: "INF-01", image_url: "/movimento/v2/inf-01.webp", mobile_image_url: null,
  image_opacity: 0.6, background_color: "#E9E1D3", eyebrow: "Chegada", title: "A manhã começa aqui", body: "Uma experiência de movimento e hospitalidade pensada para celebrar a Bentô.",
  alt_text: "Convidadas chegando ao Le Buffet Lounge em uma manhã clara de celebração Bentô.", revision: 3,
};

test("movement content public GET exposes only sanitized overrides and falls back to defaults on upstream failure", async () => {
  const calls = [];
  const out = res();
  await createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => { calls.push({ url, options }); return response([ROW]); },
  })(req("GET"), out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.ok, true);
  assert.deepEqual(out.payload.items, [{
    audience: "influencer", sceneId: "INF-01",
    override: {
      imageUrl: "/movimento/v2/inf-01.webp", mobileImageUrl: null, imageOpacity: 0.6, backgroundColor: "#E9E1D3", eyebrow: "Chegada",
      title: "A manhã começa aqui", body: "Uma experiência de movimento e hospitalidade pensada para celebrar a Bentô.",
      altText: "Convidadas chegando ao Le Buffet Lounge em uma manhã clara de celebração Bentô.",
    },
  }]);
  assert.equal("revision" in out.payload.items[0], false);
  assert.match(calls[0].url, /^https:\/\/project\.supabase\.co\/rest\/v1\/movement_presentation_content\?/);
  assert.equal(calls[0].options.headers.apikey, "test-service-key");
  assert.match(out.headers["Cache-Control"], /s-maxage=60/);

  const fallback = res();
  await createMovementContentHandler({ env: ENV, fetchImpl: async () => response({ message: "no" }, 500) })(req("GET"), fallback);
  assert.equal(fallback.statusCode, 200);
  assert.deepEqual(fallback.payload, { ok: true, items: [] });
});

test("movement content fresh GET requires PANEL_KEY and returns revisions", async () => {
  const denied = res();
  await createMovementContentHandler({ env: ENV })(req("GET", { query: { fresh: "1" } }), denied);
  assert.equal(denied.statusCode, 401);

  const out = res();
  await createMovementContentHandler({ env: ENV, fetchImpl: async () => response([ROW]) })(req("GET", { token: "panel-test-key", query: { fresh: "1" } }), out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.items[0].revision, 3);
  assert.equal(out.headers["Cache-Control"], "no-store");
});

test("movement content GET filters a selected audience and rejects a nonsensical audience", async () => {
  const calls = [];
  const out = res();
  await createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => { calls.push({ url, options }); return response([ROW]); },
  })(req("GET", { query: { audience: "partner" } }), out);
  assert.equal(out.statusCode, 200);
  assert.match(calls[0].url, /audience_type=eq\.partner/);

  const invalid = res();
  await createMovementContentHandler({ env: ENV, fetchImpl: async () => { throw new Error("should not fetch"); } })(req("GET", { query: { audience: "guest" } }), invalid);
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.payload, { ok: false, error: "Público do conteúdo inválido." });
});

test("movement content admin save creates a new override at revision zero and patches with an optimistic revision", async () => {
  const calls = [];
  const out = res();
  await createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return response([{ ...ROW, title: "Nova visão", revision: 1 }], 201);
    },
  })(req("POST", { token: "panel-test-key", body: {
    action: "save", audience: "influencer", sceneId: "INF-01", revision: 0,
    override: { title: "Nova visão" },
  } }), out);
  assert.equal(out.statusCode, 200);
  const insert = calls[0];
  assert.match(insert.url, /movement_presentation_content\?on_conflict=audience_type,scene_id$/);
  assert.equal(insert.options.method, "POST");
  assert.deepEqual(JSON.parse(insert.options.body), {
    audience_type: "influencer", scene_id: "INF-01", image_url: null, mobile_image_url: null, image_opacity: null, background_color: null,
    title_scale: null, body_scale: null, eyebrow: null, title: "Nova visão", body: null, alt_text: null, revision: 1,
  });
  assert.equal(out.payload.item.revision, 1);

  const patchCalls = [];
  const patched = res();
  await createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => {
      patchCalls.push({ url, options });
      return response([{ ...ROW, title: "Visão atualizada", revision: 4 }]);
    },
  })(req("POST", { token: "panel-test-key", body: {
    action: "save", audience: "influencer", sceneId: "INF-01", revision: 3,
    override: { title: "Visão atualizada" },
  } }), patched);
  assert.equal(patched.statusCode, 200);
  assert.match(patchCalls[0].url, /audience_type=eq\.influencer&scene_id=eq\.INF-01&revision=eq\.3$/);
  assert.equal(patchCalls[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(patchCalls[0].options.body), { title: "Visão atualizada", revision: 4 });
});

test("movement content API stores a territory background independently from scene copy", async () => {
  const calls = [];
  const out = res();
  await createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return response([{
        audience_type: "partner", scene_id: "PAR-THEME-CARE", image_url: null, mobile_image_url: null,
        image_opacity: null, background_color: "#10291E", eyebrow: null, title: null, body: null, alt_text: null, revision: 1,
      }], 201);
    },
  })(req("POST", { token: "panel-test-key", body: {
    action: "save", audience: "partner", sceneId: "PAR-THEME-CARE", revision: 0,
    override: { backgroundColor: "#10291e" },
  } }), out);

  assert.equal(out.statusCode, 200);
  assert.equal(JSON.parse(calls[0].options.body).background_color, "#10291E");
  assert.deepEqual(out.payload.item.override, {
    imageUrl: null, mobileImageUrl: null, imageOpacity: null, backgroundColor: "#10291E",
    eyebrow: null, title: null, body: null, altText: null,
  });
});

test("movement content rejects invalid/unpersonalized values, stale revisions, oversized bodies, and protects admin writes", async () => {
  let called = false;
  for (const body of [
    { action: "save", audience: "influencer", sceneId: "INF-99", revision: 0, override: { title: "Nova" } },
    { action: "save", audience: "influencer", sceneId: "INF-01", revision: 0, override: { title: "{Nome}" } },
    { action: "save", audience: "influencer", sceneId: "INF-01", revision: -1, override: { title: "Nova" } },
  ]) {
    const out = res();
    await createMovementContentHandler({ env: ENV, fetchImpl: async () => { called = true; return response([]); } })(req("POST", { token: "panel-test-key", body }), out);
    assert.equal(out.statusCode, 400);
  }
  assert.equal(called, false);

  const conflict = res();
  await createMovementContentHandler({ env: ENV, fetchImpl: async () => response([]) })(req("POST", { token: "panel-test-key", body: {
    action: "save", audience: "influencer", sceneId: "INF-01", revision: 3, override: { title: "Nova" },
  } }), conflict);
  assert.equal(conflict.statusCode, 409);

  const tooLarge = res();
  await createMovementContentHandler({ env: ENV, fetchImpl: async () => { called = true; return response([]); } })(req("POST", { token: "panel-test-key", body: JSON.stringify({ action: "save", note: "x".repeat(33 * 1024) }) }), tooLarge);
  assert.equal(tooLarge.statusCode, 413);

  const denied = res();
  await createMovementContentHandler({ env: ENV, fetchImpl: async () => { called = true; return response([]); } })(req("POST", { body: { action: "reset" } }), denied);
  assert.equal(denied.statusCode, 401);
});

test("movement content reset removes a current override and is idempotent at revision zero", async () => {
  const calls = [];
  const out = res();
  await createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => { calls.push({ url, options }); return response([ROW]); },
  })(req("POST", { token: "panel-test-key", body: { action: "reset", audience: "influencer", sceneId: "INF-01", revision: 3 } }), out);
  assert.equal(out.statusCode, 200);
  assert.match(calls[0].url, /audience_type=eq\.influencer&scene_id=eq\.INF-01&revision=eq\.3$/);
  assert.equal(calls[0].options.method, "DELETE");
  assert.deepEqual(out.payload, { ok: true, audience: "influencer", sceneId: "INF-01", revision: 0 });

  const empty = res();
  await createMovementContentHandler({ env: ENV, fetchImpl: async () => response([]) })(req("POST", { token: "panel-test-key", body: { action: "reset", audience: "influencer", sceneId: "INF-01", revision: 0 } }), empty);
  assert.equal(empty.statusCode, 200);
});

test("movement content reset at revision zero rejects an override created by another session", async () => {
  const calls = [];
  const out = res();
  await createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => { calls.push({ url, options }); return response([ROW]); },
  })(req("POST", { token: "panel-test-key", body: { action: "reset", audience: "influencer", sceneId: "INF-01", revision: 0 } }), out);
  assert.equal(out.statusCode, 409);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /audience_type=eq\.influencer&scene_id=eq\.INF-01/);
  assert.equal(calls[0].options.method, undefined);
});

function jpegPrefixResponse({ status = 206, contentType = "image/jpeg", contentLength = "32", contentRange = "bytes 0-31/2048", magic = true } = {}) {
  const bytes = new Uint8Array(32);
  if (magic) bytes.set([0xff, 0xd8, 0xff], 0);
  return new Response(bytes, { status, headers: { "Content-Type": contentType, "Content-Length": contentLength, "Content-Range": contentRange } });
}

test("movement content validates owned Supabase media with HEAD and a short Range before publishing", async () => {
  const mediaUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/2026-08-12/photo.jpg";
  const calls = [];
  const out = res();
  await createMovementContentHandler({
    env: ENV,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (url === mediaUrl && options.method === "HEAD") return response(null, 200, { "Content-Type": "image/jpeg", "Content-Length": "2048" });
      if (url === mediaUrl && options.method === "GET") return jpegPrefixResponse();
      return response([{ ...ROW, image_url: mediaUrl, revision: 1 }], 201);
    },
  })(req("POST", { token: "panel-test-key", body: {
    action: "save", audience: "influencer", sceneId: "INF-01", revision: 0,
    override: { imageUrl: mediaUrl, altText: ROW.alt_text },
  } }), out);
  assert.equal(out.statusCode, 200);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].options.method, "HEAD");
  assert.equal(calls[1].options.method, "GET");
  assert.equal(calls[1].options.headers.Range, "bytes=0-31");
  assert.match(calls[2].url, /movement_presentation_content/);
});

test("movement content refuses oversized, mismatched, or forged Supabase media before persistence", async () => {
  const mediaUrl = "https://project.supabase.co/storage/v1/object/public/artes/movimento/2026-08-12/photo.jpg";
  const cases = [
    { head: response(null, 200, { "Content-Type": "image/jpeg", "Content-Length": String(12 * 1024 * 1024 + 1) }), range: jpegPrefixResponse() },
    { head: response(null, 200, { "Content-Type": "image/png", "Content-Length": "2048" }), range: jpegPrefixResponse() },
    { head: response(null, 200, { "Content-Type": "image/jpeg", "Content-Length": "2048" }), range: jpegPrefixResponse({ magic: false }) },
    { head: response(null, 200, { "Content-Type": "image/jpeg", "Content-Length": "2048" }), range: jpegPrefixResponse({ status: 200 }) },
  ];
  for (const current of cases) {
    let mediaCalls = 0;
    let persistenceCalls = 0;
    const out = res();
    await createMovementContentHandler({
      env: ENV,
      fetchImpl: async (url, options = {}) => {
        if (url === mediaUrl) { mediaCalls += 1; return options.method === "HEAD" ? current.head : current.range; }
        persistenceCalls += 1;
        return response([]);
      },
    })(req("POST", { token: "panel-test-key", body: {
      action: "save", audience: "influencer", sceneId: "INF-01", revision: 0,
      override: { imageUrl: mediaUrl, altText: ROW.alt_text },
    } }), out);
    assert.equal(out.statusCode, 400);
    assert.equal(persistenceCalls, 0);
    assert.ok(mediaCalls >= 1 && mediaCalls <= 2);
  }
});
