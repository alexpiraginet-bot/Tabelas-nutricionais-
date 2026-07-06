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

### `POST /api/fichas-publish` · mesmo auth · corpo `{ "id": "<skuId>", "by": "nome" }`
Publica a tabela do rascunho no site público via **commit auditável**:
1. Lê `fichas:drafts[id]` no KV (o que a nutricionista vê é o que publica).
2. Valida: porção > 0, valores numéricos ≥ 0; escopo publicável = `serving`,
   `portionLabel` e os 10 campos de `nutrition`.
3. `PUT /repos/<FICHAS_GH_REPO>/contents/src/data-overrides.js` na `main` com a
   mensagem `Publica tabela <sku> — rev NNN (por <nome>, via painel de fichas)`.
4. O build do site aplica os overrides ANTES das derivações → claims (RDC 54),
   lupa (RDC 429) e CSVs recalculam sobre os valores publicados; deploy ~2 min.
5. Registra `_pub: {by, at, rev}` de volta no KV (o painel exibe o estado).
Resposta: `{ ok, drafts, commit: "<url do commit>", pub: {by, at, rev} }`.
Erros controlados: 400 (sem rascunho/valores inválidos), 502 (KV/GitHub), 503
(sem `GITHUB_TOKEN`).

## 3. Dados de referência (estáticos, versionados)

- `taco.json`: `{fonte, alimentos:[{id, nome, cat, kcal, prot, fat, sat, carb, fiber, na, sugarAdd?, trans?}]}`
  — por 100 g. Origem combinada: TACO 4ª ed. NEPA/UNICAMP (597, ids numéricos) +
  **TBCA 7.2 USP/FoRC (5.668, ids = código oficial, `cat` prefixada com
  "TBCA · ")**. Itens TBCA trazem açúcar de adição (`sugarAdd`) e trans; campos
  omitidos = dado não informado (pendente). Convenções da conversão: vírgula
  decimal → ponto; `tr` (traço) → 0; `NA`/`-` → omitido.
- `insumos-seed.json`: `{insumos: [33 auditados], recipeMap: {nome do
  ingrediente publicado → insumoId}}`; **cada insumo cita o documento fonte** em
  `docs/fichas-fornecedores/`. O `recipeMap` hidrata a receita de produção
  editável dos SKUs existentes (cobertura total dos 29). Ao transplantar,
  mantenha os documentos juntos — são a defesa em fiscalização.
- `fichas-data.json`: SKUs do site (29 produtos + 4 shakes) com ingredientes,
  macros, alérgenos, claims e flags — regenerado no site por
  `npm run fichas` a partir de `src/data.js`.

## 4. Fluxo indústria ↔ site (IMPLEMENTADO — botão 🚀 Publicar)

```
[App indústria]  nutricionista edita insumos/receitas/fichas  (fonte da verdade)
      │  ☁️ salvamento automático no KV (2,5 s) + sincronização entre aparelhos
      │  validação (IA + RT) → ficha aprovada
      ▼
[🚀 Publicar tabela no site]  api/fichas-publish.js
      │  commit auditável em src/data-overrides.js do repo do site
      │  ("Publica tabela <sku> — rev NNN (por <nome>)")
      ▼
[Site]  build aplica overrides → claims/lupa/CSVs recalculam → deploy (~2 min)
      ▼
[Consumidor]  tabelas do site sempre em sincronia com a indústria
```
Para o app da indústria publicar no site, basta configurar `GITHUB_TOKEN` +
`FICHAS_GH_REPO` apontando para o repo do site — nenhum GitHub Action é
necessário. Se indústria e site compartilharem o MESMO Upstash/KV, os dois
painéis são espelhos em tempo real (sincronização a cada 45 s).

## 5. Variáveis de ambiente

| Var | Uso | Obrigatória |
|---|---|---|
| `FICHAS_KEY` | senha do painel de fichas | sim (ou PANEL_KEY) |
| `PANEL_KEY` | fallback/admin | — |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis (estado) | sim |
| `ANTHROPIC_API_KEY` | análise IA | opcional |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | anexos de fichas | opcional |
| `SUPABASE_BUCKET` | bucket (default `artes`) | opcional |
| `GITHUB_TOKEN` (ou `FICHAS_GH_TOKEN`) | PAT fine-grained, contents:write no repo do site — botão 🚀 Publicar | p/ publicar |
| `FICHAS_GH_REPO` | repo alvo da publicação (default `alexpiraginet-bot/Tabelas-nutricionais-`) | — |

## 6. Segurança

- Auth por Bearer com comparação timing-safe; senhas nunca no front (localStorage
  do navegador da nutricionista apenas).
- Uploads: assinatura server-side; a service key do Supabase nunca vai ao navegador.
- A IA recebe apenas a ficha (sem dados pessoais); saída validada por JSON schema.
- Nada de dados inventados: campos sem fonte ficam null/pendentes por design.
