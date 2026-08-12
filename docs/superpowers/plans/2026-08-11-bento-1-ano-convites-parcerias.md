# Bentô 1 Ano — Convites e Parcerias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** transformar as duas rotas Movimento em experiências personalizadas, leves e verificadas para o primeiro aniversário da Bentô, com RSVP de influenciadora, seleção de parceiro e gestão no painel existente.

**Architecture:** preservar as rotas e tabelas atuais, acrescentar uma migration compatível e elevar a resolução do convite para um loader único que alimenta hero e sheet. Separar conteúdo, dados e mídia; manter todo texto e aplicação de marca em HTML/CSS e servir imagens responsivas versionadas.

**Tech Stack:** React 18, Vite 5, Node test runner, Vercel Functions, Supabase REST/Postgres, HTML/CSS, Sharp 0.33.

## Global Constraints

- Projeto exclusivo: `/Users/alexteixeira/Documents/Codex/2026-07-21/crie-altera-es-na-interface-a/work/tabelas-nutricionais-movimento-main`; nunca alterar `alexos`.
- Evento: `Sábado · 12.09.2026 · Le Buffet Lounge · Vitória–ES`; primeiro aniversário Bentô; 40–50 pessoas no total.
- Não usar a narrativa “projeto de um ano” ou prometer continuidade anual.
- Influenciadora: máximo de um adulto — marido ou mãe — e uma criança; camiseta e roupa de treino somente para ela; transporte sem endereço nesta etapa.
- Parceiro: exatamente `Select`, `Experience`, `Signature` e `Founding Circle`; sem preços ou promessas de alcance/exclusividade.
- Tokens opacos armazenados somente como SHA-256; service role somente no servidor; RLS e revogações preservadas.
- Visual: ivory/branco/dourado, verde apenas como acento; sem coqueiros, palmeiras, praia, mar aberto, ilhas, montanhas ou morros.
- Mulheres em roupa de treino, 23–38 aparentes, atléticas magras/definidas, anatomia natural, sem bodybuilding ou sexualização.
- Camisa fiel a uma das quatro referências; produto e wordmark sempre compostos de assets reais; nenhuma marca prospectada no raster.
- Uma família visual exclusiva por capítulo; `Visualização conceitual gerada por IA` em toda imagem gerada.
- Mobile-first, 44 px de toque, WCAG AA, safe areas iPhone, `prefers-reduced-motion` e zoom permitidos.
- Nenhuma dependência de produção nova.
- TDD obrigatório: teste vermelho observado antes de produção; revisão de especificação e qualidade após cada tarefa.

---

### Task 1: Contratos de domínio e migration aditiva

**Files:**
- Create: `supabase/migrations/20260811235900_bento_movement_personalized_invites.sql`
- Modify: `lib/movement-rsvp.mjs`
- Modify: `lib/movement-partner.mjs`
- Modify: `tests/movement-rsvp.test.mjs`
- Modify: `tests/movement-partner.test.mjs`
- Modify: `tests/movement-migrations.test.mjs`

**Interfaces:**
- Produces `validateAudienceType(value)`, `validatePartnerLead(payload, options)`, RSVP fields `childAge` and `transportInterest`, and four public tier values `select|experience|signature|founding_circle`.
- Migration keeps legacy tier values readable and writable.

- [ ] **Step 1: Write failing domain tests.** Assert that confirmed RSVP requires the two influencer sizes, accepts `childAge` only with one child, accepts `transportInterest` boolean, and never asks for an address. Assert exactly four public partner tiers and rejection of six legacy values at the public validator.
- [ ] **Step 2: Run RED.** Run `node --test tests/movement-rsvp.test.mjs tests/movement-partner.test.mjs`; expected failures mention missing `childAge`, `transportInterest` and new tier identifiers.
- [ ] **Step 3: Implement the minimal validators.** Normalize booleans, integer age `0..120` as a storage-safety bound rather than an admission rule, size text `1..40`, and keep `imageConsent` separate from privacy.
- [ ] **Step 4: Write the migration test first.** Assert new columns, nullable unique partner FK, additive indexes, expanded tier check including all legacy values, RLS and grants.
- [ ] **Step 5: Run migration RED.** Run `node --test tests/movement-migrations.test.mjs`; expected failure is the missing `20260811235900` file.
- [ ] **Step 6: Add the immutable migration.** Drop/recreate only named check constraints, add columns with `if not exists`, add FK `not valid` then validate it, add indexes with `if not exists`, and never mutate/delete existing rows.
- [ ] **Step 7: Run GREEN.** Run the three targeted files and then `npm test`; expected all tests pass.
- [ ] **Step 8: Commit.** `git add lib/movement-rsvp.mjs lib/movement-partner.mjs tests/movement-rsvp.test.mjs tests/movement-partner.test.mjs tests/movement-migrations.test.mjs supabase/migrations/20260811235900_bento_movement_personalized_invites.sql && git commit -m "feat(movimento): add personalized invitation contracts"`.

