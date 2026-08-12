import { useEffect } from "react";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down.js";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Check from "lucide-react/dist/esm/icons/check.js";
import MapPin from "lucide-react/dist/esm/icons/map-pin.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Users from "lucide-react/dist/esm/icons/users.js";
import PartnerInterestFlow from "./PartnerInterestFlow.jsx";
import RsvpFlow from "./RsvpFlow.jsx";
import { getMovementExperience } from "./movement-route.js";
import {
  EVENT,
  INFLUENCER_CHAPTERS,
  INFLUENCER_SCENES,
  PARTNER_NEEDS,
  PARTNER_ROLES,
  PARTNER_SCENES,
  SHIRT_CONCEPT,
} from "./movement-content.js";
import "./movement.css";

function Wordmark() {
  return <img className="mv-wordmark" src="/movimento/bento-wordmark-gold.png" alt="Bentô Gelatos" width="282" height="78"/>;
}

function MovementMeta({ mode }) {
  useEffect(() => {
    const partner = mode === "partner";
    const invite = mode === "invite";
    const title = partner ? "Bentô em Movimento | Parcerias" : invite ? "Bentô em Movimento | Confirmação" : "Bentô em Movimento | Convite 2026";
    const description = partner
      ? `Sua marca no Bentô em Movimento: ${EVENT.dateLong}, no Le Buffet Lounge.`
      : invite
        ? `Confirme presença, roupa de treino e acompanhantes para ${EVENT.dateLong}.`
        : `${EVENT.dateLong}, no Le Buffet Lounge: o primeiro capítulo de uma jornada Bentô.`;

    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [mode]);

  return null;
}

function Topbar({ mode }) {
  return (
    <header className="mv-topbar">
      <a href="/movimento" aria-label="Bentô em Movimento — início"><Wordmark/></a>
      <span>{mode === "partner" ? "Proposta para parceiros" : "Convite para influenciadoras"}</span>
    </header>
  );
}

function Hero({ mode }) {
  const partner = mode === "partner";
  return (
    <section className={`mv-hero mv-hero-v2 ${partner ? "is-partner" : ""}`}>
      <img
        src="/movimento/experience-training.jpg"
        alt="Visualização conceitual do aulão funcional Bentô em Movimento no deck atual do Le Buffet Lounge"
        width="1920"
        height="1080"
        fetchPriority="high"
      />
      <div className="mv-hero-wash"/>
      <div className="mv-hero-copy">
        <span className="mv-kicker">Bentô em Movimento · primeira edição</span>
        <h1>{partner ? <>Sua marca pode<br/><em>viver este capítulo.</em></> : <>Uma manhã que<br/><em>continua por um ano.</em></>}</h1>
        <div className="mv-hero-event" aria-label={`${EVENT.dayLabel}, ${EVENT.dateLong}, ${EVENT.location}`}>
          <div><small>{EVENT.dayLabel}</small><strong>12.09.2026</strong></div>
          <p><MapPin size={18}/>{EVENT.location}</p>
        </div>
        <p>{partner
          ? `Movimento, hospitalidade e conteúdo em um encontro pensado para ${EVENT.expectedGuests.toLowerCase()}.`
          : `Aulão funcional, hospitalidade, família e conexão para ${EVENT.expectedGuests.toLowerCase()}.`}</p>
        <a className="mv-hero-cta" href={partner ? "#experiencias" : "#jornada"}>
          {partner ? "Visualizar minha marca" : "Viver a experiência"}<ArrowDown size={18}/>
        </a>
      </div>
      <span className="mv-ai-disclosure">Visualização conceitual gerada por IA · espaço atual sem coqueiros</span>
    </section>
  );
}

function EventFacts({ partner = false }) {
  return (
    <div className="mv-event-facts-v2">
      <article><CalendarDays/><span>Quando</span><strong>{EVENT.dayLabel}<br/>{EVENT.dateLong}</strong></article>
      <article><MapPin/><span>Onde</span><strong>{EVENT.location}</strong></article>
      <article><Users/><span>Escala</span><strong>{EVENT.expectedGuests}</strong></article>
      <article><Sparkles/><span>Experiência</span><strong>{EVENT.training}</strong></article>
      <p>{partner
        ? "Horário, personal e operação final serão confirmados antes da contratação."
        : "Horário, personal e detalhes operacionais serão compartilhados pelo convite pessoal."}</p>
    </div>
  );
}

function ShirtSponsorOverlay() {
  return (
    <div className="mv-shirt-sponsor-zone" aria-label={SHIRT_CONCEPT.sponsorArea}>
      <span>Sua marca aqui</span>
      <span>Sua marca aqui</span>
      <span>Sua marca aqui</span>
      <span>Sua marca aqui</span>
    </div>
  );
}

function SceneSection({ scene, index, partner = false }) {
  const shirt = scene.id === "kit";
  const product = scene.id === "popsicle";
  const disclosure = product
    ? "Fotografia do acervo real Bentô."
    : shirt
      ? "Referência de camiseta aprovada por Alex; aplicações finais dependem de mockup."
      : "Visualização conceitual gerada por IA; operação e aplicações dependem de confirmação.";

  return (
    <section className={`mv-scene ${index % 2 ? "is-reverse" : ""} ${shirt ? "is-shirt" : ""} ${product ? "is-product" : ""}`}>
      <figure className="mv-scene-media">
        <img
          src={scene.image}
          alt={scene.alt}
          width={shirt ? "1254" : product ? "1448" : "1920"}
          height={shirt ? "1254" : product ? "1086" : "1080"}
          loading="lazy"
          decoding="async"
        />
        {shirt && <ShirtSponsorOverlay/>}
        {partner && <span className="mv-brand-here">Sua marca pode estar aqui</span>}
      </figure>
      <div className="mv-scene-copy">
        <span className="mv-scene-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="mv-kicker">{scene.eyebrow}</span>
        <h2>{scene.title}</h2>
        <p>{scene.text}</p>
        {shirt && <div className="mv-shirt-spec"><span>{SHIRT_CONCEPT.front}</span><span>{SHIRT_CONCEPT.back}</span><span>{SHIRT_CONCEPT.sponsorArea}</span></div>}
        {product && <p className="mv-scene-caveat">Sabor ou rótulo especial dependem de viabilidade técnica, rotulagem, alergênicos, produção e aprovação.</p>}
        {scene.id === "family" && <p className="mv-scene-caveat">Crianças permanecem acompanhadas; operação e controle de alergênicos serão confirmados.</p>}
        <small className="mv-scene-disclosure">{disclosure}</small>
      </div>
    </section>
  );
}

function Intro({ partner = false }) {
  return (
    <section className="mv-story-intro">
      <div className="mv-story-intro-copy">
        <span className="mv-kicker">{partner ? "O convite para a marca" : "O convite para você"}</span>
        <h2>{partner
          ? <>Uma marca deseja entrar<br/><em>quando consegue se enxergar.</em></>
          : <>Você não vem assistir.<br/><em>Vem viver.</em></>}</h2>
        <p>{partner
          ? "Cada capítulo abaixo mostra um ponto real de presença: chegada, mesa, movimento, cuidado, família, produto e imagem. A participação final será desenhada conforme a cota e a viabilidade."
          : "Uma experiência desenhada para movimento, acolhimento e conexões reais — com espaço para quem vem com você e intenção para continuar depois do primeiro encontro."}</p>
      </div>
      <EventFacts partner={partner}/>
    </section>
  );
}

function AnnualChapters() {
  return (
    <section className="mv-annual">
      <div className="mv-section-head">
        <span className="mv-kicker">12 de setembro é o começo</span>
        <h2>Um primeiro capítulo.<br/><em>Uma relação com tempo.</em></h2>
      </div>
      <div className="mv-annual-grid">
        {INFLUENCER_CHAPTERS.map((chapter) => <article key={chapter.number}><span>{chapter.number}</span><h3>{chapter.title}</h3><p>{chapter.text}</p></article>)}
      </div>
      <p className="mv-annual-note">Os capítulos futuros serão definidos por curadoria, disponibilidade e novos acordos — sem obrigação publicitária artificial.</p>
    </section>
  );
}

function InfluencerStory({ showRsvp = false, token = null }) {
  return (
    <>
      <Intro/>
      <div id="jornada" className="mv-scene-reel">
        {INFLUENCER_SCENES.map((scene, index) => <SceneSection key={scene.id} scene={scene} index={index}/>) }
      </div>
      <AnnualChapters/>
      <section className="mv-agreement">
        <span className="mv-kicker">O acordo</span>
        <h2>Presença genuína.<br/><em>Liberdade com clareza.</em></h2>
        <p>A Bentô cuida da curadoria, produção e hospitalidade. De cada convidada, esperamos disponibilidade combinada, respeito aos acordos de imagem e vontade real de participar.</p>
      </section>
      {showRsvp ? (
        <>
          <section className="mv-final"><Wordmark/><span className="mv-kicker">Agora é com você</span><h2>Vamos construir juntas.</h2><p>Confirme presença, seus tamanhos e quem irá com você.</p><a className="mv-primary mv-final-cta" href="#confirmacao">Confirmar meu convite<ArrowRight size={18}/></a></section>
          <RsvpFlow token={token} embedded/>
        </>
      ) : (
        <section className="mv-final"><Wordmark/><span className="mv-kicker">Seu próximo passo</span><h2>Abra o convite pessoal.</h2><p>A confirmação de presença, roupa de treino, acompanhante e criança acontece somente pelo seu link individual.</p><div className="mv-final-lock"><ShieldCheck size={18}/>Seus dados não aparecem para outras convidadas.</div></section>
      )}
    </>
  );
}

function PartnerRoles() {
  return (
    <section id="parceria" className="mv-partner-roles">
      <div className="mv-section-head"><span className="mv-kicker">Seis formas de participar</span><h2>Escolha onde sua marca<br/><em>faz mais sentido.</em></h2></div>
      <div className="mv-role-grid">
        {PARTNER_ROLES.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}
      </div>
      <div className="mv-needs-v2"><h3>Para transformar interesse em proposta</h3><ul>{PARTNER_NEEDS.map((need) => <li key={need}><Check size={16}/>{need}</li>)}</ul></div>
    </section>
  );
}

function PartnerStory() {
  return (
    <>
      <Intro partner/>
      <div id="experiencias" className="mv-scene-reel mv-scene-reel-partner">
        {PARTNER_SCENES.map((scene, index) => <SceneSection key={scene.id} scene={scene} index={index} partner/>)}
      </div>
      <PartnerRoles/>
      <PartnerInterestFlow/>
      <section className="mv-final"><Wordmark/><span className="mv-kicker">Próxima decisão</span><h2>Vamos construir o papel da sua marca.</h2><p>Interesse, desenho da proposta, mockup, aprovação e execução — cada etapa com clareza de entrega e contrapartida.</p><a className="mv-primary mv-final-cta" href="#cotas">Escolher uma cota<ArrowRight size={18}/></a></section>
    </>
  );
}

export default function MovementSite({ mode = "influencer", token = null }) {
  const experience = getMovementExperience(mode);
  return (
    <div className="mv-root">
      <MovementMeta mode={mode}/>
      <Topbar mode={mode}/>
      <Hero mode={experience.story}/>
      {experience.story === "partner" ? <PartnerStory/> : <InfluencerStory showRsvp={experience.showRsvp} token={token}/>}
      <footer className="mv-footer"><span>© 2026 ABB Gelateria Ltda.</span><a href="/?privacidade">Privacidade</a></footer>
    </div>
  );
}
