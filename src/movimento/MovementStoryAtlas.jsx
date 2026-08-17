import { useEffect, useMemo, useRef, useState } from "react";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import X from "lucide-react/dist/esm/icons/x.js";
import {
  PARTNER_FEATURED_GUESTS,
  PARTNER_GUESTS,
  buildMovementTerritories,
  resolveMovementStoryHash,
} from "./movement-content.js";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

function sceneAsset(scene) {
  return { ...scene.asset, override: scene.override };
}

// Escalas de fonte editadas no painel viram CSS vars; sem edição, o var não
// existe e o CSS cai no padrão 1. Título e texto têm vars separados.
export function typeScaleStyle(titleScale, bodyScale, prefix = "--mv-fs") {
  return {
    ...(typeof titleScale === "number" ? { [`${prefix}-t`]: titleScale } : {}),
    ...(typeof bodyScale === "number" ? { [`${prefix}-b`]: bodyScale } : {}),
  };
}

export function OrganicLine({ direction = "horizontal", className = "" }) {
  const vertical = direction === "vertical";
  return <img
    className={`mv-organic-line mv-organic-line-${direction} ${className}`.trim()}
    src={`/movimento/ornaments/gold-flow-${direction}.webp`}
    alt=""
    aria-hidden="true"
    width={vertical ? 403 : 1600}
    height={vertical ? 1774 : 221}
    loading="lazy"
    decoding="async"
    draggable="false"
  />;
}

function StoryDetailDialog({ territory, requestedSceneId, onClose, triggerRef, PictureComponent }) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const orderedScenes = useMemo(() => requestedSceneId
    ? [...territory.scenes].sort((a, b) => Number(b.assetId === requestedSceneId) - Number(a.assetId === requestedSceneId))
    : territory.scenes, [requestedSceneId, territory.scenes]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        headingRef.current?.focus();
        return;
      }
      const focusOutside = !dialogRef.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === firstFocusable || focusOutside)) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && (document.activeElement === lastFocusable || focusOutside)) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [onClose, triggerRef]);

  return <div className="mv-story-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="mv-story-detail" role="dialog" aria-modal="true" aria-labelledby="mv-story-detail-title" style={typeScaleStyle(territory.typeScale?.title, territory.typeScale?.body)}>
      <header className="mv-story-detail-header">
        <span className="mv-kicker">{territory.number} · {territory.title}</span>
        <button type="button" className="mv-story-detail-close" aria-label="Fechar detalhes" onClick={onClose}><X aria-hidden="true"/></button>
      </header>
      <h2 id="mv-story-detail-title" ref={headingRef} tabIndex="-1">{territory.headline}</h2>
      <p className="mv-story-detail-lead">{territory.summary}</p>
      <OrganicLine className="mv-organic-line-detail"/>
      <div className="mv-story-detail-scenes">
        {orderedScenes.map((scene) => <article key={scene.assetId} data-asset-id={scene.assetId} data-requested-scene={scene.assetId === requestedSceneId || undefined} style={typeScaleStyle(scene.titleScale, scene.bodyScale, "--mv-scene-fs")}>
          <figure><PictureComponent asset={sceneAsset(scene)}/></figure>
          <div><span className="mv-kicker">{scene.eyebrow}</span><h3>{scene.title}</h3><p>{scene.text}</p></div>
        </article>)}
      </div>
    </section>
  </div>;
}

function GuestListDialog({ onClose, triggerRef }) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (!firstFocusable || !lastFocusable) return;
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [onClose, triggerRef]);

  return <div className="mv-story-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="mv-story-detail mv-guest-list-dialog" role="dialog" aria-modal="true" aria-labelledby="mv-guest-list-title">
      <header className="mv-story-detail-header"><span className="mv-kicker">Curadoria da manhã</span><button type="button" className="mv-story-detail-close" aria-label="Fechar lista" onClick={onClose}><X aria-hidden="true"/></button></header>
      <h2 id="mv-guest-list-title" ref={headingRef} tabIndex="-1">Convidadas selecionadas</h2>
      <p className="mv-story-detail-lead">Criadoras, profissionais e mulheres com presença relevante em bem-estar, lifestyle, beleza, gastronomia e cotidiano.</p>
      <OrganicLine className="mv-organic-line-detail"/>
      <ol className="mv-guest-list">{PARTNER_GUESTS.map((name, index) => <li key={name}><span>{String(index + 1).padStart(2, "0")}</span><strong>{name}</strong></li>)}</ol>
    </section>
  </div>;
}

