// Tokens do protótipo — espelham os do site (src/shared.jsx) para o teste ser
// justo: o que muda aqui é o MOVIMENTO e o refino de UI, não a identidade.

export const T = {
  bg: "#F6F1E7", bgWarm: "#EFE7D6", surface: "#FFFDF7",
  ink: "#232619", inkSoft: "#5E6353",
  pistache: "#7C8C66", pistacheDark: "#46583A",
  border: "#E4DCC9", borderSoft: "#EFE8D8", accent: "#C9A24A",
};

/* ===== TOKENS DE MOVIMENTO =====
   Regra do guia: "motion-consistency" — duração e easing vivem em um lugar só,
   para tudo no produto ter o mesmo ritmo. Os números seguem o guia:
   · micro-interação 150–300 ms;
   · entrada com ease-out, saída com ease-in;
   · saída em ~60–70% da entrada ("exit-faster-than-enter");
   · mola no lugar de bezier quando o gesto é físico ("spring-physics"). */
export const M = {
  enter: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },   // ease-out expo
  exit: { duration: 0.21, ease: [0.7, 0, 0.84, 0] },    // 62% da entrada, ease-in
  press: { type: "spring", stiffness: 420, damping: 28, mass: 0.7 },
  glide: { type: "spring", stiffness: 210, damping: 26, mass: 0.9 },
  stagger: 0.04,                                        // 40 ms entre irmãos
};

// Escala tipográfica (12 14 16 18 24 32 44 60) — corpo nunca abaixo de 16 px
// no mobile, para o iOS não dar zoom automático e o texto ficar legível.
export const TYPE = {
  label: { fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase" },
  body: { fontSize: 16, lineHeight: 1.6 },
  bodySm: { fontSize: 14, lineHeight: 1.55 },
};

export const EASE_LABEL = "cubic-bezier(.16,1,.3,1)";
