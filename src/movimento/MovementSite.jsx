import { useEffect } from "react";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down.js";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import MapPin from "lucide-react/dist/esm/icons/map-pin.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Users from "lucide-react/dist/esm/icons/users.js";
import { getMovementExperience, isPersonalMovementMode } from "./movement-route.js";
import { useMovementInvite } from "./useMovementInvite.js";
import PartnerInterestFlow from "./PartnerInterestFlow.jsx";
import RsvpFlow from "./RsvpFlow.jsx";
import {
  EVENT,
  HERO_COPY,
  INFLUENCER_CHAPTERS,
  INFLUENCER_SCENES,
  PARTNER_PARTICIPATION_NOTE,
  PARTNER_SCENES,
  PARTNER_TIERS,
  SHIRT_CONCEPT,
} from "./movement-content.js";
import "./movement.css";

function Wordmark() {
  return <img className="mv-wordmark" src="/movimento/bento-wordmark-gold.png" alt="Bentô Gelatos" width="282" height="78"/>;
}

function MovementMeta({ audience, personal }) {
  useEffect(() => {
    const partner = audience === "partner";
    document.title = partner ? "Bentô Gelatos | Proposta de participação" : "Bentô Gelatos | 1º aniversário";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = personal
      ? "Convite pessoal para o primeiro aniversário da Bentô Gelatos."
      : partner
        ? "Uma proposta de participação no primeiro aniversário da Bentô Gelatos."
        : "Uma celebração do primeiro aniversário da Bentô Gelatos.";
  }, [audience, personal]);

  return null;
}

function Topbar({ audience }) {
  return <header className="mv-topbar"><a href="/movimento" aria-label="Bentô Gelatos — início"><Wordmark/></a><span>{audience === "partner" ? "Proposta de participação" : "Convite pessoal"}</span></header>;
}

function replaceTemplate(template, replacements) {
  return Object.entries(replacements).reduce((copy, [key, value]) => copy.replace(`{${key}}`, value), template);
}

function Hero({ audience, invite, personal }) {
  const copy = HERO_COPY[audience];
  const influencerName = invite?.recipientName || invite?.displayName || "";
  const companyName = invite?.companyName || invite?.displayName || "";
  const responsible = invite?.recipientName || "";
  const title = personal
    ? replaceTemplate(copy.title, audience === "partner" ? { Empresa: companyName, Responsável: responsible } : { Nome: influencerName })
    : copy.fallbackTitle;
  const kicker = personal
    ? replaceTemplate(copy.kicker, audience === "partner" ? { Empresa: companyName, Responsável: responsible } : { Nome: influencerName })
    : audience === "partner" ? "Primeiro aniversário Bentô Gelatos" : "1º aniversário Bentô Gelatos";
  const ctaTarget = personal ? "#responder" : "#como-responder";
  const showHeroCta = !(personal && audience === "influencer");
  const partnerPersonal = personal && audience === "partner";

  return <section className={`mv-hero mv-hero-v2 ${audience === "partner" ? "is-partner" : ""}`}>
    <img src="/movimento/experience-training.jpg" alt="Visualização conceitual de uma manhã de movimento no deck contemporâneo do Le Buffet Lounge" width="1920" height="1080" fetchPriority="high"/>
    <div className="mv-hero-wash"/>
    <div className="mv-hero-copy">
      <span className="mv-kicker">{kicker}</span>
      <h1>{title}</h1>
      <div className="mv-hero-event" aria-label={copy.factualLine}><div><small>{EVENT.dayLabel}</small><strong>12.09.2026</strong></div><p className="mv-hero-factual"><MapPin size={18}/>{copy.factualLine}</p></div>
      <p>{copy.text}</p>
      {showHeroCta && <a className="mv-hero-cta" href={ctaTarget} hidden={partnerPersonal} aria-hidden={partnerPersonal} tabIndex={partnerPersonal ? -1 : undefined}>{copy.cta}<ArrowDown size={18}/></a>}
    </div>
    <span className="mv-ai-disclosure">Visualização conceitual gerada por IA</span>
  </section>;
}

function LoadingSkeleton() {
  return <main className="mv-root" aria-busy="true" aria-label="Abrindo convite pessoal"><div className="mv-topbar"><Wordmark/><span>Convite pessoal</span></div><section className="mv-hero mv-hero-v2"><div className="mv-hero-wash"/><div className="mv-hero-copy"><span className="mv-kicker">Bentô Gelatos</span><h1>Preparando seu convite.</h1><p>Um instante.</p></div></section></main>;
}

