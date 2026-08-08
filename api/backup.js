// Cópia diária de TUDO que o painel guarda no Redis, gravada no Supabase.
//
// POR QUE EXISTE: em 08/08/2026 o banco bateu o teto de requisições do plano e
// passou a recusar todo comando. O painel mostrou tudo vazio e por horas
// pareceu que os dados tinham sido apagados. Não tinham — mas não havia como
// saber, porque não existia cópia nenhuma. Um sistema que guarda contrato
// assinado, CPF de cliente e agenda de evento não pode depender de um único
// banco estar de bom humor.
//
// DECISÕES QUE IMPORTAM
//
//  · Fica em OUTRA infraestrutura (Supabase), não no mesmo Redis nem no Git.
//    Cópia no mesmo lugar do original não é cópia. E dado pessoal em
//    repositório é para sempre — não se apaga do histórico.
//
//  · Bucket PRIVADO, nunca o "artes" (que é público e de URL previsível).
//    Aqui dentro vai nome, telefone, CPF/CNPJ e contrato assinado. Isto é dado
//    pessoal e sensível na régua da LGPD; público seria vazamento, não backup.
//
//  · Arquivo COM DATA no nome, um por dia. Nada é sobrescrito. Backup que
//    sobrescreve não protege contra o erro que só se percebe uma semana depois.
//
//  · Se o banco recusar UM comando que seja, ABORTA e não grava arquivo
//    nenhum. Gravar uma cópia pela metade por cima de uma boa é a única forma
//    de um backup causar a perda que deveria evitar.
//
//  · Avisa no Telegram TODA vez — inclusive quando dá certo. Backup silencioso
//    é backup que ninguém sabe que parou de rodar.
//
// RESTAURAÇÃO: de propósito NÃO existe aqui. Restaurar é ato deliberado, feito
// por gente, com o `scripts/restaurar-backup.mjs` — nunca uma rota HTTP que
// alguém dispara sem querer.
import crypto from "node:crypto";
import { sendTelegram, esc } from "../lib/telegram.js";

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
const PANEL_KEY = process.env.PANEL_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET_BACKUP || "backups";

export const config = { maxDuration: 60 };

// Teto de comandos por rodada. O backup existe por causa de um estouro de cota:
// seria irônico ele mesmo virar o próximo. Se bater aqui, o arquivo sai assim
// mesmo, com a lista do que ficou de fora ANOTADA dentro dele e no aviso —
// corte silencioso vira "estava tudo lá" quando não estava.
const TETO_COMANDOS = 3000;

const KV_RECUSOU = (s, corpo) => new Error(
  "O banco recusou o comando (HTTP " + s + "). " +
  "Costuma ser limite do plano estourado, token inválido ou banco suspenso. " +
  "Isto NÃO significa que os dados sumiram — significa que não estamos conseguindo lê-los. " +
  String(corpo || "").slice(0, 200));