export function PartnerGuestProof() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeGuestList = useMemo(() => () => setOpen(false), []);

  return <section className="mv-guest-proof" aria-labelledby="mv-guest-proof-title">
    <OrganicLine direction="vertical" className="mv-organic-line-guests"/>
    <div className="mv-guest-proof-copy"><span className="mv-kicker">Convidadas selecionadas</span><h2 id="mv-guest-proof-title">Uma manhã desenhada para pessoas que já movem comunidades.</h2><p>A curadoria reúne criadoras, profissionais e mulheres com presença relevante em bem-estar, lifestyle, beleza, gastronomia e cotidiano.</p></div>
    <div className="mv-guest-featured">{PARTNER_FEATURED_GUESTS.map((guest, index) => <article key={guest.handle}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <img className="mv-guest-portrait" src={guest.image} width="320" height="320" loading="lazy" decoding="async" alt={`Retrato de ${guest.name}`}/>
      <div><h3>{guest.name}</h3><a className="mv-guest-instagram" href={guest.instagramUrl} target="_blank" rel="noreferrer noopener" aria-label={`Abrir Instagram de ${guest.name}`}>{guest.handle}</a></div>
    </article>)}</div>
    <button ref={triggerRef} type="button" className="mv-guest-proof-action" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>Conhecer as convidadas<ArrowRight size={18} aria-hidden="true"/></button>
    {open && <GuestListDialog onClose={closeGuestList} triggerRef={triggerRef}/>}
  </section>;
}

export default function MovementStoryAtlas({ audience, scenes, territoryBackgrounds = {}, territoryTypeScales = {}, companyName = "", PictureComponent }) {
  const territories = useMemo(() => buildMovementTerritories(audience, scenes, territoryBackgrounds, territoryTypeScales), [audience, scenes, territoryBackgrounds, territoryTypeScales]);
  const articleRefs = useRef([]);
  const triggerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openTerritoryId, setOpenTerritoryId] = useState(null);
  const [requestedSceneId, setRequestedSceneId] = useState(null);

  const closeDetail = useMemo(() => () => {
    setOpenTerritoryId(null);
    setRequestedSceneId(null);
    if (resolveMovementStoryHash(window.location.hash)) history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);

  useEffect(() => {
    const target = resolveMovementStoryHash(window.location.hash);
    if (!target) return;
    const targetIndex = territories.findIndex(({ id }) => id === target.territoryId);
    if (targetIndex < 0) return;
    setActiveIndex(targetIndex);
    setOpenTerritoryId(target.territoryId);
    setRequestedSceneId(target.sceneId);
  }, [territories]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(({ isIntersecting }) => isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveIndex(Number(visible.target.dataset.territoryIndex));
    }, { rootMargin: "-38% 0px -48% 0px", threshold: [0.15, 0.35, 0.65] });
    articleRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [territories.length]);

  return <section id="jornada" className="mv-story-atlas" aria-label="Cinco territórios da experiência">
    <header className="mv-story-atlas-head">
      <OrganicLine direction="vertical" className="mv-organic-line-atlas"/>
      <div><span className="mv-kicker">A experiência em visão macro</span><h2>Cinco territórios.<br/><em>Uma manhã inteira.</em></h2></div>
      <p>Como em uma apresentação editorial, cada quadro reúne a ideia principal e os momentos que fazem parte dela. Toque para abrir todos os detalhes.</p>
      <span className="mv-story-progress" aria-hidden="true"><strong>{String(activeIndex + 1).padStart(2, "0")}</strong><i/><span>05</span></span>
    </header>
    <div className="mv-story-track">
      {territories.map((territory, index) => {
        return <article
          key={territory.id}
          ref={(node) => { articleRefs.current[index] = node; }}
          className={`mv-territory mv-territory-layout-${(index % 3) + 1} ${activeIndex === index ? "is-active" : ""}`}
          data-territory-id={territory.id}
          data-territory-index={index}
          data-color-scheme={territory.colorScheme}
          style={{ "--mv-territory-bg": territory.backgroundColor, ...typeScaleStyle(territory.typeScale?.title, territory.typeScale?.body) }}
        >
          <div className="mv-territory-frame">
            <OrganicLine className={`mv-organic-line-territory mv-organic-line-territory-${(index % 3) + 1}`}/>
            <div className="mv-territory-copy">
              <span className="mv-territory-number">{territory.number}</span>
              <span className="mv-kicker">{territory.title}</span>
              <h2>{territory.headline}</h2>
              <p>{territory.summary}</p>
              {audience === "partner" && companyName && <p className="mv-territory-company">Como {companyName} pode viver este momento.</p>}
              <button type="button" className="mv-territory-explore" aria-haspopup="dialog" aria-expanded={openTerritoryId === territory.id} onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setOpenTerritoryId(territory.id);
                setRequestedSceneId(null);
                history.replaceState(null, "", `#${territory.slug}`);
              }}>Detalhes<ArrowRight size={18} aria-hidden="true"/></button>
            </div>
            <div className="mv-territory-gallery">
              {territory.scenes.slice(0, 3).map((scene, sceneIndex) => <figure key={scene.assetId} data-gallery-slot={sceneIndex + 1}>
                <PictureComponent asset={sceneAsset(scene)}/>
              </figure>)}
            </div>
          </div>
        </article>;
      })}
    </div>
    {openTerritoryId && <StoryDetailDialog
      territory={territories.find(({ id }) => id === openTerritoryId)}
      requestedSceneId={requestedSceneId}
      onClose={closeDetail}
      triggerRef={triggerRef}
      PictureComponent={PictureComponent}
    />}
  </section>;
}
