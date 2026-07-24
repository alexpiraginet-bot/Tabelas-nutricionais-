// Análise de conformidade ANVISA de uma ficha técnica via Claude (painel /fichas.html).
// Recebe a ficha consolidada (base + rascunho) e devolve um parecer estruturado.
// Env: ANTHROPIC_API_KEY + FICHAS_KEY/PANEL_KEY. Modelo: claude-opus-4-8.
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

export const config = { maxDuration: 60 };

const KEYS = [process.env.FICHAS_KEY, process.env.PANEL_KEY].filter(Boolean);

function authed(req) {
  const h = req.headers.authorization || "";
  const k = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!k) return false;
  return KEYS.some((s) => {
    const a = Buffer.from(String(k)), b = Buffer.from(String(s));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "achados", "rotulo_sugerido"],
  properties: {
    status: { type: "string", enum: ["conforme", "conforme_com_ressalvas", "nao_conforme"] },
    achados: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["gravidade", "norma", "descricao", "correcao"],
        properties: {
          gravidade: { type: "string", enum: ["critico", "atencao", "info"] },
          norma: { type: "string" },
          descricao: { type: "string" },
          correcao: { type: "string" },
        },
      },
    },
    rotulo_sugerido: {
      type: "object",
      additionalProperties: false,
      required: ["lista_ingredientes", "alergicos", "advertencias", "alegacoes"],
      properties: {
        lista_ingredientes: { type: "string" },
        alergicos: { type: "string" },
        advertencias: { type: "array", items: { type: "string" } },
        alegacoes: { type: "array", items: { type: "string" } },
      },
    },
  },
};

const SYSTEM = `Você é auditor(a) de rotulagem de alimentos no Brasil, especialista em gelados comestíveis, revisando fichas técnicas da Bentô Functional Nutrition (ABB Gelateria) antes da notificação/protocolo na vigilância sanitária.

Verifique a ficha recebida contra:
- RDC 727/2022 + IN 75/2020: denominação de venda, lista de ingredientes em ordem decrescente (ingrediente composto com composição entre parênteses), aditivos com função + nome/INS, tabela nutricional por 100 g / porção / %VD, advertência de polióis ("Este produto pode ter efeito laxativo."), declaração de lactose.
- RDC 26/2015: alérgicos "ALÉRGICOS: CONTÉM ..." em caixa alta, por espécie (castanhas nomeadas), "PODE CONTER" para contato cruzado; Lei 10.674/2003 (contém/não contém glúten).
- RDC 429/2020: rotulagem nutricional frontal (lupa) — açúcar adicionado ≥15 g, gordura saturada ≥6 g, sódio ≥600 mg por 100 g.
- RDC 54/2012: valide "sem adição de açúcares" (+ frase "Contém açúcares próprios dos ingredientes." quando houver açúcares próprios), "fonte de proteína" (≥6 g/porção), "alto teor" (≥12 g/porção). Por política absoluta da Bentô, nunca sugira nem produza "zero açúcar" ou "zero açúcares", ainda que o critério legal absoluto seja atendido; use somente "sem adição de açúcares" quando validado.
- PROIBIÇÕES/ARMADILHAS: alulose não é aprovada pela ANVISA (achado crítico se presente); dextrose/maltodextrina/açúcares ocultos em carriers invalidam "sem adição de açúcares"; "leite" é denominação exclusiva de produto animal (vegetal = "bebida vegetal"); produto com gordura vegetal e sem massa de cacau não pode chamar-se "chocolate" (usar "cobertura"); nomes de marca de terceiros não pertencem à lista de ingredientes; macros marcados como estimados exigem análise laboratorial antes do rótulo.

Aponte só o que a ficha permite concluir; o que depender de documento externo marque como "atencao" com a pendência. Escreva em PT-BR, conciso e técnico. No rotulo_sugerido, produza os textos EXATOS prontos para o rótulo/protocolo.`;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!KEYS.length || !authed(req)) { res.status(401).json({ ok: false, error: "Senha incorreta." }); return; }
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ ok: false, error: "Configure ANTHROPIC_API_KEY na Vercel para habilitar a análise por IA." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const ficha = body && body.ficha;
  if (!ficha || typeof ficha !== "object") { res.status(400).json({ ok: false, error: "ficha ausente" }); return; }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: `Audite esta ficha técnica (JSON do sistema interno; "draft" são edições da nutricionista ainda não publicadas):\n\n${JSON.stringify(ficha).slice(0, 60000)}`,
      }],
    });
    if (response.stop_reason === "refusal") {
      res.status(200).json({ ok: false, error: "A análise foi recusada pelo modelo — tente novamente." });
      return;
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    res.status(200).json({ ok: true, analise: JSON.parse(text), usage: response.usage });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e).slice(0, 300) });
  }
}
