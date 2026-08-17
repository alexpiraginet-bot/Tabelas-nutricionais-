export const EVENT = {
  dateIso: "2026-09-12",
  dateLong: "12 de setembro de 2026",
  dateShort: "12 set 2026",
  dayLabel: "Sábado",
  expectedGuests: "40 a 50 pessoas esperadas",
  location: "Le Buffet Lounge · Vitória, ES",
  time: "Horário em confirmação",
  training: "Aulão funcional com Jonatas Correa",
};

export const HERO_COPY = {
  influencer: {
    kicker: "Convite pessoal · 1º aniversário Bentô Gelatos",
    personalizedMessage: "Esta celebração tem um lugar que só você pode ocupar.",
    fallbackTitle: "Esta celebração tem um lugar que só você pode ocupar.",
    text: "No sábado, 12 de setembro, reuniremos 40–50 pessoas no Le Buffet Lounge para uma manhã de movimento, cuidado e encontros. Sua presença é parte essencial da memória que queremos criar.",
    factualLine: "Sábado · 12 de setembro de 2026 · Le Buffet Lounge · Vitória–ES",
    cta: "Confirmar meu lugar",
  },
  partner: {
    kicker: "Primeiro aniversário Bentô Gelatos",
    responsibleLine: "Uma proposta para {Responsável}.",
    personalizedMessage: "Seu lugar nesta celebração pode ter forma, função e assinatura.",
    fallbackTitle: "Sua marca pode ter forma, função e assinatura nesta celebração.",
    text: "No primeiro aniversário da Bentô Gelatos, 40–50 pessoas viverão uma manhã de movimento e hospitalidade no Le Buffet Lounge. Esta proposta apresenta maneiras de a marca participar de forma natural, útil e memorável.",
    factualLine: "Sábado · 12 de setembro de 2026 · Le Buffet Lounge · Vitória–ES",
    cta: "Escolher participação",
  },
};

export const MOVEMENT_AI_DISCLOSURE = "Visualização conceitual gerada por IA";
const MOVEMENT_COMPOSED_DISCLOSURES = {
  shirt: "referência oficial de camiseta Bentô composta sem redesenho",
  product: "produto e embalagem do acervo real Bentô compostos sem redesenho",
  wordmark: "wordmark oficial Bentô composto sem redesenho",
  cart: "carrinho real Bentô preservado sem substituição da marca existente",
};
const MOVEMENT_WORDMARK_ASSET_IDS = new Set(["PAR-09"]);
const MOVEMENT_CART_ASSET_IDS = new Set(["INF-10", "PAR-12"]);

function mediaHeight(assetId, direction, width) {
  const hero = assetId.endsWith("HERO");
  if (direction === "mobile") return Math.round(width * (hero ? 16 / 9 : 5 / 4));
  return Math.round(width * (hero ? 9 / 16 : 10 / 16));
}

function mediaSources(assetId, direction, widths) {
  return Object.fromEntries(["avif", "webp", "jpg"].map((format) => [
    format,
    widths.map((width) => ({
      src: `/movimento/v2/${assetId}-${direction}-${width}.${format}`,
      width,
      height: mediaHeight(assetId, direction, width),
    })),
  ]));
}

function movementAsset(assetId, alt) {
  const hero = assetId.endsWith("HERO");
  const composition = ["INF-06", "PAR-07"].includes(assetId) ? "shirt" : assetId === "PAR-08" ? "product" : null;
  const disclosureDetails = [];
  if (composition) disclosureDetails.push(MOVEMENT_COMPOSED_DISCLOSURES[composition]);
  if (MOVEMENT_WORDMARK_ASSET_IDS.has(assetId)) disclosureDetails.push(MOVEMENT_COMPOSED_DISCLOSURES.wordmark);
  if (MOVEMENT_CART_ASSET_IDS.has(assetId)) disclosureDetails.push(MOVEMENT_COMPOSED_DISCLOSURES.cart);
  return {
    id: assetId,
    alt,
    disclosure: disclosureDetails.length ? `${MOVEMENT_AI_DISCLOSURE} · ${disclosureDetails.join(" · ")}.` : MOVEMENT_AI_DISCLOSURE,
    lqip: { src: `/movimento/v2/${assetId}-lqip.jpg` },
    mobile: { aspectRatio: hero ? 9 / 16 : 4 / 5, sources: mediaSources(assetId, "mobile", hero ? [480, 768] : [480, 752]) },
    desktop: { aspectRatio: hero ? 16 / 9 : 16 / 10, sources: mediaSources(assetId, "desktop", hero ? [1080, 1440] : [768, 1080, 1440]) },
  };
}