### Task 2: Convite unificado, APIs idempotentes e estados

**Files:**
- Modify: `api/movimento-admin.js`
- Modify: `api/movimento-rsvp.js`
- Modify: `api/movimento-parceiros.js`
- Create: `lib/movement-invite.mjs`
- Modify: `tests/movement-admin-api.test.mjs`
- Modify: `tests/movement-api.test.mjs`
- Modify: `tests/movement-partner-api.test.mjs`

**Interfaces:**
- `resolveMovementInvite({ fetchImpl, cfg, token, now, markOpened }) -> invite|null` returns only `id`, `displayName`, `audienceType`, `recipientName`, `companyName`, `status`, `expiresAt`.
- Admin actions: `create-invite` and `revoke-invite`.
- Public invite response never contains hash, contact or raw token.

- [ ] **Step 1: Write failing API tests.** Cover creation for both audiences, required partner company/responsible, exact returned route, single `opened_at`, neutral revoked/expired/missing response, audience mismatch, revocation, and admin summaries.
- [ ] **Step 2: Run RED.** Run `node --test tests/movement-admin-api.test.mjs tests/movement-api.test.mjs tests/movement-partner-api.test.mjs`; expected failures show unsupported partner audience/revocation and missing invite association.
- [ ] **Step 3: Extract invitation resolution.** Centralize token validation/hash/select/activity/audience and safe opening update. Accept only `sent|opened|responded`; `draft|revoked|expired` are inactive.
- [ ] **Step 4: Extend admin minimally.** Validate `audienceType`, persist `display_name`, `recipient_name`, `company_name`, status `sent`; return raw token only once in `invitePath`; revoke by validated UUID with `revoked_at` and status `revoked`.
- [ ] **Step 5: Extend RSVP.** Require influencer audience, persist child age and transport interest, upsert by invite ID, and update invite status to `responded` after success.
- [ ] **Step 6: Extend partner API.** Optional token resolves partner audience; personal lead upserts by `invite_id`; generic lead remains by `lead_key`; mismatched or conflicting association returns neutral `409` without reassignment.
- [ ] **Step 7: Enforce request boundaries.** Keep honeypot and origin checks, reject bodies exceeding 32 KiB with `413`, never log token/PII, and return the same public message for invalid/expired/revoked.
- [ ] **Step 8: Run GREEN.** Run the three targeted files, `npm test` and `npm run lint`.
- [ ] **Step 9: Commit.** `git add api/movimento-admin.js api/movimento-rsvp.js api/movimento-parceiros.js lib/movement-invite.mjs tests/movement-admin-api.test.mjs tests/movement-api.test.mjs tests/movement-partner-api.test.mjs && git commit -m "feat(movimento): unify personal invitation APIs"`.

### Task 3: Admin Movimento para os dois públicos

**Files:**
- Modify: `public/painel.html`
- Create: `tests/movement-admin-panel.test.mjs`

**Interfaces:**
- Consumes admin JSON fields from Task 2.
- Produces form payloads for `create-invite`/`revoke-invite` without exposing service credentials.

