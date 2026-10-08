// Regras de preço e formato dos EVENTOS — fonte única.
//
// Por que mora num arquivo próprio: estas regras viviam dentro do modals.jsx, e
// arquivo com JSX não pode ser importado por um script Node nem por uma função
// da API. O teste (scripts/test-eventos.mjs) precisava fatiar o modals.jsx por
// marcadores de texto para chegar aqui, e a IA do site (api/ia.js) não teria
// como usar o mesmo cálculo — ia acabar copiando preço e faixa, e a cópia
// divergiria em silêncio no primeiro reajuste. Agora o modal, o teste e a IA
// importam DAQUI. Mexer em preço, faixa ou acréscimo continua mudando site,
// orçamento, WhatsApp e contrato de uma vez — e `npm run test:eventos` trava.
//
// Sem JSX e sem nada do navegador neste arquivo: ele roda no servidor também.

// A personalização da estrutura tem nome diferente conforme o formato — não dá
// para oferecer "carrinho personalizado" a quem contratou o balcão. O PREÇO é o
// mesmo, e os dois rótulos continuam valendo para sempre: orçamento antigo
// (link salvo, lead no painel, PDF impresso) carrega o texto velho, e comparar
// por igualdade faria o item sumir da conta — preço menor, sem ninguém notar.
export const EV_PERS_ESTRUTURA={carrinho:"Carrinho personalizado",balcao:"Balcão personalizado",caixa:null};
export const EV_ESTRUTURA=(pers)=>pers.includes("Carrinho personalizado")||pers.includes("Balcão personalizado");
export const EV_PERS_BASE=["Potinhos ou rótulos personalizados","Outra personalização"];
// Opções visíveis para um formato: a caixa térmica não tem estrutura a decorar.
export const EV_PERS_DE=(formatoId)=>{const e=EV_PERS_ESTRUTURA[formatoId];return e?[e,...EV_PERS_BASE]:[...EV_PERS_BASE];};
// O rótulo mudou de nome. Orçamento antigo — link salvo, lead no painel, PDF
// impresso — carrega o texto velho, e comparar por igualdade faria o item
// simplesmente sumir da conta: preço menor, sem ninguém perceber. Por isso os
// dois nomes valem.
export const EV_POTINHOS=(pers)=>pers.includes("Potinhos ou rótulos personalizados")||pers.includes("Potinhos personalizados");

export const EV_KM_RATE=2.0;     // R$/km rodado (combustível + deslocamento + tempo, média)

export const EV_ROTA=1.3;        // fator linha reta → rota real

export const EV_POTINHO=0.5;     // R$ por potinho personalizado (2 por pessoa)

export const EV_CARRINHO=200;    // R$ personalização da estrutura (carrinho ou balcão)

// Personalização custa mais em quantidade pequena: tiragem curta de rótulo e
// montagem sob medida têm custo fixo que se dilui em evento grande. Regra do
// dono: cerca de 20% a mais abaixo de 100 convidados; a partir daí, preço
// cheio. É régua de QUANTIDADE, não de formato — o carrinho começa em 80 e
// ainda paga o acréscimo entre 80 e 99. Vale para potinhos/rótulos e para a
// estrutura personalizada.
export const EV_PERS_ACRESCIMO=0.20;
export const EV_PERS_GRANDE=100;
export const EV_PERS_FATOR=(n)=>n<EV_PERS_GRANDE?1+EV_PERS_ACRESCIMO:1;

// Subir de estrutura é UMA transição: balcão -> carrinho. O carrinho só é
// alcançável acima de 80 convidados ou por conflito de data — quando o balcão
// daquele dia já está reservado, a equipe joga o evento para o carrinho e cobra
// logística extra. Acima do carrinho não há nada, e a caixa térmica não é
// "estrutura abaixo" do balcão: entre 30 e 60 convidados os dois cabem de
// propósito, porque ali a diferença é de serviço (sem atendente × promotora
// servindo na hora), e isso o cliente escolhe. O site não decide o upgrade (a
// reserva no painel é por data, não por estrutura); ele só avisa a regra e o
// valor quando detecta a data ocupada, e só para quem está no balcão — a
// única posição de onde se sobe.
export const EV_UPGRADE_LOGISTICA=200;
export const EV_TEM_UPGRADE=(formatoId)=>formatoId==="balcao";

