import test from "node:test";
import assert from "node:assert/strict";
import { getMovementExperience, parseMovementRoute } from "../src/movimento/movement-route.js";

test("movement route distinguishes public, partner and invitation experiences", () => {
  assert.deepEqual(parseMovementRoute("/movimento"), { mode: "influencer", token: null });
  assert.deepEqual(parseMovementRoute("/movimento/"), { mode: "influencer", token: null });
  assert.deepEqual(parseMovementRoute("/movimento/parceiros"), { mode: "partner", token: null });
  assert.deepEqual(parseMovementRoute("/movimento/convite/invite_abcdefghijklmnopqrstuvwxyz_2026"), {
    mode: "invite", token: "invite_abcdefghijklmnopqrstuvwxyz_2026",
  });
  assert.equal(parseMovementRoute("/tabelas"), null);
});

test("movement route never decodes a malformed invitation token", () => {
  assert.deepEqual(parseMovementRoute("/movimento/convite/%E0%A4%A"), { mode: "invite", token: null });
});

test("personal invitation keeps the full influencer presentation before RSVP", () => {
  assert.deepEqual(getMovementExperience("invite"), {
    story: "influencer",
    showPresentation: true,
    showRsvp: true,
  });
  assert.deepEqual(getMovementExperience("partner"), {
    story: "partner",
    showPresentation: true,
    showRsvp: false,
  });
});
