import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { C, SERIF, SANS, Scene, Tag, Title, Sub, Pill, Shot, Money, StepBadge, Rise, gap } from "./parts";

const Field: React.FC<{ label: string; value: string; delay: number }> = ({ label, value, delay }) => (
  <Rise delay={delay} y={26}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        background: C.surf,
        border: `2px solid ${C.line}`,
        borderRadius: 18,
        padding: "22px 30px",
        margin: "12px auto",
        width: 760,
      }}
    >
      <span style={{ fontFamily: SANS, fontSize: 30, color: C.soft }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: 34, fontWeight: 700, color: C.ink }}>{value}</span>
    </div>
  </Rise>
);

const S1: React.FC = () => (
  <Scene>
    <Rise><Tag>Eventos · Orçamento</Tag></Rise>
    {gap(26)}
    <Rise delay={6}><Shot src="eventos/carrinho-1.jpg" w={820} h={540} /></Rise>
    {gap(34)}
    <Rise delay={12}><Title>Faça o orçamento do seu evento</Title></Rise>
    {gap(18)}
    <Rise delay={18}><Sub>Em segundos, no nosso site 👇</Sub></Rise>
  </Scene>
);

const S2: React.FC = () => (
  <Scene>
    <Rise><StepBadge n={1} /></Rise>
    {gap(34)}
    <Rise delay={7}><Title>Abra “Eventos” no site</Title></Rise>
    {gap(40)}
    <Rise delay={14}>
      <div style={{ display: "inline-block", background: "#A9831C", color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 40, padding: "26px 46px", borderRadius: 18 }}>
        🎉 Nos leve para seu evento
      </div>
    </Rise>
    {gap(24)}
    <Rise delay={20}><Sub>Ou toque no botão deste story.</Sub></Rise>
  </Scene>
);

const S3: React.FC = () => (
  <Scene>
    <Rise><StepBadge n={2} /></Rise>
    {gap(28)}
    <Rise delay={6}><Title>Conte sobre o evento</Title></Rise>
    {gap(26)}
    <Field label="Data" value="12/09/2026" delay={12} />
    <Field label="Horário previsto" value="19:00" delay={18} />
    <Field label="Local" value="Vitória — ES" delay={24} />
    <Field label="Convidados" value="70" delay={30} />
  </Scene>
);

const S4: React.FC = () => (
  <Scene>
    <Rise><StepBadge n={3} /></Rise>
    {gap(28)}
    <Rise delay={6}><Title>Escolha os produtos</Title></Rise>
    {gap(34)}
    <Rise delay={12}>
      <div>
        <Pill solid>Gelatos</Pill>
        <Pill solid>Picolés</Pill>
        <Pill solid>Mix</Pill>
      </div>
    </Rise>
    {gap(16)}
    <Rise delay={18}>
      <div>
        <Pill>Carrinho personalizado</Pill>
        <Pill>Potinhos personalizados</Pill>
      </div>
    </Rise>
  </Scene>
);

const S5: React.FC = () => (
  <Scene>
    <Rise><StepBadge n={4} /></Rise>
    {gap(28)}
    <Rise delay={6}><Title>Veja o total na hora</Title></Rise>
    {gap(36)}
    <Rise delay={12}>
      <div style={{ background: C.ink, borderRadius: 30, padding: "46px 52px", width: 780, margin: "0 auto" }}>
        <div style={{ fontFamily: SANS, fontSize: 28, letterSpacing: 4, textTransform: "uppercase", color: C.gold }}>Seu orçamento</div>
        <div style={{ fontFamily: SERIF, fontSize: 130, color: "#fff", fontWeight: 600, marginTop: 8, lineHeight: 1 }}>
          <Money to={1890} delay={16} />
        </div>
        <div style={{ fontFamily: SANS, fontSize: 30, color: "#B8C97A", marginTop: 12 }}>valor de referência · a partir de 70 convidados</div>
      </div>
    </Rise>
  </Scene>
);

const S6: React.FC = () => (
  <Scene>
    <Rise><StepBadge n={5} /></Rise>
    {gap(28)}
    <Rise delay={6}><Title>Feche e receba o contrato</Title></Rise>
    {gap(34)}
    <Rise delay={12}>
      <div style={{ fontSize: 150 }}>📄</div>
    </Rise>
    {gap(8)}
    <Rise delay={18}><Sub>A gente retorna com o contrato pra assinatura online.</Sub></Rise>
  </Scene>
);

const S7: React.FC = () => (
  <Scene>
    <Rise><Tag>Pronto!</Tag></Rise>
    {gap(24)}
    <Rise delay={7}><Title size={84}>Toque no botão e faça o seu</Title></Rise>
    {gap(34)}
    <Rise delay={15}>
      <div style={{ display: "inline-block", background: C.pist, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 52, padding: "26px 48px", borderRadius: 999 }}>
        bentogelateria.com
      </div>
    </Rise>
    {gap(24)}
    <Rise delay={22}><Sub>Orçamento na hora, sem compromisso 💛</Sub></Rise>
  </Scene>
);

export const EventosStory: React.FC = () => {
  const t = springTiming({ config: { damping: 200 }, durationInFrames: 15 });
  const sr = () => slide({ direction: "from-right" });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={100}><S1 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={90}><S2 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={130}><S3 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={95}><S4 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={115}><S5 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={95}><S6 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={110}><S7 /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