/* ---------- os três formatos de evento ----------
   A estrutura muda, o preço por pessoa muda junto, e o que vai no copo muda com
   ela: onde não tem atendente, o produto sai pré-envasado e selado da fábrica.
   Preço por pessoa é UM SÓ, R$ 27, em qualquer formato e quantidade — decisão
   do dono. O que muda entre formatos é equipe e forma de entrega; logística,
   horas de promotora e personalização são linhas à parte. Mexer aqui muda site,
   orçamento, WhatsApp e contrato de uma vez só. */
export const EV_PRECO_PESSOA=27;
export const EV_FORMATOS=[
  {
    id:"caixa", nome:"Caixa térmica", sub:"Sem atendente",
    min:20, max:60, preco:EV_PRECO_PESSOA, equipe:0,
    img:"/eventos/caixa-1.jpg",
    alt:"Caixa térmica Bentô aberta, com potinhos e picolés sobre gelo",
    resumo:"A caixa chega montada e gelada. Seus convidados se servem sozinhos, no ritmo da festa.",
    inclui:["Potinhos selados e picolés, prontos para servir","Caixa térmica que segura o gelo durante o evento","Entrega e recolhimento da caixa"],
    servico:"Sem atendente · itens pré-envasados e selados",
    prod:"envasado",
  },
  {
    id:"balcao", nome:"Balcão Bentô", sub:"Eventos menores",
    min:30, max:80, preco:EV_PRECO_PESSOA, equipe:1,
    img:"/eventos/balcao-1.jpg",
    alt:"Balcão Bentô em madeira com logo iluminado, freezer embutido e guarda-sol",
    resumo:"Nosso balcão novo, feito para festas que não comportam o carrinho inteiro — mesma presença, menos espaço.",
    inclui:["Balcão com freezer e iluminação própria","1 promotora uniformizada e treinada","Gelato servido na hora, da cuba — ou em potinhos selados"],
    servico:"1 promotora · gelato servido na hora ou em potinhos",
    // Tem promotora e cuba: o gelato é servido na hora, então o rendimento é em
    // litros, como no carrinho. Potinho selado é alternativa, não a regra.
    prod:"servido",
  },
  {
    id:"carrinho", nome:"Carrinho Bentô", sub:"Estrutura completa",
    // 81, não 80: o balcão vai ATÉ 80 inclusive. Com os dois cabendo em 80, a
    // tela preservava o carrinho de quem abriu no padrão de 150 e trocou para
    // 80 — e o cliente escolhia a estrutura maior sem conflito de data. Achado
    // do Codex no PR #241.
    min:81, max:null, preco:EV_PRECO_PESSOA, equipe:1,
    img:"/eventos/carrinho-1.jpg",
    alt:"Carrinho de gelateria Bentô montado em casamento",
    resumo:"A estrutura completa: gelato servido na hora, na casquinha ou no copo, com a equipe atendendo a fila.",
    inclui:["Carrinho de gelateria completo","Gelato servido na hora + picolés","Promotoras uniformizadas e treinadas"],
    servico:"Gelato servido na hora · promotoras",
    prod:"servido",
  },
];
export const EV_FMT=(id)=>EV_FORMATOS.find(f=>f.id===id)||EV_FORMATOS[2];
export const EV_CABE=(f,n)=>n>=f.min&&(f.max==null||n<=f.max);
// Menor número de convidados que o orçamento online atende — abaixo disto é
// conversa no WhatsApp, não formulário.
export const EV_MIN=Math.min(...EV_FORMATOS.map(f=>f.min));
// Melhor formato para um número de convidados: o primeiro que couber. A ordem
// do array é do menor para o maior, então 40 pessoas cai na caixa e 150 no
// carrinho sem precisar de tabela à parte.
export const EV_SUGERE=(n)=>(EV_FORMATOS.find(f=>EV_CABE(f,n))||EV_FORMATOS[EV_FORMATOS.length-1]).id;

