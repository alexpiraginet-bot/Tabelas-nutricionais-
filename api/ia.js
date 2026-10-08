// Bentô IA — endpoint do concierge do site (POST, resposta em streaming SSE).
//
// O motor (prompt, ferramentas, laço com o Claude) está em lib/ia-motor.js; aqui
// fica o que é HTTP: origem, limites de uso, contexto das lojas e o fluxo de
// eventos para o navegador.
//
// Env: ANTHROPIC_API_KEY (a mesma do painel de fichas e do contrato).
// Opcionais: IA_MODELO (padrão claude-opus-5-5), IA_ESFORCO (padrão low),
// IA_LIMITE_DIA (perguntas por dia no site inteiro, padrão 500),
// IA_DESLIGADA=1 (desliga a IA sem deploy de código: o site esconde a entrada).
//
// Custo: o prompt fixo (regras + catálogo) fica no cache da Anthropic; cada
// pergunta paga a leitura do cache, a conversa e a resposta curta. Os limites
// abaixo existem para que um robô não transforme isso em conta alta.
import Anthropic from "@anthropic-ai/sdk";
import { conversar, montarSistema, ErroConversa, MODELO_PADRAO, ESFORCO_PADRAO } from "../lib/ia-motor.js";

export const config = { maxDuration: 60 };

const ENTREGA_ESTADO_URL = "https://totem.bentogelateria.com/api/delivery/estado";
const SISTEMA = montarSistema();
const LIMITE_DIA = Math.max(1, Number(process.env.IA_LIMITE_DIA) || 500);
const LIMITE_IP_10MIN = 15;
const LIMITE_IP_DIA = 60;

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

async function pipeline(cmds) {
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    signal: AbortSignal.timeout(2500),
  });
  if (!r.ok) throw new Error("kv " + r.status);
  return r.json();
}
const valor = (x) => (x && typeof x === "object" && "result" in x ? x.result : x);

// Só páginas do próprio site conversam com a IA: a mesma origem do pedido
// (bentogelateria.com, o preview desta implantação, o localhost do dev) ou um
// subdomínio nosso. Nada de *.vercel.app genérico: qualquer pessoa publica uma
// página lá, e os visitantes dela gastariam a cota da IA sem saber.
function originOk(req) {
  const o = req.headers.origin || req.headers.referer || "";
  if (!o) return false;
  try {
    const u = new URL(o);
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
    if (host && u.host.toLowerCase() === host) return true;
    return u.hostname === "bentogelateria.com" || u.hostname.endsWith(".bentogelateria.com");
  } catch { return false; }
}
const ipOf = (req) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "sem-ip";
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// Limites: por IP (rajada e dia) e do site inteiro por dia. Banco fora do ar
// não derruba a IA — o limite do site é proteção de custo, não de segurança.
// Também lê o horário que a equipe editou no painel (site:config), na mesma ida.
// Fim do dia em Vitória (meia-noite seguinte), em segundos. O Brasil não tem
// horário de verão desde 2019, então o fuso é fixo em -03:00.
export function fimDoDiaSP(dia) {
  return Math.floor(Date.parse(dia + "T00:00:00-03:00") / 1000) + 86400;
}

export async function limitesEConfig(ip) {
  if (!KV_URL || !KV_TOKEN) return { ok: true, config: null };
  const dia = hojeSP();
  try {
    // Janelas fixas (a chave carrega a janela), sem depender de EXPIRE NX.
    // A chave diária do IP morre na meia-noite de Vitória (EXPIREAT), nunca
    // depois: é o "no máximo um dia" prometido na política de privacidade.
    const janela = Math.floor(Date.now() / 600000);
    const k10 = "ia:rl10:" + janela + ":" + ip, kDia = "ia:rldia:" + dia + ":" + ip;
    const r = await pipeline([
      ["INCR", k10], ["EXPIRE", k10, 660],
      ["INCR", kDia], ["EXPIREAT", kDia, fimDoDiaSP(dia)],
      ["GET", "site:config"],
    ]);
    const n10 = Number(valor(r[0])), nDia = Number(valor(r[2]));
    let cfg = null;
    try { cfg = JSON.parse(valor(r[4]) || "null"); } catch { cfg = null; }
    if (n10 > LIMITE_IP_10MIN || nDia > LIMITE_IP_DIA) return { ok: false, motivo: "ip", config: cfg };
    // Só pergunta que passou no limite do IP conta na cota do site: senão um
    // único visitante insistindo (e recebendo 429) esgotaria a cota de todos.
    const g = await pipeline([["INCR", "ia:dia:" + dia], ["EXPIRE", "ia:dia:" + dia, 60 * 60 * 24 * 40]]);
    if (Number(valor(g[0])) > LIMITE_DIA) return { ok: false, motivo: "site", config: cfg };
    return { ok: true, config: cfg };
  } catch {
    return { ok: true, config: null };
  }
}