- [ ] **Step 1: Write a failing static integration test.** Assert audience selector, conditional influencer/partner fields, `create-invite`, `revoke-invite`, link-copy affordance, status labels and display of new RSVP fields/four tiers.
- [ ] **Step 2: Run RED.** Run `node --test tests/movement-admin-panel.test.mjs`; expected failure is absence of audience/revocation controls.
- [ ] **Step 3: Implement conditional creation.** Keep existing `PANEL_KEY` flow; send influencer `displayName` or partner `companyName`+`recipientName`; copy returned link only at creation.
- [ ] **Step 4: Implement state lists.** Render audience, opened/confirmed/declined/selected/revoked/expired, child age, transport interest and legacy tier labels. Do not offer token recovery; offer revoke and new invitation.
- [ ] **Step 5: Add safe revocation UI.** Confirm exact person/company, POST UUID action, reload state, and never delete rows.
- [ ] **Step 6: Run GREEN.** Run the new test and `npm test`.
- [ ] **Step 7: Commit.** `git add public/painel.html tests/movement-admin-panel.test.mjs && git commit -m "feat(painel): manage personalized Movimento invitations"`.

### Task 4: Loader único, narrativa de aniversário e heróis personalizados

**Files:**
- Modify: `src/movimento/movement-route.js`
- Create: `src/movimento/useMovementInvite.js`
- Modify: `src/movimento/MovementSite.jsx`
- Modify: `src/movimento/movement-content.js`
- Modify: `tests/movement-route.test.mjs`
- Modify: `tests/movement-content.test.mjs`

**Interfaces:**
- `useMovementInvite(token)` resolves once and exposes `{state, invite, currentRsvp, error}`.
- `MovementSite` derives story from the resolved audience and passes the same result to hero and sheet.

- [ ] **Step 1: Write failing route/content tests.** Assert generic routes, legacy personal path, first-anniversary copy, personalized hero templates, no annual-project phrases, no sponsor language in influencer content, and exactly four partner tiers.
- [ ] **Step 2: Run RED.** Run `node --test tests/movement-route.test.mjs tests/movement-content.test.mjs`; expected failures identify old annual and six-tier content.
- [ ] **Step 3: Replace content with the approved spec.** Use the exact heroes, chapters, conditions and four participation definitions from the design spec.
- [ ] **Step 4: Lift invite loading.** Resolve once above hero; show a privacy-safe skeleton before resolution; never flash a name or wrong audience; pass existing response to the appropriate sheet.
- [ ] **Step 5: Make generic presentations non-transactional.** Keep `/movimento` and `/movimento/parceiros`; final CTA explains that response uses a personal link rather than collecting anonymous RSVP.
- [ ] **Step 6: Run GREEN.** Run targeted tests, `npm test`, and `npm run lint`.
- [ ] **Step 7: Commit.** `git add src/movimento/movement-route.js src/movimento/useMovementInvite.js src/movimento/MovementSite.jsx src/movimento/movement-content.js tests/movement-route.test.mjs tests/movement-content.test.mjs && git commit -m "feat(movimento): center invitation on Bento first anniversary"`.

### Task 5: Sheet único da influenciadora

**Files:**
- Modify: `src/movimento/RsvpFlow.jsx`
- Modify: `src/movimento/MovementSite.jsx`
- Modify: `src/movimento/movement.css`
- Create: `tests/movement-rsvp-sheet.test.mjs`

**Interfaces:**
- Consumes resolved invite/current RSVP from Task 4; never fetches the invite again.
- Emits Task 2 RSVP payload with `childAge` and `transportInterest`.

- [ ] **Step 1: Write failing sheet tests.** Assert one persistent CTA, dialog attributes, no address, shirt/outfit sizes, one adult, one child, conditional age/size, transport availability wording, separate image consent, edit/reopen and success states.
- [ ] **Step 2: Run RED.** Run `node --test tests/movement-rsvp-sheet.test.mjs`; expected failure is the old embedded multistep flow.
- [ ] **Step 3: Implement one controlled sheet.** Keep all data in one form; confirmation and decline share the surface; body lock and focus restoration are deterministic; closing preserves draft in component memory.
- [ ] **Step 4: Implement conditional validation.** Decline clears size/companion/transport fields; confirmed requires both influencer sizes and privacy; child fields exist only with one child.
- [ ] **Step 5: Implement accessibility/mobile CSS.** `100dvh`, safe-area padding, 16 px inputs, 44 px targets, visible focus, no horizontal overflow, scroll confined to sheet.
- [ ] **Step 6: Run GREEN.** Run new test, RSVP/API tests, `npm test` and `npm run lint`.
- [ ] **Step 7: Commit.** `git add src/movimento/RsvpFlow.jsx src/movimento/MovementSite.jsx src/movimento/movement.css tests/movement-rsvp-sheet.test.mjs && git commit -m "feat(movimento): add one-surface influencer RSVP"`.

