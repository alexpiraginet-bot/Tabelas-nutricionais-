import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  delayRender,
  continueRender,
} from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

// Fontes da marca carregadas LOCALMENTE (o sandbox bloqueia fonts.gstatic.com).
const SERIF = "Fraunces";
const SANS = "DM Sans";
const fontHandle = delayRender("brand-fonts");
Promise.all([
  new FontFace(SERIF, `url(${staticFile("fonts/Fraunces.ttf")}) format('truetype')`).load(),
  new FontFace(SANS, `url(${staticFile("fonts/DMSans.ttf")}) format('truetype')`).load(),
])
  .then((fonts) => {
    fonts.forEach((f) => (document as unknown as { fonts: FontFaceSet }).fonts.add(f));
    continueRender(fontHandle);
  })
  .catch(() => continueRender(fontHandle));

const C = {
  bg: "#EFE9DB",
  surf: "#FBF8EE",
  ink: "#1F2317",
  pist: "#5C6B3A",
  gold: "#C4A882",
  soft: "#5A5E4E",
  line: "#D9D2BD",
};

// Entrada suave (fade + sobe), via spring — sem CSS animation.
const Rise: React.FC<{ delay?: number; y?: number; children: React.ReactNode }> = ({
  delay = 0,
  y = 46,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const ty = interpolate(s, [0, 1], [y, 0]);
  return <div style={{ opacity, transform: `translateY(${ty}px)`, width: "100%" }}>{children}</div>;
};

const Scene: React.FC<{ children: React.ReactNode; mark?: boolean }> = ({ children, mark = true }) => (
  <AbsoluteFill
    style={{
      background: C.bg,
      backgroundImage:
        "radial-gradient(900px 700px at 80% 0%, rgba(196,168,130,0.18), transparent 60%)",
      fontFamily: SANS,
      padding: mark ? "200px 80px 120px" : "120px 80px",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
    }}
  >
    {mark && (
      <Img
        src={staticFile("bento-logo.webp")}
        style={{ position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)", width: 104, height: 104, borderRadius: "50%" }}
      />
    )}
    {children}
  </AbsoluteFill>
);

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: SANS,
      fontSize: 30,
      letterSpacing: 10,
      textTransform: "uppercase",
      color: C.pist,
      fontWeight: 700,
    }}
  >
    {children}
  </div>
);

const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 78 }) => (
  <div
    style={{
      fontFamily: SERIF,
      fontSize: size,
      lineHeight: 1.05,
      color: C.ink,
      fontWeight: 600,
      letterSpacing: "-0.01em",
    }}
  >
    {children}
  </div>
);

const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: SANS, fontSize: 38, lineHeight: 1.4, color: C.soft, maxWidth: 760 }}>
    {children}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; solid?: boolean }> = ({ children, solid }) => (
  <span
    style={{
      display: "inline-block",
      margin: 9,
      padding: "16px 30px",
      borderRadius: 999,
      fontFamily: SANS,
      fontSize: 34,
      fontWeight: 600,
      background: solid ? C.pist : C.surf,
      color: solid ? "#fff" : C.pist,
      border: `2px solid ${solid ? C.pist : C.line}`,
    }}
  >
    {children}
  </span>
);

const Shot: React.FC<{ src: string; w: number; h: number }> = ({ src, w, h }) => (
  <Img
    src={staticFile(src)}
    style={{
      width: w,
      height: h,
      objectFit: "cover",
      borderRadius: 36,
      border: `3px solid ${C.gold}`,
      boxShadow: "0 40px 90px -40px rgba(31,35,23,0.55)",
    }}
  />
);

const gap = (n: number) => <div style={{ height: n }} />;

const SIntro: React.FC = () => (
  <Scene mark={false}>
    <Rise>
      <Img src={staticFile("bento-logo.webp")} style={{ width: 280, height: 280, borderRadius: "50%", margin: "0 auto" }} />
    </Rise>
    {gap(34)}
    <Rise delay={7}>
      <Tag>Bentô Gelatos</Tag>
    </Rise>
    {gap(22)}
    <Rise delay={13}>
      <Title size={86}>
        Sabor de sobremesa.
        <br />
        <span style={{ color: C.pist }}>Ficha de suplemento.</span>
      </Title>
    </Rise>
    {gap(28)}
    <Rise delay={20}>
      <Sub>Conheça tudo que dá pra fazer no nosso site 👇</Sub>
    </Rise>
  </Scene>
);