function visualScene({ assetId, alt, ...copy }) {
  const asset = movementAsset(assetId, alt);
  return { ...copy, assetId, alt, disclosure: asset.disclosure, asset };
}

export const MOVEMENT_HERO_ASSETS = {
  influencer: movementAsset("INF-HERO", "Grupo de convidadas chegando em roupa de treino ao lounge contemporâneo junto ao canal urbano de Vitória"),
  partner: movementAsset("PAR-HERO", "Estrutura branca e dourada pronta para receber marcas no lounge junto ao canal urbano"),
};

export const SHIRT_CONCEPT = {
  front: "Wordmark oficial Bentô",
  back: "MOVIMENTO. ENCONTRO. BENTÔ.",
  sponsorArea: "Região lombar · composição coletiva aprovada",
};

export const INFLUENCER_CHAPTERS = [
  { number: "01", title: "Por que você", text: "A manhã muda quando você chega. Você foi escolhida pelo que desperta nas pessoas e pela forma como transforma presença em conexão." },
  { number: "02", title: "Primeiro aniversário", text: "Um ano merece ser sentido. A Bentô reúne pessoas que fizeram parte dessa história e dão sentido ao que vem agora." },
  { number: "03", title: "A manhã", text: "Movimento para começar. Hospitalidade para ficar. Aulão funcional, café da manhã, sabores Bentô, cuidado e conexão; nome, horário e operação final permanecem em confirmação." },
  { number: "04", title: "Seu mundo também cabe aqui", text: "Você pode trazer quem faz parte da sua vida: um acompanhante adulto — marido ou mãe — e uma criança de qualquer idade, sempre acompanhada." },
  { number: "05", title: "Feita para você", text: "Uma camiseta reservada ao seu lugar nesta manhã. Camiseta e roupa de treino são exclusivas da convidada; uma possível surpresa infantil não é prometida." },
  { number: "06", title: "12 de setembro", text: "Uma manhã íntima. Uma memória compartilhada. Movimento, gelato e boas conversas no Le Buffet Lounge." },
];

export const KIT_ITEMS = [
  "Camiseta de treino exclusiva para a convidada",
  "Roupa de treino exclusiva para a convidada",
  "Uma possível surpresa infantil permanece em confirmação",
];

export const EXPERIENCE_STEPS = [
  ["Aulão funcional", "Uma prática acessível com Jonatas Correa para criar energia, não cobrança de performance."],
  ["Café da manhã", "Hospitalidade, sabores Bentô e tempo para estar presente."],
  ["Conexão", "Boas conversas e uma memória compartilhada no primeiro aniversário."],
];

