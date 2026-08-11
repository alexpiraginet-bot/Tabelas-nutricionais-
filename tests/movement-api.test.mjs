import test from "node:test";
import assert from "node:assert/strict";
import { createMovementHandler } from "../api/movimento-rsvp.js";

const VALID_TOKEN = "invite_abcdefghijklmnopqrstuvwxyz_2026";
const ENV = { SUPABASE_URL: "https://project.supabase.co/rest/v1", SUPABASE_SERVICE_ROLE_KEY: "test-service-key" };
const INVITE = { id: "84ccf9b6-b170-4212-9f3d-1ce53901ca18", display_name: "Convidada", audience_type: "influencer", status: "sent", expires_at: "2026-09-01T12:00:00.000Z" };

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function req(method, { query = {}, body = null, headers = {} } = {}) {
  return { method, query, body, headers: { origin: "https://bentogelateria.com", ...headers } };
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

test("movement API rejects unsupported methods", async () => {
  const out = res();
  await createMovementHandler({ fetchImpl: async () => response([]), env: ENV })(req("DELETE"), out);
  assert.equal(out.statusCode, 405);
});

test("movement API reports missing server configuration without exposing values", async () => {
  const out = res();
  await createMovementHandler({ fetchImpl: async () => response([]), env: {} })(req("GET", { query: { token: VALID_TOKEN } }), out);
  assert.equal(out.statusCode, 503);
  assert.deepEqual(out.payload, { ok: false, error: "Confirmação temporariamente indisponível." });
});

test("movement API logs only safe Supabase diagnostics for upstream failures", async () => {
  const logged = [];
  const originalError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    const out = res();
    await createMovementHandler({
      fetchImpl: async () => response({ code: "PGRST205", message: "Could not find the table in the schema cache" }, 404),
      env: ENV,
    })(req("GET", { query: { token: VALID_TOKEN } }), out);
    assert.equal(out.statusCode, 502);
    assert.match(logged[0][1].error, /PGRST205/);
    assert.equal(logged[0][1].supabasePath, "/");
    assert.equal(logged[0][1].keyKind, "other");
    assert.doesNotMatch(JSON.stringify(logged), /test-service-key/);
  } finally {
    console.error = originalError;
  }
});

test("movement API returns a public invitation without private fields", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return response(url.includes("movement_invites") ? [INVITE] : []);
  };
  const out = res();
  await createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("GET", { query: { token: VALID_TOKEN } }), out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.invite.displayName, "Convidada");
  assert.equal("contact" in out.payload.invite, false);
  assert.match(calls[0].url, /^https:\/\/project\.supabase\.co\/rest\/v1\/movement_invites\?/);
  assert.doesNotMatch(calls[0].url, /\/rest\/v1\/rest\/v1\//);
  assert.match(calls[0].url, /movement_invites\?token_hash=eq\.[a-f0-9]{64}/);
  assert.equal(calls[0].options.headers.apikey, "test-service-key");
});

test("movement API uses the same neutral message for missing and expired invitations", async () => {
  for (const rows of [[], [{ ...INVITE, expires_at: "2026-08-01T12:00:00.000Z" }]]) {
    const out = res();
    await createMovementHandler({ fetchImpl: async () => response(rows), env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("GET", { query: { token: VALID_TOKEN } }), out);
    assert.equal(out.statusCode, 404);
    assert.equal(out.payload.error, "Convite inválido ou expirado.");
  }
});

test("movement API upserts one RSVP by invite id", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("movement_invites")) return response([INVITE]);
    return response([{ id: "5d49b0db-bde0-4e09-9c91-c2231c186a1e" }], 201);
  };
  const out = res();
  await createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("POST", { body: { token: VALID_TOKEN, response: "confirmed", participationMode: "family", shirtSize: "M", trainingOutfitSize: "G", adultCompanionType: "husband", companionCount: 2, childCount: 1, childKitSize: "8 infantil", privacyAccepted: true, imageConsent: false } }), out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.ok, true);
  assert.equal(out.payload.reference, "84CCF9B6");
  const upsert = calls.find((call) => call.url.includes("movement_rsvps"));
  assert.match(upsert.url, /on_conflict=invite_id/);
  assert.match(upsert.options.headers.Prefer, /resolution=merge-duplicates/);
  const persisted = JSON.parse(upsert.options.body);
  assert.equal(persisted.invite_id, INVITE.id);
  assert.equal(persisted.shirt_size, "M");
  assert.equal(persisted.training_outfit_size, "G");
  assert.equal(persisted.participation_mode, "family");
  assert.equal(persisted.adult_companion_type, "husband");
  assert.equal(persisted.companion_count, 2);
  assert.equal(persisted.child_count, 1);
  assert.equal(persisted.child_kit_size, "8 infantil");
  assert.equal(persisted.image_consent, false);
});
