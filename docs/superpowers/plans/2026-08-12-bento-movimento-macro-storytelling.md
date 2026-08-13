# Bentô em Movimento Macro Storytelling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as 14/16 telas integrais por uma apresentação editorial de cinco territórios com motion comandado pela rolagem, aprofundamento acessível e prova social curada para parceiros.

**Architecture:** As 32 famílias atuais continuam como única fonte editorial e o CMS permanece inalterado. `movement-content.js` ganha o contrato puro de agrupamento, hashes e convidadas; um novo `MovementStoryAtlas.jsx` cuida somente da apresentação, estado de rolagem e painéis, enquanto `MovementSite.jsx` preserva hero, personalização, RSVP e seleção de parceria.

**Tech Stack:** React 18.3, JavaScript ES modules, Vite 5.4, CSS existente, `IntersectionObserver`, ícones `lucide-react`, testes nativos `node:test`, auditoria Node + Sharp e QA local com `agent-browser`.

**Spec:** `docs/superpowers/specs/2026-08-12-bento-movimento-macro-storytelling-design.md`

## Global Constraints

- Produção só pode ser alterada após preview aprovado e autorização explícita de Alex para publicar.
- Não criar migration, API, tabela, dependência de produção ou segunda fonte de verdade.
- Preservar `INF-HERO`, `INF-01`–`INF-14`, `PAR-HERO`, `PAR-01`–`PAR-16` e todos os campos editáveis atuais do CMS.
- Nome da convidada, empresa, responsável e mensagem nominal continuam fixos pelo link e fora do CMS.
- A interface pública usa “convidada”, nunca “influenciadora” como rótulo.
- O wordmark vem apenas do master oficial existente; nenhum logo ou rosto será gerado.
- Retratos só entram após autorização e QA; esta entrega usa fallback tipográfico para a lista curada.
- Movimento comandado pela rolagem permanece ativo com `prefers-reduced-motion`; somente stagger, escala e movimento autônomo são removidos.
- Motion usa apenas `transform` e `opacity`, com troca de território entre 320 e 420 ms.
- Mobile preserva rolagem nativa, zoom, corpo de 16 px, toque mínimo de 44 px e safe area.
- Nenhum token, contato, RSVP, métrica de seguidores ou status privado entra na prova social.
- O checkout contém duplicatas não rastreadas com sufixo ` 2`; nunca editar, remover ou incluir esses arquivos.
- Commits, push, preview remoto e publicação são etapas bloqueadas até autorização específica.

---

### Task 1: Contrato de conteúdo dos cinco territórios

**Files:**
- Modify: `src/movimento/movement-content.js`
- Create: `tests/movement-story-atlas.test.mjs`
- Modify: `tests/movement-content.test.mjs`

**Interfaces:**
- Produces: `MOVEMENT_TERRITORIES`, `PARTNER_GUESTS`, `PARTNER_FEATURED_GUESTS`, `buildMovementTerritories(audience, scenes)` e `resolveMovementStoryHash(hash)`.
- Consumes: `INFLUENCER_SCENES`, `PARTNER_SCENES` e os `assetId` canônicos já usados pelo CMS.

- [ ] **Step 1: Escrever os testes vermelhos de agrupamento e linguagem**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  INFLUENCER_SCENES,
  MOVEMENT_TERRITORIES,
  PARTNER_FEATURED_GUESTS,
  PARTNER_GUESTS,
  PARTNER_SCENES,
  buildMovementTerritories,
  resolveMovementStoryHash,
} from "../src/movimento/movement-content.js";

test("five territories map every secondary scene exactly once", () => {
  assert.equal(MOVEMENT_TERRITORIES.length, 5);
  for (const [audience, scenes] of [["influencer", INFLUENCER_SCENES], ["partner", PARTNER_SCENES]]) {
    const groups = buildMovementTerritories(audience, scenes);
    const ids = groups.flatMap(({ scenes: grouped }) => grouped.map(({ assetId }) => assetId));
    assert.deepEqual(new Set(ids), new Set(scenes.map(({ assetId }) => assetId)));
    assert.equal(ids.length, new Set(ids).size);
  }
});

