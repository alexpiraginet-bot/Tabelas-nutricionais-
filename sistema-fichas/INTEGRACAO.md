# Integração — contratos de dados, endpoints e fluxo indústria ↔ site

## 1. Endpoints (funções serverless)

### `GET /api/fichas`  · auth: `Authorization: Bearer <FICHAS_KEY|PANEL_KEY>`
```json
{ "ok": true,
  "drafts":   { "<skuId|_config>": { ...patch, "_meta": {"by":"nome","at":"ISO"} } },
  "insumos":  { "<insumoId>": { ...insumo } },
  "receitas": { "<receitaId>": { ...receita } },
  "ai": true }
```

### `POST /api/fichas` · mesmo auth · corpo:
```json
{ "action": "save|clear|insumo-save|insumo-del|receita-save|receita-del",
  "id": "<chave>", "patch": { ... }, "by": "nome de quem editou" }
```
- `save/clear` → mapa `fichas:drafts` (rascunhos de SKU + registro especial `_config`)
- `insumo-*` → `fichas:insumos` · `receita-*` → `fichas:receitas`
- Resposta devolve o mapa atualizado. Merge raso por id (patch sobrepõe campos).

### `POST /api/fichas-ai` · mesmo auth
Corpo `{ "ficha": { base, draft, rotulo, contexto } }` → resposta:
```json
{ "ok": true, "analise": {
    "status": "conforme|conforme_com_ressalvas|nao_conforme",
    "achados": [{ "gravidade":"critico|atencao|info", "norma":"RDC …",
                   "descricao":"…", "correcao":"…" }],
    "rotulo_sugerido": { "lista_ingredientes":"…", "alergicos":"…",
                          "advertencias":["…"], "alegacoes":["…"] } } }
```
Modelo: `claude-opus-4-8` com saída estruturada (`output_config.format` json_schema),
`maxDuration: 60`. System prompt com o checklist regulatório completo (ver o arquivo).

### `POST /api/upload` · auth: `PANEL_KEY` ou `FICHAS_KEY`
`{ "action":"sign", "name":"arquivo.pdf" }` → `{ uploadUrl, publicUrl }`;
o navegador faz `PUT` do arquivo direto no `uploadUrl` (Supabase Storage, bucket
público `artes`). Sem passar pelo limite de payload da Vercel.

## 2. Modelos de dados (KV — chaves e formatos)

### `fichas:insumos` → `{ [id]: Insumo }` (id = slug do nome)
```json
{ "nome": "Cobertura sabor chocolate meio amargo",
  "categoria": "base|pasta|cobertura|láteo|proteína|complemento|líquido|fruta|outro",
  "origem": "ficha|taco|manual",
  "fonte": "referência do documento (fornecedor, código FT, revisão, arquivo)",
  "composicao": "lista declarada p/ rótulo (entre parênteses no ingrediente composto)",
  "alergenos": ["SOJA"], "podeConter": ["LEITE","AVELÃ"],
  "gluten": false, "lactoseZero": true,
  "macros100": { "kcal":482, "carb":47, "sugars":0, "addedSugars":0, "polyols":46,
                  "prot":4, "fat":38, "sat":37, "trans":0.1, "fiber":6, "na":0 },
  "tacoId": null, "tacoNome": null, "tacoQuery": null,
  "fichaUrl": "https://…supabase…/artes/…", "fichaNome": "ficha.pdf",
  "notas": "…", "_meta": { "by":"…", "at":"ISO" } }
```
- `macros100: null` (ou campos internos null) = **pendente** — a UI marca ⚠️,
  soma como 0 com aviso de "soma parcial" e **suspende claims**.
- O painel mescla `insumos-seed.json` (auditado, versionado em git) com o KV
  (edições) — KV vence por id. Excluir do KV = voltar à versão do seed.

### `fichas:receitas` → `{ [id]: Receita }`
```json
{ "nome": "Gelato teste", "categoria": "gelato|bentole|shake|outro",
  "itens": [ { "insumoId": "base-gelato", "qty": 1000 } ],
  "rendimento": 1500, "porcao": 100, "_rev": 2, "_meta": {…} }
```
- `rendimento: null` = soma das quantidades. Cálculo:
  `macroPorção = Σ(qty × macro100/100) ÷ rendimento × porção`.

### `fichas:drafts` → rascunhos de SKU publicados + `_config`
```json
"_config": { "empresa":"", "cnpj":"", "endereco":"", "cidadeUf":"",
  "rt":"", "rtRegistro":"", "validadeGelato":"", "validadeBentole":"",
  "validadeShake":"", "conservacao":"" }
```
Rascunho de SKU: qualquer subconjunto de `{serving, portionLabel, nutrition{...},
ingredientesText, alergicosText, denominacao, conservacao, obs, _rev}`.

## 3. Dados de referência (estáticos, versionados)

- `taco.json`: `{fonte, alimentos:[{id, nome, cat, kcal, prot, fat, sat, carb, fiber, na}]}`
  — por 100 g. Origem: TACO 4ª ed. NEPA/UNICAMP.
- `insumos-seed.json`: os 18 insumos auditados; **cada registro cita o documento
  fonte** em `docs/fichas-fornecedores/`. Ao transplantar, mantenha os documentos
  juntos — são a defesa em fiscalização.
- `fichas-data.json`: SKUs do site (29 produtos + 4 shakes) com ingredientes,
  macros, alérgenos, claims e flags — regenerado no site por
  `npm run fichas` a partir de `src/data.js`.

## 4. Fluxo indústria ↔ site (proposto)

```
[App indústria]  nutricionista edita insumos/receitas/fichas  (fonte da verdade)
      │  validação (IA + RT) → ficha aprovada
      ▼
[Export JSON]  botão "Exportar JSON" do painel (ou GET /api/fichas)
      │
      ▼
[Site]  PR atualizando src/data.js (agente/dev aplica os valores aprovados)
      │  npm run fichas regenera fichas-data.json/CSVs no build
      ▼
[Consumidor]  tabelas do site sempre em sincronia com a indústria
```
Automação sugerida quando o repo da indústria existir: um GitHub Action no repo
da indústria que, ao aprovar uma ficha, abre PR no repo do site com o diff de
`src/data.js` (os dois lados já falam o mesmo JSON).

## 5. Variáveis de ambiente

| Var | Uso | Obrigatória |
|---|---|---|
| `FICHAS_KEY` | senha do painel de fichas | sim (ou PANEL_KEY) |
| `PANEL_KEY` | fallback/admin | — |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis (estado) | sim |
| `ANTHROPIC_API_KEY` | análise IA | opcional |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | anexos de fichas | opcional |
| `SUPABASE_BUCKET` | bucket (default `artes`) | opcional |

## 6. Segurança

- Auth por Bearer com comparação timing-safe; senhas nunca no front (localStorage
  do navegador da nutricionista apenas).
- Uploads: assinatura server-side; a service key do Supabase nunca vai ao navegador.
- A IA recebe apenas a ficha (sem dados pessoais); saída validada por JSON schema.
- Nada de dados inventados: campos sem fonte ficam null/pendentes por design.