const STabelas: React.FC = () => (
  <Scene>
    <Rise>
      <Tag>Tabelas Nutricionais</Tag>
    </Rise>
    {gap(28)}
    <Rise delay={6}>
      <Shot src="portfolio/heros/snickers.jpg" w={520} h={720} />
    </Rise>
    {gap(34)}
    <Rise delay={12}>
      <Title>A ficha de cada sabor</Title>
    </Rise>
    {gap(20)}
    <Rise delay={18}>
      <div>
        <Pill>Proteína</Pill>
        <Pill>Sem açúcar adicionado</Pill>
        <Pill>Rótulo limpo</Pill>
      </div>
    </Rise>
  </Scene>
);

const SFerramentas: React.FC = () => (
  <Scene>
    <Rise>
      <Tag>Ferramentas no site</Tag>
    </Rise>
    {gap(30)}
    <Rise delay={6}>
      <Title size={84}>
        Monte seu pote,
        <br />
        faça o quiz
        <br />e veja o ranking
      </Title>
    </Rise>
    {gap(40)}
    <Rise delay={14}>
      <div>
        <Pill solid>Monte seu pote</Pill>
        <Pill solid>Quiz do sabor</Pill>
        <Pill solid>Mais proteicos</Pill>
      </div>
    </Rise>
    {gap(22)}
    <Rise delay={20}>
      <Sub>Gelatos, Bentôlé (picolés) e Shakes — tudo com a ficha completa.</Sub>
    </Rise>
  </Scene>
);

const SDelivery: React.FC = () => (
  <Scene>
    <Rise>
      <Tag>Delivery</Tag>
    </Rise>
    {gap(28)}
    <Rise delay={6}>
      <Shot src="portfolio/potes-140.jpg" w={820} h={560} />
    </Rise>
    {gap(34)}
    <Rise delay={12}>
      <Title>Peça no iFood</Title>
    </Rise>
    {gap(20)}
    <Rise delay={18}>
      <div>
        <Pill>Praia do Canto</Pill>
        <Pill>Jardim Camburi</Pill>
      </div>
    </Rise>
  </Scene>
);

const SEventos: React.FC = () => (
  <Scene>
    <Rise>
      <Tag>Eventos</Tag>
    </Rise>
    {gap(28)}
    <Rise delay={6}>
      <Shot src="eventos/carrinho-1.jpg" w={820} h={560} />
    </Rise>
    {gap(34)}
    <Rise delay={12}>
      <Title>Leve a Bentô pro seu evento</Title>
    </Rise>
    {gap(20)}
    <Rise delay={18}>
      <Sub>Casamentos, festas e corporativo — com orçamento na hora, direto no site.</Sub>
    </Rise>
  </Scene>
);

const SParceria: React.FC = () => (
  <Scene>
    <Rise>
      <Tag>Seja Bentô</Tag>
    </Rise>
    {gap(28)}
    <Rise delay={6}>
      <Shot src="parceria/estande.jpg" w={640} h={620} />
    </Rise>
    {gap(34)}
    <Rise delay={12}>
      <Title>Revenda na sua loja</Title>
    </Rise>
    {gap(20)}
    <Rise delay={18}>
      <Sub>Programa de parceria, revenda e franquia para o seu negócio.</Sub>
    </Rise>
  </Scene>
);

const SOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = spring({ frame: frame - 26, fps, config: { damping: 9, mass: 0.6 } });
  const scale = interpolate(pulse, [0, 1], [0.9, 1]);
  return (
    <Scene mark={false}>
      <Rise>
        <Img src={staticFile("bento-logo.webp")} style={{ width: 220, height: 220, borderRadius: "50%", margin: "0 auto" }} />
      </Rise>
      {gap(30)}
      <Rise delay={8}>
        <Title size={84}>Tudo em um só lugar</Title>
      </Rise>
      {gap(34)}
      <Rise delay={16}>
        <div
          style={{
            transform: `scale(${scale})`,
            display: "inline-block",
            background: C.pist,
            color: "#fff",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 52,
            padding: "26px 48px",
            borderRadius: 999,
          }}
        >
          bentogelateria.com
        </div>
      </Rise>
      {gap(26)}
      <Rise delay={24}>
        <Sub>Acesse agora 💛</Sub>
      </Rise>
    </Scene>
  );
};

export const BentoStory: React.FC = () => {
  const t = springTiming({ config: { damping: 200 }, durationInFrames: 15 });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={100}>
          <SIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={110}>
          <STabelas />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={slide({ direction: "from-right" })} />
        <TransitionSeries.Sequence durationInFrames={100}>
          <SFerramentas />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={slide({ direction: "from-right" })} />
        <TransitionSeries.Sequence durationInFrames={105}>
          <SDelivery />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={slide({ direction: "from-right" })} />
        <TransitionSeries.Sequence durationInFrames={100}>
          <SEventos />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={slide({ direction: "from-right" })} />
        <TransitionSeries.Sequence durationInFrames={95}>
          <SParceria />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={t} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={110}>
          <SOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