test("safe hashes resolve without personal data", () => {
  assert.deepEqual(resolveMovementStoryHash("#mobilidade"), { territoryId: "arrival", sceneId: "PAR-02" });
  assert.deepEqual(resolveMovementStoryHash("#cuidado"), { territoryId: "care", sceneId: null });
  assert.equal(resolveMovementStoryHash("#token-secreto"), null);
});

test("partner social proof is curated without metrics or confirmation claims", () => {
  assert.equal(PARTNER_GUESTS.length, 36);
  assert.deepEqual(PARTNER_FEATURED_GUESTS, ["Aline Mareto", "Isadora Binow", "Sara Broedel", "Rayanni Thomazini", "Lara Martinelle", "Bianca Romanha"]);
  assert.doesNotMatch(JSON.stringify({ PARTNER_GUESTS, PARTNER_FEATURED_GUESTS }), /\b\d+[.,]?\d*k\b|seguidores|confirmad[ao]s?/i);
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha esperada**

Run: `node --test tests/movement-story-atlas.test.mjs`

Expected: FAIL por exports ainda inexistentes.

- [ ] **Step 3: Implementar o contrato puro**

```js
export const MOVEMENT_TERRITORIES = [
  { id: "arrival", number: "01", slug: "chegada", title: "Chegada", headline: "A experiência começa antes da primeira conversa.", sceneIds: { influencer: ["INF-01", "INF-02"], partner: ["PAR-01", "PAR-02"] } },
  { id: "movement", number: "02", slug: "movimento", title: "Movimento", headline: "A manhã começa em movimento, com Jonatas Correa.", sceneIds: { influencer: ["INF-03", "INF-06", "INF-11"], partner: ["PAR-04", "PAR-07", "PAR-13"] } },
  { id: "hospitality", number: "03", slug: "hospitalidade", title: "Hospitalidade", headline: "Hospitalidade para fazer as pessoas ficarem.", sceneIds: { influencer: ["INF-08", "INF-09", "INF-10"], partner: ["PAR-03", "PAR-11", "PAR-12"] } },
  { id: "care", number: "04", slug: "cuidado", title: "Cuidado", headline: "Cuidado que continua depois do treino.", sceneIds: { influencer: ["INF-05", "INF-12", "INF-14"], partner: ["PAR-05", "PAR-14", "PAR-16"] } },
  { id: "creation", number: "05", slug: "criacao-e-memoria", title: "Criação e memória", headline: "O que se vive também pode acompanhar.", sceneIds: { influencer: ["INF-04", "INF-07", "INF-13"], partner: ["PAR-06", "PAR-08", "PAR-09", "PAR-10", "PAR-15"] } },
];

export function buildMovementTerritories(audience, scenes) {
  const byAssetId = new Map(scenes.map((scene) => [scene.assetId, scene]));
  return MOVEMENT_TERRITORIES.map((territory) => ({
    ...territory,
    scenes: territory.sceneIds[audience].map((assetId) => byAssetId.get(assetId)).filter(Boolean),
  }));
}
```

Adicionar a lista completa de 36 nomes na ordem do PDF e o resolver fechado de hashes: `chegada`, `mobilidade`, `movimento`, `hospitalidade`, `cuidado` e `criacao-e-memoria`. `#mobilidade` aponta exclusivamente para `PAR-02`.

- [ ] **Step 4: Atualizar o fato do personal nas duas narrativas**

Alterar `EVENT.training`, `EXPERIENCE_STEPS`, `INF-03` e a copy macro de Movimento para mencionar `Jonatas Correa`; preservar linguagem sem promessa de performance ou resultado.

- [ ] **Step 5: Rodar testes focados e confirmar verde**

Run: `node --test tests/movement-story-atlas.test.mjs tests/movement-content.test.mjs`

Expected: PASS, com 30 cenas secundárias únicas, cinco territórios, 36 convidadas e Jonatas visível no conteúdo das duas propostas.

- [ ] **Step 6: Preparar commit sem executá-lo antes do gate**

```bash
git add src/movimento/movement-content.js tests/movement-story-atlas.test.mjs tests/movement-content.test.mjs
git commit -m "feat(movimento): model macro story territories"
```

---

### Task 2: Atlas editorial e motion comandado pela rolagem

**Files:**
- Create: `src/movimento/MovementStoryAtlas.jsx`
- Modify: `src/movimento/MovementSite.jsx`
- Modify: `tests/movement-story-atlas.test.mjs`

**Interfaces:**
- Consumes: `buildMovementTerritories(audience, scenes)`, `resolveMovementStoryHash(hash)`, `PictureComponent`, `audience` e `companyName`.
- Produces: `MovementStoryAtlas({ audience, scenes, companyName, PictureComponent })` e `PartnerGuestProof()`.

- [ ] **Step 1: Escrever o teste vermelho da nova superfície**

```js
test("public presentation renders one five-territory atlas instead of the full scene reel", async () => {
  const [site, atlas] = await Promise.all([
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/MovementStoryAtlas.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(site, /<MovementStoryAtlas audience={audience} scenes={scenes}/);
  assert.doesNotMatch(site, /mv-scene-reel/);
  assert.match(atlas, /new IntersectionObserver/);
  assert.match(atlas, /data-territory-id=/);
  assert.match(atlas, /String\(activeIndex \+ 1\)\.padStart\(2, "0"\)/);
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `node --test tests/movement-story-atlas.test.mjs`

Expected: FAIL porque `MovementStoryAtlas.jsx` ainda não existe.

- [ ] **Step 3: Construir o atlas com estado derivado de interseção**

Implementar `IntersectionObserver` com `rootMargin: "-38% 0px -48% 0px"`, escolher o maior `intersectionRatio` e manter a rolagem nativa. O desktop renderiza um palco sticky de `52%` e uma coluna de cinco artigos; o mobile renderiza cada imagem dentro do próprio artigo.

```jsx
const territories = useMemo(() => buildMovementTerritories(audience, scenes), [audience, scenes]);
const [activeIndex, setActiveIndex] = useState(initialIndex);

useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(({ isIntersecting }) => isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveIndex(Number(visible.target.dataset.territoryIndex));
  }, { rootMargin: "-38% 0px -48% 0px", threshold: [0.15, 0.35, 0.65] });
  articleRefs.current.forEach((node) => node && observer.observe(node));
  return () => observer.disconnect();
}, []);
```

O palco mantém a imagem anterior por 420 ms para crossfade real e monta somente a imagem ativa/anterior; os cards mobile permanecem lazy por meio de `PictureComponent`.

- [ ] **Step 4: Substituir apenas o reel público**

Remover `SceneSection` e os dois `mv-scene-reel` de `MovementSite.jsx`. Preservar `Hero`, `Intro`, `InfluencerChapters`, `PartnerTiers`, `RsvpFlow`, `PartnerInterestFlow` e as CTAs persistentes. Passar `invite?.companyName || invite?.displayName || ""` somente como copy contextual, sem torná-lo editável no CMS.

- [ ] **Step 5: Rodar os testes focados**

Run: `node --test tests/movement-story-atlas.test.mjs tests/movement-content-runtime.test.mjs tests/movement-route.test.mjs`

Expected: PASS e nenhuma regressão de hero/personalização/rotas.

- [ ] **Step 6: Preparar commit sem executá-lo antes do gate**

```bash
git add src/movimento/MovementStoryAtlas.jsx src/movimento/MovementSite.jsx tests/movement-story-atlas.test.mjs
git commit -m "feat(movimento): add scroll-led story atlas"
```

---

### Task 3: Painéis acessíveis, hashes e aprofundamento opcional

**Files:**
- Modify: `src/movimento/MovementStoryAtlas.jsx`
- Modify: `tests/movement-story-atlas.test.mjs`

**Interfaces:**
- Produces: `StoryDetailDialog({ territory, requestedSceneId, onClose, triggerRef, PictureComponent })`.
- Consumes: hash seguro resolvido e cenas já mescladas pelo `useMovementContent`.

- [ ] **Step 1: Escrever testes vermelhos para dialog, foco e deep link**

```js
test("territory detail is a keyboard-safe dialog and mobility is deep-linkable", async () => {
  const source = await readFile(new URL("../src/movimento/MovementStoryAtlas.jsx", import.meta.url), "utf8");
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /aria-expanded={openTerritoryId === territory\.id}/);
  assert.match(source, /FOCUSABLE_SELECTOR/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /triggerRef\.current\?\.focus\(\)/);
  assert.match(source, /resolveMovementStoryHash\(window\.location\.hash\)/);
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `node --test tests/movement-story-atlas.test.mjs`

Expected: FAIL nos contratos de dialog ainda ausentes.

- [ ] **Step 3: Implementar o painel compartilhado**

Usar botão de fechar com `X` do Lucide, foco inicial no título (`tabIndex={-1}`), trava Tab/Shift+Tab, `Escape`, restauração de foco e restauração do `overflow` anterior. Montar apenas as cenas do território aberto; se `requestedSceneId` existir, ordenar essa cena primeiro e marcá-la com `data-requested-scene="true"`.

- [ ] **Step 4: Implementar hashes seguros**

Na montagem, resolver `window.location.hash`, ativar o território e abrir o painel quando o hash for reconhecido. Em clique normal, usar `history.replaceState(null, "", `#${territory.slug}`)`; ao fechar, remover apenas hashes pertencentes ao atlas. Nunca serializar nome, empresa, token ou status.

- [ ] **Step 5: Rodar testes focados**

Run: `node --test tests/movement-story-atlas.test.mjs tests/movement-partner-sheet.test.mjs tests/movement-rsvp-sheet.test.mjs`

Expected: PASS nos três contratos de sheet/foco.

- [ ] **Step 6: Preparar commit sem executá-lo antes do gate**

```bash
git add src/movimento/MovementStoryAtlas.jsx tests/movement-story-atlas.test.mjs
git commit -m "feat(movimento): add accessible story details"
```

---

### Task 4: Prova social curada na proposta de parceiros

**Files:**
- Modify: `src/movimento/MovementStoryAtlas.jsx`
- Modify: `src/movimento/MovementSite.jsx`
- Modify: `tests/movement-story-atlas.test.mjs`

**Interfaces:**
- Consumes: `PARTNER_FEATURED_GUESTS` e `PARTNER_GUESTS`.
- Produces: `PartnerGuestProof` depois do atlas e antes de `PartnerTiers`.

- [ ] **Step 1: Escrever o teste vermelho de posição, copy e privacidade**

```js
test("partner proof uses invited-guest language and precedes participation tiers", async () => {
  const [site, atlas] = await Promise.all([
    readFile(new URL("../src/movimento/MovementSite.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/movimento/MovementStoryAtlas.jsx", import.meta.url), "utf8"),
  ]);
  assert.ok(site.indexOf("<PartnerGuestProof") < site.indexOf("<PartnerTiers"));
  assert.match(atlas, /Convidadas selecionadas/);
  assert.match(atlas, /Conhecer as convidadas/);
  assert.doesNotMatch(atlas, /influenciadoras|presenças confirmadas|seguidores|movement_invites|movement_rsvps/i);
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `node --test tests/movement-story-atlas.test.mjs`

Expected: FAIL por ausência do bloco de prova social.

- [ ] **Step 3: Implementar o enquadramento inicial tipográfico**

Renderizar os seis nomes como cartões editoriais sem foto e o texto aprovado: `Uma manhã desenhada para pessoas que já movem comunidades.` O botão `Conhecer as convidadas` abre o mesmo contrato de painel acessível com a lista completa de 36 nomes na ordem do PDF.

- [ ] **Step 4: Integrar somente na proposta de parceiros**

Em `PartnerStory`, colocar `<PartnerGuestProof/>` entre `<MovementStoryAtlas .../>` e `<PartnerTiers/>`. Não alterar a rota de convidadas.

- [ ] **Step 5: Rodar testes focados**

Run: `node --test tests/movement-story-atlas.test.mjs tests/movement-content.test.mjs`

Expected: PASS sem termos proibidos, métricas ou dados privados.

- [ ] **Step 6: Preparar commit sem executá-lo antes do gate**

```bash
git add src/movimento/MovementStoryAtlas.jsx src/movimento/MovementSite.jsx tests/movement-story-atlas.test.mjs
git commit -m "feat(movimento): add curated partner guest proof"
```

---

### Task 5: Sistema visual responsivo e estados de motion

**Files:**
- Modify: `src/movimento/movement.css`
- Modify: `tests/movement-story-atlas.test.mjs`
- Modify: `tests/movement-content-runtime.test.mjs`

**Interfaces:**
- Consumes: classes `mv-story-atlas`, `mv-story-stage`, `mv-territory`, `mv-story-detail` e `mv-guest-proof`.
- Produces: desktop sticky, mobile compacto, sheet responsivo e fallbacks de reduced motion.

- [ ] **Step 1: Escrever os testes vermelhos do CSS**

```js
test("atlas CSS is sticky on desktop, compact on mobile and keeps scroll state under reduced motion", async () => {
  const css = await readFile(new URL("../src/movimento/movement.css", import.meta.url), "utf8");
  assert.match(css, /\.mv-story-stage\{[^}]*position:sticky[^}]*width:52%/);
  assert.match(css, /\.mv-story-detail\{[^}]*width:min\(720px,100%\)/);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*\.mv-story-stage\{display:none/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*\.mv-story-layer[^}]*transform:none/);
  assert.doesNotMatch(css, /\.mv-story-[^{]+\{[^}]*(?:width|height|top|left)\s*:[^;}]+;[^}]*transition/);
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `node --test tests/movement-story-atlas.test.mjs`

