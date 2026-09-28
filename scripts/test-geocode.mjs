// Exercita a decisão de `api/geo.js` contra respostas simuladas do Nominatim.
//
// A versão anterior deste arquivo testava a evGeocode que vivia no modals.jsx e
// falava com o Nominatim direto do navegador. Ela passava — e o recurso estava
// quebrado em produção o tempo todo, porque o fetch era simulado e o serviço
// real respondia HTTP 403 a todas as chamadas. Por isso o primeiro caso aqui é
// sobre o TRANSPORTE (o User-Agent que nos identifica), e não só sobre parsing.
import assert from "node:assert/strict";

const UA_ESPERADO = /BentoGelatos/;
let CHAMADAS = [];
let RESPOSTAS = [];     // uma por chamada, na ordem; número = status de erro
const real = globalThis.fetch;
globalThis.fetch = async (u, opt) => {
  const url = String(u);
  // O Redis não existe no teste: deixa o cache no-op e não conta como chamada.
  if (!url.includes("nominatim")) return { ok: false, status: 500, json: async () => ({}) };
  CHAMADAS.push({ url, ua: (opt && opt.headers && opt.headers["User-Agent"]) || "" });
  const r = RESPOSTAS.shift();
  if (typeof r === "number") return { ok: false, status: r, text: async () => "", json: async () => [] };
  return { ok: true, status: 200, json: async () => r || [] };
};

const { default: handler } = await import("../api/geo.js");
const chamar = (q) => new Promise((r) => {
  CHAMADAS = [];
  handler({ method: "GET", headers: {}, query: { q } },
          { setHeader() {}, status(c) { this._c = c; return this; }, json(b) { r(b); } });
});

// Fábricas de resposta do Nominatim, só com os campos que a decisão usa.
const lugar = (nome, uf, tipo, lat, lon) => ({
  lat: String(lat), lon: String(lon), addresstype: tipo,
  display_name: nome, address: { state: uf, "ISO3166-2-lvl4": uf === "Espírito Santo" ? "BR-ES" : "BR-XX" },
});
const VITORIA = [-20.3155, -40.3128];
const MANAUS = [-3.119, -60.0217];
const SC = [-26.55, -53.03];

let falhas = 0;
const caso = async (nome, fn) => {
  try { await fn(); console.log("PASS · " + nome); }
  catch (e) { falhas++; console.log("FALHA · " + nome + "\n         " + e.message); }
};

await caso("manda o User-Agent que nos identifica (era HTTP 403 sem ele)", async () => {
  RESPOSTAS = [[lugar("Vitória, Espírito Santo", "Espírito Santo", "municipality", ...VITORIA)]];
  await chamar("Vitória");
  assert.match(CHAMADAS[0].ua, UA_ESPERADO, "a busca saiu sem User-Agent próprio");
});

await caso("a PRIMEIRA busca é no Brasil inteiro, não presa ao ES", async () => {
  RESPOSTAS = [[lugar("Vitória, Espírito Santo", "Espírito Santo", "municipality", ...VITORIA)]];
  await chamar("Vitória");
  assert.ok(!/bounded=1/.test(CHAMADAS[0].url),
    "a primeira busca ainda força o resultado para dentro do ES — foi assim que 'Manaus' virou 5 km");
});

await caso("endereço no ES devolve km e loja de referência", async () => {
  RESPOSTAS = [[lugar("Vila Velha, Espírito Santo", "Espírito Santo", "municipality", -20.33, -40.29)]];
  const r = await chamar("Vila Velha");
  assert.equal(r.ok, true);
  assert.ok(r.km > 0 && r.km < 320, "km fora do esperado: " + r.km);
  assert.ok(r.loja, "não disse de qual loja mediu");
});

await caso("mede do lugar que a pessoa quis dizer, não do candidato mais perto de uma loja", async () => {
  // Cachoeiro no topo + uma rua em Vitória na mesma lista. Pegar "a mais perto"
  // devolveria ~1 km e cobraria deslocamento de bairro por um evento a 140 km.
  RESPOSTAS = [[
    lugar("Cachoeiro de Itapemirim, Espírito Santo", "Espírito Santo", "municipality", -20.849, -41.113),
    lugar("Rua Cachoeiro, Praia do Canto, Vitória", "Espírito Santo", "road", ...VITORIA),
  ]];
  const r = await chamar("Cachoeiro de Itapemirim");
  assert.equal(r.ok, true);
  assert.ok(r.km > 100, "mediu " + r.km + " km — pegou o candidato errado da lista");
});

await caso("cidade de outro estado NÃO vira preço local por causa de rua homônima", async () => {
  // Este é o bug que o 403 escondia: 'Manaus' casava com a Rua Manaus, em Vila
  // Velha, e o orçamento saía com 5 km para um evento a 3.700 km.
  RESPOSTAS = [
    [lugar("Manaus, Amazonas", "Amazonas", "city", ...MANAUS)],          // busca BR
    [lugar("Rua Manaus, Vila Velha", "Espírito Santo", "road", -20.33, -40.29)],  // busca ES
  ];
  const r = await chamar("Manaus");
  assert.equal(r.ok, false, "aceitou um endereço fora do ES");
  assert.equal(r.fora, true, "não marcou como fora do ES");
  assert.equal(r.uf, "Amazonas");
  assert.ok(r.km > 1000, "mediu " + r.km + " km — está medindo da rua homônima");
});

await caso("homônimo de mesma força não é chutado: pede a cidade", async () => {
  RESPOSTAS = [
    [lugar("Anchieta, Santa Catarina", "Santa Catarina", "village", ...SC)],
    [lugar("Anchieta, Espírito Santo", "Espírito Santo", "municipality", -20.8, -40.64)],
  ];
  const r = await chamar("Anchieta");
  assert.equal(r.ok, false);
  assert.equal(r.ambiguo, true, "chutou um dos dois em vez de pedir desempate");
  assert.notEqual(r.fora, true, "ambíguo não pode bloquear o orçamento");
});

await caso("fora do teto de distância não vira preço", async () => {
  RESPOSTAS = [[lugar("Ponta longe", "Espírito Santo", "municipality", -10.0, -40.0)]];
  const r = await chamar("Ponta longe");
  assert.equal(r.ok, false, "aceitou um ponto acima do teto de 320 km");
});

await caso("nada encontrado não bloqueia o orçamento", async () => {
  RESPOSTAS = [[], []];
  const r = await chamar("asdkjhasd zzz");
  assert.equal(r.ok, false);
  assert.notEqual(r.fora, true, "marcou como fora do ES sem ter localizado nada");
});

await caso("Nominatim recusando (403/429) não derruba o orçamento", async () => {
  RESPOSTAS = [403, 429];
  const r = await chamar("Vitória");
  assert.equal(r.ok, false);
  assert.notEqual(r.fora, true);
});

globalThis.fetch = real;
console.log(falhas ? `\n${falhas} FALHA(S)` : "\nGeocodificação: todos os casos passaram.");
process.exit(falhas ? 1 : 0);