function InvalidInvitation({ error }) {
  return <main className="mv-root"><MovementMeta audience="influencer" personal/><Topbar audience="influencer"/><section className="mv-final"><Wordmark/><span className="mv-kicker">Bentô Gelatos</span><h1>Este convite não pôde ser aberto.</h1><p>{error || "Convite inválido ou expirado."}</p><a className="mv-primary" href="/movimento">Conhecer a celebração<ArrowRight size={18}/></a></section></main>;
}

function EventFacts({ partner = false }) {
  return <div className="mv-event-facts-v2"><article><CalendarDays/><span>Quando</span><strong>{EVENT.dayLabel}<br/>{EVENT.dateLong}</strong></article><article><MapPin/><span>Onde</span><strong>{EVENT.location}</strong></article><article><Users/><span>Escala</span><strong>{EVENT.expectedGuests}</strong></article><article><Sparkles/><span>Experiência</span><strong>{EVENT.training}</strong></article><p>{partner ? "A participação começa por uma conversa de escopo." : "Nome, horário e operação final permanecem em confirmação."}</p></div>;
}

function ShirtSponsorOverlay() {
  return <div className="mv-shirt-sponsor-zone" aria-label={SHIRT_CONCEPT.sponsorArea}><span>Sua marca aqui</span><span>Sua marca aqui</span><span>Sua marca aqui</span><span>Sua marca aqui</span></div>;
}

function SceneSection({ scene, index, audience }) {
  const shirt = scene.id === "made-for-you" || scene.id === "memory";
  const product = scene.id === "co-creation";
  const partner = audience === "partner";
  const disclosure = product ? "Fotografia do acervo real Bentô." : shirt ? "Referência de camiseta aprovada por Alex; aplicações finais dependem de mockup." : "Visualização conceitual gerada por IA; operação em confirmação.";
  return <section className={`mv-scene ${index % 2 ? "is-reverse" : ""} ${shirt ? "is-shirt" : ""} ${product ? "is-product" : ""}`}><figure className="mv-scene-media"><img src={scene.image} alt={scene.alt} width={shirt ? "1254" : product ? "1448" : "1920"} height={shirt ? "1254" : product ? "1086" : "1080"} loading="lazy" decoding="async"/>{shirt && partner && <ShirtSponsorOverlay/>}</figure><div className="mv-scene-copy"><span className="mv-scene-number">{String(index + 1).padStart(2, "0")}</span><span className="mv-kicker">{scene.eyebrow}</span><h2>{scene.title}</h2><p>{scene.text}</p>{shirt && partner && <div className="mv-shirt-spec"><span>{SHIRT_CONCEPT.front}</span><span>{SHIRT_CONCEPT.back}</span><span>{SHIRT_CONCEPT.sponsorArea}</span></div>}<small className="mv-scene-disclosure">{disclosure}</small></div></section>;
}

function Intro({ partner = false }) {
  return <section className="mv-story-intro"><div className="mv-story-intro-copy"><span className="mv-kicker">{partner ? "Uma ideia por capítulo" : "Uma manhã em capítulos"}</span><h2>{partner ? <>Participação com<br/><em>função real.</em></> : <>O lugar que só<br/><em>você ocupa.</em></>}</h2><p>{partner ? "A apresentação mostra formas de participar da celebração com utilidade, cuidado e memória." : "Cada capítulo revela uma parte da manhã que vamos guardar na memória."}</p></div><EventFacts partner={partner}/></section>;
}

function InfluencerChapters() {
  return <section className="mv-annual"><div className="mv-section-head"><span className="mv-kicker">Primeiro aniversário</span><h2>Uma manhã para<br/><em>ser sentida.</em></h2></div><div className="mv-annual-grid">{INFLUENCER_CHAPTERS.map((chapter) => <article key={chapter.number}><span>{chapter.number}</span><h3>{chapter.title}</h3><p>{chapter.text}</p></article>)}</div></section>;
}

