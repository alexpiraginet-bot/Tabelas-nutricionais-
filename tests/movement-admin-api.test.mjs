import test from "node:test";
import assert from "node:assert/strict";
import { createMovementAdminHandler } from "../api/movimento-admin.js";

const ENV = {
  PANEL_KEY: "panel-test-key",
  SUPABASE_URL: "https://project.supabase.co/rest/v1",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
};

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function req(method = "GET", token = "panel-test-key", body = null) {
  return { method, body, headers: token ? { authorization: `Bearer ${token}` } : {} };
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

test("movement admin API requires the existing panel key before reading Supabase", async () => {
  let called = false;
  for (const token of ["", "wrong-key"]) {
    const out = res();
    await createMovementAdminHandler({ fetchImpl: async () => { called = true; return response([]); }, env: ENV })(req("GET", token), out);
    assert.equal(out.statusCode, 401);
    assert.deepEqual(out.payload, { ok: false, error: "Não autorizado." });
  }
  assert.equal(called, false);
});

test("movement admin API reports missing server configuration", async () => {
  const out = res();
  await createMovementAdminHandler({ fetchImpl: async () => response([]), env: { PANEL_KEY: "panel-test-key" } })(req(), out);
  assert.equal(out.statusCode, 503);
  assert.deepEqual(out.payload, { ok: false, error: "Movimento temporariamente indisponível." });
});

test("movement admin API joins invites and responses without selecting invitation hashes", async () => {
  const calls = [];
  const inviteId = "84ccf9b6-b170-4212-9f3d-1ce53901ca18";
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("movement_invites")) return response([{ id: inviteId, display_name: "Ana", contact: "ana@example.com", audience_type: "influencer", status: "responded", expires_at: "2026-09-01T12:00:00.000Z", created_at: "2026-08-11T12:00:00.000Z" }]);
    if (url.includes("movement_rsvps")) return response([{ invite_id: inviteId, response: "confirmed", participation_mode: "family", shirt_size: "M", training_outfit_size: "G", adult_companion_type: "mother", companion_count: 2, child_count: 1, child_kit_size: "6 infantil", image_consent: false, responded_at: "2026-08-11T13:00:00.000Z", updated_at: "2026-08-11T13:00:00.000Z" }]);
    return response([{ id: "c0a8012e-b173-4ab3-b9c9-e4a6c33258f8", company_name: "Marca", contact_name: "Bia", email: "bia@marca.com", phone: "27999999999", tier_interest: "founding", contribution_type: "mixed", contribution_details: "Produto e experiência", submitted_at: "2026-08-11T14:00:00.000Z", updated_at: "2026-08-11T14:00:00.000Z" }]);
  };

  const out = res();
  await createMovementAdminHandler({ fetchImpl, env: ENV })(req(), out);

  assert.equal(out.statusCode, 200);
  assert.deepEqual(out.payload.summary, { invited: 1, confirmed: 1, declined: 0, pending: 0, partnerLeads: 1 });
  assert.equal(out.payload.invites[0].rsvp.trainingOutfitSize, "G");
  assert.equal(out.payload.invites[0].rsvp.adultCompanionType, "mother");
  assert.equal(out.payload.invites[0].rsvp.childKitSize, "6 infantil");
  assert.equal(out.payload.partners[0].tierInterest, "founding");
  assert.equal(JSON.stringify(out.payload).includes("token_hash"), false);
  assert.equal(calls.some((call) => call.url.includes("token_hash")), false);
  assert.equal(calls.every((call) => call.url.startsWith("https://project.supabase.co/rest/v1/")), true);
  assert.equal(calls.some((call) => call.url.includes("/rest/v1/rest/v1/")), false);
  assert.equal(calls.every((call) => call.options.headers.apikey === "test-service-key"), true);
});

test("movement admin API creates a personal link while storing only its hash", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return response([{ id: "84ccf9b6-b170-4212-9f3d-1ce53901ca18", display_name: "Ana", contact: "ana@example.com", status: "sent", expires_at: "2026-12-31T23:59:00.000Z", created_at: "2026-08-11T12:00:00.000Z" }], 201);
  };
  const out = res();
  await createMovementAdminHandler({
    fetchImpl,
    env: ENV,
    createToken: () => "invite_abcdefghijklmnopqrstuvwxyz_2026",
    now: () => new Date("2026-08-11T12:00:00.000Z"),
  })(req("POST", "panel-test-key", {
    action: "create-invite",
    displayName: "  Ana  ",
    contact: "ana@example.com",
    expiresAt: "2026-12-31T23:59:00.000Z",
  }), out);

  assert.equal(out.statusCode, 201);
  assert.equal(out.payload.invitePath, "/movimento/convite/invite_abcdefghijklmnopqrstuvwxyz_2026");
  assert.equal(out.payload.invite.displayName, "Ana");
  const persisted = JSON.parse(calls[0].options.body);
  assert.equal(persisted.token_hash, "91517880b4a2308ea3823e81e58aaea193b7d24ffa6ef98e859a247c16e9e145");
  assert.equal(JSON.stringify(persisted).includes("invite_abcdefghijklmnopqrstuvwxyz_2026"), false);
  assert.equal(calls[0].options.headers.Prefer, "return=representation");
});

test("movement admin API rejects an expired invitation before writing", async () => {
  let called = false;
  const out = res();
  await createMovementAdminHandler({
    fetchImpl: async () => { called = true; return response([]); },
    env: ENV,
    now: () => new Date("2026-08-11T12:00:00.000Z"),
  })(req("POST", "panel-test-key", {
    action: "create-invite",
    displayName: "Ana",
    expiresAt: "2026-08-10T12:00:00.000Z",
  }), out);
  assert.equal(out.statusCode, 400);
  assert.equal(out.payload.error, "Escolha uma validade futura para o convite.");
  assert.equal(called, false);
});

test("movement admin API rejects unsupported methods", async () => {
  const out = res();
  await createMovementAdminHandler({ env: ENV })(req("DELETE"), out);
  assert.equal(out.statusCode, 405);
});
