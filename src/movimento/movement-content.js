export const EVENT = {
  dateIso: "2026-09-12",
  dateLong: "12 de setembro de 2026",
  dateShort: "12 set 2026",
  dayLabel: "Sábado",
  expectedGuests: "40 a 50 pessoas esperadas",
  location: "Le Buffet Lounge · Vitória, ES",
  time: "Horário em confirmação",
  training: "Aulão funcional com personal renomado · nome em confirmação",
};

export const HERO_COPY = {
  influencer: {
    kicker: "Convite pessoal · 1º aniversário Bentô Gelatos",
    title: "{Nome}, esta celebração tem um lugar que só você pode ocupar.",
    fallbackTitle: "Esta celebração tem um lugar que só você pode ocupar.",
    text: "No sábado, 12 de setembro, reuniremos 40–50 pessoas no Le Buffet Lounge para uma manhã de movimento, cuidado e encontros. Sua presença é parte essencial da memória que queremos criar.",
    factualLine: "Sábado · 12 de setembro de 2026 · Le Buffet Lounge · Vitória–ES",
    cta: "Confirmar meu lugar",
  },
  partner: {
    kicker: "Uma proposta para {Responsável} · {Empresa}",
    title: "{Empresa}, seu lugar nesta celebração pode ter forma, função e assinatura.",
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
  workshop: "picolé do acervo real Bentô composto sem redesenho",
  wordmark: "wordmark oficial Bentô composto sem redesenho",
};
const MOVEMENT_WORDMARK_ASSET_IDS = new Set(["INF-HERO", "INF-03", "PAR-04"]);

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
  const composition = ["INF-06", "PAR-07"].includes(assetId) ? "shirt" : ["INF-04", "PAR-06"].includes(assetId) ? "workshop" : assetId === "PAR-08" ? "product" : null;
  const disclosureDetails = [];
  if (composition) disclosureDetails.push(MOVEMENT_COMPOSED_DISCLOSURES[composition]);
  if (MOVEMENT_WORDMARK_ASSET_IDS.has(assetId)) disclosureDetails.push(MOVEMENT_COMPOSED_DISCLOSURES.wordmark);
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
  { number: "05", title: "Feita para você", text: "Uma camiseta reservada ao seu lugar nesta manhã. Camiseta e roupa de treino são exclusivas da influenciadora; uma possível surpresa infantil não é prometida." },
  { number: "06", title: "12 de setembro", text: "Uma manhã íntima. Uma memória compartilhada. Movimento, gelato e boas conversas no Le Buffet Lounge." },
];

export const KIT_ITEMS = [
  "Camiseta de treino exclusiva para a influenciadora",
  "Roupa de treino exclusiva para a influenciadora",
  "Uma possível surpresa infantil permanece em confirmação",
];

export const EXPERIENCE_STEPS = [
  ["Aulão funcional", "Uma prática acessível com personal renomado — nome em confirmação — para criar energia, não cobrança de performance."],
  ["Café da manhã", "Hospitalidade, sabores Bentô e tempo para estar presente."],
  ["Conexão", "Boas conversas e uma memória compartilhada no primeiro aniversário."],
];

export const INFLUENCER_SCENES = [
  visualScene({ id: "scenario", assetId: "INF-01", eyebrow: "O cenário", title: "A cidade encontra a água — e a manhã ganha outra atmosfera.", text: "No Le Buffet Lounge, o canal, a marina e o skyline urbano desenham o cenário contemporâneo da celebração.", alt: "Deck contemporâneo do lounge junto ao canal e à marina urbana preparado para a manhã Bentô" }),
  visualScene({ id: "welcome", assetId: "INF-02", eyebrow: "Por que você", title: "A manhã muda quando você chega.", text: "Você foi escolhida pelo que desperta nas pessoas e pela forma como transforma presença em conexão.", alt: "Convidadas em roupa de treino sendo acolhidas com naturalidade na chegada ao lounge" }),
  visualScene({ id: "training", assetId: "INF-03", eyebrow: "Movimento", title: "Energia para começar. Sem cobrança de performance.", text: "Um aulão funcional com personal renomado — nome em confirmação — em estações organizadas para uma experiência natural e compartilhada.", alt: "Grupo de mulheres atléticas vivendo um aulão funcional natural em estações bem organizadas" }),
  visualScene({ id: "kids-workshop", assetId: "INF-04", eyebrow: "Seu mundo também cabe aqui", title: "Oficina de decoração de picolés para as crianças, dentro do cerimonial.", text: "Uma criança de qualquer idade pode participar sempre acompanhada por um adulto responsável, enquanto a experiência acontece no mesmo lugar.", alt: "Crianças acompanhadas por adultos decorando picolés em oficina organizada dentro do cerimonial" }),
  visualScene({ id: "recovery", assetId: "INF-05", eyebrow: "Cuidado", title: "Depois do movimento, tempo para recuperar e conversar.", text: "Uma estação de recovery amplia a sensação de cuidado sem transformar a manhã em uma sequência de obrigações.", alt: "Convidada em roupa de treino recebendo cuidado em uma estação elegante de recovery" }),
  visualScene({ id: "shirt-kit", assetId: "INF-06", eyebrow: "Feita para você", title: "Uma camiseta reservada ao seu lugar nesta manhã.", text: "Camiseta e roupa de treino são exclusivas da influenciadora. Uma possível surpresa infantil não é prometida.", alt: "Composição editorial do kit e da camiseta de treino oficial reservados à influenciadora" }),
  visualScene({ id: "celebration", assetId: "INF-07", eyebrow: "Primeiro aniversário", title: "Um ano merece ser sentido.", text: "Movimento, sabores Bentô e boas conversas fecham uma manhã íntima que queremos guardar na memória.", alt: "Convidadas celebrando de forma espontânea o primeiro aniversário Bentô depois do treino" }),
];

