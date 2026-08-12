import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT,
  EXPERIENCE_STEPS,
  INFLUENCER_SCENES,
  KIT_ITEMS,
  PARTNER_ROLES,
  PARTNER_SCENES,
  SHIRT_CONCEPT,
} from "../src/movimento/movement-content.js";

test("movement presentations expose the confirmed event date and functional training format", () => {
  assert.deepEqual(EVENT, {
    dateIso: "2026-09-12",
    dateLong: "12 de setembro de 2026",
    dateShort: "12 set 2026",
    dayLabel: "Sábado",
    expectedGuests: "40 a 50 pessoas esperadas",
    location: "Le Buffet Lounge · Vitória, ES",
    time: "Horário em confirmação",
    training: "Aulão funcional com personal renomado · nome em confirmação",
  });
  assert.ok(EXPERIENCE_STEPS.some(([title, text]) => title === "Aulão funcional" && text.includes("personal renomado")));
});

test("movement presentations turn the approved experiences into visual chapters", () => {
  const influencerIds = INFLUENCER_SCENES.map(({ id }) => id);
  const partnerIds = PARTNER_SCENES.map(({ id }) => id);

  assert.deepEqual(influencerIds, ["venue", "welcome", "training", "family", "recovery", "kit", "year"]);
  assert.deepEqual(partnerIds, ["venue", "mobility", "breakfast", "training", "recovery", "family", "kit", "popsicle", "visibility", "continuity"]);
  for (const scene of [...INFLUENCER_SCENES, ...PARTNER_SCENES]) {
    assert.match(scene.image, /^\/movimento\/.+\.(webp|png|jpg)$/);
    assert.ok(scene.alt.length >= 24);
  }
});

test("public Movement copy contains no unconfirmed prospect names", () => {
  const publicCopy = JSON.stringify({ INFLUENCER_SCENES, PARTNER_SCENES, KIT_ITEMS });
  for (const prospect of ["Grand Cave", "Fiore", "Magia do Mar", "True Suplementos", "Academia Lifft", "Café Pocar", "Luciana Melo"]) {
    assert.doesNotMatch(publicCopy, new RegExp(prospect, "i"));
  }
});

test("shirt concept reserves the lower back for approved sponsors", () => {
  assert.deepEqual(SHIRT_CONCEPT, {
    front: "Wordmark oficial Bentô",
    back: "MOVIMENTO. ENCONTRO. BENTÔ.",
    sponsorArea: "Região lombar · Sua marca pode estar aqui",
  });
});

test("movement partner presentation includes premium mobility as a participation role", () => {
  assert.ok(PARTNER_ROLES.some(([title]) => title === "Mobilidade premium"));
});