### Task 6: Seleção personalizada do parceiro

**Files:**
- Modify: `src/movimento/PartnerInterestFlow.jsx`
- Modify: `src/movimento/MovementSite.jsx`
- Modify: `src/movimento/movement.css`
- Modify: `tests/movement-partner.test.mjs`
- Create: `tests/movement-partner-sheet.test.mjs`

**Interfaces:**
- Consumes resolved partner invite from Task 4 and posts the token to Task 2 API.
- Public flow keeps company/responsible/contact editable; personal flow locks identity fields and pre-fills them.

- [ ] **Step 1: Write failing UI/domain tests.** Assert exactly four cards in order, approved inclusions, non-binding microcopy, personalized company/responsible, no prospect names, no public price/reach/exclusivity promise.
- [ ] **Step 2: Run RED.** Run `node --test tests/movement-partner.test.mjs tests/movement-partner-sheet.test.mjs`; expected failure identifies the six old tiers and generic-only form.
- [ ] **Step 3: Implement one participation sheet.** Persistent `Escolher participação` CTA, four cumulative cards, identity from invite, editable contact details, review and success in the same dialog.
- [ ] **Step 4: Preserve legacy admin readability only.** Public UI never exposes `kit|mobility|support|custom|founding`; API/domain maps only new values for new writes.
- [ ] **Step 5: Run GREEN.** Run partner tests, `npm test` and `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/movimento/PartnerInterestFlow.jsx src/movimento/MovementSite.jsx src/movimento/movement.css tests/movement-partner.test.mjs tests/movement-partner-sheet.test.mjs && git commit -m "feat(movimento): add four curated partner participations"`.

### Task 7: Assets finais e pipeline responsivo

**Files:**
- Create: `scripts/build-movement-assets.mjs`
- Create: `public/movimento/v2/manifest.json`
- Create: `public/movimento/v2/<scene>-<width>.<avif|webp|jpg>` for the 19 approved scene families and responsive crops
- Modify: `src/movimento/movement-content.js`
- Modify: `src/movimento/MovementSite.jsx`
- Modify: `src/movimento/movement.css`
- Modify: `tests/movement-assets.test.mjs`

**Interfaces:**
- Manifest maps each scene ID to mobile/desktop sources, intrinsic size, LQIP, alt and disclosure.
- `ScenePicture({asset, priority})` preloads only the active hero and lazily loads every later scene.

- [ ] **Step 1: Write failing asset tests.** Assert all 19 IDs, unique source hashes, valid formats/dimensions, per-route byte budgets, no rejected old asset references, one priority image per route, and disclosure/alt for each scene.
- [ ] **Step 2: Run RED.** Run `node --test tests/movement-assets.test.mjs`; expected failure is missing V2 manifest/assets.
- [ ] **Step 3: Generate masters from approved prompts.** Use the complete scene matrix and negatives in the design spec; reject any palm/beach/mountain, fake product/wordmark, inaccurate shirt, duplicate face/anatomy or sponsor text.
- [ ] **Step 4: Compose exact brand assets.** Overlay the official wordmark, shirt reference and real Bentô products without redrawing; sponsor regions remain clean raster surfaces with HTML/CSS overlays only in partner scenes.
- [ ] **Step 5: Produce responsive derivatives.** Sharp outputs AVIF/WebP/JPEG, strips metadata, normalizes sRGB/orientation, generates LQIPs and a deterministic manifest. OG stays separate.
- [ ] **Step 6: Implement `<picture>`.** Art direction for portrait/landscape, correct `srcset`/`sizes`, dimensions/aspect ratio, hero `fetchPriority=high`, all later scenes lazy/async.
- [ ] **Step 7: Run visual asset gate.** Side-by-side inspect every master at original resolution; record accepted/rejected reason in `docs/movimento-v2-asset-qa.md`.
- [ ] **Step 8: Run GREEN.** Run asset/content tests, `npm test`, `npm run lint`, and the asset pipeline twice; second run must leave identical hashes.
- [ ] **Step 9: Commit.** `git add scripts/build-movement-assets.mjs public/movimento/v2 src/movimento/movement-content.js src/movimento/MovementSite.jsx src/movimento/movement.css tests/movement-assets.test.mjs docs/movimento-v2-asset-qa.md && git commit -m "feat(movimento): add responsive anniversary visual system"`.

