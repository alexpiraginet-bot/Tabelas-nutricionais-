# Bentô em Movimento CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permitir que a equipe edite as apresentações Movimento no painel, preservando personalização segura, desempenho, fallback e compatibilidade do RSVP.

**Architecture:** conteúdo publicado é um override por cena em uma tabela Supabase protegida com colunas tipadas, mesclado por ID sobre os defaults do código. O runtime consulta apenas dados saneados e volta aos assets atuais em qualquer falha. O painel usa o mesmo `PANEL_KEY`, upload assinado versionado e controle otimista por revisão.

**Tech Stack:** React 18, Vite 5, JavaScript ESM, HTML/CSS/JS puro no painel, Vercel Functions, Supabase REST/Postgres/Storage, Node test runner, Sharp existente no projeto.

## Global Constraints

- Trabalhar exclusivamente no checkout `tabelas-nutricionais-movimento-main`; nunca alterar `alexos`.
- O evento continua sendo o primeiro aniversário em 12 de setembro de 2026 no Le Buffet Lounge.
- `influencer` permanece somente como chave interna; a interface usa `Convidada`.
- Nome, empresa, responsável, mensagem nominal, token, data/local e CTA transacional não são editáveis.
- Nenhum conteúdo customizado usa `innerHTML`.
- Nenhuma dependência de produção nova.
- TDD: cada comportamento novo precisa falhar pelo motivo esperado antes da implementação.
- Migration aditiva, RLS, sem acesso direto para `anon`/`authenticated` e sem exclusão de dados.
- Código atual permanece fallback integral.
- Não executar migration remota, commit, push ou deploy sem passar pelo gate explícito aplicável.

---

### Task 1: Contrato e API de conteúdo

**Files:**
- Create: `lib/movement-content-config.mjs`
- Create: `api/movimento-content.js`
- Create: `supabase/migrations/20260812130452_bento_movement_content.sql`
- Create: `tests/movement-content-config.test.mjs`
- Create: `tests/movement-content-api.test.mjs`
- Modify: `tests/movement-migrations.test.mjs`

**Interfaces:**
- Produces `sanitizeMovementOverride(value, options)` and allowlists for two audiences and 32 scene IDs.
- Produces public/admin GET and revision-safe POST `/api/movimento-content`.

- [ ] Write tests for allowlists, string limits, opacity, URL schemes/hosts, forbidden placeholders and unknown fields.
- [ ] Run RED and confirm imports/API are missing.
- [ ] Implement the sanitizer and immutable defaults.
- [ ] Write migration/API tests for auth, fallback, public filtering, optimistic revision and reset.
- [ ] Run RED for missing migration/endpoint.
- [ ] Implement migration and endpoint using `lib/supabase-rest.mjs`.
- [ ] Run targeted GREEN and the migration tests.

### Task 2: Upload Movimento seguro

**Files:**
- Modify: `api/upload.js`
- Create: `tests/upload-api.test.mjs`

**Interfaces:**
- Extends signed-upload action with optional `purpose: "movimento"`, `type` and `size`.
- Returns a unique path under `movimento/YYYY-MM-DD/`.

- [ ] Write tests that reject unsupported MIME, empty/oversized payload metadata and verify two equal names yield distinct paths.
- [ ] Run RED against the date/name path currently reused.
- [ ] Implement UUID pathing and purpose-specific validation without changing legacy callers.
- [ ] Authenticate Storage requests with `apikey`, retaining Bearer only for legacy JWT service-role keys.
- [ ] Run targeted GREEN.

### Task 3: Editor no painel

**Files:**
- Modify: `public/painel.html`
- Create: `public/painel-movimento-editor.js`
- Create: `public/painel-movimento-editor.css`
- Modify: `tests/movement-admin-panel.test.mjs`
- Create: `tests/movement-content-editor.test.mjs`

**Interfaces:**
- Consumes admin GET/POST from Task 1 and signed upload from Task 2.
- Produces an accessible scene editor without changing panel authentication.

- [ ] Write RED tests for subtabs, 32 scenes, locked identity, form controls, dirty/error states, upload and save payload.
- [ ] Add Convidada labels and one consolidated legacy-size display.
- [ ] Implement mobile and desktop editor shells.
- [ ] Implement load, local preview, upload, save/reset, conflict and dirty guards using DOM APIs.
- [ ] Add a pre-upload cropper with horizontal/vertical focus, zoom, scene-specific aspect ratios and WebP/JPEG optimization.
- [ ] Run targeted GREEN.