Expected: FAIL porque os novos seletores ainda não existem.

- [ ] **Step 3: Implementar tokens e desktop**

Adicionar `--mv-motion-fast: 220ms`, `--mv-motion-story: 380ms`, `--mv-ease-out: cubic-bezier(.22,1,.36,1)`. O atlas tem palco sticky de 52%, artigos de 50–65svh, contador `01 / 05`, barra de progresso e duas camadas máximas com `opacity`, `translateY(16px)` e escala máxima `1.025`.

- [ ] **Step 4: Implementar mobile e painel**

Em `max-width: 900px`, esconder apenas o palco duplicado, mostrar uma mídia 4:5 por território, remover alturas longas e manter botão de 44 px. O painel vira bottom sheet `100dvh`; acima de 901 px, lateral direita, `width:min(720px,100%)`. Reservar padding para CTAs persistentes e safe areas.

- [ ] **Step 5: Corrigir a regra antiga de reduced motion sem desligar transições de estado necessárias**

Substituir `.mv-root *{animation:none!important;transition:none!important}` por regras específicas: desativar `mv-spin` apenas quando não sinaliza loading, stagger/escala e movimento autônomo; manter opacity de troca de território e remover somente o deslocamento (`transform:none`). Preservar feedback de foco e abertura/fechamento.

