import test from "node:test";
import assert from "node:assert/strict";
import * as content from "../src/movimento/movement-content.js";

const {
  EVENT,
  EXPERIENCE_STEPS,
  HERO_COPY,
  INFLUENCER_SCENES,
  KIT_ITEMS,
  PARTNER_PARTICIPATION_NOTE,
  PARTNER_SCENES,
  PARTNER_TIERS,
  SHIRT_CONCEPT,
} = content;

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

  assert.deepEqual(influencerIds, ["scenario", "welcome", "training", "kids-workshop", "recovery", "shirt-kit", "celebration"]);
  assert.deepEqual(partnerIds, ["stage", "mobility", "breakfast", "movement", "recovery", "kids-workshop", "shirt-kit", "product", "backdrop", "curation"]);
  for (const scene of [...INFLUENCER_SCENES, ...PARTNER_SCENES]) {
    assert.match(scene.assetId, /^(?:INF|PAR)-(?:0[1-9]|10)$/);
    assert.ok(scene.alt.length >= 24);
    assert.ok(scene.disclosure.length >= 24);
  }
  assert.match(PARTNER_SCENES.find(({ assetId }) => assetId === "PAR-02").alt, /estacionado/i);
  assert.match(PARTNER_SCENES.find(({ assetId }) => assetId === "PAR-09").alt, /preparado|vazio/i);
  assert.doesNotMatch(PARTNER_SCENES.find(({ assetId }) => assetId === "PAR-09").alt, /em uso/i);
  assert.match(content.MOVEMENT_HERO_ASSETS.influencer.alt, /grupo|convidadas/i);
  assert.match(INFLUENCER_SCENES.find(({ id }) => id === "kids-workshop").title, /oficina de decoração de picolés/i);
  assert.match(PARTNER_SCENES.find(({ id }) => id === "kids-workshop").title, /oficina de decoração de picolés/i);
  for (const assetId of ["INF-03", "PAR-04"]) {
    const scene = [...INFLUENCER_SCENES, ...PARTNER_SCENES].find((candidate) => candidate.assetId === assetId);
    assert.match(scene.disclosure, /wordmark oficial Bentô composto sem redesenho/i);
  }
  for (const assetId of ["INF-04", "PAR-06"]) {
    const scene = [...INFLUENCER_SCENES, ...PARTNER_SCENES].find((candidate) => candidate.assetId === assetId);
    assert.match(scene.disclosure, /picolé do acervo real Bentô composto sem redesenho/i);
  }
});

test("first anniversary copy contains no annual project narrative or influencer sponsor language", () => {
  const influencerCopy = JSON.stringify({ HERO_COPY: HERO_COPY.influencer, INFLUENCER_SCENES, KIT_ITEMS });
  const publicCopy = JSON.stringify({ HERO_COPY, INFLUENCER_SCENES, PARTNER_SCENES, KIT_ITEMS, PARTNER_TIERS });
  for (const prospect of ["Grand Cave", "Fiore", "Magia do Mar", "True Suplementos", "Academia Lifft", "Café Pocar", "Luciana Melo"]) {
    assert.doesNotMatch(publicCopy, new RegExp(prospect, "i"));
  }
  assert.doesNotMatch(publicCopy, /projeto de um ano|ciclo anual|jornada anual|programa anual/i);
  assert.doesNotMatch(influencerCopy, /patrocin|sua marca aqui|marca parceira/i);
});

test("shirt concept reserves the lower back for approved sponsors", () => {
  assert.deepEqual(SHIRT_CONCEPT, {
    front: "Wordmark oficial Bentô",
    back: "MOVIMENTO. ENCONTRO. BENTÔ.",
    sponsorArea: "Região lombar · composição coletiva aprovada",
  });
});

test("movement hero templates and partner participation use the approved first anniversary language", () => {
  assert.deepEqual(HERO_COPY, {
    influencer: {
      kicker: "Convite pessoal · 1º aniversário Bentô Gelatos",
      title: "{Nome}, esta celebração tem um lugar que só você pode ocupar.",
      fallbackTitle: "Esta celebração tem um lugar que só você pode ocupar.",
      text: "No sábado, 12 de setembro, reuniremos 40–50 pessoas no Le Buffet Lounge para uma manhã de movimento, cuidado e encontros. Sua presença é parte essencial da memória que queremos criar.",
      factualLine: "Sábado · 12 de setembro de 2026 · Le Buffet Lounge · Vitória–ES",
      cta: "Confirmar meu lugar",
    },
    partner: {
      kicker: "Uma proposta para {Responsável} · {Empresa}",
      title: "{Empresa}, seu lugar nesta celebração pode ter forma, função e assinatura.",
      fallbackTitle: "Sua marca pode ter forma, função e assinatura nesta celebração.",
      text: "No primeiro aniversário da Bentô Gelatos, 40–50 pessoas viverão uma manhã de movimento e hospitalidade no Le Buffet Lounge. Esta proposta apresenta maneiras de a marca participar de forma natural, útil e memorável.",
      factualLine: "Sábado · 12 de setembro de 2026 · Le Buffet Lounge · Vitória–ES",
      cta: "Escolher participação",
    },
  });
  assert.deepEqual(PARTNER_TIERS.map(({ name }) => name), ["Select", "Experience", "Signature", "Founding Circle"]);
  assert.equal(PARTNER_TIERS.length, 4);
  assert.ok(PARTNER_TIERS.every(({ includes }) => includes.length >= 3));
  assert.equal(
    PARTNER_PARTICIPATION_NOTE,
    "Founding Circle refere-se exclusivamente à participação nesta celebração. Nenhuma opção promete preço, exclusividade, alcance, publicação, categoria protegida ou continuidade anual. A escolha registra interesse e não constitui reserva ou contrato.",
  );
});