export function calcEvento(g,tipo="Mix (gelatos + picolés)",pers=[],km=null,formatoId="carrinho"){
  const n=Math.max(1,Number(g)||0);
  const f=EV_FMT(formatoId);
  // O rendimento muda com a estrutura. No carrinho o gelato é servido na hora e
  // a conta é em litros; na caixa e no balcão ele sai em potinho selado, e
  // prometer "litros" ali seria descrever um serviço que não existe nesse
  // formato.
  let rend;
  if(f.prod==="servido"){
    if(tipo==="Gelatos") rend=`~${Math.round(n*0.15)} L de gelato · 150 ml/pessoa`;
    else if(tipo==="Picolés") rend=`~${n*2} picolés · 2 por pessoa`;
    else rend=`~${Math.round(n*0.075)} L de gelato + ~${n} picolés · 1 + 1 por pessoa`;
  }else{
    if(tipo==="Gelatos") rend=`~${n*2} potinhos selados · 2 por pessoa`;
    else if(tipo==="Picolés") rend=`~${n*2} picolés · 2 por pessoa`;
    // Mix na caixa (decisão do dono): 1 picolé por pessoa e 1 potinho a cada
    // 2 — 30 convidados levam 30 picolés + 15 potinhos, não 30 + 30. E o
    // sortimento é fechado: 1 sabor de gelato e até 2 de picolé.
    else rend=`~${n} picolés (até 2 sabores) + ~${Math.ceil(n/2)} potinhos selados (1 sabor de gelato) · 1 picolé por pessoa e 1 potinho a cada 2`;
  }
  const base=n*f.preco;
  // Arredondado em reais inteiros: com o acréscimo o unitário vira R$ 0,60 e
  // 2 por pessoa daria centavos quebrados no contrato.
  const persFator=EV_PERS_FATOR(n);
  const potinhos=EV_POTINHOS(pers)?Math.round(n*2*EV_POTINHO*persFator):0;   // 2 por pessoa
  const estrutura=EV_ESTRUTURA(pers)?Math.round(EV_CARRINHO*persFator):0;
  const persACombinar=pers.filter(p=>!EV_POTINHOS([p])&&!EV_ESTRUTURA([p]));
  const logistica=km!=null?Math.round(km*2*EV_KM_RATE):null;              // ida e volta × R$/km
  // Duas promotoras só fazem sentido onde existe fila para atender. A caixa
  // térmica não tem equipe nenhuma — é isso que a torna mais barata.
  const promotoras=f.equipe===0?0:(f.id==="carrinho"&&n>300?2:f.equipe);
  return{
    formato:f.id, formatoNome:f.nome, preco:f.preco, servico:f.servico,
    persFator, persUnit:Math.round(EV_POTINHO*persFator*100)/100,
    // Até 6 sabores (150+), proporcional abaixo. O piso muda com o formato: a
    // fórmula foi feita quando o evento mínimo era 70 pessoas, e com o mínimo em
    // 20 ela passou a devolver "até 2 sabores" o tempo todo. Onde o produto sai
    // pré-envasado o sabor não depende da máquina no local — é só variar o que
    // se põe na caixa —, então ali o piso é 3.
    sabores:n>=150?6:Math.max(f.prod==="servido"?2:3,Math.round(n*6/150)),
    rend,
    promotoras,
    base,potinhos,carrinho:estrutura,persACombinar,logistica,
    total:base+potinhos+estrutura+(logistica||0),
    corporativo:n>300,
  };
}