- [ ] **Step 6: Rodar testes focados**

Run: `node --test tests/movement-story-atlas.test.mjs tests/movement-content-runtime.test.mjs`

Expected: PASS para CSS, hero, opacidade de mídia e responsividade.

- [ ] **Step 7: Preparar commit sem executá-lo antes do gate**

```bash
git add src/movimento/movement.css tests/movement-story-atlas.test.mjs tests/movement-content-runtime.test.mjs
git commit -m "feat(movimento): style responsive macro storytelling"
```

---

### Task 6: Auditoria determinística, build e QA visual

**Files:**
- Modify: `scripts/check-movement-v2.mjs`
- Modify: `tests/movement-story-atlas.test.mjs`
- Create locally only: `/tmp/bento-movimento-qa/*.png`

**Interfaces:**
- Produces: falha de build se agrupamento, linguagem, prova social, privacidade ou orçamento regredir.
- Consumes: exports do conteúdo, fontes do atlas e bundle de produção.

- [ ] **Step 1: Escrever o teste vermelho da auditoria de fonte**

Adicionar ao teste estático a exigência de que `check-movement-v2.mjs` leia `MovementStoryAtlas.jsx`, valide cinco territórios, 30 cenas únicas, seis/36 convidadas, ausência de métricas e ausência de `confirmadas`.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `node --test tests/movement-story-atlas.test.mjs`