### Task 4: Runtime de conteúdo e hero

**Files:**
- Modify: `src/movimento/movement-content.js`
- Modify: `src/movimento/MovementSite.jsx`
- Modify: `src/movimento/movement.css`
- Create: `src/movimento/useMovementContent.js`
- Modify/Create: relevant `tests/movement-content*.test.mjs`

**Interfaces:**
- Consumes public `{items}` from Task 1.
- Produces merge by scene ID with default fallback and protected personal hero.

- [ ] Write RED tests for fixed personalized hierarchy, merge by ID, image fallback and protected identity.
- [ ] Implement one fetch per audience and empty fallback.
- [ ] Render custom image slots with standard media fallback, opacity and accessible copy.
- [ ] Separate hero name/company from the fixed message and reduce mobile type scale.
- [ ] Remove artificial shirt callout and restrict backdrop treatment to partner scenes.
- [ ] Run targeted GREEN.

### Task 5: RSVP de tamanho único

**Files:**
- Modify: `src/movimento/RsvpFlow.jsx`
- Modify: `lib/movement-rsvp.mjs`
- Modify: `api/movimento-rsvp.js`
- Modify: `tests/movement-rsvp.test.mjs`
- Modify: `tests/movement-rsvp-sheet.test.mjs`
- Modify: `tests/movement-api.test.mjs`

**Interfaces:**
- UI uses `outfitSize`; transport sends the same value in both legacy fields.
- API accepts/returns `outfitSize` and preserves old rows.

- [ ] Write RED tests for one question, Convidada wording, dual-write equality and legacy divergence.
- [ ] Replace the duplicated UI state with one controlled value.
- [ ] Normalize outgoing and persisted values without schema destruction.
- [ ] Preserve conditional child fields and decline clearing.
- [ ] Run targeted GREEN.

### Task 6: Integração, segurança e QA

**Files:**
- Modify only files above when a verified defect requires it.

**Interfaces:**
- Produces verified local software and a release-ready additive migration.

- [ ] Run all focused Movement tests.
- [ ] Run `npm test`, `npm run lint`, `npm run build` and `git diff --check`.
- [ ] Perform a task review for backend, panel and runtime; fix Important/Critical findings and re-review.
- [ ] Serve the fresh build and test panel/runtime at 320, 375, 390, 430 and 1440 px.
- [ ] Verify keyboard, 44 px targets, dirty guards, upload failure, API fallback, custom-image failure and no identity flash.
- [ ] Confirm default route budgets remain within the existing audit and document CMS-media limitations separately.
- [ ] Prepare exact migration and preview-deploy commands behind the production gate.

### Task 7: Capítulos ampliados e prévia personalizada

**Files:**
- Modify: `src/movimento/movement-content.js`
- Modify: `public/painel-movimento-editor.js`
- Modify: `scripts/build-movement-assets.mjs`
- Modify: `scripts/check-movement-v2.mjs`
- Create/Modify: masters e derivados `INF-08` a `INF-14`, `PAR-11` a `PAR-16`
- Create: endpoint e testes da prévia nominal do convite
- Modify: `vercel.json` e auditoria de share pages

**Interfaces:**
- Produces 32 capítulos editáveis, com conteúdo específico para café, carrinho, suplementação, beleza, oficina adulta e espaço infantil.
- Produces link preview com primeiro nome da convidada ou empresa do parceiro, resolvido sem registrar abertura e sem expor o token em canonical/OG URL.

- [ ] Escrever RED para as 32 famílias, conteúdo ampliado e nova prévia.
- [ ] Gerar e inspecionar os novos masters fotográficos sem redesenhar o wordmark; aplicar dourado em fundo escuro e verde-escuro Bentô em fundo claro, com camiseta/jaleco pequenos e altos no peito conforme o mockup oficial.
- [ ] Reconstruir derivados e atualizar budgets com valores medidos.
- [ ] Implementar a prévia nominal server-side e preservar `noindex`, `no-store` e `no-referrer`.
- [ ] Executar QA visual nas duas propostas e no cartão compartilhado.
