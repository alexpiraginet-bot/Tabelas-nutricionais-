# Sistema de Fichas Técnicas Bentô — pacote de transplante

Sistema completo de **insumos, receitas e fichas técnicas nível ANVISA** da Bentô
Functional Nutrition (ABB Gelateria Ltda), empacotado para integração no app de
controle de indústria. Extraído do repositório do site em 06/07/2026
(PRs #161–#175).

## O que este pacote contém

| Pasta | Conteúdo |
|---|---|
| `app/fichas.html` | O painel completo (HTML único, zero dependências): categorias Gelatos/Bentôlé/Shakes, editor de rascunhos por SKU **com receita de produção editável** (hidratada da receita publicada, cálculo ao vivo calculado × publicado), módulo 🧺 Insumos (busca TACO+TBCA, anexo de fichas, macros), módulo 👩‍🍳 Receitas (cálculo automático), **salvamento automático ☁️ + sincronização entre dispositivos**, **botão 🚀 Publicar tabela no site**, análise de conformidade por IA, ficha padrão indústria e dossiê ANVISA imprimível |
| `api/fichas.js` | Backend de persistência (Vercel serverless + Upstash/Redis KV): rascunhos, insumos, receitas e config da empresa |
| `api/fichas-publish.js` | **Publicação no site**: valida o rascunho do KV e gera um commit auditável em `src/data-overrides.js` do repositório do site via API do GitHub (`Publica tabela <sku> — rev NNN (por <nome>)`) → build recalcula claims/lupa/CSVs → deploy automático. É a ponte indústria → site |
| `api/fichas-ai.js` | Análise de conformidade via Claude (`claude-opus-4-8`, SDK oficial `@anthropic-ai/sdk`), com checklist RDC 727/2022 + IN 75/2020, RDC 26/2015, RDC 429/2020, RDC 54/2012, alulose, dextrose, polióis; saída estruturada (JSON schema) com parecer e textos de rótulo prontos |
| `api/upload.js` | Assinatura de upload direto para Supabase Storage (anexos de fichas de insumos) |
| `data/taco.json` | Base de alimentos combinada — **6.265 itens**: TACO 4ª ed. (NEPA/UNICAMP, 597, ids numéricos) + **TBCA 7.2 (USP/FoRC, 5.668, ids = código oficial ex. `C0113T`)**. Itens TBCA trazem também `sugarAdd` (açúcar de adição) e `trans` por 100 g — a TACO não os informa |
| `data/insumos-seed.json` | 33 insumos auditados com dados EXATOS das fichas de fornecedor (fonte rastreável em cada registro) + `recipeMap` (ingrediente publicado → insumoId, cobertura total dos 29 SKUs). Campos `null` = dado inexistente na fonte — nunca inventado |
| `data/fichas-data.json` | Snapshot dos 29 SKUs + 4 shakes do site (gerado de `src/data.js` do repo do site) |
| `data/data-overrides.exemplo.js` | Formato do arquivo que o `fichas-publish` mantém no repo do site (overrides publicados com `_pub: {by, at, rev}`) |
| `scripts/generate-fichas.mjs` | Gerador do snapshot + CSVs (depende do `src/data.js` do site) |
| `docs/fichas-fornecedores/` | TODOS os documentos-fonte da auditoria: fichas Aromitalia, rótulos Lukau/Veneza, FTs Ice Cream Mix (PDFs), FT MEC3, rótulo da bebida de amêndoa — com README de rastreabilidade |
| `docs/REGRAS-ANVISA.md` | As regras regulatórias codificadas no sistema (a "alma" do compliance) |
| `INTEGRACAO.md` | Contratos de dados, endpoints, variáveis de ambiente e o fluxo indústria ↔ site |
| `HISTORICO.md` | Trilha de auditoria: o que foi feito, decidido e por quê (PRs #161–#175) |

## Subir em 5 minutos (num projeto Vercel)

1. Copie `app/fichas.html` para a pasta pública, `api/*.js` para `/api`.
2. `npm i @anthropic-ai/sdk` (única dependência das funções).
3. Variáveis de ambiente: `FICHAS_KEY` (senha do painel), `KV_REST_API_URL` +
   `KV_REST_API_TOKEN` (Upstash), `ANTHROPIC_API_KEY` (IA, opcional),
   `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (anexos, opcional), e para o botão
   de publicar no site: `GITHUB_TOKEN` (PAT fine-grained com contents:write no
   repo do site) + `FICHAS_GH_REPO` (padrão
   `alexpiraginet-bot/Tabelas-nutricionais-`).
4. Sirva `data/*.json` na raiz pública (`/taco.json`, `/insumos-seed.json`,
   `/fichas-data.json`).
5. Pronto: `/fichas.html` funciona idêntico ao do site.

> **Nuvem compartilhada**: se o app da indústria usar o MESMO Upstash/KV do
> site (mesmas `KV_REST_API_URL/TOKEN`), os dois painéis enxergam os mesmos
> rascunhos/insumos/receitas em tempo real (a sincronização automática puxa a
> cada 45 s). É o caminho recomendado: uma nuvem só, dois pontos de acesso.

## Arquitetura em uma frase

Front-end estático + 4 funções serverless + KV para estado editável + JSONs
estáticos para dados de referência (TACO+TBCA/seed/SKUs) — sem banco
relacional, sem build de front, tudo versionável em git.

## Divisão de responsabilidade (indústria × site)

- **App de indústria (este pacote)** = fonte da verdade de insumos, receitas e
  fichas. A nutricionista trabalha aqui, com salvamento automático na nuvem.
- **Site (repo Tabelas-nutricionais-)** = vitrine ao consumidor; os SKUs
  publicados vivem em `src/data.js` + `src/data-overrides.js`. O botão
  **🚀 Publicar tabela no site** atualiza a vitrine direto da indústria via
  commit auditável (sem PR manual) — claims RDC 54 e lupa RDC 429 recalculam
  no build (fluxo detalhado no `INTEGRACAO.md` §4).
