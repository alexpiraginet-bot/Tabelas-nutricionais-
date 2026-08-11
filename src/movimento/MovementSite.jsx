import { useEffect } from "react";
import { ArrowDown, ArrowRight, CalendarDays, Check, MapPin, MoveRight, ShieldCheck } from "lucide-react";
import PartnerInterestFlow from "./PartnerInterestFlow.jsx";
import RsvpFlow from "./RsvpFlow.jsx";
import { getMovementExperience } from "./movement-route.js";
import { EVENT, EXPERIENCE_STEPS, INFLUENCER_CHAPTERS, KIT_ITEMS, PARTNER_NEEDS, PARTNER_ROLES, PARTNERS, PRESENCE_PATHS } from "./movement-content.js";
import "./movement.css";

function Wordmark() {
  return <img className="mv-wordmark" src="/movimento/bento-wordmark-gold.png" alt="Bentô Gelatos"/>;
}

function MovementMeta({ mode }) {
  useEffect(() => {
    const title = mode === "partner" ? "Bentô em Movimento | Parcerias" : mode === "invite" ? "Bentô em Movimento | Confirmação" : "Bentô em Movimento | Convite 2026";
    const description = mode === "partner" ? `Conheça o Bentô em Movimento de ${EVENT.dateLong} e registre a cota de interesse da sua marca.` : mode === "invite" ? `Confirme presença, roupa de treino e acompanhantes para ${EVENT.dateLong}.` : `Uma jornada de 12 meses que começa em ${EVENT.dateLong}.`;
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    meta.content = description;
  }, [mode]);
  return null;
}

function Topbar({ mode }) {
  return <header className="mv-topbar"><a href="/movimento" aria-label="Bentô em Movimento — início"><Wordmark/></a><span>{mode === "partner" ? `Parceiros · ${EVENT.dateShort}` : `${EVENT.dateShort} · Vitória`}</span></header>;
}

function Hero({ mode }) {
  const partner = mode === "partner";
  return (
    <section className={`mv-hero ${partner ? "is-partner" : ""}`}>
      <img src={partner ? "/movimento/partner-lounge.png" : "/movimento/hero-creators.png"} alt={partner ? "Ambiente editorial de hospitalidade preparado para uma experiência de bem-estar" : "Mulheres chegando a um encontro de movimento e conexão à beira-mar"}/>
      <div className="mv-hero-wash"/>
      <div className="mv-hero-copy">
        <span className="mv-kicker">Bentô em Movimento · {EVENT.dateLong}</span>
        <h1>{partner ? <>Uma plataforma de<br/><em>experiência e presença.</em></> : <>12 meses para<br/><em>criar presença.</em></>}</h1>
        <p>{partner ? "Uma abertura memorável. Uma comunidade cuidadosamente escolhida. Capítulos de marca que continuam depois do evento." : "Um convite para viver, cocriar e transformar encontros em uma relação que continua ao longo do ano."}</p>
        <a className="mv-hero-cta" href={partner ? "#parceria" : "#jornada"}>{partner ? "Conhecer o projeto" : "Descobrir a jornada"}<ArrowDown size={18}/></a>
      </div>
    </section>
  );
}

function SectionIntro({ index, eyebrow, title, children, dark = false, id }) {
  return <section id={id} className={`mv-section mv-intro ${dark ? "is-dark" : ""}`}><div className="mv-index">{index}</div><div className="mv-section-copy"><span className="mv-kicker">{eyebrow}</span><h2>{title}</h2>{children}</div></section>;
}

function PartnersLine() {
  return <div className="mv-partner-line">{PARTNERS.map(({ name, category }) => <article key={name}><strong>{name}</strong><span>{category}</span></article>)}</div>;
}

function EventFacts({ partner = false }) {
  return <div className="mv-event-facts"><p><CalendarDays size={18}/>{EVENT.dateLong}</p><p><MapPin size={18}/>{EVENT.location}</p><strong>{EVENT.training}</strong><small>{EVENT.time}. {partner ? "A operação final será alinhada com o espaço e os parceiros confirmados." : "Os detalhes operacionais serão compartilhados pelo convite pessoal."}</small></div>;
}

