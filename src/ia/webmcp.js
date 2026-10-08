// WebMCP: o site oferece ferramentas a agentes de IA que rodam no navegador
// (por exemplo, o assistente do Chrome agindo em nome da pessoa).
//
// Em vez de o agente "ler" a página e clicar às cegas, ele chama funções com
// dados estruturados: buscar sabores por restrição, ver a ficha, saber se a
// loja está aberta, calcular um evento e abrir as telas certas. Os dados são os
// mesmos da Bentô IA (src/ia/catalogo.js).
//
// Padrão W3C em incubação (document.modelContext; o navigator.modelContext
// antigo foi descontinuado no Chrome 150). Sem suporte no navegador, isto não
// faz nada — custo zero para quem não tem.
import { PRODUCTS, MOOD_META } from "../data.js";
import { fatosSabor, fichaSabor, lojasAgora, entregaPorLoja, orcamentoEvento, EV_TIPOS } from "./catalogo.js";

const ENTREGA_ESTADO_URL = "https://totem.bentogelateria.com/api/delivery/estado";
const resposta = (dados) => ({ content: [{ type: "text", text: JSON.stringify(dados) }] });

function buscar({ restricoes = [], perfil, linha, proteina_min, kcal_max, ordenar } = {}) {
  const r = Array.isArray(restricoes) ? restricoes : [];
  let lista = PRODUCTS.filter((p) => !(p.category === "bentole" && p.id.endsWith("-g")));
  if (linha === "gelato" || linha === "bentole") lista = lista.filter((p) => p.category === linha);
  if (r.includes("sem_lactose")) lista = lista.filter((p) => !p.flags.lactose);
  if (r.includes("sem_gluten")) lista = lista.filter((p) => !p.flags.gluten);
  if (r.includes("sem_poliois")) lista = lista.filter((p) => !p.hasPolyols);
  if (perfil && MOOD_META[perfil]) lista = lista.filter((p) => p.moods.includes(perfil));
  if (Number.isFinite(Number(proteina_min))) lista = lista.filter((p) => p.nutrition.protein >= Number(proteina_min));
  if (Number.isFinite(Number(kcal_max))) lista = lista.filter((p) => p.nutrition.kcal <= Number(kcal_max));
  if (ordenar === "proteina") lista = [...lista].sort((a, b) => b.nutrition.protein - a.nutrition.protein);
  if (ordenar === "kcal") lista = [...lista].sort((a, b) => a.nutrition.kcal - b.nutrition.kcal);
  return { total: lista.length, sabores: lista.slice(0, 8).map(fatosSabor), observacao: "Produção compartilhada: todos podem conter traços de alérgicos. Disponibilidade varia por loja e dia." };
}