Expected: FAIL até o auditor incorporar o novo componente.

- [ ] **Step 3: Ampliar `check-movement-v2.mjs`**

Importar dinamicamente o contrato de conteúdo, verificar os dois públicos e incluir `MovementStoryAtlas.jsx` em `assertSourceAndBuild()`. Não alterar os budgets existentes de mídia; como a primeira versão não publica retratos, o teto inicial continua igual.

- [ ] **Step 4: Rodar a suíte completa antes do build**

Run: `npm test`

Expected: todos os testes coletados e PASS; zero testes coletados não conta.

- [ ] **Step 5: Rodar lint**

Run: `npm run lint`

Expected: PASS ou somente o erro preexistente documentado em `src/modals.jsx`; qualquer erro nos arquivos Movimento bloqueia a entrega.

- [ ] **Step 6: Rodar build/auditoria em espelho local se o File Provider bloquear o checkout**

Run no checkout primeiro: `npm run build`

Se houver leitura vazia/dataless em `node_modules`, criar um diretório com `mktemp -d`, copiar apenas os arquivos rastreados com `git archive HEAD`, aplicar o diff atual com `git diff --binary`, reutilizar a versão exata do lockfile com `npm ci` e executar `npm run build`. Registrar literalmente o bloqueio e o caminho temporário; não apagar nem reescrever o checkout canônico.

