import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getMovementExperience, isPersonalMovementMode, parseMovementRoute } from "../src/movimento/movement-route.js";

test("movement route distinguishes public, partner and invitation experiences", () => {
  assert.deepEqual(parseMovementRoute("/movimento"), { mode: "influencer", token: null });
  assert.deepEqual(parseMovementRoute("/movimento/"), { mode: "influencer", token: null });
  assert.deepEqual(parseMovementRoute("/movimento/parceiros"), { mode: "partner", token: null });
  assert.deepEqual(parseMovementRoute("/movimento/convite"), { mode: "invite", token: null });
  assert.deepEqual(parseMovementRoute("/movimento/convite/"), { mode: "invite", token: null });
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

test("movement route preserves generic presentations and the legacy personal invitation path", () => {
  assert.deepEqual(getMovementExperience("influencer"), {
    story: "influencer",
    showPresentation: true,
    showRsvp: false,
  });
  assert.deepEqual(parseMovementRoute("/movimento/convite/invite_abcdefghijklmnopqrstuvwxyz_2026"), {
    mode: "invite",
    token: "invite_abcdefghijklmnopqrstuvwxyz_2026",
  });
  assert.equal(isPersonalMovementMode("invite"), true);
  assert.equal(isPersonalMovementMode("influencer"), false);
  assert.equal(isPersonalMovementMode("partner"), false);
});

test("movement site resolves each personal invitation before choosing its story", async () => {
  const site = await readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8");
  const loader = await readFile(new URL("../src/movimento/useMovementInvite.js", import.meta.url), "utf8");

  assert.match(site, /useMovementInvite\(token\)/);
  assert.match(site, /state === "loading"/);
  assert.match(site, /invite\?\.audienceType/);
  assert.match(site, /currentRsvp=\{currentRsvp\}/);
  assert.match(site, /currentPartnerLead=\{currentPartnerLead\}/);
  assert.match(loader, /fetch\(`\/api\/movimento-rsvp\?token=\$\{encodeURIComponent\(token\)\}`/);
  assert.match(loader, /const inviteRequests = new Map\(\)/);
});

test("movement hero renders the approved factual line as visible content", async () => {
  const source = await readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8");

  assert.match(source, /<p className="mv-hero-factual"><MapPin size=\{18\}\/>{copy\.factualLine}<\/p>/);
});

test("partner tier limits are rendered from the approved content contract", async () => {
  const source = await readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8");

  assert.match(source, /<p className="mv-annual-note">{PARTNER_PARTICIPATION_NOTE}<\/p>/);
});

test("movement entry does not eagerly load the full public site bundle", async () => {
  const source = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /import App from ["']\.\/App\.jsx["']/);
  assert.match(source, /lazy\(\(\) => import\(["']\.\/App\.jsx["']\)\)/);
  assert.match(source, /lazy\(\(\) => import\(["']\.\/movimento\/MovementSite\.jsx["']\)\)/);
});

test("movement presentation imports icons directly instead of loading the full barrel", async () => {
  const files = ["MovementSite.jsx", "RsvpFlow.jsx", "PartnerInterestFlow.jsx"];

  for (const file of files) {
    const source = await readFile(new URL(`../src/movimento/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from ["']lucide-react["']/);
  }
});
