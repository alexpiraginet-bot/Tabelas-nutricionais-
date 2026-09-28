# Bentô Gelatos — memória operacional

Site da **Bentô Gelatos / ABB Gelateria** (bentogelateria.com). Leia antes de mexer:
o que está aqui foi aprendido apanhando, e ignorar custa retrabalho.

## Stack

Vite + React 18 em **JavaScript** (`.jsx`) — **não** é Next.js, **não** tem Tailwind,
**não** tem TypeScript no site. Estilos são inline com os tokens de `src/shared.jsx`
(`T.bg`, `T.ink`, `T.pistacheDark`…) e as classes `.fd` (Fraunces), `.fb` (DM Sans),
`.fm` (JetBrains Mono). Ícones: `lucide-react`. Deploy na Vercel.

Eventos têm **três formatos** (`EV_FORMATOS` em `src/modals.jsx`): caixa térmica
(20–60, R$ 25/pessoa, sem atendente), balcão (30–120, R$ 26) e carrinho (100+,
R$ 27). Mudar faixa ou preço ali muda site, orçamento, WhatsApp e contrato de uma
vez — e `npm run test:eventos` trava os três. Fechar por quantidade de itens é
WhatsApp, nunca orçamento online: as duas réguas na mesma tela dão dois preços
para o mesmo evento.

**Nunca chame o Nominatim do navegador.** Ele recusa tráfego de aplicação (403
sem User-Agent próprio, 429 na segunda chamada por IP) e o erro chega silencioso:
o orçamento sai sem logística e ninguém vê erro nenhum. A geocodificação vive em
`api/geo.js`, com User-Agent que nos identifica e cache no Redis. E a busca
começa no **Brasil inteiro**, não presa ao ES: prender à caixa do estado faz
"Manaus" casar com a Rua Manaus, em Vila Velha, e cobrar 5 km por um evento a
3.700 km.

Arquivos centrais: `src/App.jsx` (home, seções, pushes), `src/modals.jsx` (todos os
modais), `src/shared.jsx` (tokens, `LOJAS`, helpers), `public/painel.html` (admin,
HTML+JS puro), `api/*.js` (funções serverless).

## Fronteira com o TOTEM — a regra mais importante

Existe um segundo sistema, o **totem** (`totem.bentogelateria.com`, repositório
`totem-autoatendimento`, fora do acesso deste repo). A divisão é rígida:

| Assunto | Dono | Como o site vê |
|---|---|---|
| Raio, centro, entrega grátis, horário de entrega | **Totem** | `GET /api/delivery/estado` (só leitura) |
| Conteúdo e aparência do site | **Site** | `GET /api/site-config` |

**O site nunca escreve regra de entrega.** Já houve uma colisão: duas sessões
construíram interruptores de entrega grátis em paralelo, e dois interruptores
significam site anunciando "grátis" enquanto o pedido cobra. Se precisar de uma
regra de entrega nova, peça ao totem expor o campo — não reimplemente aqui.

Formato real do endpoint do totem (chaves com **underscore**, raio em **km**):

```json
{ "praia_do_canto": { "entrega": true, "gratis": true, "raioKm": 3,
                      "centro": { "lat": -20.29927, "lng": -40.29515 } },
  "jardim_camburi": { "entrega": false } }
```

O id da loja no site usa **hífen** (`praia-do-canto`) — a comparação normaliza os dois.
O centro **não é** a coordenada cadastrada da loja; é um ponto medido pelo dono.

**Regra de ouro:** sem resposta do endpoint, o site **não afirma nada** sobre entrega —
não anuncia grátis, não promete raio. Melhor calar do que prometer o que não pode cumprir.

## Config editável (`/api/site-config`)

Documento no Redis (`site:config`) editado na aba **🎛️ Site** do painel: horário das
lojas, banners (ordem/ocultos/imagens), push da home e opacidades.

**O código é o padrão; a config só sobrescreve.** Config vazia ou banco fora do ar =
site roda como está no código. Ao criar um banner novo, sincronize a lista em três
lugares: `ORDEM_PADRAO` (`src/App.jsx`), `BANNERS_VALIDOS` (`api/destaque.js`) e
`BANNERS` (`api/site-config.js`) — existe um teste que trava isso
(`npm run test:home-banners`).

Detalhe que já mordeu: o card da loja exibe `resumo` (texto agrupado), mas o painel
edita `dias`. O `resumo` é **derivado** de `dias`; não editar os dois em paralelo.

## Movimento e acessibilidade

