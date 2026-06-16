import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { C, SANS, Scene, Tag, Title, Sub, Pill, Shot, Rise, gap } from "./parts";

const S1: React.FC = () => (
  <Scene>
    <Rise><Tag>Delivery</Tag></Rise>
    {gap(28)}
    <Rise delay={6}><Shot src="portfolio/potes-140.jpg" w={840} h={560} /></Rise>
    {gap(34)}
    <Rise delay={12}><Title>Peça a Bentô sem sair de casa</Title></Rise>
    {gap(18)}
    <Rise delay={18}><Sub>Gelato proteico, picolés e shakes 👇</Sub></Rise>
  </Scene>
);

const S2: React.FC = () => (
  <Scene>
    <Rise><Tag>No iFood</Tag></Rise>
    {gap(28)}
    <Rise delay={6}>
      <div style={{ display: "inline-block", background: "#EA1D2C", color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 56, padding: "30px 56px", borderRadius: 20 }}>
        🛵 Pedir no iFood
      </div>
    </Rise>
    {gap(36)}
    <Rise delay={12}><Title>Duas lojas em Vitória</Title></Rise>
    {gap(22)}
    <Rise delay={18}>
      <div>
        <Pill>Praia do Canto</Pill>
        <Pill>Jardim Camburi</Pill>
      </div>
    </Rise>
  </Scene>
);

const S3: React.FC = () => (
  <Scene>
    <Rise><Shot src="portfolio/heros/snickers.jpg" w={520} h={700} /></Rise>
    {gap(34)}
    <Rise delay={10}><Title>Sobremesa que cabe na dieta</Title></Rise>
    {gap(20)}
    <Rise delay={16}>
      <div>
        <Pill solid>Sem açúcar adicionado</Pill>
        <Pill solid>Proteico</Pill>
        <Pill solid>Rótulo limpo</Pill>
      </div>
    </Rise>
  </Scene>
);

const S4: React.FC = () => (
  <Scene>
    <Rise><Tag>É só pedir</Tag></Rise>
    {gap(26)}
    <Rise delay={7}><Title size={86}>Toque no botão e peça agora</Title></Rise>
    {gap(34)}
    <Rise delay={15}>
      <div style={{ display: "inline-block", background: C.pist, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 52, padding: "26px 48px", borderRadius: 999 }}>
        bentogelateria.com
      </div>
    </Rise>
    {gap(24)}
    <Rise delay={22}><Sub>Encontra a loja mais perto e pede no iFood 💛</Sub></Rise>
  </Scene>
);

export const DeliveryStory: React.FC = () => {
  const t = springTiming({ config: { damping: 200 }, durationInFrames: 15 });
  const sr = () => slide({ direction: "from-right" });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={110}><S1 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={110}><S2 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={110}><S3 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={110}><S4 /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