let gastos = 0;
async function pipe(cmds) {
  if (!cmds.length) return [];
  gastos += cmds.length;
  const r = await fetch(KV_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw KV_RECUSOU(r.status, await r.text().catch(() => ""));
  const j = await r.json();
  return j.map((x) => x.result);
}

function safeEq(a, b) {
  if (!a || !b) return false;
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
const bearer = (req) => { const h = req.headers.authorization || ""; return h.startsWith("Bearer ") ? h.slice(7) : ""; };

// ---------- o que é copiado ----------
// Nada de SCAN: tudo aqui é alcançável por índice, e SCAN numa base grande
// gastaria mais comando do que o backup inteiro.
const LISTAS = ["leads", "prevendas", "espera", "sejabento", "sorteio", "vagas",
                "contratos", "contratos:importados"];
const TEXTOS = ["leads:count", "prevendas:count", "prevendas:estoque", "prevendas:lote2",
                "prevendas:units", "espera:count", "sejabento:count", "sorteio:count",
                "sorteio:winners", "vagas:count", "fichas:drafts", "site:config", "home:destaque"];
// Fora de propósito: `contrato:tok:*` (índice de link, tem prazo e se reemite
// pelo painel) e `ev:*` / `brinde:done:*` (marcas de limite por minuto, que
// expiram sozinhas). Restaurar lixo com prazo vencido não ajuda ninguém.

async function coletar() {
  const dados = {}, faltou = [];

  const fixas = await pipe([
    ...LISTAS.map((k) => ["LRANGE", k, 0, -1]),
    ...TEXTOS.map((k) => ["GET", k]),
    ["HGETALL", "booked"],
    ["SMEMBERS", "clube:phones"],
  ]);
  let i = 0;
  for (const k of LISTAS) dados[k] = { tipo: "list", valor: fixas[i++] || [] };
  for (const k of TEXTOS) { const v = fixas[i++]; if (v !== null && v !== undefined) dados[k] = { tipo: "string", valor: v }; }
  dados["booked"] = { tipo: "hash", valor: fixas[i++] || [] };
  const telefones = fixas[i++] || [];
  dados["clube:phones"] = { tipo: "set", valor: telefones };

  // --- clube: um documento, um conjunto de indicados e um hash de códigos por telefone
  const restanteClube = Math.max(0, TETO_COMANDOS - gastos);
  const cabemClube = Math.floor(restanteClube / 3);
  const usados = telefones.slice(0, cabemClube);
  if (usados.length < telefones.length) faltou.push("clube: " + (telefones.length - usados.length) + " membro(s) além do teto");
  for (let n = 0; n < usados.length; n += 60) {
    const lote = usados.slice(n, n + 60);
    const r = await pipe(lote.flatMap((p) => [
      ["GET", "clube:" + p], ["SMEMBERS", "clube:ind:" + p], ["HGETALL", "clube:cod:" + p]]));
    lote.forEach((p, x) => {
      if (r[x * 3] != null) dados["clube:" + p] = { tipo: "string", valor: r[x * 3] };
      if ((r[x * 3 + 1] || []).length) dados["clube:ind:" + p] = { tipo: "set", valor: r[x * 3 + 1] };
      if ((r[x * 3 + 2] || []).length) dados["clube:cod:" + p] = { tipo: "hash", valor: r[x * 3 + 2] };
    });
  }

  // --- contratos: documento, cadeia de eventos e AS DUAS assinaturas.
  // Esta é a parte que não se refaz de jeito nenhum: contrato assinado é prova.
  const ids = [...new Set([...(dados["contratos"].valor || []), ...(dados["contratos:importados"].valor || [])])];
  const restanteCtr = Math.max(0, TETO_COMANDOS - gastos);
  const cabemCtr = Math.floor(restanteCtr / 4);
  const idsUsados = ids.slice(0, cabemCtr);
  if (idsUsados.length < ids.length) faltou.push("contratos: " + (ids.length - idsUsados.length) + " além do teto");
  for (let n = 0; n < idsUsados.length; n += 50) {
    const lote = idsUsados.slice(n, n + 50);
    const r = await pipe(lote.flatMap((id) => [
      ["GET", "contrato:" + id],
      ["LRANGE", "contrato:" + id + ":eventos", 0, -1],
      ["GET", "contrato:" + id + ":assinatura"],
      ["GET", "contrato:" + id + ":contratada"]]));
    lote.forEach((id, x) => {
      if (r[x * 4] != null) dados["contrato:" + id] = { tipo: "string", valor: r[x * 4] };
      if ((r[x * 4 + 1] || []).length) dados["contrato:" + id + ":eventos"] = { tipo: "list", valor: r[x * 4 + 1] };
      if (r[x * 4 + 2] != null) dados["contrato:" + id + ":assinatura"] = { tipo: "string", valor: r[x * 4 + 2] };
      if (r[x * 4 + 3] != null) dados["contrato:" + id + ":contratada"] = { tipo: "string", valor: r[x * 4 + 3] };
    });
  }
  return { dados, faltou };
}

// ---------- Supabase Storage ----------
const sb = (caminho, opts) => fetch(SB_URL + "/storage/v1" + caminho, {
  ...opts, headers: { Authorization: "Bearer " + SB_KEY, ...(opts && opts.headers) } });

async function garanteBalde() {
  const r = await sb("/bucket/" + BUCKET, { method: "GET" });
  if (r.ok) {
    const j = await r.json().catch(() => ({}));
    // Um balde PÚBLICO com CPF dentro é vazamento, não backup. Se estiver
    // público, o backup para aqui em vez de publicar dado de cliente.
    if (j && j.public === true) throw new Error("O bucket '" + BUCKET + "' está PÚBLICO. Backup tem dado pessoal — deixe-o privado no Supabase antes de continuar.");
    return;
  }
  const c = await sb("/bucket", { method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ name: BUCKET, id: BUCKET, public: false }) });
  if (!c.ok) throw new Error("Não consegui criar o bucket '" + BUCKET + "': " + (await c.text().catch(() => "")).slice(0, 200));
}

async function grava(caminho, conteudo) {
  const r = await sb("/object/" + BUCKET + "/" + caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: conteudo,
  });
  if (!r.ok) throw new Error("Supabase recusou a gravação (" + r.status + "): " + (await r.text().catch(() => "")).slice(0, 200));
}

async function lista(limite) {
  const r = await sb("/object/list/" + BUCKET, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: limite || 60, sortBy: { column: "name", order: "desc" } }),
  });
  if (!r.ok) return [];
  const j = await r.json().catch(() => []);
  return Array.isArray(j) ? j.filter((x) => x.name && x.name.endsWith(".json")) : [];
}

async function linkAssinado(caminho, segundos) {
  const r = await sb("/object/sign/" + BUCKET + "/" + caminho, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: segundos || 900 }),
  });
  const j = await r.json().catch(() => ({}));
  return j && j.signedURL ? SB_URL + "/storage/v1" + j.signedURL : null;
}