export const INFLUENCER_SCENES = [
  visualScene({ id: "scenario", assetId: "INF-01", eyebrow: "O cenário", title: "A cidade encontra a água — e a manhã ganha outra atmosfera.", text: "No Le Buffet Lounge, o canal, a marina e o skyline urbano desenham o cenário contemporâneo da celebração.", alt: "Deck contemporâneo do lounge junto ao canal e à marina urbana preparado para a manhã Bentô" }),
  visualScene({ id: "welcome", assetId: "INF-02", eyebrow: "Sua chegada", title: "A experiência pode começar antes mesmo da porta.", text: "Um transporte executivo premium, com motorista e embarque coordenado, poderá levar as convidadas ao lounge. A disponibilidade e a logística serão confirmadas mais perto do evento.", alt: "Convidadas em roupa de treino chegando ao lounge em transporte executivo premium com motorista" }),
  visualScene({ id: "training", assetId: "INF-03", eyebrow: "Movimento", title: "Energia para começar. Sem cobrança de performance.", text: "Um aulão funcional conduzido por Jonatas Correa, em estações organizadas para uma experiência natural e compartilhada.", alt: "Grupo de mulheres atléticas vivendo um aulão funcional natural em estações bem organizadas" }),
  visualScene({ id: "kids-workshop", assetId: "INF-04", eyebrow: "Seu mundo também cabe aqui", title: "Oficina de decoração de picolés para as crianças, dentro do cerimonial.", text: "Uma criança de qualquer idade pode participar sempre acompanhada por um adulto responsável, enquanto a experiência acontece no mesmo lugar.", alt: "Crianças acompanhadas por adultos decorando picolés em oficina organizada dentro do cerimonial" }),
  visualScene({ id: "recovery", assetId: "INF-05", eyebrow: "Cuidado", title: "Depois do movimento, tempo para recuperar e conversar.", text: "Uma estação de recovery amplia a sensação de cuidado sem transformar a manhã em uma sequência de obrigações.", alt: "Convidada em roupa de treino recebendo cuidado em uma estação elegante de recovery" }),
  visualScene({ id: "shirt-kit", assetId: "INF-06", eyebrow: "Feita para você", title: "Uma camiseta reservada ao seu lugar nesta manhã.", text: "Camiseta e roupa de treino são exclusivas da convidada. Uma possível surpresa infantil não é prometida.", alt: "Composição editorial do kit e da camiseta de treino oficial reservados à convidada" }),
  visualScene({ id: "celebration", assetId: "INF-07", eyebrow: "Primeiro aniversário", title: "Um ano merece ser sentido.", text: "Movimento, sabores Bentô e boas conversas fecham uma manhã íntima que queremos guardar na memória.", alt: "Convidadas celebrando de forma espontânea o primeiro aniversário Bentô depois do treino" }),
  visualScene({ id: "specialty-coffee", assetId: "INF-08", eyebrow: "Cafés especiais", title: "V60, espresso e café coado com tempo para perceber cada detalhe.", text: "Uma dupla de profissionais prepara os cafés ao vivo em uma mesa dedicada, aproximando aroma, técnica e conversa de quem chega.", alt: "Dois profissionais preparando cafés especiais em V60 e máquina de espresso diante das convidadas" }),
  visualScene({ id: "breakfast-table", assetId: "INF-09", eyebrow: "Café da manhã", title: "Uma mesa generosa para chegar, respirar e ficar.", text: "Frutas, pães, acompanhamentos e sabores Bentô formam uma pausa de hospitalidade entre movimento, cuidado e encontros.", alt: "Convidadas reunidas diante de uma mesa elegante de café da manhã com frutas pães e louças claras" }),
  visualScene({ id: "gelato-cart", assetId: "INF-10", eyebrow: "Bentô em movimento", title: "O carrinho leva o gelato até o centro da celebração.", text: "Serviço, sabores e conversa se encontram em torno do carrinho Bentô, como parte viva da manhã e não apenas como cenário.", alt: "Carrinho de gelato Bentô em atendimento durante a celebração com convidadas ao redor" }),
  visualScene({ id: "supplement-kits", assetId: "INF-11", eyebrow: "Bem-estar", title: "Suplementação entra na experiência como cuidado útil.", text: "Kits organizados em uma mesa própria apresentam produtos e orientações de forma clara, sem promessas clínicas ou atalhos de performance.", alt: "Kits de suplementação organizados sobre uma mesa de marca em uma apresentação elegante de bem-estar" }),
  visualScene({ id: "beauty-care", assetId: "INF-12", eyebrow: "Skincare e maquiagem", title: "Um tempo de cuidado com atendimento profissional.", text: "Uma equipe dedicada conduz momentos de skincare e maquiagem em estações confortáveis, com espelhos, luz adequada e atenção individual.", alt: "Mulheres recebendo atendimento profissional de skincare e maquiagem em estações claras e organizadas" }),
  visualScene({ id: "adult-popsicle-workshop", assetId: "INF-13", eyebrow: "Oficina para adultas", title: "Você também poderá criar o seu próprio picolé.", text: "De avental, as convidadas experimentam coberturas e finalizações com o apoio das profissionais Bentô em jalecos brancos e uma bancada realmente preparada para alimentos.", alt: "Convidadas de avental criando os próprios picolés com profissionais Bentô de jaleco branco" }),
  visualScene({ id: "kids-play", assetId: "INF-14", eyebrow: "Espaço infantil", title: "Brincar também encontra um lugar bonito dentro da manhã.", text: "Mesas baixas, madeira, blocos, casinha e atividades táteis formam um espaço infantil delimitado e acompanhado, sem transformar o cerimonial em um parque inflável.", alt: "Crianças acompanhadas brincando com brinquedos minimalistas de madeira mesas baixas blocos e casinha" }),
];

