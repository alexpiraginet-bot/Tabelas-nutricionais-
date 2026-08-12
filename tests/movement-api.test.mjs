import test from "node:test";
import assert from "node:assert/strict";
import { createMovementHandler } from "../api/movimento-rsvp.js";

const VALID_TOKEN = "invite_abcdefghijklmnopqrstuvwxyz_2026";
const ENV = { SUPABASE_URL: "https://project.supabase.co/rest/v1", SUPABASE_SERVICE_ROLE_KEY: "test-service-key" };
const SECRET_ENV = { SUPABASE_URL: "https://project.supabase.co/rest/v1", SUPABASE_SERVICE_KEY: "sb_secret_test_key" };
const INVITE = { id: "84ccf9b6-b170-4212-9f3d-1ce53901ca18", display_name: "Convidada", recipient_name: "Ana", company_name: null, audience_type: "influencer", status: "sent", opened_at: null, expires_at: "2026-09-01T12:00:00.000Z" };
const PARTNER_INVITE = { id: "fa4ce3a4-bdb7-4612-b9d8-4959099d2684", display_name: "Marca Parceira", recipient_name: "Bia", company_name: "Marca Parceira", audience_type: "partner", status: "sent", opened_at: null, expires_at: "2026-09-01T12:00:00.000Z" };

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
    if (url.includes("movement_invites") && options?.method === "PATCH") return response([{ id: INVITE.id }]);
    return response(url.includes("movement_invites") ? [INVITE] : []);
  };
  const out = res();
  await createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("GET", { query: { token: VALID_TOKEN } }), out);
  assert.equal(out.statusCode, 200);
  assert.equal(out.payload.invite.displayName, "Convidada");
  assert.deepEqual(Object.keys(out.payload.invite).sort(), ["audienceType", "companyName", "displayName", "expiresAt", "id", "recipientName", "status"]);
  assert.equal("contact" in out.payload.invite, false);
  assert.match(calls[0].url, /^https:\/\/project\.supabase\.co\/rest\/v1\/movement_invites\?/);
  assert.doesNotMatch(calls[0].url, /\/rest\/v1\/rest\/v1\//);
  assert.match(calls[0].url, /movement_invites\?token_hash=eq\.[a-f0-9]{64}/);
  assert.equal(calls[0].options.headers.apikey, "test-service-key");
  const opening = calls.find((call) => call.options?.method === "PATCH");
  assert.match(opening.url, /movement_invites\?id=eq\.84ccf9b6-b170-4212-9f3d-1ce53901ca18&opened_at=is\.null&status=eq\.sent$/);
  assert.equal(opening.options.headers.Prefer, "return=representation");
  assert.deepEqual(JSON.parse(opening.options.body), { opened_at: "2026-08-11T12:00:00.000Z", status: "opened", updated_at: "2026-08-11T12:00:00.000Z" });
});

test("movement API sends a modern Supabase secret only as apikey", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && options.method === "PATCH") return response([{ id: INVITE.id }]);
    return response(url.includes("movement_invites") ? [INVITE] : []);
  };
  const out = res();

  await createMovementHandler({ fetchImpl, env: SECRET_ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("GET", { query: { token: VALID_TOKEN } }), out);

  assert.equal(out.statusCode, 200);
  assert.ok(calls.length >= 3);
  assert.equal(calls.every((call) => call.options.headers.apikey === "sb_secret_test_key"), true);
  assert.equal(calls.every((call) => !("Authorization" in call.options.headers)), true);
});

