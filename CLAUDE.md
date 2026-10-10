# Bentô Gelatos — memória operacional

Site da **Bentô Gelatos / ABB Gelateria** (bentogelateria.com). Leia antes de mexer:
o que está aqui foi aprendido apanhando, e ignorar custa retrabalho.

## Stack

Vite + React 18 em **JavaScript** (`.jsx`) — **não** é Next.js, **não** tem Tailwind,
**não** tem TypeScript no site. Estilos são inline com os tokens de `src/shared.jsx`
(`T.bg`, `T.ink`, `T.pistacheDark`…) e as classes `.fd` (Fraunces), `.fb` (DM Sans),
`.fm` (JetBrains Mono). Ícones: `lucide-react`. Deploy na Vercel.

Eventos têm **três formatos** (`EV_FORMATOS` em `src/eventos-regras.js`, módulo sem JSX
que o modal, o teste e a IA importam): caixa térmica
(20–60, sem atendente), balcão (30–80, 1 promotora, gelato servido na hora da cuba
ou em potinhos) e carrinho (81+ — 80 ainda é balcão; as faixas não se sobrepõem
no limite, senão a tela preserva o formato maior já escolhido). O preço por pessoa é **um só, R$ 27, em qualquer
formato** (`EV_PRECO_PESSOA`) — decisão do dono; o que muda entre formatos é equipe
e entrega. No **mix da caixa térmica** vai 1 picolé por pessoa e 1 potinho selado
a cada 2 (30 convidados = 30 picolés + 15 potinhos), com 1 sabor de gelato e até
2 de picolé. Logística é linha à parte, e **personalização custa +20% abaixo de 100
convidados** (`EV_PERS_ACRESCIMO`, `EV_PERS_GRANDE`) — régua de quantidade, não de
formato. **Subir de estrutura não é escolha do cliente**: só acontece quando a
estrutura do formato dele já está reservada na data, e custa `EV_UPGRADE_LOGISTICA`
(R$ 200) a mais; a reserva no painel é por data, não por estrutura, então o site só
avisa a regra no conflito e a equipe decide. Mudar faixa, preço ou acréscimo ali
muda site, orçamento, WhatsApp e contrato de uma vez — `npm run test:eventos`
trava tudo. Fechar por quantidade de itens é
WhatsApp, nunca orçamento online: as duas réguas na mesma tela dão dois preços
para o mesmo evento.

O orçamento tem 4 passos: dados → orçamento → **sabores** → contrato. Os sabores
têm limite fechado por formato (`EV_LIMITE_SABORES`): caixa com mix leva 1 de
gelato e até 2 de picolé; nos servidos com mix o total do `calcEvento().sabores`
se divide, com a sobra para o gelato. O passo abre com a sugestão sem IA
(`sugestaoEquilibrada`, em `src/ia/catalogo.js`) e a Bentô IA sugere sob pedido
(`/api/ia` com `modo: "sabores-evento"`: o modelo só devolve ids, o servidor
confere contra catálogo e limite, e sem conserto cai na regra). A escolha segue
no WhatsApp, no lead e no contrato (`saboresEscolha`). **Sem lactose não é sem
leite**: o Framboesa Duo não tem lactose, mas leva leite zero lactose — serve
para intolerância, nunca para alergia ao leite.

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

## Bentô IA (concierge do site)

Barra "Pergunte à Bentô IA" na home e link `?ia` / `?ia=pergunta`. O modelo
conversa; **quem mostra dado é o código**: ele só escolhe QUAIS cards aparecer
(sabores, comparação, ficha, lojas, evento, atalho) por ferramentas com ids
validados, e o site monta os cards com os dados do bundle. Nunca deixe o modelo
escrever número, preço ou tabela na tela por conta própria.

