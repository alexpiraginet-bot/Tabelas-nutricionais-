// Atalhos de pergunta da Bentô IA — chips da home e do painel vazio.
// Rótulo curto no chip, pergunta completa no envio (e girando na barra da
// home): assim a barra e os chips nunca repetem o mesmo texto lado a lado.
// Arquivo à parte para a home não carregar o painel inteiro só por eles.
import { MilkOff, Dumbbell, PartyPopper, Citrus, Activity, Store } from "lucide-react";

export const SUGESTOES = [
  { rotulo: "Sem lactose", pergunta: "Tenho intolerância à lactose. O que posso pedir?", Icone: MilkOff },
  { rotulo: "Mais proteína", pergunta: "Qual sabor tem mais proteína e menos calorias?", Icone: Dumbbell },
  // Sem número inventado: quem toca no chip não disse quantos convidados.
  { rotulo: "Evento", pergunta: "Como funciona o orçamento de evento?", Icone: PartyPopper },
  { rotulo: "Leve e refrescante", pergunta: "Quero algo leve e refrescante", Icone: Citrus },
  { rotulo: "Pós-treino", pergunta: "Picolé pós-treino: qual você indica?", Icone: Activity },
  { rotulo: "Lojas agora", pergunta: "Qual loja está aberta agora?", Icone: Store },
];
