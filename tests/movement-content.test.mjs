import test from "node:test";
import assert from "node:assert/strict";
import { EVENT, EXPERIENCE_STEPS, PARTNERS, PARTNER_ROLES } from "../src/movimento/movement-content.js";

test("movement presentations expose the confirmed event date and functional training format", () => {
  assert.deepEqual(EVENT, {
    dateIso: "2026-09-12",
    dateLong: "12 de setembro de 2026",
    dateShort: "12 set 2026",
    location: "Le Buffet Lounge · Vitória, ES",
    time: "Horário em confirmação",
    training: "Aulão funcional com personal renomado · nome em confirmação",
  });
  assert.ok(EXPERIENCE_STEPS.some(([title, text]) => title === "Aulão funcional" && text.includes("personal renomado")));
});

test("movement partner presentation uses the approved prospect references", () => {
  assert.deepEqual(PARTNERS.map(({ name }) => name), [
    "Grand Cave",
    "Le Buffet Lounge",
    "Fiore Laticínios",
    "Magia do Mar",
    "True Suplementos",
    "Academia Lifft",
    "Café Pocar",
    "Luciana Melo Perfumes",
    "Maquiagem & skincare",
  ]);
});

test("movement partner presentation includes premium mobility as a participation role", () => {
  assert.ok(PARTNER_ROLES.some(([title]) => title === "Mobilidade premium"));
});