// acoes: ref com { abrirSabor(id), abrirOrcamento(n), perguntar(texto) } — ref
// para registrar uma vez só e ainda chamar as funções atuais do App.
export function registrarFerramentasWebMCP(acoes) {
  if (typeof document === "undefined") return () => {};
  const mc = document.modelContext || (typeof navigator !== "undefined" && navigator.modelContext);
  if (!mc || typeof mc.registerTool !== "function") return () => {};
  const ctrl = new AbortController();
  const ferramentas = [
    {
      name: "buscar_sabores",
      title: "Buscar sabores Bentô",
      description: "Busca gelatos e picolés Bentôlé por restrição (sem lactose, sem glúten, sem polióis), perfil (pós-treino, leve, refrescante...), proteína mínima ou calorias máximas. Devolve a tabela nutricional, alérgicos e alegações oficiais.",
      inputSchema: {
        type: "object",
        properties: {
          restricoes: { type: "array", items: { type: "string", enum: ["sem_lactose", "sem_gluten", "sem_poliois"] } },
          perfil: { type: "string", enum: Object.keys(MOOD_META) },
          linha: { type: "string", enum: ["gelato", "bentole"] },
          proteina_min: { type: "number" },
          kcal_max: { type: "number" },
          ordenar: { type: "string", enum: ["proteina", "kcal"] },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => resposta(buscar(input || {})),
    },
    {
      name: "ficha_sabor",
      title: "Ficha de um sabor",
      description: "Ingredientes, alérgicos (contém e pode conter), lactose, glúten, polióis e tabela nutricional de um sabor pelo id.",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      annotations: { readOnlyHint: true },
      execute: async (input) => { const f = fichaSabor(input && input.id); return resposta(f || { erro: "id desconhecido" }); },
    },
    {
      name: "lojas_agora",
      title: "Lojas Bentô agora",
      description: "Se cada loja Bentô em Vitória-ES está aberta agora, horário de hoje, endereço e estado da entrega própria.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => {
        let entrega = null, cfg = null;
        try { const r = await fetch(ENTREGA_ESTADO_URL, { mode: "cors", signal: AbortSignal.timeout(3000) }); entrega = r.ok ? entregaPorLoja(await r.json()) : null; } catch { entrega = null; }
        // Horário editado no painel (site:config) vale por cima do código, como no resto do site.
        try { const r = await fetch("/api/site-config", { cache: "no-store", signal: AbortSignal.timeout(3000) }); cfg = r.ok ? await r.json() : null; } catch { cfg = null; }
        return resposta({ lojas: lojasAgora(cfg && cfg.lojas), entrega: entrega || "sem dados agora; o pedido online mostra se a entrega está disponível", pedido_online: "https://totem.bentogelateria.com/pedir" });
      },
    },
    {
      name: "calcular_evento",
      title: "Calcular evento",
      description: "Calcula o serviço de gelato para um evento (valor por pessoa, formatos que atendem, rendimento e equipe) com o motor do orçamento oficial. Logística e personalização ficam fora do subtotal.",
      inputSchema: { type: "object", properties: { convidados: { type: "integer", minimum: 1, maximum: 5000 }, produtos: { type: "string", enum: EV_TIPOS } }, required: ["convidados"] },
      annotations: { readOnlyHint: true },
      execute: async (input) => resposta(orcamentoEvento(input && input.convidados, input && input.produtos) || { erro: "convidados inválido" }),
    },
    {
      name: "abrir_sabor",
      title: "Abrir a ficha de um sabor",
      description: "Abre na tela a ficha completa de um sabor (tabela nutricional, ingredientes e alérgicos).",
      inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      execute: async (input) => {
        const id = String((input && input.id) || "");
        if (!PRODUCTS.some((p) => p.id === id)) return resposta({ erro: "id desconhecido" });
        acoes.current.abrirSabor(id);
        return resposta({ aberto: id });
      },
    },
    {
      name: "abrir_orcamento_evento",
      title: "Abrir orçamento de evento",
      description: "Abre o orçamento online de evento já com o número de convidados, para a pessoa completar data, local e contato.",
      inputSchema: { type: "object", properties: { convidados: { type: "integer", minimum: 1, maximum: 5000 } }, required: ["convidados"] },
      execute: async (input) => { acoes.current.abrirOrcamento(Math.round(Number(input && input.convidados)) || null); return resposta({ aberto: true }); },
    },
    {
      name: "perguntar_bento_ia",
      title: "Perguntar à Bentô IA",
      description: "Abre a Bentô IA (concierge do site) com uma pergunta da pessoa sobre sabores, lojas, pedidos ou eventos.",
      inputSchema: { type: "object", properties: { pergunta: { type: "string", maxLength: 300 } }, required: ["pergunta"] },
      execute: async (input) => { acoes.current.perguntar(String((input && input.pergunta) || "").slice(0, 300)); return resposta({ aberto: true }); },
    },
  ];
  for (const f of ferramentas) {
    try {
      const r = mc.registerTool(f, { signal: ctrl.signal });
      if (r && typeof r.catch === "function") r.catch(() => {});
    } catch { /* navegador com outra versão da API: segue sem esta ferramenta */ }
  }
  return () => {
    ctrl.abort();
    // Implementações antigas (navigator.modelContext) desregistram pelo nome.
    if (typeof mc.unregisterTool === "function") for (const f of ferramentas) { try { mc.unregisterTool(f.name); } catch { /* */ } }
  };
}