const kb = (n) => (n / 1024).toFixed(1) + " KB";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const okCron = !!(CRON_SECRET && safeEq(bearer(req), CRON_SECRET));
  const okKey = !!(PANEL_KEY && (safeEq(bearer(req), PANEL_KEY) || safeEq(req.query && req.query.key, PANEL_KEY)));
  if (!okCron && !okKey) { res.status(401).json({ ok: false, error: "não autorizado" }); return; }
  if (!SB_URL || !SB_KEY) { res.status(503).json({ ok: false, error: "Configure SUPABASE_URL e SUPABASE_SERVICE_KEY." }); return; }
  if (!KV_URL || !KV_TOKEN) { res.status(503).json({ ok: false, error: "Banco (Redis/KV) não configurado." }); return; }

  // Só listar (o painel usa para mostrar a última cópia e baixar)
  if (req.method === "GET" && req.query && req.query.listar !== undefined) {
    if (!okKey) { res.status(401).json({ ok: false, error: "não autorizado" }); return; }
    try {
      const arquivos = await lista(60);
      const baixar = req.query.baixar ? await linkAssinado(String(req.query.baixar).slice(0, 120), 900) : null;
      res.status(200).json({ ok: true, bucket: BUCKET, baixar, arquivos: arquivos.map((a) => ({
        nome: a.name, em: a.created_at || a.updated_at || null,
        bytes: (a.metadata && a.metadata.size) || null })) });
    } catch (e) { res.status(500).json({ ok: false, error: String((e && e.message) || e) }); }
    return;
  }

  const inicio = Date.now();
  gastos = 0;
  try {
    await garanteBalde();
    const { dados, faltou } = await coletar();

    const chaves = Object.keys(dados);
    const registros = chaves.reduce((n, k) => n + (Array.isArray(dados[k].valor) ? dados[k].valor.length : 1), 0);
    const doc = {
      formato: 1,
      geradoEm: new Date().toISOString(),
      origem: "bentogelateria.com",
      comandosGastos: gastos,
      incompleto: faltou.length ? faltou : undefined,   // presente = a cópia NÃO é o todo
      resumo: {
        leads: (dados["leads"] && dados["leads"].valor.length) || 0,
        contratos: (dados["contratos"] && dados["contratos"].valor.length) || 0,
        clube: (dados["clube:phones"] && dados["clube:phones"].valor.length) || 0,
        prevendas: (dados["prevendas"] && dados["prevendas"].valor.length) || 0,
        sorteio: (dados["sorteio"] && dados["sorteio"].valor.length) || 0,
        vagas: (dados["vagas"] && dados["vagas"].valor.length) || 0,
      },
      dados,
    };
    const corpo = JSON.stringify(doc);
    const dia = new Date().toISOString().slice(0, 10);
    const nome = "bento-" + dia + ".json";
    await grava(nome, corpo);

    // Comparação com a cópia anterior. Não bloqueia nada — o arquivo do dia já
    // está gravado e tem nome próprio —, mas uma queda grande precisa ser dita
    // em voz alta no mesmo dia, não descoberta daqui a um mês.
    let alerta = "";
    try {
      const anteriores = (await lista(3)).filter((a) => a.name !== nome);
      const ant = anteriores[0];
      if (ant && ant.metadata && ant.metadata.size && corpo.length < ant.metadata.size * 0.6) {
        alerta = "\n\n⚠️ <b>A cópia de hoje é bem menor que a de " + esc(ant.name) + "</b> ("
               + kb(corpo.length) + " contra " + kb(ant.metadata.size) + "). "
               + "Nada foi sobrescrito — as duas estão guardadas —, mas confira se não faltou coisa.";
      }
    } catch { /* comparar é bônus; não pode derrubar o backup */ }

    const r = { ok: true, arquivo: nome, bytes: corpo.length, chaves: chaves.length,
                registros, comandos: gastos, segundos: ((Date.now() - inicio) / 1000).toFixed(1),
                incompleto: faltou };
    await sendTelegram(
      "💾 <b>Backup do painel</b> — " + esc(nome) + "\n"
      + doc.resumo.leads + " leads · " + doc.resumo.contratos + " contratos · "
      + doc.resumo.clube + " no clube · " + doc.resumo.prevendas + " pré-vendas\n"
      + kb(corpo.length) + " · " + chaves.length + " chaves · " + registros + " registros · "
      + gastos + " comandos no banco"
      + (faltou.length ? "\n\n⚠️ <b>Cópia INCOMPLETA</b> (teto de comandos): " + esc(faltou.join("; ")) : "")
      + alerta);
    res.status(200).json(r);
  } catch (e) {
    // Nenhum arquivo é gravado quando a leitura falha: cópia pela metade é a
    // única forma de um backup causar a perda que deveria evitar.
    const msg = String((e && e.message) || e);
    await sendTelegram("🚨 <b>BACKUP FALHOU</b> — nenhuma cópia foi gravada hoje.\n\n" + esc(msg)
      + "\n\nO banco pode estar recusando comandos. Os dados não somem por isso, mas <b>hoje ficou sem cópia</b>.");
    res.status(500).json({ ok: false, error: msg, comandos: gastos });
  }
}
