// Geocodificação do local do evento — AGORA NO SERVIDOR.
//
// POR QUE ESTE ARQUIVO EXISTE
// O site chamava o Nominatim (OpenStreetMap) direto do navegador do cliente.
// Funcionava no papel e falhava na prática: o Nominatim recusa tráfego de
// aplicação com HTTP 403/429 — a política de uso dele exige um User-Agent que
// identifique o app (o navegador manda o dele, não o nosso) e limita a UMA
// requisição por segundo por IP. Cada orçamento disparava de duas a três
// buscas seguidas. Medido: 403 em 100% das tentativas sem User-Agent próprio,
// e 429 já na segunda com User-Agent de navegador.
//
// O `catch` do cliente engolia tudo em silêncio e a tela só dizia
// "Logística: a confirmar". O cliente não estava vendo erro nenhum — estava
// vendo um orçamento sem o deslocamento, que é justamente a reclamação.
//
// Aqui o problema some por três motivos:
//  1. mandamos um User-Agent que nos identifica, como a política pede;
//  2. tudo passa por cache no Redis — endereço geocodificado uma vez não volta
//     ao Nominatim por 30 dias. "Vitória" é a mesma coordenada hoje e no mês
//     que vem, então quase todo orçamento é servido do cache;
//  3. o limite de 1 req/s é nosso para administrar, e não do IP do cliente
//     (que num 4G é compartilhado com meio bairro).
//
// Contrato de saída — o mesmo que o cliente já consumia:
//   { ok:true,  km, loja, endereco }                  dentro do ES
//   { ok:false, fora:true, uf, endereco, km, loja }   fora do ES (bloqueia)
//   { ok:false }                                      não localizado (não bloqueia)
import { LOJAS } from "../src/lojas.js";

const UA = "BentoGelatos/1.0 (+https://bentogelateria.com; orcamento de eventos)";

const EV_ROTA = 1.3;       // fator linha reta → rota real
const EV_MAX_KM = 320;     // ES inteiro cabe nisto a partir de Vitória
const EV_CAIXA_ES = "-41.95,-17.85,-39.65,-21.35";  // lon1,lat1,lon2,lat2
const TTL = 60 * 60 * 24 * 30;   // 30 dias: coordenada de endereço não muda

function findKV() {
  let url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    for (const k of Object.keys(process.env)) {
      if (!url && /REST_API_URL$/.test(k)) url = process.env[k];
      if (!token && /REST_API_TOKEN$/.test(k) && !/READ_ONLY/.test(k)) token = process.env[k];
    }
  }
  return { url, token };
}
const { url: KV_URL, token: KV_TOKEN } = findKV();

// O cache é uma OTIMIZAÇÃO, não uma dependência: banco fora do ar não pode
// derrubar o orçamento. Por isso todo acesso ao Redis é best-effort.
async function kv(args) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const r = await fetch(KV_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.result;
  } catch { return null; }
}

function originOk(req) {
  const o = req.headers.origin || req.headers.referer || "";
  if (!o) return true;
  try {
    const h = new URL(o).hostname;
    return h === "bentogelateria.com" || h.endsWith(".bentogelateria.com") || h.endsWith(".vercel.app") || h === "localhost";
  } catch { return true; }
}
function ipOf(req) { return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(); }

// Teto por IP: 20 buscas por minuto. Quem está montando um orçamento faz uma ou
// duas; 20 é folgado para a pessoa e apertado para um raspador.
async function rateOk(req) {
  const ip = ipOf(req);
  if (!ip) return true;
  const k = "rl:geo:" + ip;
  const n = await kv(["INCR", k]);
  if (n === null) return true;           // sem banco, não barra ninguém
  if (Number(n) === 1) await kv(["EXPIRE", k, 60]);
  return Number(n) <= 20;
}