test("movement API resolves a personal partner once with only editable lead data", async () => {
  const calls = [];
  const currentLead = {
    tier_interest: "signature",
    contribution_type: "service",
    contribution_details: "Ativação de recovery.",
    email: "bia@marca.com",
    phone: "27999990000",
    submitted_at: "2026-08-11T10:00:00.000Z",
    updated_at: "2026-08-11T10:00:00.000Z",
    lead_key: "internal-key",
    privacy_version: "v1",
    is_binding: false,
  };
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && options.method !== "PATCH") return response([PARTNER_INVITE]);
    if (url.includes("movement_invites")) return response([{ id: PARTNER_INVITE.id }]);
    if (url.includes("movement_partner_leads")) return response([currentLead]);
    return response([]);
  };
  const out = res();

  await createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("GET", { query: { token: VALID_TOKEN } }), out);

  assert.equal(out.statusCode, 200);
  assert.deepEqual(out.payload.invite, {
    id: PARTNER_INVITE.id,
    displayName: "Marca Parceira",
    audienceType: "partner",
    recipientName: "Bia",
    companyName: "Marca Parceira",
    status: "opened",
    expiresAt: "2026-09-01T12:00:00.000Z",
  });
  assert.deepEqual(out.payload.currentPartnerLead, {
    tier: "signature",
    contributionType: "service",
    contributionDetails: "Ativação de recovery.",
    email: "bia@marca.com",
    phone: "27999990000",
  });
  assert.equal("leadKey" in out.payload.currentPartnerLead, false);
  assert.equal("privacyVersion" in out.payload.currentPartnerLead, false);
  assert.equal("currentRsvp" in out.payload, false);
  assert.equal(calls.filter((call) => call.url.includes("movement_invites") && !call.options.method).length, 2);
  const leadCall = calls.find((call) => call.url.includes("movement_partner_leads"));
  assert.match(leadCall.url, new RegExp(`invite_id=eq\\.${PARTNER_INVITE.id}`));
});

test("movement API treats a zero-row sent opening claim as an inactive invitation", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && options.method === "PATCH") return response([]);
    return response([INVITE]);
  };
  const out = res();
  await createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("GET", { query: { token: VALID_TOKEN } }), out);
  assert.equal(out.statusCode, 404);
  assert.equal(out.payload.error, "Convite inválido ou expirado.");
  assert.equal(calls.some((call) => call.url.includes("movement_rsvps")), false);
});

test("movement API uses the same neutral message for missing, inactive, and expired invitations", async () => {
  for (const rows of [
    [],
    [{ ...INVITE, status: "draft" }],
    [{ ...INVITE, status: "revoked" }],
    [{ ...INVITE, status: "expired" }],
    [{ ...INVITE, expires_at: "2026-08-01T12:00:00.000Z" }],
  ]) {
    const out = res();
    await createMovementHandler({ fetchImpl: async () => response(rows), env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("GET", { query: { token: VALID_TOKEN } }), out);
    assert.equal(out.statusCode, 404);
    assert.equal(out.payload.error, "Convite inválido ou expirado.");
  }
});

test("movement API keeps POST exclusive to influencer invitations", async () => {
  const out = res();
  await createMovementHandler({
    fetchImpl: async () => response([PARTNER_INVITE]),
    env: ENV,
    now: () => new Date("2026-08-11T12:00:00.000Z"),
  })(req("POST", { body: { token: VALID_TOKEN, response: "confirmed", privacyAccepted: true } }), out);
  assert.equal(out.statusCode, 404);
  assert.equal(out.payload.error, "Convite inválido ou expirado.");
});

test("movement API opens an invitation once and preserves responded status", async () => {
  for (const invite of [
    { ...INVITE, status: "opened", opened_at: "2026-08-11T11:00:00.000Z" },
    { ...INVITE, status: "responded", opened_at: null },
  ]) {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      if (url.includes("movement_invites") && options?.method !== "PATCH") return response([invite]);
      return response([{ id: invite.id }]);
    };
    const out = res();
    await createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("GET", { query: { token: VALID_TOKEN } }), out);
    assert.equal(out.statusCode, 200);
    const patches = calls.filter((call) => call.options?.method === "PATCH");
    if (invite.opened_at) {
      assert.equal(patches.length, 0);
    } else {
      assert.equal(patches.length, 1);
      assert.equal("status" in JSON.parse(patches[0].options.body), false);
      assert.equal(out.payload.invite.status, "responded");
    }
  }
});

