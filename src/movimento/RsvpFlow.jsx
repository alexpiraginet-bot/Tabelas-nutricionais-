import { useEffect, useMemo, useState } from "react";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import Check from "lucide-react/dist/esm/icons/check.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import { EVENT } from "./movement-content.js";

const SIZES = ["PP", "P", "M", "G", "GG", "XGG"];
const initialForm = { response: "", participationMode: "", shirtSize: "", trainingOutfitSize: "", adultCompanionType: "", childCount: 0, childKitSize: "", privacyAccepted: false, imageConsent: false, siteUrl: "" };
const MODE_LABELS = { training: "Aulão funcional", lounge: "Presença sem aulão", family: "Com criança na oficina infantil" };
const ADULT_COMPANION_LABELS = { husband: "Marido", mother: "Mãe" };

function localDemo(token) {
  if (token !== "demo") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export default function RsvpFlow({ token, embedded = false }) {
  const [state, setState] = useState("loading");
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState("form");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const isDemo = useMemo(() => localDemo(token), [token]);

  useEffect(() => {
    if (step !== "review" && state !== "success") return;
    if (embedded) document.getElementById("confirmacao")?.scrollIntoView({ block: "start", behavior: "auto" });
    else window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [embedded, step, state]);

  useEffect(() => {
    let alive = true;
    if (isDemo) {
      setInvite({ displayName: "Convidada", audienceType: "influencer", status: "sent" });
      setState("ready");
      return () => { alive = false; };
    }
    if (!token) { setState("invalid"); return () => { alive = false; }; }
    fetch(`/api/movimento-rsvp?token=${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } })
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) }))
      .then(({ response, body }) => {
        if (!alive) return;
        if (!response.ok) { setMessage(body.error || "Convite inválido ou expirado."); setState(response.status === 404 ? "invalid" : "error"); return; }
        setInvite(body.invite);
        if (body.currentRsvp) setForm({ ...initialForm, response: body.currentRsvp.response, participationMode: body.currentRsvp.participationMode || "", shirtSize: body.currentRsvp.shirtSize || "", trainingOutfitSize: body.currentRsvp.trainingOutfitSize || "", adultCompanionType: body.currentRsvp.adultCompanionType || "", childCount: body.currentRsvp.childCount || 0, childKitSize: body.currentRsvp.childKitSize || "", privacyAccepted: true, imageConsent: body.currentRsvp.imageConsent === true });
        setState("ready");
      })
      .catch(() => { if (alive) { setMessage("Não foi possível abrir o convite agora."); setState("error"); } });
    return () => { alive = false; };
  }, [token, isDemo]);

  const error = (() => {
    if (!form.response) return "Escolha se poderá participar.";
    if (form.response === "confirmed" && !MODE_LABELS[form.participationMode]) return "Escolha como deseja participar.";
    if (form.response === "confirmed" && !SIZES.includes(form.shirtSize)) return "Escolha o tamanho da camiseta.";
    if (form.response === "confirmed" && !SIZES.includes(form.trainingOutfitSize)) return "Escolha o tamanho da roupa de treino.";
    if (form.response === "confirmed" && form.adultCompanionType && !ADULT_COMPANION_LABELS[form.adultCompanionType]) return "Escolha marido ou mãe como acompanhante adulto.";
    if (form.response === "confirmed" && form.participationMode === "family" && Number(form.childCount) !== 1) return "Confirme a criança na oficina infantil.";
    if (form.response === "confirmed" && form.participationMode === "family" && !form.childKitSize.trim()) return "Informe um tamanho aproximado para a criança.";
    if (!form.privacyAccepted) return "Confirme a leitura da Política de Privacidade.";
    return "";
  })();

  function review(event) {
    event.preventDefault();
    if (error) { setMessage(error); return; }
    setMessage("");
    setStep("review");
  }

  async function submit() {
    setState("submitting");
    setMessage("");
    if (isDemo) {
      setReference("DEMO-2026");
      setState("success");
      return;
    }
    try {
      const response = await fetch("/api/movimento-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, ...form, companionCount: (form.adultCompanionType ? 1 : 0) + Number(form.childCount) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(body.error || "Não foi possível registrar agora."); setState("ready"); setStep("form"); return; }
      setReference(body.reference);
      setState("success");
    } catch {
      setMessage("Não foi possível registrar agora. Sua resposta continua nesta tela.");
      setState("ready");
      setStep("form");
    }
  }

  const Container = embedded ? "section" : "main";
  const sectionProps = embedded ? { id: "confirmacao" } : {};
  const containerClass = embedded ? "mv-rsvp-embedded" : "";

  if (state === "loading") return <Container {...sectionProps} className={`mv-rsvp-state ${containerClass}`}><LoaderCircle className="mv-spin" aria-hidden="true"/><p>Abrindo seu convite…</p></Container>;
  if (state === "invalid" || state === "error") return <Container {...sectionProps} className={`mv-rsvp-state ${containerClass}`}><span className="mv-kicker">Bentô em Movimento</span><h1>Este convite não pôde ser aberto.</h1><p>{message || "Convite inválido ou expirado."}</p><a href={embedded ? "#jornada" : "/movimento"}>{embedded ? "Rever o projeto" : "Conhecer o projeto"}</a></Container>;
  if (state === "success") return (
    <Container {...sectionProps} className={`mv-rsvp-state mv-success ${containerClass}`}>
      <div className="mv-success-mark"><Check aria-hidden="true"/></div>
      <span className="mv-kicker">Resposta registrada</span>
      <h1>{form.response === "confirmed" ? "Presença confirmada." : "Obrigada por responder."}</h1>
      <p>{form.response === "confirmed" ? `Nos vemos em ${EVENT.dateLong}. Sua camiseta ${form.shirtSize} e sua roupa de treino ${form.trainingOutfitSize} ficaram registradas para a montagem do seu kit.` : "Sua resposta foi registrada com carinho e pode ser alterada pelo mesmo link."}</p>
      <div className="mv-reference">Referência · {reference}</div>
      <button type="button" className="mv-link-button" onClick={() => { setState("ready"); setStep("form"); }}>Editar minha resposta</button>
    </Container>
  );

  if (step === "review") return (
    <Container {...sectionProps} className={`mv-rsvp-page ${containerClass}`}>
      <button type="button" className="mv-back" onClick={() => setStep("form")}><ArrowLeft size={18}/>Voltar</button>
      <span className="mv-kicker">Revise antes de confirmar</span>
      <h1>{invite?.displayName}, está tudo certo?</h1>
      <dl className="mv-review">
        <div><dt>Encontro</dt><dd>{EVENT.dateLong} · {EVENT.location}</dd></div>
        <div><dt>Presença</dt><dd>{form.response === "confirmed" ? "Confirmada" : "Não participarei"}</dd></div>
        {form.response === "confirmed" && <div><dt>Experiência</dt><dd>{MODE_LABELS[form.participationMode]}</dd></div>}
        {form.response === "confirmed" && <div><dt>Camiseta</dt><dd>{form.shirtSize}</dd></div>}
        {form.response === "confirmed" && <div><dt>Roupa de treino</dt><dd>{form.trainingOutfitSize}</dd></div>}
        {form.response === "confirmed" && <div><dt>Acompanhante adulto</dt><dd>{ADULT_COMPANION_LABELS[form.adultCompanionType] || "Sem acompanhante adulto"}</dd></div>}
        {form.response === "confirmed" && form.participationMode === "family" && <div><dt>Criança</dt><dd>1 · tamanho aproximado {form.childKitSize}</dd></div>}
        {form.response === "confirmed" && <div><dt>Total no convite</dt><dd>{1 + (form.adultCompanionType ? 1 : 0) + Number(form.childCount)} pessoa(s)</dd></div>}
        <div><dt>Uso de imagem</dt><dd>{form.imageConsent ? "Autorizado" : "Não autorizado"}</dd></div>
      </dl>
      <button type="button" className="mv-primary" onClick={submit} disabled={state === "submitting"}>{state === "submitting" ? <><LoaderCircle className="mv-spin"/>Registrando…</> : <>Confirmar resposta<ChevronRight size={18}/></>}</button>
    </Container>
  );

  return (
    <Container {...sectionProps} className={`mv-rsvp-page ${containerClass}`}>
      <a className="mv-back" href={embedded ? "#jornada" : "/movimento"}><ArrowLeft size={18}/>{embedded ? "Rever o projeto" : "Ver o projeto"}</a>
      <span className="mv-kicker">Seu convite pessoal</span>
      <h1>Olá, {invite?.displayName || "convidada"}.</h1>
      <div className="mv-rsvp-event"><strong>{EVENT.dateLong}</strong><span>{EVENT.location}</span><small>{EVENT.training}</small></div>
      <p className="mv-lead">Queremos saber se você estará com a gente no primeiro capítulo do Bentô em Movimento.</p>
      <form onSubmit={review} className="mv-form" noValidate>
        <fieldset>
          <legend>Você poderá participar?</legend>
          <label className={form.response === "confirmed" ? "is-selected" : ""}><input type="radio" name="response" value="confirmed" checked={form.response === "confirmed"} onChange={(e) => setForm({ ...form, response: e.target.value })}/><span><strong>Sim, estarei presente</strong><small>Quero viver este primeiro encontro.</small></span></label>
          <label className={form.response === "declined" ? "is-selected" : ""}><input type="radio" name="response" value="declined" checked={form.response === "declined"} onChange={(e) => setForm({ ...form, response: e.target.value, participationMode: "", shirtSize: "", trainingOutfitSize: "", adultCompanionType: "", childCount: 0, childKitSize: "" })}/><span><strong>Não poderei participar</strong><small>Continuo torcendo pelo projeto.</small></span></label>
        </fieldset>
        {form.response === "confirmed" && <fieldset><legend>Como você quer viver este encontro?</legend><div className="mv-mode-options">
          <label className={form.participationMode === "training" ? "is-selected" : ""}><input type="radio" name="participationMode" value="training" checked={form.participationMode === "training"} onChange={(e) => setForm({ ...form, participationMode: e.target.value, childCount: 0, childKitSize: "" })}/><span><strong>Aulão funcional</strong><small>Com personal renomado; nome em confirmação.</small></span></label>
          <label className={form.participationMode === "lounge" ? "is-selected" : ""}><input type="radio" name="participationMode" value="lounge" checked={form.participationMode === "lounge"} onChange={(e) => setForm({ ...form, participationMode: e.target.value, childCount: 0, childKitSize: "" })}/><span><strong>Presença sem aulão</strong><small>Permaneço no cerimonial acompanhando a experiência.</small></span></label>
          <label className={form.participationMode === "family" ? "is-selected" : ""}><input type="radio" name="participationMode" value="family" checked={form.participationMode === "family"} onChange={(e) => setForm({ ...form, participationMode: e.target.value, childCount: 1 })}/><span><strong>Com criança na oficina infantil</strong><small>Oficina de picolés e decoração, exclusiva para uma criança acompanhada.</small></span></label>
        </div></fieldset>}
        {form.response === "confirmed" && <fieldset><legend>Qual é o tamanho da sua camiseta?</legend><div className="mv-sizes">{SIZES.map((size) => <label key={size} className={form.shirtSize === size ? "is-selected" : ""}><input type="radio" name="shirtSize" value={size} checked={form.shirtSize === size} onChange={(e) => setForm({ ...form, shirtSize: e.target.value })}/><span>{size}</span></label>)}</div></fieldset>}
        {form.response === "confirmed" && <fieldset><legend>Qual é o tamanho da sua roupa de treino?</legend><div className="mv-sizes">{SIZES.map((size) => <label key={size} className={form.trainingOutfitSize === size ? "is-selected" : ""}><input type="radio" name="trainingOutfitSize" value={size} checked={form.trainingOutfitSize === size} onChange={(e) => setForm({ ...form, trainingOutfitSize: e.target.value })}/><span>{size}</span></label>)}</div><p className="mv-field-note">A camiseta e a roupa de treino são destinadas somente à influenciadora convidada. O modelo final da peça será confirmado depois.</p></fieldset>}
        {form.response === "confirmed" && <fieldset><legend>Quem vai com você?</legend><p className="mv-field-note mv-field-note-first">O convite permite no máximo 3 pessoas no total: você, marido ou mãe e uma criança.</p><div className="mv-mode-options">
          <label className={!form.adultCompanionType ? "is-selected" : ""}><input type="radio" name="adultCompanionType" value="" checked={!form.adultCompanionType} onChange={() => setForm({ ...form, adultCompanionType: "" })}/><span><strong>Sem acompanhante adulto</strong><small>Vou sozinha ou somente com a criança, se escolhi a oficina.</small></span></label>
          <label className={form.adultCompanionType === "husband" ? "is-selected" : ""}><input type="radio" name="adultCompanionType" value="husband" checked={form.adultCompanionType === "husband"} onChange={(e) => setForm({ ...form, adultCompanionType: e.target.value })}/><span><strong>Meu marido</strong><small>Ele permanece no lounge e no cerimonial durante o aulão.</small></span></label>
          <label className={form.adultCompanionType === "mother" ? "is-selected" : ""}><input type="radio" name="adultCompanionType" value="mother" checked={form.adultCompanionType === "mother"} onChange={(e) => setForm({ ...form, adultCompanionType: e.target.value })}/><span><strong>Minha mãe</strong><small>Ela permanece no lounge e no cerimonial durante o aulão.</small></span></label>
        </div>{form.participationMode === "family" && <div className="mv-child-plan"><span className="mv-kicker">1 criança · qualquer idade</span><h3>Oficina de picolés e decoração</h3><p>A criança permanece acompanhada pelo responsável no mesmo cerimonial.</p><label className="mv-text-field"><span>Tamanho aproximado da criança</span><input value={form.childKitSize} onChange={(e) => setForm({ ...form, childKitSize: e.target.value })} maxLength="40" placeholder="Ex.: 12 meses, 6 infantil" aria-describedby="mv-child-kit-note"/></label><p id="mv-child-kit-note" className="mv-field-note">Possibilidade de item infantil em confirmação. O tamanho serve apenas para planejamento e não garante produto ou modelo.</p></div>}</fieldset>}
        <fieldset className="mv-consents">
          <label><input type="checkbox" checked={form.privacyAccepted} onChange={(e) => setForm({ ...form, privacyAccepted: e.target.checked })}/><span>Li e compreendi a <a href="/?privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span></label>
          <label><input type="checkbox" checked={form.imageConsent} onChange={(e) => setForm({ ...form, imageConsent: e.target.checked })}/><span>Autorizo o uso da minha imagem em registros e conteúdos deste projeto. <small>Opcional — sua escolha não altera a presença.</small></span></label>
          <label className="mv-honeypot" aria-hidden="true">Site<input tabIndex="-1" autoComplete="off" value={form.siteUrl} onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}/></label>
        </fieldset>
        {message && <p className="mv-form-error" role="alert">{message}</p>}
        <button className="mv-primary" type="submit">Revisar resposta<ChevronRight size={18}/></button>
        <p className="mv-security"><ShieldCheck size={16}/>Seu link é individual. Seus dados não aparecem para outras convidadas.</p>
      </form>
    </Container>
  );
}