export const PARTNER_SCENES = [
  visualScene({ id: "stage", assetId: "PAR-01", eyebrow: "Assinatura de chegada", title: "A marca pode receber antes mesmo da primeira conversa.", text: "Recepção, credenciamento e kit de boas-vindas formam um primeiro contato útil, elegante e integrado à experiência.", alt: "Recepção de chegada com anfitriã entregando pulseira a convidadas junto a uma instalação arquitetônica dourada" }),
  visualScene({ id: "mobility", assetId: "PAR-02", eyebrow: "Mobilidade premium", title: "A experiência pode começar no caminho.", text: "Uma marca automotiva premium pode conduzir convidadas em transporte executivo com motorista; modelo, rota, frota e operação dependem do escopo aprovado.", alt: "Transporte executivo premium com motorista recebendo convidadas na chegada ao lounge" }),
  visualScene({ id: "breakfast", assetId: "PAR-03", eyebrow: "Hospitalidade", title: "O café da manhã pode carregar a assinatura de quem acolhe.", text: "Mesa, serviço, peças de apoio e conteúdo criam um território útil para uma participação de marca.", alt: "Café da manhã editorial com áreas limpas para presença funcional de uma marca participante" }),
  visualScene({ id: "movement", assetId: "PAR-04", eyebrow: "Movimento", title: "Garrafa, toalha e acessórios entram em uso real.", text: "Jonatas Correa conduz o treino, enquanto a marca pode participar por meio de pontos de contato funcionais definidos depois da conversa de escopo.", alt: "Aulão funcional natural com materiais que podem receber aplicações de parceiros em uso real" }),
  visualScene({ id: "recovery", assetId: "PAR-05", eyebrow: "Recovery", title: "Cuidado também pode ter forma e função.", text: "Equipamentos, profissionais e materiais de recovery criam uma integração natural depois do aulão.", alt: "Estação premium de recovery com equipamentos e superfícies disponíveis para integração de marca" }),
  visualScene({ id: "kids-workshop", assetId: "PAR-06", eyebrow: "Família", title: "A oficina de decoração de picolés abre outro território de presença.", text: "Picolés prontos recebem decoração, materiais e acompanhamento dentro do cerimonial, sempre com adulto responsável.", alt: "Oficina infantil de decoração de picolés com espaço organizado para uma participação de marca" }),
  visualScene({ id: "shirt-kit", assetId: "PAR-07", eyebrow: "Memória que acompanha", title: "Kit e camiseta transformam utilidade em lembrança.", text: "Ecobag, lancheira, press kit e região lombar da camiseta podem receber a composição coletiva aprovada.", alt: "Kit editorial e camiseta oficial com área de composição coletiva abaixo da frase nas costas" }),
  visualScene({ id: "product", assetId: "PAR-08", eyebrow: "Cocriação", title: "Um produto pode nascer da conversa — se a técnica permitir.", text: "O estudo de picolé ou rótulo co-branded considera formulação, rotulagem, alergênicos, produção e aprovação.", alt: "Produtos reais Bentô compostos em um cenário editorial para estudo de cocriação responsável" }),
  visualScene({ id: "backdrop", assetId: "PAR-09", eyebrow: "Visibilidade contextual", title: "O destaque acontece onde a memória é registrada.", text: "O backdrop coletivo oferece presença no enquadramento sem transformar a celebração em uma feira de marcas.", alt: "Backdrop branco e dourado preparado como ponto de fotografia para o encontro Bentô" }),
  visualScene({ id: "curation", assetId: "PAR-10", eyebrow: "Curadoria", title: "A melhor presença é construída para caber na experiência.", text: "A seleção registra interesse e abre uma conversa de escopo; não constitui reserva, exclusividade ou contrato.", alt: "Mesa de curadoria com amostras de materiais e espaços limpos para propostas de participação" }),
  visualScene({ id: "specialty-coffee", assetId: "PAR-11", eyebrow: "Cafés especiais", title: "Uma marca pode assinar uma mesa viva de preparo e conversa.", text: "Dois profissionais, V60, espresso e café coado criam um território próprio para produto, serviço, utensílios e conteúdo durante toda a manhã.", alt: "Dois baristas preparando V60 e espresso em uma mesa de cafés especiais com áreas de presença de marca" }),
  visualScene({ id: "gelato-cart", assetId: "PAR-12", eyebrow: "Carrinho Bentô", title: "A marca pode acompanhar o gelato até onde as pessoas estão.", text: "Uma aplicação aprovada no carrinho, sem substituir o wordmark oficial Bentô, conecta a parceria ao serviço e ao momento de consumo.", alt: "Carrinho oficial de gelato Bentô em atendimento com painel reservado para uma aplicação aprovada de parceiro" }),
  visualScene({ id: "supplement-kits", assetId: "PAR-13", eyebrow: "Suplementação", title: "Kits bem montados transformam produto em experiência útil.", text: "Uma mesa dedicada organiza produtos, orientações e entregas individuais com linguagem responsável e sem promessas clínicas ou de resultado.", alt: "Kits de suplementação organizados sobre mesa de marca com embalagens neutras e materiais de orientação" }),
  visualScene({ id: "beauty-care", assetId: "PAR-14", eyebrow: "Beleza e cuidado", title: "Skincare e maquiagem ganham uma estação profissional.", text: "Equipe, espelhos, iluminação e produtos entram em uso real, criando um território de marca baseado em serviço e atenção individual.", alt: "Equipe profissional realizando skincare e maquiagem em mulheres diante de espelhos iluminados" }),
  visualScene({ id: "adult-popsicle-workshop", assetId: "PAR-15", eyebrow: "Oficina adulta", title: "Criar o próprio picolé abre espaço para uma integração memorável.", text: "Aventais, bancada, ingredientes e profissionais Bentô de jaleco branco permitem que produto e marca participem de uma experiência conduzida.", alt: "Adultas de avental fabricando picolés com profissionais de jaleco branco em uma bancada de alimentos" }),
  visualScene({ id: "kids-play", assetId: "PAR-16", eyebrow: "Entretenimento infantil", title: "O espaço das crianças também pode receber uma presença cuidadosa.", text: "Brinquedos minimalistas, mobiliário baixo e atividades táteis formam um ambiente delimitado cuja integração de marca deve respeitar o brincar.", alt: "Espaço infantil minimalista com brinquedos de madeira mesas baixas blocos e crianças acompanhadas" }),
];