export const PARTNER_SCENES = [
  visualScene({ id: "stage", assetId: "PAR-01", eyebrow: "Assinatura de chegada", title: "A marca pode receber antes mesmo da primeira conversa.", text: "Palco, backdrop e sinalização formam uma composição coletiva cuja aplicação final passa por mockup e aprovação.", alt: "Palco e backdrop modulares em branco e dourado preparados para aplicações coletivas de marcas" }),
  visualScene({ id: "mobility", assetId: "PAR-02", eyebrow: "Mobilidade premium", title: "A experiência pode começar no caminho.", text: "Uma marca automotiva pode transportar convidadas em uma imersão com o veículo; rota, frota e operação dependem de escopo.", alt: "Veículo premium elétrico estacionado no deck do lounge para visualizar uma chegada do evento" }),
  visualScene({ id: "breakfast", assetId: "PAR-03", eyebrow: "Hospitalidade", title: "O café da manhã pode carregar a assinatura de quem acolhe.", text: "Mesa, serviço, peças de apoio e conteúdo criam um território útil para uma participação de marca.", alt: "Café da manhã editorial com áreas limpas para presença funcional de uma marca participante" }),
  visualScene({ id: "movement", assetId: "PAR-04", eyebrow: "Movimento", title: "Garrafa, toalha e acessórios entram em uso real.", text: "A marca pode viver no treino por meio de pontos de contato funcionais, definidos depois da conversa de escopo.", alt: "Aulão funcional natural com materiais que podem receber aplicações de parceiros em uso real" }),
  visualScene({ id: "recovery", assetId: "PAR-05", eyebrow: "Recovery", title: "Cuidado também pode ter forma e função.", text: "Equipamentos, profissionais e materiais de recovery criam uma integração natural depois do aulão.", alt: "Estação premium de recovery com equipamentos e superfícies disponíveis para integração de marca" }),
  visualScene({ id: "kids-workshop", assetId: "PAR-06", eyebrow: "Família", title: "A oficina de decoração de picolés abre outro território de presença.", text: "Picolés prontos recebem decoração, materiais e acompanhamento dentro do cerimonial, sempre com adulto responsável.", alt: "Oficina infantil de decoração de picolés com espaço organizado para uma participação de marca" }),
  visualScene({ id: "shirt-kit", assetId: "PAR-07", eyebrow: "Memória que acompanha", title: "Kit e camiseta transformam utilidade em lembrança.", text: "Ecobag, lancheira, press kit e região lombar da camiseta podem receber a composição coletiva aprovada.", alt: "Kit editorial e camiseta oficial com área de composição coletiva abaixo da frase nas costas" }),
  visualScene({ id: "product", assetId: "PAR-08", eyebrow: "Cocriação", title: "Um produto pode nascer da conversa — se a técnica permitir.", text: "O estudo de picolé ou rótulo co-branded considera formulação, rotulagem, alergênicos, produção e aprovação.", alt: "Produtos reais Bentô compostos em um cenário editorial para estudo de cocriação responsável" }),
  visualScene({ id: "backdrop", assetId: "PAR-09", eyebrow: "Visibilidade contextual", title: "O destaque acontece onde a memória é registrada.", text: "O backdrop coletivo oferece presença no enquadramento sem transformar a celebração em uma feira de marcas.", alt: "Backdrop branco e dourado preparado como ponto de fotografia para o encontro Bentô" }),
  visualScene({ id: "curation", assetId: "PAR-10", eyebrow: "Curadoria", title: "A melhor presença é construída para caber na experiência.", text: "A seleção registra interesse e abre uma conversa de escopo; não constitui reserva, exclusividade ou contrato.", alt: "Mesa de curadoria com amostras de materiais e espaços limpos para propostas de participação" }),
];

export const PARTNER_TIERS = [
  { name: "Select", includes: ["Nome ou logo oficial na composição coletiva do backdrop", "Aplicação coletiva na região lombar da camiseta", "Crédito institucional na relação de participantes e no press kit", "Mockup das aplicações para aprovação"] },
  { name: "Experience", includes: ["Tudo de Select", "Um ponto de contato funcional entre garrafa, toalha, ecobag, lancheira ou press kit", "Integração em um momento entre café da manhã, treino, recovery ou oficina infantil", "Registro curado da participação na documentação do evento"] },
  { name: "Signature", includes: ["Tudo de Experience", "Assinatura de um território entre mobilidade premium, café da manhã, treino, recovery ou oficina infantil", "Presença ampliada nos materiais e na ambientação desse território", "Construção conjunta da narrativa e do plano de captação", "Estudo de viabilidade para picolé ou rótulo co-branded"] },
  { name: "Founding Circle", includes: ["Tudo de Signature", "Segundo ponto de contato em território complementar", "Maior hierarquia nas composições coletivas", "Identificação editorial Founding Circle nos materiais institucionais do evento", "Participação na curadoria criativa final", "Registro editorial personalizado da presença da marca"] },
];

export const PARTNER_PARTICIPATION_NOTE = "Founding Circle refere-se exclusivamente à participação nesta celebração. Nenhuma opção promete preço, exclusividade, alcance, publicação, categoria protegida ou continuidade anual. A escolha registra interesse e não constitui reserva ou contrato.";
