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

// Fontes da marca carregadas LOCALMENTE (o sandbox bloqueia fonts.gstatic.com no render).
export const SERIF = "Fraunces";
export const SANS = "DM Sans";
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

export const C = {
  bg: "#EFE9DB",
  surf: "#FBF8EE",
  ink: "#1F2317",
  pist: "#5C6B3A",
  gold: "#C4A882",
  soft: "#5A5E4E",
  line: "#D9D2BD",
};

export const Rise: React.FC<{ delay?: number; y?: number; children: React.ReactNode }> = ({
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

export const Scene: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: C.bg,
      backgroundImage: "radial-gradient(900px 700px at 80% 0%, rgba(196,168,130,0.18), transparent 60%)",
      fontFamily: SANS,
      padding: "120px 80px",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

export const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: SANS, fontSize: 30, letterSpacing: 10, textTransform: "uppercase", color: C.pist, fontWeight: 700 }}>
    {children}
  </div>
);

export const Title: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 78 }) => (
  <div style={{ fontFamily: SERIF, fontSize: size, lineHeight: 1.05, color: C.ink, fontWeight: 600, letterSpacing: "-0.01em" }}>
    {children}
  </div>
);

export const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: SANS, fontSize: 38, lineHeight: 1.4, color: C.soft, maxWidth: 780, margin: "0 auto" }}>{children}</div>
);

export const Pill: React.FC<{ children: React.ReactNode; solid?: boolean }> = ({ children, solid }) => (
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

export const Shot: React.FC<{ src: string; w: number; h: number }> = ({ src, w, h }) => (
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

// Número que conta até o valor, formatado em BRL.
export const Money: React.FC<{ to: number; delay?: number; durationSec?: number }> = ({ to, delay = 0, durationSec = 1.1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame - delay, [0, fps * durationSec], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 1 - Math.pow(1 - p, 3);
  const v = Math.round(to * eased);
  return <>{v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</>;
};

// Selo de passo numerado.
export const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <div
    style={{
      width: 92,
      height: 92,
      borderRadius: "50%",
      background: C.pist,
      color: "#fff",
      fontFamily: SERIF,
      fontWeight: 600,
      fontSize: 52,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto",
    }}
  >
    {n}
  </div>
);

export const gap = (n: number) => <div style={{ height: n }} />;
<<<<<<< HEAD

// Contador genérico (até "to"), com casas decimais opcionais.
export const Num: React.FC<{ to: number; delay?: number; dur?: number; dec?: number }> = ({ to, delay = 0, dur = 1, dec = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame - delay, [0, fps * dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 1 - Math.pow(1 - p, 3);
  const v = to * eased;
  return <>{v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })}</>;
};
=======
>>>>>>> origin/main