export const PARTNER_TIERS = [
  { name: "Select", includes: ["Nome ou logo oficial na composição coletiva do backdrop", "Aplicação coletiva na região lombar da camiseta", "Crédito institucional na relação de participantes e no press kit", "Mockup das aplicações para aprovação"] },
  { name: "Experience", includes: ["Tudo de Select", "Um ponto de contato funcional entre garrafa, toalha, ecobag, lancheira ou press kit", "Integração em um momento entre café da manhã, treino, recovery ou oficina infantil", "Registro curado da participação na documentação do evento"] },
  { name: "Signature", includes: ["Tudo de Experience", "Assinatura de um território entre mobilidade premium, café da manhã, treino, recovery ou oficina infantil", "Presença ampliada nos materiais e na ambientação desse território", "Construção conjunta da narrativa e do plano de captação", "Estudo de viabilidade para picolé ou rótulo co-branded"] },
  { name: "Founding Circle", includes: ["Tudo de Signature", "Segundo ponto de contato em território complementar", "Maior hierarquia nas composições coletivas", "Identificação editorial Founding Circle nos materiais institucionais do evento", "Participação na curadoria criativa final", "Registro editorial personalizado da presença da marca"] },
];

export const PARTNER_PARTICIPATION_NOTE = "Founding Circle refere-se exclusivamente à participação nesta celebração. Nenhuma opção promete preço, exclusividade, alcance, publicação, categoria protegida ou continuidade anual. A escolha registra interesse e não constitui reserva ou contrato.";

