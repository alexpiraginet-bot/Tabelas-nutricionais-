import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { C, SANS, SERIF, Scene, Tag, Title, Sub, Pill, Rise, gap } from "./parts";

// Foto com leve zoom (Ken Burns) e moldura dourada — clima premium da marca.
const KenShot: React.FC<{ src: string; w: number; h: number; delay?: number }> = ({ src, w, h, delay = 0 }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame - delay, [0, 130], [1.05, 1.13], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ width: w, height: h, borderRadius: 36, overflow: "hidden", border: `3px solid ${C.gold}`, boxShadow: "0 40px 90px -40px rgba(31,35,23,0.55)" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
    </div>
  );
};

// Selo do formato (Impulso / Grab & Go / Destino) — cápsula com contorno dourado.
const FormatBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: "inline-block", fontFamily: SANS, fontSize: 30, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase", color: C.gold, border: `2px solid ${C.gold}`, borderRadius: 999, padding: "12px 28px" }}>
    {children}
  </span>
);

// 1 — Capa
const S1: React.FC = () => (
  <Scene>
    <Rise><Tag>Parcerias + Expansão</Tag></Rise>
    {gap(26)}
    <Rise delay={6}><Title size={90}>Programa de Franquias</Title></Rise>
    {gap(22)}
    <Rise delay={12}>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 44, color: C.gold }}>
        uma marca para chamar de sua
      </div>
    </Rise>
    {gap(26)}
    <Rise delay={18}><Sub>Gelato funcional premium em quiosques, aeroportos e pontos estratégicos.</Sub></Rise>
  </Scene>
);

// 2–4 — Modelos de unidade
const Modelo: React.FC<{ kicker: string; img: string; title: string; badge: string; desc: string }> = ({ kicker, img, title, badge, desc }) => (
  <Scene>
    <Rise><Tag>{kicker}</Tag></Rise>
    {gap(24)}
    <Rise delay={6}><KenShot src={img} w={920} h={560} /></Rise>
    {gap(30)}
    <Rise delay={12}><Title size={72}>{title}</Title></Rise>
    {gap(16)}
    <Rise delay={16}><FormatBadge>{badge}</FormatBadge></Rise>
    {gap(20)}
    <Rise delay={20}><Sub>{desc}</Sub></Rise>
  </Scene>
);

const S2: React.FC = () => (
  <Modelo kicker="Modelos de unidade" img="franquias/quiosque.webp" title="Quiosque · Shopping" badge="Impulso"
    desc="Footprint compacto e alto fluxo: vitrine de gelatos, picolés Bentôlé e cafeteria no coração das praças premium." />
);
const S3: React.FC = () => (
  <Modelo kicker="Modelos de unidade" img="franquias/aeroporto.webp" title="Aeroporto · Alto fluxo" badge="Grab & Go"
    desc="Formato grab-and-go para quem está em trânsito: picolés proteicos, cafeteria e bebidas. Margem e giro em fluxo intenso." />
);
const S4: React.FC = () => (
  <Modelo kicker="Modelos de unidade" img="franquias/loja-conceito.webp" title="Loja Conceito" badge="Destino"
    desc="Experiência completa de marca em bairros nobres: área de consumo, cafeteria e a linha integral. O ponto que vira destino." />
);

// 5 — Diferenciais
const S5: React.FC = () => (
  <Scene>
    <Rise><Tag>Por que Bentô</Tag></Rise>
    {gap(24)}
    <Rise delay={6}><Title size={74}>Vantagens para o franqueado</Title></Rise>
    {gap(30)}
    <Rise delay={12}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Pill solid>Marca premium</Pill>
        <Pill solid>Operação enxuta</Pill>
        <Pill solid>Categoria em alta</Pill>
        <Pill solid>Sem cozinha complexa</Pill>
        <Pill solid>Suporte completo</Pill>
      </div>
    </Rise>
    {gap(26)}
    <Rise delay={20}><Sub>Sem adição de açúcares · rico em proteína · rótulo limpo.</Sub></Rise>
  </Scene>
);

// 6 — CTA
const S6: React.FC = () => (
  <Scene>
    <Rise><Tag>Vamos conversar?</Tag></Rise>
    {gap(26)}
    <Rise delay={7}><Title size={82}>A próxima Bentô pode ser sua</Title></Rise>
    {gap(34)}
    <Rise delay={15}>
      <div style={{ display: "inline-block", background: C.pist, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 50, padding: "26px 48px", borderRadius: 999 }}>
        bentogelateria.com
      </div>
    </Rise>
    {gap(26)}
    <Rise delay={22}><Sub>WhatsApp (27) 99915-9995 · @bentogelateria</Sub></Rise>
  </Scene>
);

export const FranquiasStory: React.FC = () => {
  const t = springTiming({ config: { damping: 200 }, durationInFrames: 16 });
  const sr = () => slide({ direction: "from-right" });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}><S1 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={130}><S2 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={130}><S3 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={sr()} />
        <TransitionSeries.Sequence durationInFrames={130}><S4 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={120}><S5 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={140}><S6 /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