function InfluencerStory({ showRsvp = false, token = null }) {
  return <>
    <SectionIntro index="01" eyebrow="A ideia" title={<>Não é uma ação isolada.<br/><em>É uma relação que ganha tempo.</em></>}><p>O Bentô em Movimento nasce como uma plataforma anual de encontros, cuidado, movimento e conteúdo relevante — feita para existir dentro e fora das redes.</p></SectionIntro>
    <section className="mv-statement"><span>Experiência antes de exposição.</span><strong>Curadoria antes de volume.</strong><span>Utilidade antes de brinde.</span></section>
    <SectionIntro index="02" eyebrow="O primeiro capítulo" title={<>12 de setembro.<br/><em>Uma manhã para começar do jeito certo.</em></>} dark><EventFacts/></SectionIntro>
    <section id="jornada" className="mv-section mv-experience"><div className="mv-section-head"><span className="mv-kicker">O ritmo da experiência</span><h2>Leve para chegar.<br/>Intensa para permanecer.</h2></div><ol>{EXPERIENCE_STEPS.map(([title, text], index) => <li key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></section>
    <section className="mv-section mv-presence"><div className="mv-section-head"><span className="mv-kicker">Todo mundo no mesmo encontro</span><h2>Ninguém precisa sair do cerimonial.</h2></div><div className="mv-presence-list">{PRESENCE_PATHS.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div><p className="mv-note">A oficina é exclusiva para crianças acompanhadas pelo responsável. Programação sujeita à confirmação operacional e ao controle de alergênicos.</p></section>
    <section className="mv-section mv-kit"><div className="mv-media"><img src="/movimento/kit-editorial.png" alt="Composição conceitual do kit da influenciadora Bentô em Movimento"/></div><div className="mv-section-copy"><span className="mv-kicker">O kit continua depois</span><h2>Objetos escolhidos para acompanhar a vida real.</h2><ul>{KIT_ITEMS.map((item) => <li key={item}><Check size={17}/>{item}</li>)}</ul><p className="mv-note">Camiseta e roupa de treino são exclusivas da influenciadora. A composição do kit e a possibilidade infantil dependem de confirmação.</p></div></section>
    <section className="mv-section mv-cocreate"><div className="mv-section-copy"><span className="mv-kicker">Sua voz entra no projeto</span><h2>Você não recebe uma ideia pronta.<br/><em>Ajuda a dar forma a ela.</em></h2><p>Uso real, feedback honesto e repertório compartilhado entram na escolha dos materiais, na linguagem e nos próximos encontros.</p></div><div className="mv-media"><img src="/movimento/painel-cocriacao.png" alt="Painel conceitual de cocriação das camisetas e acessórios do projeto"/></div></section>
    <section className="mv-section mv-chapters"><div className="mv-section-head"><span className="mv-kicker">Quatro capítulos · 12 meses</span><h2>Um começo com espaço para continuar.</h2></div><div className="mv-chapter-list">{INFLUENCER_CHAPTERS.map((chapter) => <article key={chapter.number}><span>{chapter.number}</span><h3>{chapter.title}</h3><p>{chapter.text}</p></article>)}</div></section>
    <SectionIntro index="03" eyebrow="O acordo" title={<>Presença genuína.<br/><em>Liberdade com clareza.</em></>} dark><p>A Bentô entrega curadoria, produção e cuidado. De cada convidada, esperamos disponibilidade combinada, respeito aos acordos de imagem e vontade real de participar — sem obrigação publicitária artificial.</p></SectionIntro>
    <section className="mv-section mv-partners"><span className="mv-kicker">Marcas em conversa</span><h2>Um ecossistema construído com afinidade.</h2><PartnersLine/><p>Nomes sujeitos a confirmação e aprovação de cada marca.</p></section>
    {showRsvp ? <>
      <section className="mv-final"><Wordmark/><span className="mv-kicker">Agora é com você</span><h2>Vamos construir juntas.</h2><p>Você conheceu o projeto. Agora confirme presença, seus tamanhos e quem irá com você.</p><a className="mv-primary mv-final-cta" href="#confirmacao">Confirmar meu convite<ArrowRight size={18}/></a></section>
      <RsvpFlow token={token} embedded/>
    </> : <section className="mv-final"><Wordmark/><span className="mv-kicker">Se fizer sentido para você</span><h2>Vamos construir juntas.</h2><p>Abra o seu link individual para confirmar presença, roupa de treino e quem irá com você.</p><div className="mv-final-lock"><ShieldCheck size={18}/>A confirmação acontece somente pelo convite pessoal.</div></section>}
  </>;
}

function PartnerStory() {
  return <>
    <SectionIntro index="01" eyebrow="A oportunidade" title={<>Uma abertura memorável.<br/><em>Doze meses de relevância.</em></>}><p>O Bentô em Movimento transforma um encontro de alto desejo em uma plataforma anual de relacionamento entre comunidade, hospitalidade, bem-estar e marcas com afinidade real.</p></SectionIntro>
    <section className="mv-statement"><span>Não buscamos ocupação de espaço.</span><strong>Buscamos um papel que faça sentido.</strong></section>
    <SectionIntro index="02" eyebrow="O encontro de abertura" title={<>Le Buffet Lounge.<br/><em>12 de setembro de 2026.</em></>} dark><EventFacts partner/></SectionIntro>
    <section className="mv-section mv-curation"><div className="mv-section-copy"><span className="mv-kicker">Curadoria</span><h2>A audiência começa pela escolha de quem estará presente.</h2><p>Buscamos influenciadoras com força editorial, afinidade local, presença verdadeira e compatibilidade com a proposta. Nomes e alcances entram apenas depois de autorização.</p></div><div className="mv-big-word" aria-hidden="true">PRESENÇA</div></section>
    <section className="mv-section mv-mobility"><div className="mv-mobility-media"><img src="/movimento/mobility-premium.png" alt="Cena conceitual de chegada a um evento com veículo premium sem identificação de marca"/></div><div className="mv-section-copy"><span className="mv-kicker">Nova frente · Mobilidade premium</span><h2>A experiência começa antes da porta.</h2><p>Uma cota desenhada para fabricantes ou concessionárias de veículos premium integra a marca à jornada de chegada com elegância, presença cenográfica e conteúdo contextual.</p><div className="mv-mobility-note"><strong>Imagem conceitual</strong><span>Nenhuma marca automotiva está confirmada ou representada nesta proposta.</span></div></div></section>
    <section className="mv-section mv-kit"><div className="mv-media"><img src="/movimento/kit-concept-v1.png" alt="Conceito visual do kit Bentô em Movimento à beira-mar"/></div><div className="mv-section-copy"><span className="mv-kicker">Arquitetura do kit</span><h2>O parceiro entra onde sua contribuição ganha uso e significado.</h2><ul>{KIT_ITEMS.map((item) => <li key={item}><Check size={17}/>{item}</li>)}</ul></div></section>
    <section id="parceria" className="mv-section mv-roles"><div className="mv-section-head"><span className="mv-kicker">Seis formas de participar</span><h2>Da experiência ao próximo capítulo.</h2></div><ol>{PARTNER_ROLES.map(([title, text], index) => <li key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div><MoveRight aria-hidden="true"/></li>)}</ol></section>
    <section className="mv-section mv-visibility"><div><span className="mv-kicker">Visibilidade sem perder desejo</span><h2>A marca aparece com elegância porque participa de verdade.</h2></div><div className="mv-visibility-list"><p><strong>Encontro</strong>Painel coletivo com hierarquia uniforme.</p><p><strong>Camiseta</strong>Assinatura discreta apenas após mockup aprovado.</p><p><strong>Kit</strong>Crédito ligado à contribuição específica.</p><p><strong>Conteúdo</strong>Menção contextualizada, sem promessa de alcance.</p></div></section>
    <section className="mv-section mv-partners"><span className="mv-kicker">Ecossistema em construção</span><h2>Conversas que já apontam a direção.</h2><PartnersLine/><p>As marcas acima são potenciais integrantes e não representam confirmação comercial.</p></section>
    <section className="mv-section mv-needs"><div className="mv-section-head"><span className="mv-kicker">Para desenhar o encaixe</span><h2>Seis respostas transformam interesse em proposta.</h2></div><ol>{PARTNER_NEEDS.map((need, index) => <li key={need}><span>{String(index + 1).padStart(2, "0")}</span>{need}</li>)}</ol></section>
    <PartnerInterestFlow/>
    <section className="mv-final"><Wordmark/><span className="mv-kicker">Próxima decisão</span><h2>Vamos construir o papel da sua marca.</h2><p>Alinhamento, protótipo, aprovação e execução — cada etapa com clareza de entrega e contrapartida.</p><a className="mv-primary mv-final-cta" href="#cotas">Escolher uma cota<ArrowRight size={18}/></a></section>
  </>;
}

export default function MovementSite({ mode = "influencer", token = null }) {
  const experience = getMovementExperience(mode);
  return <div className="mv-root"><MovementMeta mode={mode}/><Topbar mode={mode}/><Hero mode={experience.story}/>{experience.story === "partner" ? <PartnerStory/> : <InfluencerStory showRsvp={experience.showRsvp} token={token}/>}<footer className="mv-footer"><span>© 2026 ABB Gelateria Ltda.</span><a href="/?privacidade">Privacidade</a></footer></div>;
}