export const MOVEMENT_TERRITORIES = [
  {
    id: "arrival",
    number: "01",
    slug: "chegada",
    title: "Chegada",
    backgroundColor: "#F2EDE4",
    headline: "A experiência começa antes da primeira conversa.",
    summary: {
      influencer: "O canal, a marina e uma chegada coordenada abrem a manhã com atmosfera e acolhimento.",
      partner: "Recepção e mobilidade premium transformam o primeiro contato em uma assinatura útil de marca.",
    },
    sceneIds: { influencer: ["INF-01", "INF-02"], partner: ["PAR-01", "PAR-02"] },
  },
  {
    id: "movement",
    number: "02",
    slug: "movimento",
    title: "Movimento",
    backgroundColor: "#10291E",
    headline: "A manhã começa em movimento, com Jonatas Correa.",
    summary: {
      influencer: "Aulão funcional, camiseta e cuidado útil criam energia sem cobrança de performance.",
      partner: "Treino, acessórios em uso real e suplementação formam um território funcional de participação.",
    },
    sceneIds: { influencer: ["INF-03", "INF-06", "INF-11"], partner: ["PAR-04", "PAR-07", "PAR-13"] },
  },
  {
    id: "hospitality",
    number: "03",
    slug: "hospitalidade",
    title: "Hospitalidade",
    backgroundColor: "#FFFDF9",
    headline: "Hospitalidade para fazer as pessoas ficarem.",
    summary: {
      influencer: "Cafés especiais, café da manhã e o carrinho Bentô dão ritmo às conversas e aos encontros.",
      partner: "Serviço vivo, produto e presença contextual aproximam a marca de momentos reais de consumo.",
    },
    sceneIds: { influencer: ["INF-08", "INF-09", "INF-10"], partner: ["PAR-03", "PAR-11", "PAR-12"] },
  },
  {
    id: "care",
    number: "04",
    slug: "cuidado",
    title: "Cuidado",
    backgroundColor: "#EBE3D7",
    headline: "Cuidado que continua depois do treino.",
    summary: {
      influencer: "Recovery, skincare, maquiagem e um espaço infantil acompanhado ampliam o cuidado da manhã.",
      partner: "Serviços profissionais e atenção às famílias criam integrações baseadas em utilidade e presença.",
    },
    sceneIds: { influencer: ["INF-05", "INF-12", "INF-14"], partner: ["PAR-05", "PAR-14", "PAR-16"] },
  },
  {
    id: "creation",
    number: "05",
    slug: "criacao-e-memoria",
    title: "Criação e memória",
    backgroundColor: "#F2EDE4",
    headline: "O que se vive também pode acompanhar.",
    summary: {
      influencer: "Oficinas, celebração e produto transformam a experiência em uma memória feita com as mãos.",
      partner: "Oficinas, kits, backdrop e registro editorial prolongam a experiência sem virar feira de marcas.",
    },
    sceneIds: { influencer: ["INF-04", "INF-07", "INF-13"], partner: ["PAR-06", "PAR-08", "PAR-09", "PAR-10", "PAR-15"] },
  },
];

export const PARTNER_GUESTS = [
  "Ludmilla Telles",
  "Rayanni Thomazini",
  "Gabriela Fonseca",
  "Ana Clara Santos",
  "Julia Sette",
  "Bianca Romanha",
  "Beatriz Amaral",
  "Talita Romagna",
  "Gabriella Rosa",
  "Melyssa Viana",
  "Italla Baptisti",
  "Lilian Bonatto",
  "Bruna Machado",
  "Carolina Neves",
  "Juliane Neves",
  "Lara Martinelle",
  "Aline Mareto",
  "Lorrayne Colodetti",
  "Barbara Ferretti",
  "Rafaela Sterquino",
  "Marina Coser",
  "Bárbara Pancotto",
  "Isadora Binow",
  "Mylena Personal",
  "Luna Lubiana",
  "Nicolle Fiorot",
  "Ana Lara Grassi",
  "Natalia Catelan",
  "Sara Broedel",
  "Sarah Esteves",
  "Natalia Rody",
  "Ana Carolina Nutri",
  "Alexia Mariano",
  "Beatriz Scaramussa",
  "Soraya Honorio",
  "Brunella Simão",
];