const rad = (x) => (x * Math.PI) / 180;
function haversine(a, b, c, d) {
  const R = 6371;
  const h = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const noES = (a) => {
  const uf = String((a && (a.state_code || a["ISO3166-2-lvl4"])) || "").toUpperCase();
  const nome = String((a && a.state) || "").toLowerCase();
  return uf.endsWith("-ES") || (nome.includes("esp") && nome.includes("santo"));
};
// Loja mais próxima de uma coordenada — a logística sai sempre da loja que
// estiver mais perto, que é como a operação realmente despacha.
function maisPerto(la, lo) {
  let best = null;
  for (const st of LOJAS) {
    const km = haversine(la, lo, st.lat, st.lng);
    if (!best || km < best.km) best = { km, loja: st.nome };
  }
  return best;
}

async function nominatim(params) {
  const url = "https://nominatim.openstreetmap.org/search?" + params;
  const r = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR", Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) throw new Error("nominatim " + r.status);
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

// Quão específico é um resultado. Serve para desempatar nome ambíguo: "Manaus"
// casa com a cidade do Amazonas E com uma "Rua Manaus" em Vila Velha. Cidade
// ganha de rua — quem digita "Manaus" não está falando de uma rua da Grande
// Vitória. Sem esta régua, o cliente de Manaus recebia preço de 5 km.
function especificidade(c) {
  const t = String((c && c.addresstype) || (c && c.type) || "").toLowerCase();
  if (["city", "municipality", "town", "administrative", "state"].includes(t)) return 3;
  if (["village", "suburb", "hamlet", "neighbourhood", "quarter", "borough"].includes(t)) return 2;
  return 1;   // road, building, amenity, house…
}
const coord = (c) => {
  const la = +c.lat, lo = +c.lon;
  return Number.isFinite(la) && Number.isFinite(lo) ? { la, lo } : null;
};
const buscaBR = (q) =>
  nominatim("format=json&addressdetails=1&limit=8&countrycodes=br&q=" + encodeURIComponent(q));
const buscaES = (q) =>
  nominatim("format=json&addressdetails=1&limit=8&countrycodes=br&viewbox=" + EV_CAIXA_ES +
            "&bounded=1&q=" + encodeURIComponent(q));

// Melhor candidato do ES numa lista, medido pela loja mais próxima.
function melhorNoES(lista) {
  let best = null;
  for (const c of lista) {
    if (!noES(c.address)) continue;
    const p = coord(c);
    if (!p) continue;
    const m = maisPerto(p.la, p.lo);
    if (m && (!best || m.km < best.km)) {
      best = { ...m, endereco: String(c.display_name || "").slice(0, 140), rank: especificidade(c) };
    }
  }
  return best;
}
const comoOk = (b) =>
  b && b.km <= EV_MAX_KM
    ? { ok: true, km: Math.max(1, Math.round(b.km * EV_ROTA)), loja: b.loja, endereco: b.endereco }
    : null;

// A ORDEM IMPORTA, e este foi o erro que o HTTP 403 vinha escondendo.
//
// A versão antiga buscava PRIMEIRO dentro da caixa do Espírito Santo, com
// bounded=1. Parece prudente e é o contrário: forçar a busca a só olhar para
// dentro do ES garante que ela SEMPRE ache alguma coisa aqui. "Manaus" casava
// com a Rua Manaus, em Vila Velha, e o orçamento saía com 5 km — preço de
// bairro para um evento a dois mil quilômetros. Medido, era o que acontecia.
//
// Agora a primeira pergunta é a que o cliente respondeu: "onde no Brasil fica
// isto?". O ranking do próprio Nominatim resolve a maioria (cidade ganha de
// rua), e só quando o topo cai fora do ES é que perguntamos se existe um
// homônimo aqui — e, se existir com a mesma força, não chutamos: pedimos a
// cidade. Conferido com Manaus, Belo Horizonte, Anchieta, Vila Velha,
// Guarapari, Serra, Vitória, Cachoeiro, Domingos Martins e Campo Grande.
async function geocode(base) {
  let br = [];
  try { br = await buscaBR(base); } catch { /* segue para a tentativa no ES */ }

  // Nada no Brasil inteiro: última chance para nome de espaço/cerimonial, que
  // às vezes só existe no índice local.
  if (!br.length) {
    let es = [];
    try { es = await buscaES(base); } catch { return { ok: false }; }
    return comoOk(melhorNoES(es)) || { ok: false };
  }

  const topo = br[0];

  // O que a pessoa quis dizer está no Espírito Santo: mede a partir DESTE ponto,
  // não do candidato mais perto de uma loja. Pegar o mais perto era outra forma
  // de empurrar o preço para baixo sem ninguém ter decidido isso.
  if (noES(topo.address)) {
    const p = coord(topo);
    if (p) {
      const m = maisPerto(p.la, p.lo);
      const r = comoOk({ ...m, endereco: String(topo.display_name || "").slice(0, 140) });
      if (r) return r;
    }
    return comoOk(melhorNoES(br)) || { ok: false };
  }

  // O topo caiu fora do ES. Existe homônimo aqui com a mesma força?
  let es = [];
  try { es = await buscaES(base); } catch { /* sem segunda opinião: trata como fora */ }
  const esBest = melhorNoES(es);
  const a = topo.address || {};
  if (esBest && esBest.rank >= especificidade(topo)) {
    // Empate real ("Anchieta" existe no ES e em SC). Chutar qualquer um dos dois
    // produz preço errado na metade das vezes, então não chutamos: NÃO bloqueia
    // (o orçamento sai com "logística a confirmar") e a tela pede a cidade.
    return {
      ok: false, ambiguo: true,
      uf: String(a.state || "").slice(0, 40),
      sugestao: esBest.endereco,
    };
  }

  // `ok:false` e `fora:true` SEMPRE: fora do ES não sai orçamento, então não
  // existe preço de deslocamento a fechar. O km segue sendo medido porque é
  // informação de decisão no painel — 131 km é uma exceção que pode valer a
  // pena, 3.728 km não é —, mas ele não vira preço em lugar nenhum.
  const p = coord(topo);
  const m = p ? maisPerto(p.la, p.lo) : null;
  return {
    ok: false, fora: true,
    uf: String(a.state || "").slice(0, 40),
    endereco: String(topo.display_name || "").slice(0, 140),
    km: m ? Math.max(1, Math.round(m.km * EV_ROTA)) : null,
    loja: m ? m.loja : null,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  if (!originOk(req)) return res.status(403).json({ ok: false });
  if (!(await rateOk(req))) return res.status(429).json({ ok: false, erro: "muitas buscas" });

  const base = String((req.query && req.query.q) || "").trim().slice(0, 180);
  if (!base) return res.status(200).json({ ok: false });

  const chave = "geo:" + base.toLowerCase().replace(/\s+/g, " ");
  const cache = await kv(["GET", chave]);
  if (cache) {
    try { return res.status(200).json({ ...JSON.parse(cache), cache: true }); } catch { /* valor podre: refaz */ }
  }

  let out;
  try { out = await geocode(base); }
  catch { out = { ok: false }; }   // nunca derruba o orçamento por causa do geocoder

  // Só guarda acerto ou certeza de fora. "Não localizei" não é guardado: seria
  // prender um endereço mal digitado mesmo depois de a pessoa corrigir.
  if (out.ok || out.fora || out.ambiguo) await kv(["SET", chave, JSON.stringify(out), "EX", TTL]);

  return res.status(200).json(out);
}
