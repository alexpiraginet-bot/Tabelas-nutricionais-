import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { C, SERIF, SANS, Scene, Tag, Title, Sub, Pill, Shot, Num, Rise, gap } from "./parts";

// Duas barras verticais comparando Bentô x sorvete comum para uma métrica.
const Bars: React.FC<{
  bento: number;
  comum: number;
  unit: string;
  dec?: number;
  bentoWins?: boolean;
}> = ({ bento, comum, unit, dec = 1, bentoWins }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(bento, comum) || 1;
  const H = 640;
  const grow = (v: number, delay: number) =>
    interpolate(frame - delay, [0, fps * 0.9], [0, (v / max) * H], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const col = (
    name: string,
    val: number,
    h: number,
    fill: string,
    delay: number,
    win: boolean
  ) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 320 }}>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 64,
          fontWeight: 600,
          color: win ? C.pist : C.soft,
          marginBottom: 14,
        }}
      >
        <Num to={val} delay={delay} dec={dec} />
        <span style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600 }}>{unit}</span>
      </div>
      <div style={{ height: H, display: "flex", alignItems: "flex-end" }}>
        <div style={{ width: 190, height: Math.max(8, h), background: fill, borderRadius: "20px 20px 0 0" }} />
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 32,
          fontWeight: 700,
          color: win ? C.pist : C.soft,
          marginTop: 18,
        }}
      >
        {name}
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 70, justifyContent: "center", alignItems: "flex-end" }}>
      {col("Bentô", bento, grow(bento, 8), "linear-gradient(180deg,#8FA050,#5C6B3A)", 8, !!bentoWins)}
      {col("Comum", comum, grow(comum, 8), "#C9A98F", 8, !bentoWins)}
    </div>
  );
};

const Metric: React.FC<{
  tag: string;
  title: string;
  bento: number;
  comum: number;
  unit: string;
  dec?: number;
  bentoWins?: boolean;
  note: string;
}> = ({ tag, title, bento, comum, unit, dec, bentoWins, note }) => (
  <Scene>
    <Rise><Tag>{tag}</Tag></Rise>
    {gap(12)}
    <Rise delay={4}><Title size={70}>{title}</Title></Rise>
    {gap(40)}
    <Rise delay={8}>
      <Bars bento={bento} comum={comum} unit={unit} dec={dec} bentoWins={bentoWins} />
    </Rise>
    {gap(34)}
    <Rise delay={18}>
      <div
        style={{
          display: "inline-block",
          background: C.pist,
          color: "#fff",
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 40,
          padding: "20px 38px",
          borderRadius: 999,
        }}
      >
        {note}
      </div>
    </Rise>
  </Scene>
);

// Calorias como fato positivo (porção real), sem barra de comparação.
const SCal: React.FC = () => (
  <Scene>
    <Rise><Tag>Calorias / porção</Tag></Rise>
    {gap(20)}
    <Rise delay={5}><Title size={74}>Leve de verdade</Title></Rise>
    {gap(46)}
    <Rise delay={10}>
      <div style={{ fontFamily: SERIF, fontWeight: 600, color: C.pist, fontSize: 200, lineHeight: 1 }}>
        <Num to={130} delay={10} dec={0} />
        <span style={{ fontFamily: SANS, fontSize: 64, fontWeight: 700 }}> kcal</span>
      </div>
    </Rise>
    {gap(18)}
    <Rise delay={16}><Sub>na porção de 60 g do nosso Pistache</Sub></Rise>
    {gap(34)}
    <Rise delay={22}>
      <div style={{ display: "inline-block", background: C.pist, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 40, padding: "20px 38px", borderRadius: 999 }}>
        sem adição de açúcares · 10 g de proteína
      </div>
    </Rise>
  </Scene>
);

const SHook: React.FC = () => (
  <Scene>
    <Rise><Tag>Sem culpa</Tag></Rise>
    {gap(26)}
    <Rise delay={6}><Shot src="portfolio/heros/pistache-choco-branco.jpg" w={500} h={680} /></Rise>
    {gap(32)}
    <Rise delay={12}><Title size={82}>Bentô x sorvete comum</Title></Rise>
    {gap(18)}
    <Rise delay={18}><Sub>Nosso Pistache, por porção 👇</Sub></Rise>
  </Scene>
);

const SFim: React.FC = () => (
  <Scene>
    <Rise><Title size={86}>Sobremesa que cabe na sua meta</Title></Rise>
    {gap(34)}
    <Rise delay={8}>
      <div>
        <Pill solid>Sem adição de açúcares</Pill>
        <Pill solid>Rico em proteína</Pill>
        <Pill solid>Rótulo limpo</Pill>
      </div>
    </Rise>
    {gap(30)}
    <Rise delay={16}>
      <div style={{ display: "inline-block", background: C.ink, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 48, padding: "24px 46px", borderRadius: 999 }}>
        bentogelateria.com
      </div>
    </Rise>
    {gap(20)}
    <Rise delay={22}><Sub>Veja a ficha de cada sabor no site 💛</Sub></Rise>
  </Scene>
);

export const SemCulpaStory: React.FC = () => {
  const t = springTiming({ config: { damping: 200 }, durationInFrames: 15 });
  const sr = () => slide({ direction: "from-right" });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={95}><SHook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Metric tag="Açúcar adicionado / porção" title="Sem adição de açúcares" bento={0} comum={13} unit="g" dec={0} bentoWins note="só o natural do leite/fruta" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Metric tag="Proteína / porção" title="Quase 5× mais proteína" bento={10} comum={2.1} unit="g" dec={1} bentoWins note="Whey WPH (alta absorção)" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={120}>
          <SCal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={105}><SFim /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
