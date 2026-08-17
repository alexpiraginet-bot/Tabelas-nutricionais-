(function () {
  "use strict";

  var audiences = {
    influencer: { label: "Convidada", prefix: "INF", count: 14 },
    partner: { label: "Parceiro", prefix: "PAR", count: 16 },
  };
  var baseScenes = {
    "INF-HERO": ["Capa", "Convite pessoal", "", "Grupo de convidadas chegando em roupa de treino ao lounge contemporâneo junto ao canal urbano de Vitória"],
    "INF-01": ["O cenário", "A cidade encontra a água — e a manhã ganha outra atmosfera.", "No Le Buffet Lounge, o canal, a marina e o skyline urbano desenham o cenário contemporâneo da celebração.", "Deck contemporâneo do lounge junto ao canal e à marina urbana preparado para a manhã Bentô"],
    "INF-02": ["Sua chegada", "A experiência pode começar antes mesmo da porta.", "Um transporte executivo premium, com motorista e embarque coordenado, poderá levar as convidadas ao lounge. A disponibilidade e a logística serão confirmadas mais perto do evento.", "Convidadas em roupa de treino chegando ao lounge em transporte executivo premium com motorista"],
    "INF-03": ["Movimento", "Energia para começar. Sem cobrança de performance.", "Um aulão funcional conduzido por Jonatas Correa, em estações organizadas para uma experiência natural e compartilhada.", "Grupo de mulheres atléticas vivendo um aulão funcional natural em estações bem organizadas"],
    "INF-04": ["Seu mundo também cabe aqui", "Oficina de decoração de picolés para as crianças, dentro do cerimonial.", "Uma criança de qualquer idade pode participar sempre acompanhada por um adulto responsável, enquanto a experiência acontece no mesmo lugar.", "Crianças acompanhadas por adultos decorando picolés em oficina organizada dentro do cerimonial"],
    "INF-05": ["Cuidado", "Depois do movimento, tempo para recuperar e conversar.", "Uma estação de recovery amplia a sensação de cuidado sem transformar a manhã em uma sequência de obrigações.", "Convidada em roupa de treino recebendo cuidado em uma estação elegante de recovery"],
    "INF-06": ["Feita para você", "Uma camiseta reservada ao seu lugar nesta manhã.", "Camiseta e roupa de treino são exclusivas da convidada. Uma possível surpresa infantil não é prometida.", "Composição editorial do kit e da camiseta de treino oficial reservados à convidada"],
    "INF-07": ["Primeiro aniversário", "Um ano merece ser sentido.", "Movimento, sabores Bentô e boas conversas fecham uma manhã íntima que queremos guardar na memória.", "Convidadas celebrando de forma espontânea o primeiro aniversário Bentô depois do treino"],
    "INF-08": ["Cafés especiais", "V60, espresso e café coado com tempo para perceber cada detalhe.", "Uma dupla de profissionais prepara os cafés ao vivo em uma mesa dedicada, aproximando aroma, técnica e conversa de quem chega.", "Dois profissionais preparando cafés especiais em V60 e máquina de espresso diante das convidadas"],
    "INF-09": ["Café da manhã", "Uma mesa generosa para chegar, respirar e ficar.", "Frutas, pães, acompanhamentos e sabores Bentô formam uma pausa de hospitalidade entre movimento, cuidado e encontros.", "Convidadas reunidas diante de uma mesa elegante de café da manhã com frutas pães e louças claras"],
    "INF-10": ["Bentô em movimento", "O carrinho leva o gelato até o centro da celebração.", "Serviço, sabores e conversa se encontram em torno do carrinho Bentô, como parte viva da manhã e não apenas como cenário.", "Carrinho de gelato Bentô em atendimento durante a celebração com convidadas ao redor"],
    "INF-11": ["Bem-estar", "Suplementação entra na experiência como cuidado útil.", "Kits organizados em uma mesa própria apresentam produtos e orientações de forma clara, sem promessas clínicas ou atalhos de performance.", "Kits de suplementação organizados sobre uma mesa de marca em uma apresentação elegante de bem-estar"],
    "INF-12": ["Skincare e maquiagem", "Um tempo de cuidado com atendimento profissional.", "Uma equipe dedicada conduz momentos de skincare e maquiagem em estações confortáveis, com espelhos, luz adequada e atenção individual.", "Mulheres recebendo atendimento profissional de skincare e maquiagem em estações claras e organizadas"],
    "INF-13": ["Oficina para adultas", "Você também poderá criar o seu próprio picolé.", "De avental, as convidadas experimentam coberturas e finalizações com o apoio das profissionais Bentô em jalecos brancos e uma bancada realmente preparada para alimentos.", "Convidadas de avental criando os próprios picolés com profissionais Bentô de jaleco branco"],
    "INF-14": ["Espaço infantil", "Brincar também encontra um lugar bonito dentro da manhã.", "Mesas baixas, madeira, blocos, casinha e atividades táteis formam um espaço infantil delimitado e acompanhado, sem transformar o cerimonial em um parque inflável.", "Crianças acompanhadas brincando com brinquedos minimalistas de madeira mesas baixas blocos e casinha"],
    "PAR-HERO": ["Capa", "Proposta de participação", "", "Estrutura branca e dourada pronta para receber marcas no lounge junto ao canal urbano"],
    "PAR-01": ["Assinatura de chegada", "A marca pode receber antes mesmo da primeira conversa.", "Recepção, credenciamento e kit de boas-vindas formam um primeiro contato útil, elegante e integrado à experiência.", "Recepção de chegada com anfitriã entregando pulseira a convidadas junto a uma instalação arquitetônica dourada"],
    "PAR-02": ["Mobilidade premium", "A experiência pode começar no caminho.", "Uma marca automotiva premium pode conduzir convidadas em transporte executivo com motorista; modelo, rota, frota e operação dependem do escopo aprovado.", "Transporte executivo premium com motorista recebendo convidadas na chegada ao lounge"],
    "PAR-03": ["Hospitalidade", "O café da manhã pode carregar a assinatura de quem acolhe.", "Mesa, serviço, peças de apoio e conteúdo criam um território útil para uma participação de marca.", "Café da manhã editorial com áreas limpas para presença funcional de uma marca participante"],
    "PAR-04": ["Movimento", "Garrafa, toalha e acessórios entram em uso real.", "Jonatas Correa conduz o treino, enquanto a marca pode participar por meio de pontos de contato funcionais definidos depois da conversa de escopo.", "Aulão funcional natural com materiais que podem receber aplicações de parceiros em uso real"],
    "PAR-05": ["Recovery", "Cuidado também pode ter forma e função.", "Equipamentos, profissionais e materiais de recovery criam uma integração natural depois do aulão.", "Estação premium de recovery com equipamentos e superfícies disponíveis para integração de marca"],
    "PAR-06": ["Família", "A oficina de decoração de picolés abre outro território de presença.", "Picolés prontos recebem decoração, materiais e acompanhamento dentro do cerimonial, sempre com adulto responsável.", "Oficina infantil de decoração de picolés com espaço organizado para uma participação de marca"],
    "PAR-07": ["Memória que acompanha", "Kit e camiseta transformam utilidade em lembrança.", "Ecobag, lancheira, press kit e região lombar da camiseta podem receber a composição coletiva aprovada.", "Kit editorial e camiseta oficial com área de composição coletiva abaixo da frase nas costas"],
    "PAR-08": ["Cocriação", "Um produto pode nascer da conversa — se a técnica permitir.", "O estudo de picolé ou rótulo co-branded considera formulação, rotulagem, alergênicos, produção e aprovação.", "Produtos reais Bentô compostos em um cenário editorial para estudo de cocriação responsável"],
    "PAR-09": ["Visibilidade contextual", "O destaque acontece onde a memória é registrada.", "O backdrop coletivo oferece presença no enquadramento sem transformar a celebração em uma feira de marcas.", "Backdrop branco e dourado preparado como ponto de fotografia para o encontro Bentô"],
    "PAR-10": ["Curadoria", "A melhor presença é construída para caber na experiência.", "A seleção registra interesse e abre uma conversa de escopo; não constitui reserva, exclusividade ou contrato.", "Mesa de curadoria com amostras de materiais e espaços limpos para propostas de participação"],
    "PAR-11": ["Cafés especiais", "Uma marca pode assinar uma mesa viva de preparo e conversa.", "Dois profissionais, V60, espresso e café coado criam um território próprio para produto, serviço, utensílios e conteúdo durante toda a manhã.", "Dois baristas preparando V60 e espresso em uma mesa de cafés especiais com áreas de presença de marca"],
    "PAR-12": ["Carrinho Bentô", "A marca pode acompanhar o gelato até onde as pessoas estão.", "Uma aplicação aprovada no carrinho, sem substituir o wordmark oficial Bentô, conecta a parceria ao serviço e ao momento de consumo.", "Carrinho oficial de gelato Bentô em atendimento com painel reservado para uma aplicação aprovada de parceiro"],
    "PAR-13": ["Suplementação", "Kits bem montados transformam produto em experiência útil.", "Uma mesa dedicada organiza produtos, orientações e entregas individuais com linguagem responsável e sem promessas clínicas ou de resultado.", "Kits de suplementação organizados sobre mesa de marca com embalagens neutras e materiais de orientação"],
    "PAR-14": ["Beleza e cuidado", "Skincare e maquiagem ganham uma estação profissional.", "Equipe, espelhos, iluminação e produtos entram em uso real, criando um território de marca baseado em serviço e atenção individual.", "Equipe profissional realizando skincare e maquiagem em mulheres diante de espelhos iluminados"],
    "PAR-15": ["Oficina adulta", "Criar o próprio picolé abre espaço para uma integração memorável.", "Aventais, bancada, ingredientes e profissionais Bentô de jaleco branco permitem que produto e marca participem de uma experiência conduzida.", "Adultas de avental fabricando picolés com profissionais de jaleco branco em uma bancada de alimentos"],
    "PAR-16": ["Entretenimento infantil", "O espaço das crianças também pode receber uma presença cuidadosa.", "Brinquedos minimalistas, mobiliário baixo e atividades táteis formam um ambiente delimitado cuja integração de marca deve respeitar o brincar.", "Espaço infantil minimalista com brinquedos de madeira mesas baixas blocos e crianças acompanhadas"],
  };
  var heroDefaults = {
    influencer: {
      eyebrow: "Convite pessoal · 1º aniversário Bentô Gelatos",
      title: "Esta celebração tem um lugar que só você pode ocupar.",
      body: "No sábado, 12 de setembro, reuniremos 40–50 pessoas no Le Buffet Lounge para uma manhã de movimento, cuidado e encontros. Sua presença é parte essencial da memória que queremos criar.",
      personalMessage: "Esta celebração tem um lugar que só você pode ocupar.",
      responsibleLine: "",
    },
    partner: {
      eyebrow: "Primeiro aniversário Bentô Gelatos",
      title: "Sua marca pode ter forma, função e assinatura nesta celebração.",
      body: "No primeiro aniversário da Bentô Gelatos, 40–50 pessoas viverão uma manhã de movimento e hospitalidade no Le Buffet Lounge. Esta proposta apresenta maneiras de a marca participar de forma natural, útil e memorável.",
      personalMessage: "Seu lugar nesta celebração pode ter forma, função e assinatura.",
      responsibleLine: "Uma proposta para responsável da empresa.",
    },
  };
  var territories = [
    { id: "arrival", key: "ARRIVAL", number: "01", title: "Chegada", headline: "A experiência começa antes da primeira conversa.", backgroundColor: "#F2EDE4", summary: { influencer: "O canal, a marina e uma chegada coordenada abrem a manhã com atmosfera e acolhimento.", partner: "Recepção e mobilidade premium transformam o primeiro contato em uma assinatura útil de marca." }, sceneIds: { influencer: ["INF-01", "INF-02"], partner: ["PAR-01", "PAR-02"] } },
    { id: "movement", key: "MOVEMENT", number: "02", title: "Movimento", headline: "A manhã começa em movimento, com Jonatas Correa.", backgroundColor: "#10291E", summary: { influencer: "Aulão funcional, camiseta e cuidado útil criam energia sem cobrança de performance.", partner: "Treino, acessórios em uso real e suplementação formam um território funcional de participação." }, sceneIds: { influencer: ["INF-03", "INF-06", "INF-11"], partner: ["PAR-04", "PAR-07", "PAR-13"] } },
    { id: "hospitality", key: "HOSPITALITY", number: "03", title: "Hospitalidade", headline: "Hospitalidade para fazer as pessoas ficarem.", backgroundColor: "#FFFDF9", summary: { influencer: "Cafés especiais, café da manhã e o carrinho Bentô dão ritmo às conversas e aos encontros.", partner: "Serviço vivo, produto e presença contextual aproximam a marca de momentos reais de consumo." }, sceneIds: { influencer: ["INF-08", "INF-09", "INF-10"], partner: ["PAR-03", "PAR-11", "PAR-12"] } },
    { id: "care", key: "CARE", number: "04", title: "Cuidado", headline: "Cuidado que continua depois do treino.", backgroundColor: "#EBE3D7", summary: { influencer: "Recovery, skincare, maquiagem e um espaço infantil acompanhado ampliam o cuidado da manhã.", partner: "Serviços profissionais e atenção às famílias criam integrações baseadas em utilidade e presença." }, sceneIds: { influencer: ["INF-05", "INF-12", "INF-14"], partner: ["PAR-05", "PAR-14", "PAR-16"] } },
    { id: "creation", key: "CREATION", number: "05", title: "Criação e memória", headline: "O que se vive também pode acompanhar.", backgroundColor: "#F2EDE4", summary: { influencer: "Oficinas, celebração e produto transformam a experiência em uma memória feita com as mãos.", partner: "Oficinas, kits, backdrop e registro editorial prolongam a experiência sem virar feira de marcas." }, sceneIds: { influencer: ["INF-04", "INF-07", "INF-13"], partner: ["PAR-06", "PAR-08", "PAR-09", "PAR-10", "PAR-15"] } },
  ];
  var state = { audienceType: "influencer", territoryId: "cover", sceneId: "INF-HERO", overrides: {}, drafts: {}, mediaStates: {}, loaded: false, loading: false, dirty: false, uploading: false, saving: false, crop: null, focusTarget: null, previewErrorKey: "" };
  var elements = {};
  var REQUEST_TIMEOUT_MS = 15000;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function sceneIds(audienceType) {
    var audience = audiences[audienceType];
    return [audience.prefix + "-HERO"].concat(Array.from({ length: audience.count }, function (_, index) {
      return audience.prefix + "-" + String(index + 1).padStart(2, "0");
    }));
  }
  function territoryById(territoryId) { return territories.find(function (territory) { return territory.id === territoryId; }) || null; }
  function territoryForScene(audienceType, sceneId) { return territories.find(function (territory) { return territory.sceneIds[audienceType].includes(sceneId); }) || null; }
  function themeSceneId(audienceType, territory) { return (audienceType === "influencer" ? "INF" : "PAR") + "-THEME-" + territory.key; }
  function activeTerritory() { return territoryById(state.territoryId); }
  function defaultImage(sceneId, mobile) {
    var hero = sceneId.endsWith("HERO");
    return "/movimento/v2/" + sceneId + "-" + (mobile ? "mobile-" + (hero ? "768" : "752") : "desktop-" + (hero ? "1440" : "1080")) + ".jpg";
  }
  function defaultContent(sceneId, audienceType) {
    var copy = baseScenes[sceneId] || ["", "", "", ""];
    if (sceneId.endsWith("HERO")) {
      var hero = heroDefaults[audienceType || state.audienceType];
      copy = [hero.eyebrow, hero.title, hero.body, copy[3]];
    }
    return { imageUrl: defaultImage(sceneId, false), mobileImageUrl: "", imageOpacity: 1, titleScale: 1, bodyScale: 1, eyebrow: copy[0], title: copy[1], body: copy[2], altText: copy[3], revision: 0 };
  }
  function entryKey(audienceType, sceneId) { return audienceType + ":" + sceneId; }
  function normalizeItem(item) {
    var audienceType = item.audience || item.audienceType;
    var source = item.override || item;
    var normalized = { audienceType: audienceType, sceneId: item.sceneId, revision: Number(item.revision || 0) };
    ["imageUrl", "mobileImageUrl", "imageOpacity", "backgroundColor", "titleScale", "bodyScale", "eyebrow", "title", "body", "altText"].forEach(function (field) {
      if (source[field] !== null && source[field] !== undefined) normalized[field] = source[field];
    });
    return normalized;
  }
  function overrideFor(audienceType, sceneId) { return state.overrides[entryKey(audienceType, sceneId)] || { audienceType: audienceType, sceneId: sceneId, revision: 0 }; }
  function contentFor(audienceType, sceneId) { return Object.assign({}, defaultContent(sceneId, audienceType), overrideFor(audienceType, sceneId), state.drafts[entryKey(audienceType, sceneId)] || {}); }
  function currentOverride() { return overrideFor(state.audienceType, state.sceneId); }
  function currentContent() { return contentFor(state.audienceType, state.sceneId); }
  function currentKey() { return entryKey(state.audienceType, state.sceneId); }
  function currentThemeKey() { var territory = activeTerritory(); return territory ? entryKey(state.audienceType, themeSceneId(state.audienceType, territory)) : ""; }
  function currentThemeContent() {
    var territory = activeTerritory();
    if (!territory) return null;
    return Object.assign({ audienceType: state.audienceType, sceneId: themeSceneId(state.audienceType, territory), revision: 0, backgroundColor: territory.backgroundColor, titleScale: 1, bodyScale: 1 }, overrideFor(state.audienceType, themeSceneId(state.audienceType, territory)), state.drafts[currentThemeKey()] || {});
  }
  function busy() { return state.loading || state.uploading || state.saving || Boolean(state.crop); }
  async function fetchWithTimeout(url, options) {
    var Controller = window.AbortController;
    var controller = typeof Controller === "function" ? new Controller() : null;
    var requestOptions = Object.assign({}, options || {});
    if (controller) requestOptions.signal = controller.signal;
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error("A operação demorou demais. Verifique a conexão e tente novamente."));
      }, REQUEST_TIMEOUT_MS);
    });
    try {
      return await Promise.race([fetch(url, requestOptions), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
  function setStatus(text, kind) { elements.status.textContent = text || ""; elements.status.className = "mov-editor-status" + (kind ? " " + kind : ""); }
  function captureFocus() {
    if (state.focusTarget) return;
    var active = document.activeElement;
    if (!active || !elements.host || !elements.host.contains(active)) return;
    if (active.id) state.focusTarget = { id: active.id };
    else if (active.name) state.focusTarget = { name: active.name };
  }
  function restoreFocus() {
    if (busy() || !state.focusTarget) return;
    var target = state.focusTarget.id ? document.getElementById(state.focusTarget.id) : elements.form && elements.form.elements.namedItem(state.focusTarget.name);
    if (!target || target.disabled || typeof target.focus !== "function") return;
    state.focusTarget = null;
    target.focus();
  }
  function discardCurrentDraft() { delete state.drafts[currentKey()]; if (currentThemeKey()) delete state.drafts[currentThemeKey()]; state.dirty = false; }
  function canLeaveCurrentScene() {
    if (busy()) return false;
    if (!state.dirty) return true;
    if (!window.confirm("Há alterações não salvas nesta cena. Deseja descartá-las?")) return false;
    discardCurrentDraft();
    return true;
  }
  function setDirty(value) { state.dirty = value; if (value) setStatus("Alterações não salvas."); }
  function imageSource(content, sceneId) {
    sceneId = sceneId || state.sceneId;
    if (content.mobileImageUrl) return content.mobileImageUrl;
    var defaultDesktop = defaultImage(sceneId, false);
    if (content.imageUrl && content.imageUrl !== defaultDesktop) return content.imageUrl;
    return defaultImage(sceneId, true);
  }
  function foregroundScheme(color) {
    var match = /^#([0-9A-F]{6})$/i.exec(String(color || ""));
    if (!match) return "dark";
    var value = Number.parseInt(match[1], 16);
    var red = (value >> 16) & 255; var green = (value >> 8) & 255; var blue = value & 255;
    var luminance = (red * .2126 + green * .7152 + blue * .0722) / 255;
    return luminance < .48 ? "light" : "dark";
  }
  function previewKey(source) { return currentKey() + "|" + source; }
  function currentPreviewState() {
    if (!elements.previewImage) return "loading";
    return state.mediaStates[previewKey(elements.previewImage._movSource || imageSource(draftContent()))] || "loading";
  }
  function updatePreviewState(source) {
    if (!elements.preview || !elements.previewImage || elements.previewImage._movSource !== source) return;
    var key = previewKey(source);
    var status = state.mediaStates[key] || "loading";
    elements.preview.classList.toggle("loading", status === "loading");
    elements.preview.classList.toggle("error", status === "error");
    if (elements.save) elements.save.disabled = busy() || status !== "valid";
    if (status === "error") {
      state.previewErrorKey = key;
      setStatus("Não foi possível carregar a imagem da prévia. Substitua a mídia ou tente novamente.", "error");
    } else if (status === "valid" && state.previewErrorKey === key) {
      state.previewErrorKey = "";
      setStatus("Imagem da prévia carregada.", "saved");
    }
    restoreFocus();
  }
  function setPreviewSource(source) {
    if (!elements.previewImage || elements.previewImage._movSource === source) return;
    var image = elements.previewImage;
    var key = previewKey(source);
    image._movSource = source;
    if (!state.mediaStates[key]) state.mediaStates[key] = "loading";
    image.addEventListener("load", function () {
      if (image._movSource !== source) return;
      state.mediaStates[key] = "valid";
      updatePreviewState(source);
    }, { once: true });
    image.addEventListener("error", function () {
      if (image._movSource !== source) return;
      state.mediaStates[key] = "error";
      updatePreviewState(source);
    }, { once: true });
    image.src = source;
    updatePreviewState(source);
  }
  function waitForPreview(source) {
    var key = previewKey(source);
    if (state.mediaStates[key] === "valid") return Promise.resolve();
    if (state.mediaStates[key] === "error") return Promise.reject(new Error("Não foi possível carregar a imagem enviada."));
    return new Promise(function (resolve, reject) {
      var image = elements.previewImage;
      function loaded() { if (image._movSource === source) resolve(); else reject(new Error("A prévia da imagem mudou durante o envio.")); }
      function failed() { reject(new Error("Não foi possível carregar a imagem enviada.")); }
      image.addEventListener("load", loaded, { once: true }); image.addEventListener("error", failed, { once: true });
      if (image.complete) { if (image.naturalWidth > 0) loaded(); else failed(); }
    });
  }
  function textInput(label, field, multiline, maxLength) {
    var wrap = el("label");
    wrap.appendChild(document.createTextNode(label));
    var input = document.createElement(multiline ? "textarea" : "input");
    input.name = field; input.maxLength = maxLength; input.value = currentContent()[field] || ""; input.disabled = busy();
    input.addEventListener("input", function () { setDirty(true); renderPreview(); });
    wrap.appendChild(input);
    return wrap;
  }
  function scaleInput(label, field, value, onInput) {
    var wrap = el("label", "mov-editor-range");
    wrap.appendChild(document.createTextNode(label));
    var output = el("output", "", Math.round(Number(value) * 100) + "%");
    var input = document.createElement("input");
    input.type = "range"; input.name = field; input.min = "0.7"; input.max = "1.5"; input.step = "0.05";
    input.value = String(value); input.disabled = busy();
    input.addEventListener("input", function () { output.textContent = Math.round(Number(input.value) * 100) + "%"; onInput(); });
    wrap.append(output, input);
    return wrap;
  }
  function fileInput(label, field) {
    var wrap = el("label", "mov-editor-upload");
    wrap.appendChild(document.createTextNode(label));
    var input = document.createElement("input");
    input.type = "file"; input.name = field; input.accept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"; input.dataset.field = field; input.disabled = busy();
    input.addEventListener("change", function () { if (input.files && input.files[0]) return uploadImage(input.files[0], field); });
    wrap.appendChild(input);
    return wrap;
  }
  function renderPreview() {
    if (!elements.preview) return;
    var content = draftContent();
    var territory = activeTerritory();
    var theme = draftThemeContent() || currentThemeContent();
    elements.preview.style.setProperty("--mov-editor-opacity", String(content.imageOpacity));
    if (territory && theme) {
      elements.preview.style.setProperty("--mov-editor-background", theme.backgroundColor);
      elements.preview.dataset.colorScheme = foregroundScheme(theme.backgroundColor);
    }
    var previewScales = territory && theme ? theme : content;
    elements.preview.style.setProperty("--mov-editor-ts", String(previewScales.titleScale || 1));
    elements.preview.style.setProperty("--mov-editor-bs", String(previewScales.bodyScale || 1));
    setPreviewSource(imageSource(content));
    elements.previewEyebrow.textContent = territory ? territory.number + " · " + territory.title : (content.eyebrow || "Capítulo");
    elements.previewTitle.textContent = territory ? territory.headline : (state.audienceType === "partner" ? "Nome da empresa" : "Nome da convidada");
    elements.previewContext.textContent = territory ? "Editando: " + (content.eyebrow || "capítulo") : heroDefaults[state.audienceType].responsibleLine;
    elements.previewMessage.textContent = territory ? "" : heroDefaults[state.audienceType].personalMessage;
    elements.previewBody.textContent = territory ? territory.summary[state.audienceType] : (content.body || "");
  }
  function buildEditor() {
    var root = el("section", "mov-editor");
    var toolbar = el("div", "mov-editor-toolbar");
    var audienceLabel = el("label"); audienceLabel.appendChild(document.createTextNode("Público"));
    elements.audience = document.createElement("select"); elements.audience.id = "movEditorAudience"; elements.audience.setAttribute("aria-label", "Público da apresentação");
    Object.keys(audiences).forEach(function (key) { var option = el("option", "", audiences[key].label); option.value = key; elements.audience.appendChild(option); });
    elements.audience.value = state.audienceType; elements.audience.disabled = busy();
    elements.audience.addEventListener("change", function () { if (!canLeaveCurrentScene()) { elements.audience.value = state.audienceType; return; } state.audienceType = elements.audience.value; state.territoryId = "cover"; state.sceneId = sceneIds(state.audienceType)[0]; render(); });
    audienceLabel.appendChild(elements.audience); toolbar.appendChild(audienceLabel);
    toolbar.appendChild(el("p", "mov-editor-note", "Altere imagem e copy de cada capítulo. Nome, empresa e mensagem pessoal são definidos exclusivamente pelo link individual."));
    elements.status = el("p", "mov-editor-status"); elements.status.id = "movEditorStatus"; elements.status.setAttribute("aria-live", "polite"); toolbar.appendChild(elements.status);
    elements.reload = el("button", "mov-editor-reload", "Recarregar do servidor"); elements.reload.id = "movEditorReload"; elements.reload.type = "button"; elements.reload.hidden = true; elements.reload.addEventListener("click", reloadContent); toolbar.appendChild(elements.reload);
    root.appendChild(toolbar);
    elements.layout = el("div", "mov-editor-layout"); elements.layout.id = "movEditorLayout"; root.appendChild(elements.layout);
    elements.cropDialog = el("section", "mov-crop-dialog"); elements.cropDialog.id = "movImageCropDialog"; elements.cropDialog.hidden = true; elements.cropDialog.setAttribute("role", "dialog"); elements.cropDialog.setAttribute("aria-modal", "true"); elements.cropDialog.setAttribute("aria-labelledby", "movCropTitle");
    var cropPanel = el("div", "mov-crop-panel"); var cropHeading = el("div", "mov-crop-heading"); var cropTitle = el("h3", "", "Ajuste e otimize"); cropTitle.id = "movCropTitle"; elements.cropMeta = el("p", "mov-crop-meta"); cropHeading.append(cropTitle, elements.cropMeta); cropPanel.appendChild(cropHeading);
    var cropStage = el("div", "mov-crop-stage"); elements.cropCanvas = document.createElement("canvas"); elements.cropCanvas.setAttribute("aria-label", "Prévia do corte da imagem"); cropStage.appendChild(elements.cropCanvas); cropPanel.appendChild(cropStage);
    elements.cropControls = el("div", "mov-crop-controls");
    [["Enquadramento horizontal", "cropX", 50], ["Enquadramento vertical", "cropY", 50], ["Zoom", "cropZoom", 100]].forEach(function (definition) {
      var label = el("label"); var line = el("span", "mov-crop-control-label", definition[0]); var output = el("output", "", definition[2] + "%"); var input = document.createElement("input"); input.type = "range"; input.name = definition[1]; input.min = definition[1] === "cropZoom" ? "100" : "0"; input.max = definition[1] === "cropZoom" ? "200" : "100"; input.step = "1"; input.value = String(definition[2]); input.addEventListener("input", function () { output.textContent = input.value + "%"; if (state.crop) state.crop[definition[1]] = Number(input.value); renderCropPreview(); }); line.appendChild(output); label.append(line, input); elements.cropControls.appendChild(label);
    });
    cropPanel.appendChild(elements.cropControls);
    var cropActions = el("div", "mov-crop-actions"); elements.cropCancel = el("button", "", "Cancelar"); elements.cropCancel.type = "button"; elements.cropCancel.id = "movCropCancel"; elements.cropCancel.addEventListener("click", cancelCrop); elements.cropApply = el("button", "primary", "Aplicar corte e publicar"); elements.cropApply.type = "button"; elements.cropApply.id = "movCropApply"; elements.cropApply.addEventListener("click", applyCrop); cropActions.append(elements.cropCancel, elements.cropApply); cropPanel.appendChild(cropActions); elements.cropDialog.appendChild(cropPanel); root.appendChild(elements.cropDialog);
    elements.host.replaceChildren(root);
  }
  function draftContent() {
    var base = currentContent();
    if (!elements.form) return base;
    ["eyebrow", "title", "body", "altText"].forEach(function (field) { var input = elements.form.elements.namedItem(field); if (input) base[field] = input.value; });
    var range = elements.form.elements.namedItem("imageOpacity"); if (range) base.imageOpacity = Number(range.value);
    ["titleScale", "bodyScale"].forEach(function (field) { var slider = elements.form.elements.namedItem(field); if (slider) base[field] = Number(slider.value); });
    return base;
  }
  function draftThemeContent() {
    var theme = currentThemeContent();
    if (!theme || !elements.form) return theme;
    var input = elements.form.elements.namedItem("backgroundColor");
    if (input) theme.backgroundColor = String(input.value || theme.backgroundColor).toUpperCase();
    ["themeTitleScale", "themeBodyScale"].forEach(function (name) { var slider = elements.form.elements.namedItem(name); if (slider) theme[name === "themeTitleScale" ? "titleScale" : "bodyScale"] = Number(slider.value); });
    return theme;
  }
  function rememberDraft() {
    if (!elements.form) return;
    state.drafts[currentKey()] = draftContent();
    var theme = draftThemeContent();
    if (theme) state.drafts[currentThemeKey()] = theme;
  }
  function render() {
    if (!elements.layout) return;
    captureFocus();
    elements.audience.value = state.audienceType; elements.audience.disabled = busy();
    if (elements.reload) elements.reload.disabled = busy();
    document.querySelectorAll("[data-mov-admin-tab]").forEach(function (button) { button.disabled = busy(); });
    elements.layout.replaceChildren();
    var territoryNav = el("nav", "mov-editor-territories"); territoryNav.id = "movEditorTerritoryList"; territoryNav.setAttribute("aria-label", "Visão macro da apresentação");
    [{ id: "cover", number: "", title: "Capa" }].concat(territories).forEach(function (territory) {
      var active = territory.id === state.territoryId;
      var label = territory.id === "cover" ? "Capa" : territory.number + " · " + territory.title;
      var button = el("button", "mov-editor-territory" + (active ? " on" : ""), label);
      button.id = "movEditorTerritory-" + territory.id; button.type = "button"; button.disabled = busy(); button.setAttribute("aria-current", active ? "true" : "false");
      button.addEventListener("click", function () {
        if (active || !canLeaveCurrentScene()) return;
        state.territoryId = territory.id;
        state.sceneId = territory.id === "cover" ? audiences[state.audienceType].prefix + "-HERO" : territory.sceneIds[state.audienceType][0];
        render();
      });
      territoryNav.appendChild(button);
    });
    elements.layout.appendChild(territoryNav);
    var scenes = el("nav", "mov-editor-scenes"); scenes.id = "movEditorSceneList"; scenes.setAttribute("aria-label", "Capítulos da apresentação");
    var territory = activeTerritory();
    var visibleSceneIds = territory ? territory.sceneIds[state.audienceType] : [audiences[state.audienceType].prefix + "-HERO"];
    sceneIds(state.audienceType).forEach(function (sceneId, index) {
      var copy = baseScenes[sceneId] || [];
      var button = el("button", "mov-editor-scene" + (sceneId === state.sceneId ? " on" : ""), (index === 0 ? "Capa" : String(index).padStart(2, "0")) + " · " + (copy[0] || sceneId));
      button.id = "movEditorScene-" + sceneId; button.type = "button"; button.hidden = !visibleSceneIds.includes(sceneId); button.disabled = busy(); button.setAttribute("aria-current", sceneId === state.sceneId ? "true" : "false");
      button.addEventListener("click", function () { if (sceneId === state.sceneId) return; if (!canLeaveCurrentScene()) return; state.sceneId = sceneId; var nextTerritory = territoryForScene(state.audienceType, sceneId); state.territoryId = nextTerritory ? nextTerritory.id : "cover"; render(); }); scenes.appendChild(button);
    });
    elements.layout.appendChild(scenes);
    var content = currentContent();
    elements.preview = el("figure", "mov-editor-preview" + (state.sceneId.endsWith("HERO") ? " is-hero" : " is-territory")); elements.preview.id = "movEditorPreview"; elements.preview.style.setProperty("--mov-editor-opacity", String(content.imageOpacity));
    elements.previewImage = document.createElement("img"); elements.previewImage.alt = "Prévia da imagem do capítulo"; elements.preview.appendChild(elements.previewImage); setPreviewSource(imageSource(content));
    var previewCopy = el("figcaption", "mov-editor-preview-copy"); elements.previewEyebrow = el("small", "", content.eyebrow || "Capítulo"); elements.previewTitle = el("strong", "", state.sceneId.endsWith("HERO") ? (state.audienceType === "partner" ? "Nome da empresa" : "Nome da convidada") : (content.title || "Título do capítulo")); elements.previewContext = el("span", "mov-editor-preview-context", state.sceneId.endsWith("HERO") ? heroDefaults[state.audienceType].responsibleLine : ""); elements.previewMessage = el("span", "mov-editor-preview-message", state.sceneId.endsWith("HERO") ? heroDefaults[state.audienceType].personalMessage : ""); elements.previewBody = el("p", "mov-editor-preview-body", content.body || ""); previewCopy.append(elements.previewEyebrow, elements.previewTitle, elements.previewContext, elements.previewMessage, elements.previewBody); elements.preview.appendChild(previewCopy); elements.layout.appendChild(elements.preview);
    elements.form = el("form", "mov-editor-form"); elements.form.id = "movEditorForm"; elements.form.noValidate = true;
    if (state.sceneId.endsWith("HERO")) {
      var lock = el("div", "mov-editor-lock"); lock.append(el("strong", "", "Nome e empresa são definidos pelo link."), document.createElement("br"), document.createTextNode("A mensagem nominal e a chamada de confirmação permanecem protegidas.")); elements.form.appendChild(lock);
    }
    if (territory) {
      var theme = currentThemeContent(); var colorLabel = el("label", "mov-editor-color"); colorLabel.appendChild(document.createTextNode("Cor de fundo do card"));
      var colorLine = el("span", "mov-editor-color-line"); var color = document.createElement("input"); color.type = "color"; color.name = "backgroundColor"; color.value = theme.backgroundColor; color.disabled = busy(); var colorValue = el("output", "", theme.backgroundColor);
      color.addEventListener("input", function () { color.value = String(color.value).toUpperCase(); colorValue.textContent = color.value; var pending = currentThemeContent(); pending.backgroundColor = color.value; state.drafts[currentThemeKey()] = pending; setDirty(true); renderPreview(); });
      colorLine.append(color, colorValue); colorLabel.appendChild(colorLine); elements.form.appendChild(colorLabel);
      elements.form.append(scaleInput("Tamanho do título do card", "themeTitleScale", theme.titleScale, function () { var pending = draftThemeContent(); state.drafts[currentThemeKey()] = pending; setDirty(true); renderPreview(); }));
      elements.form.append(scaleInput("Tamanho do texto do card", "themeBodyScale", theme.bodyScale, function () { var pending = draftThemeContent(); state.drafts[currentThemeKey()] = pending; setDirty(true); renderPreview(); }));
    }
    elements.form.append(fileInput("Foto principal deste tópico", "imageUrl")); elements.form.append(fileInput("Versão vertical para iPhone (opcional)", "mobileImageUrl"));
    var rangeLabel = el("label", "mov-editor-range"); rangeLabel.append(document.createTextNode("Intensidade da imagem")); var output = el("output", "", Math.round(content.imageOpacity * 100) + "%");
    var range = document.createElement("input"); range.type = "range"; range.name = "imageOpacity"; range.min = "0"; range.max = "1"; range.step = "0.01"; range.value = String(content.imageOpacity); range.disabled = busy(); range.addEventListener("input", function () { output.textContent = Math.round(Number(range.value) * 100) + "%"; setDirty(true); renderPreview(); }); rangeLabel.append(output, range); elements.form.appendChild(rangeLabel);
    elements.form.append(scaleInput(state.sceneId.endsWith("HERO") ? "Tamanho do título" : "Tamanho do título (no detalhe)", "titleScale", content.titleScale, function () { setDirty(true); renderPreview(); }));
    elements.form.append(scaleInput(state.sceneId.endsWith("HERO") ? "Tamanho do texto" : "Tamanho do texto (no detalhe)", "bodyScale", content.bodyScale, function () { setDirty(true); renderPreview(); }));
    elements.form.append(textInput("Texto superior", "eyebrow", false, 60));
    elements.form.append(textInput(state.sceneId.endsWith("HERO") ? "Título editorial do link geral" : "Título", "title", true, 140));
    elements.form.append(textInput("Texto", "body", true, 360)); elements.form.append(textInput("Descrição acessível da imagem", "altText", true, 240));
    var actions = el("div", "mov-editor-actions"); var reset = el("button", "", "Restaurar padrão"); reset.id = "movEditorRestore"; reset.type = "button"; reset.disabled = busy(); reset.addEventListener("click", resetScene); var save = el("button", "primary", "Salvar alterações"); save.id = "movEditorSave"; save.type = "submit"; save.disabled = busy() || currentPreviewState() !== "valid"; elements.save = save; actions.append(reset, save); elements.form.appendChild(actions);
    elements.form.addEventListener("submit", function (event) { event.preventDefault(); return saveScene(); }); elements.layout.appendChild(elements.form); renderPreview(); renderCropPreview(); restoreFocus();
  }
  function collectOverride(target, content) {
    var baseline = defaultContent(target.sceneId, target.audienceType);
    var saved = target.saved;
    var override = {};
    ["imageUrl", "mobileImageUrl", "imageOpacity", "titleScale", "bodyScale", "eyebrow", "title", "body", "altText"].forEach(function (field) {
      var changed = content[field] !== baseline[field];
      var wasOverridden = Object.hasOwn(saved, field) && saved[field] != null;
      if (field === "mobileImageUrl") { if (content[field] || wasOverridden) override[field] = content[field] || null; return; }
      if (changed || wasOverridden) override[field] = changed ? content[field] : null;
    });
    var hasCustomImage = content.imageUrl !== baseline.imageUrl || Boolean(content.mobileImageUrl);
    if (hasCustomImage) override.altText = content.altText;
    return override;
  }
  function collectThemeOverride(target, content) {
    var territory = activeTerritory();
    if (!territory || !content) return {};
    var override = {};
    var value = String(content.backgroundColor || territory.backgroundColor).toUpperCase();
    var colorChanged = value !== territory.backgroundColor;
    if (colorChanged || (Object.hasOwn(target.saved, "backgroundColor") && target.saved.backgroundColor != null)) override.backgroundColor = colorChanged ? value : null;
    ["titleScale", "bodyScale"].forEach(function (field) {
      var scale = Number(content[field] || 1);
      var changed = scale !== 1;
      var wasOverridden = Object.hasOwn(target.saved, field) && target.saved[field] != null;
      if (changed || wasOverridden) override[field] = changed ? scale : null;
    });
    return override;
  }
  async function persistOverride(target, override) {
    var key = localStorage.getItem("bento:panelkey") || "";
    var response = await fetchWithTimeout("/api/movimento-content", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ action: "save", audience: target.audienceType, sceneId: target.sceneId, revision: Number(target.saved.revision || 0), override: override }) });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || ("HTTP " + response.status));
    state.overrides[target.key] = normalizeItem(data.item || data.override || {});
  }
  async function load() {
    if (busy()) return;
    state.loading = true; render();
    setStatus("Carregando conteúdo…");
    try {
      var key = localStorage.getItem("bento:panelkey") || "";
      var response = await fetchWithTimeout("/api/movimento-content?fresh=1", { cache: "no-store", headers: { Authorization: "Bearer " + key } });
      var data = await response.json().catch(function () { return {}; }); if (!response.ok) throw new Error(data.error || ("HTTP " + response.status));
      state.overrides = {}; (data.items || data.overrides || []).forEach(function (item) { var normalized = normalizeItem(item); if (normalized.audienceType && normalized.sceneId) state.overrides[entryKey(normalized.audienceType, normalized.sceneId)] = normalized; }); state.loaded = true; state.dirty = false; elements.reload.hidden = true; setStatus("Conteúdo carregado.");
    } catch (error) { elements.reload.hidden = false; setStatus((error && error.message) || "Não foi possível carregar o conteúdo.", "error"); }
    finally { state.loading = false; render(); }
  }
  function reloadContent() {
    if (busy()) return;
    if (state.dirty && !window.confirm("Recarregar o conteúdo do servidor e descartar as alterações desta cena?")) return;
    discardCurrentDraft(); state.loaded = false;
    return load();
  }
  async function decodeImage(file) {
    if (typeof window.createImageBitmap === "function") {
      try {
        var bitmap = await window.createImageBitmap(file, { imageOrientation: "from-image" });
        return { source: bitmap, width: bitmap.width, height: bitmap.height, close: function () { if (typeof bitmap.close === "function") bitmap.close(); } };
      } catch (_) {}
    }
    if (!window.URL || typeof window.URL.createObjectURL !== "function" || typeof window.Image !== "function") throw new Error("Este navegador não consegue preparar a foto com segurança.");
    var objectUrl = window.URL.createObjectURL(file);
    try {
      var image = await new Promise(function (resolve, reject) {
        var candidate = new window.Image();
        candidate.addEventListener("load", function () { resolve(candidate); }, { once: true });
        candidate.addEventListener("error", function () { reject(new Error("Não foi possível abrir esta foto.")); }, { once: true });
        candidate.src = objectUrl;
      });
      return { source: image, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, close: function () { window.URL.revokeObjectURL(objectUrl); } };
    } catch (error) {
      window.URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }
  function cropOutput(field, sceneId) {
    var hero = sceneId.endsWith("HERO"); var vertical = field === "mobileImageUrl";
    if (vertical) return hero ? { width: 768, height: 1365, label: "Vertical · 9:16" } : { width: 752, height: 940, label: "Vertical · 4:5" };
    return hero ? { width: 1440, height: 810, label: "Principal · 16:9" } : { width: 1080, height: 675, label: "Principal · 8:5" };
  }
  function cropGeometry(decoded, output, crop) {
    var targetRatio = output.width / output.height; var sourceRatio = decoded.width / decoded.height; var width; var height;
    if (sourceRatio > targetRatio) { height = decoded.height; width = height * targetRatio; } else { width = decoded.width; height = width / targetRatio; }
    var zoom = Math.max(1, Math.min(2, Number(crop.cropZoom || 100) / 100)); width /= zoom; height /= zoom;
    var x = Math.max(0, Math.min(100, Number(crop.cropX || 0))) / 100; var y = Math.max(0, Math.min(100, Number(crop.cropY || 0))) / 100;
    return { x: (decoded.width - width) * x, y: (decoded.height - height) * y, width: width, height: height };
  }
  function drawCrop(canvas, decoded, output, crop, scale) {
    var context = canvas.getContext("2d", { alpha: true }); if (!context) throw new Error("Não foi possível preparar a foto neste navegador.");
    var geometry = cropGeometry(decoded, output, crop); var reduction = scale === undefined ? 1 : scale; canvas.width = Math.max(1, Math.round(output.width * reduction)); canvas.height = Math.max(1, Math.round(output.height * reduction));
    context.drawImage(decoded.source, geometry.x, geometry.y, geometry.width, geometry.height, 0, 0, canvas.width, canvas.height); return canvas;
  }
  function renderCropPreview() {
    if (!elements.cropDialog) return; var crop = state.crop; elements.cropDialog.hidden = !crop; if (!crop) return;
    var output = cropOutput(crop.field, crop.target.sceneId); elements.cropMeta.textContent = output.label + " · saída " + output.width + "×" + output.height + " px";
    ["cropX", "cropY", "cropZoom"].forEach(function (name) { var input = elements.cropControls.elements ? elements.cropControls.elements.namedItem(name) : null; if (!input) input = Array.from(elements.cropControls.children || []).map(function (label) { return label.children && label.children[1]; }).find(function (candidate) { return candidate && candidate.name === name; }); if (input) input.value = String(crop[name]); });
    drawCrop(elements.cropCanvas, crop.decoded, output, crop, 1); if (!crop.focusPlaced && elements.cropApply && typeof elements.cropApply.focus === "function") { crop.focusPlaced = true; elements.cropApply.focus(); }
  }
  async function optimizeImage(file, field, preparedCrop) {
    var crop = preparedCrop || { cropX: 50, cropY: 50, cropZoom: 100, target: { sceneId: state.sceneId }, decoded: await decodeImage(file) }; var decoded = crop.decoded; var output = cropOutput(field, crop.target.sceneId); var maxBytes = field === "mobileImageUrl" ? 1024 * 1024 : 1536 * 1024;
    if (!Number.isFinite(decoded.width) || !Number.isFinite(decoded.height) || decoded.width < 1 || decoded.height < 1) throw new Error("Não foi possível ler as dimensões da foto.");
    var canvas = document.createElement("canvas"); var formats = [{ type: "image/webp", extension: "webp" }, { type: "image/jpeg", extension: "jpg" }]; var qualities = [.84, .76, .68, .58]; var selected = null;
    for (var reduction = 0; reduction < 4 && !selected; reduction += 1) {
      drawCrop(canvas, decoded, output, crop, Math.pow(.82, reduction));
      for (var formatIndex = 0; formatIndex < formats.length && !selected; formatIndex += 1) { var format = formats[formatIndex]; for (var qualityIndex = 0; qualityIndex < qualities.length; qualityIndex += 1) { var quality = qualities[qualityIndex]; var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, format.type, quality); }); if (!blob || blob.type !== format.type) break; if (blob.size > 0 && blob.size <= maxBytes) { selected = { blob: blob, type: format.type, extension: format.extension }; break; } } }
    }
    if (!selected) throw new Error("Não foi possível reduzir a foto para um tamanho seguro. Escolha outra imagem.");
    var baseName = String(file.name || "foto").replace(/\.[^.]+$/, ""); return { blob: selected.blob, name: baseName + (field === "mobileImageUrl" ? "-mobile." : "-desktop.") + selected.extension, type: selected.type, size: selected.blob.size };
  }
  async function uploadImage(file, field) {
    if (busy()) return;
    var extension = String(file.name || "").split(".").at(-1).toLowerCase(); var supported = /^image\/(jpeg|png|webp|avif|heic|heif)$/.test(String(file.type || "").toLowerCase()) || /^(jpe?g|png|webp|avif|heic|heif)$/.test(extension);
    if (!supported) { setStatus("Use JPEG, PNG, WebP, AVIF ou HEIC.", "error"); return; }
    if (!Number.isFinite(file.size) || file.size < 1 || file.size > 30 * 1024 * 1024) { setStatus("A foto original deve ter no máximo 30 MiB.", "error"); return; }
    var target = { audienceType: state.audienceType, sceneId: state.sceneId, key: currentKey(), hadDraft: state.dirty };
    if (state.dirty) rememberDraft(); state.uploading = true; render(); setStatus("Preparando o editor de corte…");
    try {
      var decoded = await decodeImage(file); state.uploading = false; state.crop = { file: file, field: field, target: target, decoded: decoded, cropX: 50, cropY: 50, cropZoom: 100 }; render(); setStatus("Ajuste o enquadramento e aplique o corte.");
    } catch (error) { state.uploading = false; setStatus((error && error.message) || "Não foi possível abrir a foto.", "error"); render(); }
  }
  function cancelCrop() {
    if (!state.crop) return; var crop = state.crop; state.crop = null; crop.decoded.close(); render(); setStatus("Seleção de foto cancelada.");
  }
  async function applyCrop() {
    if (!state.crop || state.uploading) return; var crop = state.crop; state.crop = null; state.uploading = true; render(); setStatus("Otimizando foto…");
    try {
      var uploadFile = await optimizeImage(crop.file, crop.field, crop); setStatus("Enviando foto otimizada…");
      var key = localStorage.getItem("bento:panelkey") || "";
      var signed = await fetchWithTimeout("/api/upload", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ action: "sign", purpose: "movimento", name: uploadFile.name, type: uploadFile.type, size: uploadFile.size }) });
      var data = await signed.json().catch(function () { return {}; }); if (!signed.ok || !data.uploadUrl || !data.publicUrl) throw new Error(data.error || "Não foi possível preparar o envio.");
      var put = await fetchWithTimeout(data.uploadUrl, { method: "PUT", headers: { "Content-Type": uploadFile.type }, body: uploadFile.blob }); if (!put.ok) throw new Error("Não foi possível enviar a foto.");
      var draft = contentFor(crop.target.audienceType, crop.target.sceneId); draft[crop.field] = data.publicUrl; state.drafts[crop.target.key] = draft;
      if (crop.target.key === currentKey()) {
        state.dirty = true; render(); setPreviewSource(data.publicUrl);
        await waitForPreview(data.publicUrl); setStatus("Publicando foto…");
        var saved = overrideFor(crop.target.audienceType, crop.target.sceneId); var baseline = defaultContent(crop.target.sceneId, crop.target.audienceType); var override = {};
        override[crop.field] = data.publicUrl; override.altText = draft.altText || baseline.altText;
        var key = localStorage.getItem("bento:panelkey") || "";
        var response = await fetchWithTimeout("/api/movimento-content", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ action: "save", audience: crop.target.audienceType, sceneId: crop.target.sceneId, revision: Number(saved.revision || 0), override: override }) });
        var savedData = await response.json().catch(function () { return {}; }); if (!response.ok) throw new Error(savedData.error || ("HTTP " + response.status));
        var pendingDraft = state.drafts[crop.target.key] || draft; state.overrides[crop.target.key] = normalizeItem(savedData.item || savedData.override || {});
        if (crop.target.hadDraft) { state.drafts[crop.target.key] = pendingDraft; state.dirty = true; }
        else { delete state.drafts[crop.target.key]; state.dirty = false; }
        render(); setStatus(crop.target.hadDraft ? "Foto publicada. Outras alterações continuam como rascunho." : "Foto ajustada, salva e publicada.", "saved");
      }
    } catch (error) { setStatus((error && error.message) || "Não foi possível enviar a foto.", "error"); }
    finally {
      crop.decoded.close(); state.uploading = false; state.focusTarget = null; render();
      var liveInput = elements.form && elements.form.elements.namedItem(crop.field); if (liveInput && typeof liveInput.focus === "function") liveInput.focus();
    }
  }
  async function saveScene() {
    if (busy()) return;
    if (currentPreviewState() !== "valid") { setStatus("Aguarde a prévia carregar ou substitua a imagem com erro.", "error"); return; }
    var target = { audienceType: state.audienceType, sceneId: state.sceneId, key: currentKey(), saved: currentOverride() };
    var content = draftContent();
    var override = collectOverride(target, content);
    var territory = activeTerritory();
    var themeTarget = territory ? { audienceType: state.audienceType, sceneId: themeSceneId(state.audienceType, territory), key: currentThemeKey(), saved: overrideFor(state.audienceType, themeSceneId(state.audienceType, territory)) } : null;
    var themeContent = draftThemeContent();
    var themeOverride = themeTarget ? collectThemeOverride(themeTarget, themeContent) : {};
    if (!Object.keys(override).length && !Object.keys(themeOverride).length) { setStatus("Nenhuma alteração para salvar."); return; }
    state.drafts[target.key] = content;
    if (themeTarget && themeContent) state.drafts[themeTarget.key] = themeContent;
    if ((override.altText || "").trim() && override.altText.trim().length < 24) { setStatus("A descrição acessível precisa ter pelo menos 24 caracteres.", "error"); return; }
    state.saving = true; render(); setStatus("Salvando conteúdo…");
    try {
      if (Object.keys(override).length) await persistOverride(target, override);
      if (themeTarget && Object.keys(themeOverride).length) await persistOverride(themeTarget, themeOverride);
      delete state.drafts[target.key]; if (themeTarget) delete state.drafts[themeTarget.key]; state.dirty = false; elements.reload.hidden = true; setStatus("Salvo e pronto para a apresentação.", "saved");
    } catch (error) { elements.reload.hidden = false; setStatus((error && error.message) || "Não foi possível salvar o conteúdo.", "error"); }
    finally { state.saving = false; render(); }
  }
  async function resetScene() {
    if (busy()) return;
    var target = { audienceType: state.audienceType, sceneId: state.sceneId, key: currentKey(), saved: currentOverride() };
    if (target.saved.revision) {
      if (!window.confirm("Restaurar o padrão desta cena? A personalização publicada será removida.")) return;
    } else if (state.dirty) {
      if (!window.confirm("Restaurar o padrão desta cena e descartar as alterações não salvas?")) return;
    } else { setStatus("Esta cena já usa o padrão do código."); return; }
    if (!target.saved.revision) { discardCurrentDraft(); render(); setStatus("Padrão do código restaurado.", "saved"); return; }
    if (state.dirty) state.drafts[target.key] = draftContent();
    state.saving = true; render(); setStatus("Restaurando padrão…");
    try {
      var key = localStorage.getItem("bento:panelkey") || "";
      var response = await fetchWithTimeout("/api/movimento-content", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ action: "reset", audience: target.audienceType, sceneId: target.sceneId, revision: Number(target.saved.revision) }) });
      var data = await response.json().catch(function () { return {}; }); if (!response.ok) throw new Error(data.error || ("HTTP " + response.status));
      delete state.overrides[target.key]; delete state.drafts[target.key]; state.dirty = false; elements.reload.hidden = true; setStatus("Padrão do código restaurado.", "saved");
    } catch (error) { elements.reload.hidden = false; setStatus((error && error.message) || "Não foi possível restaurar o padrão.", "error"); }
    finally { state.saving = false; render(); }
  }
  function activateTab(tab) {
    if (busy()) return;
    var content = tab === "content"; document.querySelectorAll("[data-mov-admin-tab]").forEach(function (button) { var active = button.dataset.movAdminTab === tab; button.classList.toggle("on", active); button.setAttribute("aria-selected", String(active)); button.setAttribute("tabindex", active ? "0" : "-1"); });
    document.getElementById("movInvitesPane").hidden = content; elements.host.hidden = !content; if (content && !state.loaded) load();
  }
  function init() {
    elements.host = document.getElementById("movContentPane"); if (!elements.host) return; buildEditor();
    var tabs = Array.from(document.querySelectorAll("[data-mov-admin-tab]"));
    tabs.forEach(function (button, index) {
      button.setAttribute("tabindex", index === 0 ? "0" : "-1");
      button.addEventListener("click", function () { activateTab(button.dataset.movAdminTab); });
      button.addEventListener("keydown", function (event) {
        var destination = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
        if (destination < 0) return;
        event.preventDefault(); activateTab(tabs[destination].dataset.movAdminTab); tabs[destination].focus();
      });
    });
    window.addEventListener("beforeunload", function (event) { if (!state.dirty && !busy()) return; event.preventDefault(); event.returnValue = ""; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
}());