### Task 8: OG privado, headers, build e auditoria renderizada

**Files:**
- Modify: `scripts/generate-share-pages.mjs`
- Modify: `vercel.json`
- Modify: `tests/movement-link-preview.test.mjs`
- Create: `scripts/check-movement-v2.mjs`
- Modify: `package.json`

**Interfaces:**
- `npm run test:movimento` runs the deterministic structural/performance audit.
- Personal preview never includes token, name, company or responsible.

- [ ] **Step 1: Write failing preview/header tests.** Assert a generic personal share page, `noindex/no-store/no-referrer`, route precedence, two approved OG files and absence of PII/token in generated HTML.
- [ ] **Step 2: Run RED.** Run `node --test tests/movement-link-preview.test.mjs`; expected failure is missing personal preview/header.
- [ ] **Step 3: Implement privacy-safe share output.** Preserve generic influencer/partner OG and add personal invitation metadata without identity or token.
- [ ] **Step 4: Add the deterministic audit script.** Check routes, 19 unique media families, byte budgets, duplicate hashes, forbidden old assets/copy/brand placeholders, HTML headers and build output.
- [ ] **Step 5: Run full verification.** Execute `npm test`, `npm run lint`, `npm run test:movimento`, `npm run build`, and `git diff --check`. Reconcile generated unrelated files; do not commit unrelated build regeneration.
- [ ] **Step 6: Serve the build and perform rendered QA.** Verify 320/375/390/430 px portrait and landscape plus desktop; CTA/sheets, focus, keyboard, safe area, edit/update, partner selection, generic links, invalid/revoked link and admin.
- [ ] **Step 7: Measure cold-load behavior.** Confirm only active hero preloads, below-fold scenes do not download before proximity, LCP/INP/CLS and route transfer meet the design spec or record/fix the exact delta.
- [ ] **Step 8: Commit.** `git add scripts/generate-share-pages.mjs scripts/check-movement-v2.mjs vercel.json tests/movement-link-preview.test.mjs package.json && git commit -m "test(movimento): enforce privacy and visual performance gates"`.

### Task 9: Final review, preview and production release

**Files:**
- No planned source file; corrections from final review must stay within Tasks 1–8 files.

**Interfaces:**
- Consumes a clean branch with all prior task reviews approved.
- Produces an audited preview, migration/deploy evidence and live readback.

- [ ] **Step 1: Run whole-branch review.** Review from the merge base against this spec, all task reports and deferred findings; one fix wave only, then scoped re-review.
- [ ] **Step 2: Run fresh verification.** `npm test`, `npm run lint`, `npm run test:movimento`, `npm run build`, `git diff --check`, `git status --short`.
- [ ] **Step 3: Deploy a preview.** Capture preview URL, deployment ID and commit SHA; do not promote a failed build.
- [ ] **Step 4: Audit the preview.** Re-run real mobile/desktop flows, network audit, OG HTML, API error states and admin using non-production test records.
- [ ] **Step 5: Apply the additive migration before frontend promotion.** Verify the exact migration version is present and RLS/grants remain correct; never expose keys or values in logs.
- [ ] **Step 6: Promote the verified build.** Capture production deployment confirmation and open the exact public and private-route bases.
- [ ] **Step 7: Live readback.** Confirm `/movimento`, `/movimento/parceiros`, the personal preview shell and the panel tab; record literal failure as `NÃO_PUBLICADO` if Vercel does not confirm production.
- [ ] **Step 8: WhatsApp proof.** Verify both generic cards and the privacy-safe personal card; cache refresh is evidence-based, not inferred.