async function registrarUso(uso) {
  // Só contagem e tokens — nunca o texto da conversa.
  console.log("ia", JSON.stringify(uso));
  if (!KV_URL || !KV_TOKEN) return;
  const dia = hojeSP();
  try {
    await pipeline([
      ["HINCRBY", "ia:uso:" + dia, "entrada", uso.entrada || 0],
      ["HINCRBY", "ia:uso:" + dia, "cache_lido", uso.cache_lido || 0],
      ["HINCRBY", "ia:uso:" + dia, "cache_escrito", uso.cache_escrito || 0],
      ["HINCRBY", "ia:uso:" + dia, "saida", uso.saida || 0],
      ["EXPIRE", "ia:uso:" + dia, 60 * 60 * 24 * 40],
    ]);
  } catch { /* contagem é bônus */ }
}

function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") { try { return Promise.resolve(JSON.parse(req.body)); } catch { return Promise.resolve(null); } }
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 65536) { d = ""; req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    req.on("error", () => resolve(null));
  });
}

async function carregarEntrega() {
  const r = await fetch(ENTREGA_ESTADO_URL, { signal: AbortSignal.timeout(3000), headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  return r.json();
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // O site pergunta se a IA está ligada antes de mostrar a entrada.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).json({ ativa: !!process.env.ANTHROPIC_API_KEY && process.env.IA_DESLIGADA !== "1" });
    return;
  }
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!originOk(req)) { res.status(403).json({ ok: false, erro: "origem" }); return; }
  // Só JSON: de outro site, um POST application/json exige preflight de CORS,
  // que este endpoint nunca aprova. Um text/plain "simples" passaria direto.
  if (!/^application\/json\b/i.test(String(req.headers["content-type"] || ""))) { res.status(415).json({ ok: false, erro: "pedido inválido" }); return; }
  if (!process.env.ANTHROPIC_API_KEY || process.env.IA_DESLIGADA === "1") {
    res.status(503).json({ ok: false, erro: "A Bentô IA está desligada agora. Fale com a equipe pelo WhatsApp (27) 99915-9995." });
    return;
  }
  const body = await readBody(req);
  if (!body || !Array.isArray(body.mensagens)) { res.status(400).json({ ok: false, erro: "pedido inválido" }); return; }

  const lim = await limitesEConfig(ipOf(req));
  if (!lim.ok) {
    res.status(429).json({ ok: false, erro: lim.motivo === "site"
      ? "A Bentô IA atendeu muita gente hoje e fez uma pausa. A equipe responde pelo WhatsApp (27) 99915-9995."
      : "Muitas perguntas seguidas daqui. Espere uns minutos e tente de novo, ou fale com a equipe pelo WhatsApp." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  const enviar = (evento, dados) => { try { res.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`); } catch { /* conexão fechou */ } };

  // Quem fecha a aba cancela a chamada ao modelo (e para de gastar). É o
  // "close" da RESPOSTA: o do pedido dispara assim que o corpo termina de chegar.
  const ctrl = new AbortController();
  res.on("close", () => { if (!res.writableEnded) ctrl.abort(); });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45000, maxRetries: 1 });
  try {
    const uso = await conversar({
      client,
      mensagens: body.mensagens,
      ctx: { sistema: SISTEMA, overridesLojas: lim.config && lim.config.lojas, carregarEntrega },
      enviar,
      modelo: process.env.IA_MODELO || MODELO_PADRAO,
      esforco: process.env.IA_ESFORCO || ESFORCO_PADRAO,
      sinal: ctrl.signal,
    });
    enviar("fim", { ok: true });
    await registrarUso(uso);
  } catch (e) {
    let msg = "Tive um problema para responder agora. Tente de novo em instantes ou fale com a equipe pelo WhatsApp (27) 99915-9995.";
    if (e instanceof Anthropic.RateLimitError) msg = "Muita gente perguntando ao mesmo tempo. Tente de novo em alguns segundos.";
    else if (e instanceof Anthropic.APIUserAbortError) msg = "";
    else if (e instanceof ErroConversa) msg = "Não entendi a pergunta. Pode escrever de novo?";
    console.error("ia erro", e && e.constructor && e.constructor.name, e && e.status, String(e && e.message).slice(0, 300));
    if (msg) enviar("erro", { msg });
  } finally {
    try { res.end(); } catch { /* */ }
  }
}