export const PARTNER_FEATURED_GUESTS = [
  { name: "Aline Mareto", handle: "@alinemareto", image: "/movimento/guests/aline-mareto.webp", instagramUrl: "https://www.instagram.com/alinemareto/" },
  { name: "Isadora Binow", handle: "@isa_binow", image: "/movimento/guests/isadora-binow.webp", instagramUrl: "https://www.instagram.com/isa_binow/" },
  { name: "Sara Broedel", handle: "@sarabroedel", image: "/movimento/guests/sara-broedel.webp", instagramUrl: "https://www.instagram.com/sarabroedel/" },
  { name: "Rayanni Thomazini", handle: "@rayannithomazini", image: "/movimento/guests/rayanni-thomazini.webp", instagramUrl: "https://www.instagram.com/rayannithomazini/" },
  { name: "Lara Martinelle", handle: "@lara.martinelle", image: "/movimento/guests/lara-martinelle.webp", instagramUrl: "https://www.instagram.com/lara.martinelle/" },
  { name: "Bianca Romanha", handle: "@biancaromanha_", image: "/movimento/guests/bianca-romanha.webp", instagramUrl: "https://www.instagram.com/biancaromanha_/" },
  { name: "Italla Baptisti", handle: "@italla", image: "/movimento/guests/italla-baptisti.webp", instagramUrl: "https://www.instagram.com/italla/" },
  { name: "Carolina Neves", handle: "@carolinaneves_", image: "/movimento/guests/carolina-neves.webp", instagramUrl: "https://www.instagram.com/carolinaneves_/" },
  { name: "Marina Coser", handle: "@marinacoser", image: "/movimento/guests/marina-coser.webp", instagramUrl: "https://www.instagram.com/marinacoser/" },
];

const MOVEMENT_HASH_TARGETS = new Map([
  ["#chegada", { territoryId: "arrival", sceneId: null }],
  ["#mobilidade", { territoryId: "arrival", sceneId: "PAR-02" }],
  ["#movimento", { territoryId: "movement", sceneId: null }],
  ["#hospitalidade", { territoryId: "hospitality", sceneId: null }],
  ["#cuidado", { territoryId: "care", sceneId: null }],
  ["#criacao-e-memoria", { territoryId: "creation", sceneId: null }],
]);

const TERRITORY_THEME_KEYS = Object.freeze({ arrival: "ARRIVAL", movement: "MOVEMENT", hospitality: "HOSPITALITY", care: "CARE", creation: "CREATION" });

export function movementTerritoryThemeSceneId(audience, territoryId) {
  const prefix = audience === "influencer" ? "INF" : audience === "partner" ? "PAR" : "";
  const key = TERRITORY_THEME_KEYS[territoryId];
  return prefix && key ? `${prefix}-THEME-${key}` : "";
}

export function movementForegroundScheme(backgroundColor) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(backgroundColor || ""));
  if (!match) return "dark";
  const channels = [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const darkContrast = (luminance + 0.05) / 0.058;
  const lightContrast = 1.05 / (luminance + 0.05);
  return lightContrast > darkContrast ? "light" : "dark";
}

export function buildMovementTerritories(audience, scenes, territoryBackgrounds = {}, territoryTypeScales = {}) {
  if (!Object.hasOwn(MOVEMENT_TERRITORIES[0].sceneIds, audience)) return [];
  const byAssetId = new Map(scenes.map((scene) => [scene.assetId, scene]));
  return MOVEMENT_TERRITORIES.map((territory) => {
    const backgroundColor = territoryBackgrounds[territory.id] || territory.backgroundColor;
    return {
      ...territory,
      backgroundColor,
      colorScheme: movementForegroundScheme(backgroundColor),
      summary: territory.summary[audience],
      typeScale: territoryTypeScales[territory.id] || {},
      scenes: territory.sceneIds[audience].map((assetId) => byAssetId.get(assetId)).filter(Boolean),
    };
  });
}

export function resolveMovementStoryHash(hash) {
  if (typeof hash !== "string") return null;
  return MOVEMENT_HASH_TARGETS.get(hash.trim().toLowerCase()) || null;
}
