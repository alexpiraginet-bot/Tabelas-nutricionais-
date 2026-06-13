// ============================================================================
// AGENDA COMPARTILHADA · ponte com o Bentô OS (controle-industria)
// ----------------------------------------------------------------------------
// Os eventos confirmados aqui (na tela interna de Contrato) são gravados na
// MESMA base do Bentô OS: tabela `bento_kv` do Supabase, sob a chave
// `bento:agenda`, no MESMO formato que o módulo Agenda & Alertas do OS lê.
// Assim, um evento fechado pelo site aparece automaticamente no calendário
// interno da equipe — sem digitar duas vezes, sem divergência de dados.
//
// Pré-requisito: este app e o Bentô OS precisam apontar para o MESMO projeto
// Supabase (mesmas variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
// Sem essas variáveis, a nuvem fica desligada e a gravação não acontece
// (o site segue funcionando normalmente).
// ============================================================================

// Chave e tabela espelham exatamente o Bentô OS (src/agenda.jsx e src/storage.js).
const AGENDA_KEY = 'bento:agenda';
const KV_TABLE = 'bento_kv';

let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
while (SUPABASE_URL.endsWith('/')) SUPABASE_URL = SUPABASE_URL.slice(0, -1);
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// true quando a sincronização com o Bentô OS está ligada (Supabase configurado).
export const AGENDA_CLOUD_ON = Boolean(SUPABASE_URL && SUPABASE_KEY);

const supaHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function kvGet(key) {
  if (!AGENDA_CLOUD_ON) return null;
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/${KV_TABLE}?select=value&key=eq.${encodeURIComponent(key)}`,
    { headers: supaHeaders },
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const rows = await r.json();
  return rows.length ? rows[0].value : null;
}

async function kvSet(key, value) {
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${KV_TABLE}`, {
    method: 'POST',
    headers: { ...supaHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key, value: v, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

// "dd/mm/aaaa" → "aaaa-mm-dd" (formato que a Agenda do OS usa em `data`).
function isoDoBR(br) {
  const [dd, mm, yy] = String(br || '').split('/');
  if (!dd || !mm || !yy) return null;
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function slug(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 24) || 'evento';
}

const moneyBRL = (v) =>
  typeof v === 'number'
    ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : v;

// Converte os dados do contrato (objeto `d` da ContratoPage) num evento no
// formato do Bentô OS: { id, data, tipo, titulo, obs, by, at, ... }.
export function contratoParaEvento(d) {
  const data = isoDoBR(d.data);
  // id estável → reabrir o mesmo contrato e salvar de novo ATUALIZA o evento,
  // em vez de criar duplicata na agenda.
  const id = `ev-site-${data || 'sem-data'}-${slug(d.nome)}`;
  const titulo = `Evento · ${d.nome}${d.convidados ? ` (${d.convidados} pax)` : ''}`;
  const obs = [
    d.local,
    d.tipo,
    d.sabores ? `até ${d.sabores} sabores` : '',
    d.promotoras ? `${d.promotoras} promotora${d.promotoras > 1 ? 's' : ''}` : '',
    d.km != null ? `~${d.km} km` : '',
    d.total != null ? moneyBRL(d.total) : '',
    d.zap ? `Contato: ${d.zap}` : '',
  ].filter(Boolean).join(' · ');
  return {
    id,
    data,
    tipo: 'evento',
    titulo,
    obs,
    by: 'Site Bentô · Eventos',
    at: new Date().toISOString(),
    origem: 'tabelas-eventos', // marca a procedência (campo extra, ignorado pelo OS)
  };
}

// Grava (ou atualiza) o evento na agenda compartilhada do Bentô OS.
// Retorna { ok, reason }: 'saved' | 'updated' | 'offline' | 'baddate' | 'error'.
export async function salvarEventoNaAgenda(d) {
  const ev = contratoParaEvento(d);
  if (!ev.data) return { ok: false, reason: 'baddate' };
  if (!AGENDA_CLOUD_ON) return { ok: false, reason: 'offline' };
  try {
    const raw = await kvGet(AGENDA_KEY);
    let lista = [];
    if (raw != null) { try { lista = JSON.parse(raw); } catch { lista = []; } }
    if (!Array.isArray(lista)) lista = [];
    const idx = lista.findIndex((e) => e && e.id === ev.id);
    let reason = 'saved';
    if (idx >= 0) { lista[idx] = { ...lista[idx], ...ev }; reason = 'updated'; }
    else { lista = [ev, ...lista]; }
    await kvSet(AGENDA_KEY, lista);
    return { ok: true, reason };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
