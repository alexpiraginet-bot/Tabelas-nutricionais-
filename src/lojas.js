// Lojas físicas — FONTE ÚNICA de endereço, contato e horário.
//
// Por que este arquivo existe separado de shared.jsx: shared.jsx contém JSX, e
// arquivo com JSX não pode ser importado por um script Node puro. O horário
// precisava chegar ao painel admin (public/painel.html, HTML+JS sem build), e
// enquanto ele vivia lá dentro a única saída era copiar os horários na mão para
// o painel. Duas cópias do mesmo horário, divergindo em silêncio.
//
// Agora scripts/generate-painel-padroes.mjs importa DAQUI e escreve o padrão
// que o painel carrega. O painel não tem mais horário escrito: recebe o que
// está aqui. shared.jsx reexporta LOJAS, então nada muda para o site.
//
// dias: 0=Dom … 6=Sáb · [abre, fecha] em horas (24h) · null = fechado.
// Endereços = os mesmos do JSON-LD de SEO local no index.html (manter em
// sincronia ao mudar).
export const LOJAS = [
  {id:"praia-do-canto",nome:"Praia do Canto",bairro:"Praia do Canto · Vitória-ES",
   endereco:"R. Joaquim Lírio, 455, Quiosque 02 — Praia do Canto, Vitória – ES, 29055-460",
   lat:-20.2947,lng:-40.2925,zap:"5527999159995",zapLabel:"(27) 99915-9995",
   dias:{0:[12,17],1:[10,19],2:[8,20],3:[8,20],4:[8,20],5:[8,20],6:[10,20]},
   resumo:[["Seg","10h–19h"],["Ter a Sex","08h–20h"],["Sáb","10h–20h"],["Dom","12h–17h"]],
   ifood:"https://www.ifood.com.br/delivery/vitoria-es/bento-gelatos-saudaveis-praia-do-canto/fcfff152-838e-4743-88f3-0e18eff6b867?utm_medium=share"},
  {id:"jardim-camburi",nome:"Jardim Camburi",bairro:"Jardim Camburi · Vitória-ES",
   endereco:"Rua Silvino Grecco, 800, Loja 17 — Jardim Camburi, Vitória – ES",
   lat:-20.2547,lng:-40.2670,zap:"5527999159995",zapLabel:"(27) 99915-9995",
   dias:{0:[12,17],1:null,2:[11,19],3:[11,19],4:[11,19],5:[11,19],6:[12,20]},
   resumo:[["Seg","fechado"],["Ter a Sex","11h–19h"],["Sáb","12h–20h"],["Dom","12h–17h"]],
   ifood:"https://www.ifood.com.br/delivery/vitoria-es/bento-gelatos-jardim-camburi/e654e388-ebc8-480c-bb0d-7d0c31f6cc3a?utm_medium=share"},
];

// Link "Ver no Google Maps": busca por nome + endereço completo — determinística
// (o endereço identifica o ponto) e abre a FICHA da loja (fotos, avaliações,
// horários), que coordenadas puras não abrem. A rota ("Como chegar") usa
// lat/lng exatos direto na dir API.
for (const l of LOJAS) l.maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Bentô Gelatos, " + l.endereco);