Expected: `OK  Movimento V2: 32 famílias, privacidade, rotas, mídia e budgets auditados`.

- [ ] **Step 7: Iniciar servidor local e fazer o gut-check obrigatório**

Run: `npm run dev -- --host 127.0.0.1 --port 4179`

Em outra sessão:

```bash
agent-browser --session bento-movimento open http://127.0.0.1:4179/movimento
agent-browser --session bento-movimento wait --load networkidle
agent-browser --session bento-movimento eval 'document.querySelector(".vite-error-overlay") ? "ERROR_OVERLAY" : "OK"'
agent-browser --session bento-movimento eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"'
agent-browser --session bento-movimento snapshot -i
```

- [ ] **Step 8: Capturar e inspecionar os quatro viewports obrigatórios**

```bash
mkdir -p /tmp/bento-movimento-qa
agent-browser --session bento-movimento set viewport 375 812
agent-browser --session bento-movimento screenshot /tmp/bento-movimento-qa/movimento-375x812.png
agent-browser --session bento-movimento set viewport 390 844
agent-browser --session bento-movimento screenshot /tmp/bento-movimento-qa/movimento-390x844.png
agent-browser --session bento-movimento set viewport 844 390
agent-browser --session bento-movimento screenshot /tmp/bento-movimento-qa/movimento-landscape.png
agent-browser --session bento-movimento set viewport 1440 1024
agent-browser --session bento-movimento screenshot /tmp/bento-movimento-qa/movimento-desktop.png
```

Abrir `/movimento/parceiros`, repetir mobile e desktop, rolar pelos cinco tópicos, abrir/fechar `Explorar`, verificar `Escape`, Tab, restauração de foco, `#mobilidade`, `Conhecer as convidadas`, ausência de overflow horizontal e posição do CTA persistente.

- [ ] **Step 9: Verificar reduced motion, rede e estabilidade**

```bash
agent-browser --session bento-movimento set media light reduced-motion
agent-browser --session bento-movimento reload
agent-browser --session bento-movimento eval 'JSON.stringify({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,territories:document.querySelectorAll("[data-territory-id]").length})'
agent-browser --session bento-movimento network requests --filter movimento/v2
agent-browser --session bento-movimento vitals http://127.0.0.1:4179/movimento --json
agent-browser --session bento-movimento errors
agent-browser --session bento-movimento console
agent-browser --session bento-movimento close
```

Expected: cinco territórios, `scrollWidth === clientWidth`, sem erro de página, CLS abaixo de 0,1 e imagens internas do painel ausentes antes da abertura.

- [ ] **Step 10: Revisar diff e preparar commit final sem executar gate**

```bash
git diff --check
git status --short
git diff --stat
git add scripts/check-movement-v2.mjs tests/movement-story-atlas.test.mjs
git commit -m "test(movimento): audit macro storytelling experience"
```

Não executar commit, push, preview remoto ou produção sem a autorização correspondente de Alex.

---

## Self-review

- Cobertura da especificação: cinco territórios, 30 cenas, Jonatas, mobilidade, prova social 6/36, CMS preservado, personalização fixa, detalhes, hash, accessibility, motion, performance e QA estão associados a Tasks 1–6.
- Sem lacunas: todos os passos de código, teste e verificação têm conteúdo executável e interfaces nomeadas.
- Consistência: `territoryId`, `sceneId`, `openTerritoryId`, `PARTNER_GUESTS`, `PARTNER_FEATURED_GUESTS`, `buildMovementTerritories` e `resolveMovementStoryHash` mantêm os mesmos nomes em testes e implementação.
- Fora do escopo: retratos públicos, edição da lista de convidadas no admin, migração/API, upload para Drive, commit/push/merge e publicação.