**Movimento comandado pela rolagem NUNCA é desligado.** O iPhone do dono usa
"Reduzir Movimento" (iOS), e por três vezes ele avaliou o site achando que estava
quebrado porque o scrub e os cards se desligavam nesse modo. Rolar é gesto do
usuário, não animação autônoma. Só animação automática (stagger, bob ocioso)
respeita `prefers-reduced-motion`.

## Preferências do dono (aprendidas apanhando)

- **Nada de vídeo gerado por IA** de produto. Foi tentado com Sora e reprovado:
  baixa nitidez, fundo "quadrado" que não pertence à cena, objeto mudando de
  aparência entre cortes. Movimento aqui é sobre **conteúdo real**.
- **Renderize para vertical.** Arte landscape cortada no celular já foi apontada
  como erro mais de uma vez. Use `<picture>` com arte composta em retrato.
- Imagens geradas: use uma **espinha de estilo idêntica** em todos os prompts
  (mesma câmera, luz, paleta e superfícies) — é o que faz o conjunto pertencer ao
  mesmo mundo. `gpt-image-2` entrega bem.
- Sem emoji como ícone estrutural (usar SVG do lucide) — o site legado ainda viola
  isso em vários pontos.
- Autorização permanente: **pode mergear o PR** depois de tratar as revisões.

## Fluxo de trabalho

Branch → PR → revisão do **Codex** (o Copilot parou de revisar) → corrigir achados →
squash merge com o título terminando em `(#N)` → verificar produção por `curl` no
bundle. O Codex acha bugs reais com frequência (já pegou regressão de aba apagada,
relógio que não atualizava, promessa de entrega sem endpoint) — vale sempre rodar.

## Armadilhas do ambiente de teste

Doeu horas descobrir; não repita:

- **Geolocalização do Chromium só funciona no primeiro contexto do processo.**
  Rode **um cenário por processo** quando o teste depender de `geolocation`.
- **Cliques podem ser interceptados** por widgets flutuantes (balão de Horários,
  pílula da Lex). Prefira clique via `page.evaluate` no elemento.
- `waitForFunction` engasga por causa do rAF contínuo da home — use **polling
  explícito** em `body.innerText`.
- `fonts.googleapis.com` é **bloqueado pelo proxy** do container: os testes acusam
  erro de console que não existe em produção. Filtre.
- Chromium **alcança, sim, hosts externos** — o que faltava era confiança na CA do
  proxy, que não vem no repositório NSS. Uma vez por container:

  ```
  apt-get update -qq && apt-get install -y libnss3-tools
  mkdir -p $HOME/.pki/nssdb && certutil -d sql:$HOME/.pki/nssdb -N --empty-password
  certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n ccr-agent-proxy -i /root/.ccr/agent-proxy-ca.crt
  ```

  Sem isso a navegação morre em `ERR_CERT_AUTHORITY_INVALID` e parece bloqueio de
  rede. Com isso dá para testar **produção de verdade** pelo navegador. NÃO use
  `--ignore-https-errors`: some o erro e some também a verificação.
- **Asserção de teste é no JS, não no bash.** O `agent-browser eval` devolve JSON
  escapado; comparar acento e `\n` no `case` do bash gera falha falsa em teste
  que passou. Faça a comparação dentro da página e traga só PASS/FALHA.
- Regex montada por string que passa pelo bash: `[\s\S]` precisa chegar ao
  `new RegExp` como `\s`, não `\\s` — com quatro barras vira "barra ou s" e
  nunca casa. Já custou meia dúzia de falhas falsas.
- `pkill -f "vite preview"` mata o próprio shell — use porta nova a cada rodada.
- CSS `textTransform: uppercase` faz `innerText` devolver MAIÚSCULAS: use regex com `/i`.

## Comandos

```
npm run build              # inclui geração de fichas e páginas de compartilhamento
npm run lint               # 1 erro pré-existente em modals.jsx (config do eslint), ignore
npm run test:home-banners  # trava a sincronia da lista de banners
npm run test:eventos       # trava preço, faixa e equipe dos três formatos
npm run test:geocode       # trava a decisão de dentro/fora do ES e o User-Agent
```

## Pendências conhecidas

- Totem deve expor `horario: {abre, fecha}`; enquanto não expõe, 11h–20h está fixo
  em `src/App.jsx` como padrão.
- `jardim_camburi` chega com `gratis: true` e `entrega: false` — o site ignora o
  grátis de loja que não entrega, de propósito.
- PR do protótipo de movimento (`/proto`) e da bancada shadcn (`/ui`) segue aberto,
  aguardando avaliação do dono.