- `lib/ia-motor.js`: prompt (regras + catálogo), ferramentas, laço com o Claude
  e a **revisão frase a frase** do texto (`fraseSegura`), também no streaming:
  sai inteira a frase com algarismo que o cliente não escreveu (o de convidados
  que foi ao orçamento pode), número por extenso com unidade, "zero/sem açúcar"
  e "sem adição de açúcares" sem o nome de um sabor que tem a alegação. **Nada é
  reescrito**: trocar "zero açúcar" por "sem adição" sem saber o sabor fazia de
  "o Extra Dark é zero açúcar" uma alegação falsa com cara de oficial. Alérgico
  idem: "tem/não tem leite" (e lactose, glúten, amendoim, castanhas, "serve
  para alérgicos") só passa com o nome do sabor e igual ao `vereditoFoco`; sem
  nome, ou "sem traços", sai. O número
  que decide vai no card (`destaque` em `mostrar_sabores`), não no texto.
  Contagem diária em `frases_cortadas` (`ia:uso:<dia>`). `api/ia.js`: HTTP, limites por IP e por dia,
  SSE. `src/ia/catalogo.js`: tudo o que a IA sabe, DERIVADO de `data.js`,
  `lojas.js` e `eventos-regras.js` — nada copiado. `src/ia/BentoIA.jsx`: painel.
- Modelo `claude-sonnet-5-5` (metade do custo do Opus 5.5), esforço `low`
  sempre explícito (o padrão do Sonnet 5.5 é `high`), fallback de recusa ligado.
  `tool_choice` forçado dá 400 nos modelos 5.5 — use `auto` e valide. Env:
  `ANTHROPIC_API_KEY` (a mesma das fichas), `IA_MODELO`, `IA_ESFORCO`,
  `IA_LIMITE_DIA` (padrão 500 perguntas/dia no site), `IA_DESLIGADA=1` (some a
  barra sem deploy). Uso diário em tokens fica em `ia:uso:<dia>` no Redis; o
  texto da conversa **não** é guardado em lugar nenhum nosso.
- A volta inteira do modelo (pensamento + ferramenta) vai de volta sem edição:
  o pensamento do modelo só vale com o histórico intacto. Entre perguntas, o
  histórico é só texto (sem blocos de pensamento) — de propósito.
- Entrega: a IA só afirma o que `/api/delivery/estado` do totem disse (mesma
  regra de ouro), e "oferece entrega" não é "entregando agora": agora exige loja
  aberta e a janela de entrega (`janelaEntrega` em `src/lojas.js`, a mesma do
  site). Grátis só com entrega acontecendo. Evento: valores do `calcEvento`, e o
  botão abre o orçamento já com os convidados (`convidadosInicial`).
- Shake: alérgicos separados por proteína e por líquido (`alergicosShake`). A
  proteína vegana (opção do Açaí) não tem alérgicos no cadastro: fica "confirme
  com a equipe" — nem LEITE (falso para quem escolhe a vegana) nem "sem alérgicos".
- Resposta que não terminou (falha ou Parar) fica marcada (`interrompida`) na
  aba e vai marcada ao modelo na pergunta seguinte. Card além do limite (6) não
  aparece e o modelo recebe erro dizendo isso.
- WebMCP (`src/ia/webmcp.js`): as mesmas ferramentas para agentes de IA do
  navegador, em `document.modelContext` (padrão em incubação; sem suporte, nada
  acontece). `public/llms.txt` é gerado no build — não edite.
- `npm run test:ia` trava tudo isso com um cliente falso, sem rede.
- Visual no padrão da marca ("Deep Tech Clean": off-white, pistache, números em
  JetBrains Mono, foto real do produto). Já reprovado como "amador": ícone em
  quadradinho colorido, card dentro de card, chips de status por todo lado,
  pontinhos pulando de "pensando", tela inicial com linhas idênticas. Use uma
  superfície por resposta com linha fina entre itens, **um botão principal por
  resposta** (não um "Pedir" por linha), esqueleto do card que vai chegar e o
  botão Parar durante a resposta. Campo de texto no celular com 16px ou mais
  (abaixo disso o iPhone dá zoom).
- **O card responde a pergunta.** Pergunta de restrição usa a lente `foco`
  (lactose, leite, glúten, amendoim, castanhas): o veredito de cada sabor sai de
  `vereditoFoco` (catálogo), na primeira linha do card, e nunca garante ausência
  de traços. Em alergia, a ação principal é "Confirmar com a equipe" (WhatsApp
  com sabor e alérgico). O card de lojas abre com a conclusão ("Nenhuma loja
  aberta agora · X abre…"). De onde vem o dado fica no pé do card ("Fichas
  técnicas oficiais…", "Verificado às 14:05") — **nada de rótulo acima do
  título**: o Impeccable proíbe e o resultado é genérico. O selo da Bentô marca
  a IA; o Sparkles já é do quiz e do Clube.
- Passo de sabores do evento: a combinação pronta vem primeiro, a IA fica
  recolhida ("Ajustar com a Bentô IA", com Desfazer), e contadores + Continuar
  ficam num rodapé fixo do modal. Pedido de sugestão em andamento morre quando
  a pessoa sai do passo.

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

## Rolagem

Modal que não pode ficar com os botões flutuantes por cima (horários, suporte,
selo da Lex, avisos do Clube) chama `useSemFlutuantes()` (`src/shared.jsx`):
tem contador, porque modal abre modal (IA → orçamento de evento).

Quem rola neste site é o **`<html>`**, não o `<body>`. Por isso
`document.body.style.overflow="hidden"` **não trava nada** — foi medido: com o
modal de eventos aberto, um `scrollTo` levava a página de 900 para 1800 atrás
dele. A trava de verdade está em `useModal` (`src/shared.jsx`): fixa o body no
deslocamento atual e devolve a pessoa ao mesmo ponto ao fechar. Tem contador,
porque modal abre modal (GLP-1 → ficha) e sem ele o segundo leria posição 0 e
jogaria a pessoa para o topo.

`overscroll-behavior:contain` nos modais impede que o gesto continue na página
atrás ao chegar no fim, e `overscroll-behavior-x:none` global tira o arrasto
lateral de borracha. Nenhum dos dois toca o eixo vertical.

**Não ponha `overflow-x` no body ou no html.** Não há estouro lateral em página
nenhuma (conferido), e qualquer valor diferente de `visible` num eixo tira o
outro de `visible`: o elemento vira contêiner de rolagem e leva junto o
`position:sticky` e o movimento comandado pela rolagem.

`/movimento/` não responde a `window.scrollTo` — é da página, não regressão.
Confirmado A/B com e sem as regras acima.

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
npm run lint               # tem de sair limpo
npm run test:home-banners  # trava a sincronia da lista de banners
npm run test:eventos       # trava preço, faixa e equipe dos três formatos
npm run test:geocode       # trava a decisão de dentro/fora do ES e o User-Agent
npm run test:ia            # trava a Bentô IA: cards só com id real, alegações, evento, entrega
```

## Pendências conhecidas

- Totem deve expor `horario: {abre, fecha}`; enquanto não expõe, 11h–20h está fixo
  em `src/lojas.js` (`JANELA_ENTREGA_PADRAO`) como padrão — site e Bentô IA leem dali.
- `jardim_camburi` chega com `gratis: true` e `entrega: false` — o site ignora o
  grátis de loja que não entrega, de propósito.
- PR do protótipo de movimento (`/proto`) e da bancada shadcn (`/ui`) segue aberto,
  aguardando avaliação do dono.
