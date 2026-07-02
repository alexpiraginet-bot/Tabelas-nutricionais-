# Sistema de Fichas Técnicas Bentô — pacote de transplante

Sistema completo de **insumos, receitas e fichas técnicas nível ANVISA** da Bentô
Functional Nutrition (ABB Gelateria Ltda), empacotado para integração no app de
controle de indústria. Extraído do repositório do site em 02/07/2026
(PRs #161–#171).

## O que este pacote contém

| Pasta | Conteúdo |
|---|---|
| `app/fichas.html` | O painel completo (HTML único, zero dependências): categorias Gelatos/Bentôlé/Shakes, editor de rascunhos por SKU, módulo 🧺 Insumos (busca TACO, anexo de fichas, macros), módulo 👩‍🍳 Receitas (cálculo automático), análise de conformidade por IA, ficha padrão indústria e dossiê ANVISA imprimível |
| `api/fichas.js` | Backend de persistência (Vercel serverless + Upstash/Redis KV): rascunhos, insumos, receitas e config da empresa |
| `api/fichas-ai.js` | Análise de conformidade via Claude (`claude-opus-4-8`, SDK oficial `@anthropic-ai/sdk`), com checklist RDC 727/2022 + IN 75/2020, RDC 26/2015, RDC 429/2020, RDC 54/2012, alulose, dextrose, polióis; saída estruturada (JSON schema) com parecer e textos de rótulo prontos |
| `api/upload.js` | Assinatura de upload direto para Supabase Storage (anexos de fichas de insumos) |
| `data/taco.json` | TACO 4ª ed. (NEPA/UNICAMP) — 597 alimentos, macros por 100 g (kcal, prot, gordura, saturada, carboidrato, fibra, sódio). A TACO **não** informa açúcares/polióis |
| `data/insumos-seed.json` | 18 insumos auditados com dados EXATOS das fichas de fornecedor (fonte rastreável em cada registro). Campos `null` = dado inexistente na fonte — nunca inventado |
| `data/fichas-data.json` | Snapshot dos 29 SKUs + 4 shakes do site (gerado de `src/data.js` do repo do site) |
| `scripts/generate-fichas.mjs` | Gerador do snapshot + CSVs (depende do `src/data.js` do site) |
| `docs/fichas-fornecedores/` | TODOS os documentos-fonte da auditoria: fichas Aromitalia, rótulos Lukau/Veneza, FTs Ice Cream Mix (PDFs), FT MEC3, rótulo da bebida de amêndoa — com README de rastreabilidade |
| `docs/REGRAS-ANVISA.md` | As regras regulatórias codificadas no sistema (a "alma" do compliance) |
| `INTEGRACAO.md` | Contratos de dados, endpoints, variáveis de ambiente e o fluxo indústria ↔ site |
| `HISTORICO.md` | Trilha de auditoria: o que foi feito, decidido e por quê (PRs #161–#171) |

## Subir em 5 minutos (num projeto Vercel)

1. Copie `app/fichas.html` para a pasta pública, `api/*.js` para `/api`.
2. `npm i @anthropic-ai/sdk` (única dependência das funções).
3. Variáveis de ambiente: `FICHAS_KEY` (senha do painel), `KV_REST_API_URL` +
   `KV_REST_API_TOKEN` (Upstash), `ANTHROPIC_API_KEY` (IA, opcional),
   `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (anexos, opcional).
4. Sirva `data/*.json` na raiz pública (`/taco.json`, `/insumos-seed.json`,
   `/fichas-data.json`).
5. Pronto: `/fichas.html` funciona idêntico ao do site.

## Arquitetura em uma frase

Front-end estático + 3 funções serverless + KV para estado editável + JSONs
estáticos para dados de referência (TACO/seed/SKUs) — sem banco relacional,
sem build de front, tudo versionável em git.

## Divisão de responsabilidade proposta (indústria × site)

- **App de indústria (este pacote)** = fonte da verdade de insumos, receitas e
  fichas. A nutricionista trabalha aqui.
- **Site (repo Tabelas-nutricionais-)** = vitrine ao consumidor; os SKUs
  publicados vivem em `src/data.js` e são atualizados **por PR** a partir das
  fichas validadas na indústria (fluxo detalhado no `INTEGRACAO.md` §4).