function PartnerTiers() {
  return <section id="participacoes" className="mv-partner-roles"><div className="mv-section-head"><span className="mv-kicker">Quatro participações</span><h2>Forma, função<br/><em>e assinatura.</em></h2></div><div className="mv-role-grid">{PARTNER_TIERS.map((tier, index) => <article key={tier.name}><span>{String(index + 1).padStart(2, "0")}</span><h3>{tier.name}</h3><ul>{tier.includes.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div><p className="mv-annual-note">{PARTNER_PARTICIPATION_NOTE}</p></section>;
}

function InvitationSheetHandoff({ audience, token, currentPartnerLead }) {
  if (audience === "influencer") return <section id="responder" className="mv-final" data-audience={audience} data-token={token ? "present" : "absent"}><Wordmark/><span className="mv-kicker">Convite pessoal</span><h2>Sua confirmação começa aqui.</h2><p>Você pode revisar, enviar e editar sua resposta nesta mesma superfície.</p></section>;
  return <section id="responder" className="mv-final" data-audience={audience} data-token={token ? "present" : "absent"}><Wordmark/><span className="mv-kicker">Convite pessoal</span><h2>Sua seleção será aberta aqui.</h2><p>A identidade e a seleção já resolvidas serão entregues na mesma superfície.</p><span hidden>{currentPartnerLead ? "interesse-resolvido" : "sem-resposta"}</span></section>;
}

function InfluencerStory({ personal, token }) {
  return <><Intro/><div id="jornada" className="mv-scene-reel">{INFLUENCER_SCENES.map((scene, index) => <SceneSection key={scene.id} scene={scene} index={index} audience="influencer"/>)}</div><InfluencerChapters/>{personal ? <InvitationSheetHandoff audience="influencer" token={token}/> : <section id="como-responder" className="mv-final"><Wordmark/><span className="mv-kicker">Seu próximo passo</span><h2>Abra o convite pessoal.</h2><p>A confirmação acontece somente pelo link individual enviado pela Bentô.</p><div className="mv-final-lock"><ShieldCheck size={18}/>Nenhum dado é coletado nesta apresentação.</div></section>}</>;
}

function PartnerStory({ personal, token, currentPartnerLead }) {
  return <><Intro partner/><div className="mv-scene-reel mv-scene-reel-partner">{PARTNER_SCENES.map((scene, index) => <SceneSection key={scene.id} scene={scene} index={index} audience="partner"/>)}</div><PartnerTiers/>{personal ? <InvitationSheetHandoff audience="partner" token={token} currentPartnerLead={currentPartnerLead}/> : <section id="como-responder" className="mv-final"><Wordmark/><span className="mv-kicker">Próximo passo</span><h2>Abra a proposta pessoal.</h2><p>A seleção de participação acontece somente pelo link enviado pela Bentô.</p><div className="mv-final-lock"><ShieldCheck size={18}/>Esta apresentação não coleta interesse anônimo.</div></section>}</>;
}

export default function MovementSite({ mode = "influencer", token = null }) {
  const { state, invite, currentRsvp, currentPartnerLead, error } = useMovementInvite(token);
  const generic = getMovementExperience(mode);
  const personal = isPersonalMovementMode(mode);
  if (personal && state === "loading") return <LoadingSkeleton/>;
  if (personal && state === "error") return <InvalidInvitation error={error}/>;
  const audience = personal ? invite?.audienceType : generic.story;
  if (!audience) return <InvalidInvitation error="Convite inválido ou expirado."/>;
  const hasPersistentRsvpCta = personal && audience === "influencer";
  const hasPersistentPartnerCta = personal && audience === "partner";
  return <div className={`mv-root${hasPersistentRsvpCta ? " has-rsvp-cta" : ""}`} data-partner-cta={hasPersistentPartnerCta || undefined}><MovementMeta audience={audience} personal={personal}/><Topbar audience={audience}/>{hasPersistentRsvpCta && <RsvpFlow token={token} invite={invite} currentRsvp={currentRsvp}/>} {hasPersistentPartnerCta && <PartnerInterestFlow token={token} invite={invite} currentPartnerLead={currentPartnerLead}/>}<Hero audience={audience} invite={invite} personal={personal}/>{audience === "partner" ? <PartnerStory personal={personal} token={token} currentPartnerLead={currentPartnerLead}/> : <InfluencerStory personal={personal} token={token}/>}<footer className="mv-footer"><span>© 2026 ABB Gelateria Ltda.</span><a href="/?privacidade">Privacidade</a></footer></div>;
}