test("movement API upserts one RSVP by invite id", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && options?.method !== "PATCH") return response([INVITE]);
    return response([{ id: "5d49b0db-bde0-4e09-9c91-c2231c186a1e" }], 201);
  };
  const out = res();
  await createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("POST", { body: { token: VALID_TOKEN, response: "confirmed", participationMode: "family", shirtSize: "M", trainingOutfitSize: "G", adultCompanionType: "husband", companionCount: 2, childCount: 1, childAge: 8, childKitSize: "8 infantil", transportInterest: true, privacyAccepted: true, imageConsent: false } }), out);
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
  assert.equal(persisted.child_age, 8);
  assert.equal(persisted.child_kit_size, "8 infantil");
  assert.equal(persisted.transport_interest, true);
  assert.equal(persisted.image_consent, false);
  const inviteUpdate = calls.find((call) => call.url.includes("movement_invites") && call.options?.method === "PATCH");
  assert.match(inviteUpdate.url, /id=eq\.84ccf9b6-b170-4212-9f3d-1ce53901ca18&status=in\.\(sent,opened,responded\)&revoked_at=is\.null$/);
  assert.deepEqual(JSON.parse(inviteUpdate.options.body), { status: "responded", updated_at: "2026-08-11T12:00:00.000Z" });
  assert.equal(inviteUpdate.options.headers.Prefer, "return=representation");
  assert.ok(calls.indexOf(inviteUpdate) < calls.indexOf(upsert));
});

test("movement API aborts before RSVP persistence when the responded claim affects zero rows", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && options.method === "PATCH") return response([]);
    if (url.includes("movement_invites")) return response([INVITE]);
    return response([{ id: "must-not-persist" }], 201);
  };
  const out = res();
  await createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") })(req("POST", { body: { token: VALID_TOKEN, response: "confirmed", participationMode: "training", shirtSize: "M", trainingOutfitSize: "G", companionCount: 0, childCount: 0, privacyAccepted: true } }), out);
  assert.equal(out.statusCode, 404);
  assert.equal(out.payload.error, "Convite inválido ou expirado.");
  assert.equal(calls.some((call) => call.url.includes("movement_rsvps") && call.options.method === "POST"), false);
});

test("movement API retries persistence after a claimed response write fails", async () => {
  const calls = [];
  let inviteStatus = "sent";
  let persistenceAttempts = 0;
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("movement_invites") && options.method === "PATCH") {
      inviteStatus = "responded";
      return response([{ id: INVITE.id }]);
    }
    if (url.includes("movement_invites")) return response([{ ...INVITE, status: inviteStatus }]);
    persistenceAttempts += 1;
    return persistenceAttempts === 1 ? response({}, 500) : response([{ id: "5d49b0db-bde0-4e09-9c91-c2231c186a1e" }], 201);
  };
  const handler = createMovementHandler({ fetchImpl, env: ENV, now: () => new Date("2026-08-11T12:00:00.000Z") });
  const request = () => req("POST", { body: { token: VALID_TOKEN, response: "confirmed", participationMode: "training", shirtSize: "M", trainingOutfitSize: "G", companionCount: 0, childCount: 0, privacyAccepted: true } });
  const originalError = console.error;
  console.error = () => {};
  try {
    const first = res();
    await handler(request(), first);
    assert.equal(first.statusCode, 502);

    const retry = res();
    await handler(request(), retry);
    assert.equal(retry.statusCode, 200);
  } finally {
    console.error = originalError;
  }
  assert.equal(inviteStatus, "responded");
  assert.equal(persistenceAttempts, 2);
  assert.equal(calls.filter((call) => call.url.includes("movement_invites") && call.options.method === "PATCH").length, 2);
});

test("movement API rejects parsed bodies above 32 KiB before resolving a token", async () => {
  let called = false;
  const out = res();
  await createMovementHandler({ fetchImpl: async () => { called = true; return response([]); }, env: ENV })(req("POST", {
    body: JSON.stringify({ token: VALID_TOKEN, note: "x".repeat(33 * 1024) }),
  }), out);
  assert.equal(out.statusCode, 413);
  assert.equal(called, false);
});
