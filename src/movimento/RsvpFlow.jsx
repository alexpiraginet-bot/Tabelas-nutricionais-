import { useEffect, useMemo, useRef, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import X from "lucide-react/dist/esm/icons/x.js";
import { EVENT } from "./movement-content.js";

const SIZES = ["PP", "P", "M", "G", "GG", "XGG"];
const ADULT_COMPANION_LABELS = { husband: "Marido", mother: "Mãe" };
const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']):not([tabindex='-1']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const initialForm = {
  response: "", outfitSize: "", adultCompanionType: "",
  childCount: 0, childAge: "", childKitSize: "", transportInterest: false,
  privacyAccepted: false, imageConsent: false, siteUrl: "",
};

function formFromRsvp(currentRsvp) {
  if (!currentRsvp) return initialForm;
  return {
    ...initialForm,
    response: currentRsvp.response || "",
    outfitSize: currentRsvp.outfitSize || "",
    adultCompanionType: currentRsvp.adultCompanionType || "",
    childCount: currentRsvp.childCount === 1 ? 1 : 0,
    childAge: currentRsvp.childAge ?? "",
    childKitSize: currentRsvp.childKitSize || "",
    transportInterest: currentRsvp.transportInterest === true,
    privacyAccepted: true,
    imageConsent: currentRsvp.imageConsent === true,
  };
}

function clearConfirmedFields(form) {
  return {
    ...form,
    outfitSize: "",
    adultCompanionType: "",
    childCount: 0,
    childAge: "",
    childKitSize: "",
    transportInterest: false,
  };
}

function isLocalDemo(token) {
  return token === "demo" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export default function RsvpFlow({ token, invite, currentRsvp }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => formFromRsvp(currentRsvp));
  const [step, setStep] = useState("form");
  const [state, setState] = useState("ready");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const dialogRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const triggerRef = useRef(null);
  const initializedRsvp = useRef(currentRsvp);
  const stateRef = useRef(state);
  const demo = useMemo(() => isLocalDemo(token), [token]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (initializedRsvp.current === currentRsvp) return;
    initializedRsvp.current = currentRsvp;
    setForm(formFromRsvp(currentRsvp));
  }, [currentRsvp]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape" && stateRef.current !== "submitting") setOpen(false);
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const activeElement = document.activeElement;
      const focusIsAtDialogBoundary = activeElement === dialogRef.current || !dialogRef.current?.contains(activeElement);
      if (event.shiftKey && (activeElement === firstFocusable || focusIsAtDialogBoundary)) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && (activeElement === lastFocusable || focusIsAtDialogBoundary)) {
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    stepHeadingRef.current?.focus();
  }, [open, step]);

  const error = (() => {
    const childAge = Number(form.childAge);
    if (!form.response) return "Escolha se poderá participar.";
    if (form.response !== "confirmed") return form.privacyAccepted ? "" : "Confirme a leitura da Política de Privacidade.";
    if (!SIZES.includes(form.outfitSize)) return "Escolha o seu tamanho.";
    if (!["", "husband", "mother"].includes(form.adultCompanionType)) return "Escolha marido ou mãe como acompanhante adulto.";
    if (form.childCount === 1 && (!/^\d+$/.test(String(form.childAge)) || !Number.isInteger(childAge) || childAge < 0 || childAge > 120)) return "Informe uma idade inteira entre 0 e 120 para organização.";
    if (form.childCount === 1 && !form.childKitSize.trim()) return "Informe um tamanho aproximado para a criança.";
    if (!form.privacyAccepted) return "Confirme a leitura da Política de Privacidade.";
    return "";
  })();

  function updateResponse(response) {
    setForm((current) => response === "declined"
      ? { ...clearConfirmedFields(current), response }
      : { ...current, response });
  }

  function review(event) {
    event.preventDefault();
    if (error) { setMessage(error); return; }
    setMessage("");
    setStep("review");
  }

  async function submit() {
    setState("submitting");
    setMessage("");
    if (demo) {
      setReference("DEMO-2026");
      setState("success");
      setStep("success");
      return;
    }
    try {
      const response = await fetch("/api/movimento-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          token,
          ...form,
          shirtSize: form.outfitSize,
          trainingOutfitSize: form.outfitSize,
          companionCount: (form.adultCompanionType ? 1 : 0) + form.childCount,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível registrar agora.");
      setReference(body.reference || "");
      setState("success");
      setStep("success");
    } catch (submissionError) {
      setMessage(submissionError.message || "Não foi possível registrar agora. Sua resposta continua nesta tela.");
      setState("ready");
      setStep("form");
    }
  }

  return <>
    <button ref={triggerRef} type="button" className="mv-rsvp-persistent-cta" aria-haspopup="dialog" aria-expanded={open} aria-controls="mv-rsvp-sheet" onClick={() => { setOpen(true); setStep("form"); setMessage(""); }}>
      Confirmar meu lugar<ChevronRight size={18}/>
    </button>
    {open && <div className="mv-rsvp-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && state !== "submitting") setOpen(false); }}>
      <section id="mv-rsvp-sheet" ref={dialogRef} className="mv-rsvp-sheet" role="dialog" aria-modal="true" aria-labelledby="mv-rsvp-sheet-title" tabIndex="-1">
        <div className="mv-rsvp-sheet-header"><span className="mv-kicker">Convite pessoal</span><button type="button" className="mv-rsvp-sheet-close" aria-label="Fechar confirmação" onClick={() => setOpen(false)} disabled={state === "submitting"}><X aria-hidden="true"/></button></div>
        {step === "form" && <form onSubmit={review} className="mv-rsvp-sheet-form" noValidate>
          <h2 id="mv-rsvp-sheet-title" ref={stepHeadingRef} tabIndex="-1">{invite?.displayName || "Convidada"}, confirme seu lugar.</h2>
          <p className="mv-rsvp-sheet-lead">{EVENT.dateLong} · {EVENT.location}</p>
          <fieldset><legend>Você estará com a gente?</legend>
            <label className={form.response === "confirmed" ? "is-selected" : ""}><input type="radio" name="response" value="confirmed" checked={form.response === "confirmed"} onChange={() => updateResponse("confirmed")}/><span><strong>Estarei presente</strong><small>Quero viver essa manhã com a Bentô.</small></span></label>
            <label className={form.response === "declined" ? "is-selected" : ""}><input type="radio" name="response" value="declined" checked={form.response === "declined"} onChange={() => updateResponse("declined")}/><span><strong>Desta vez, acompanho de longe</strong><small>Minha resposta fica registrada e pode ser editada neste link.</small></span></label>
          </fieldset>
          {form.response === "confirmed" && <>
            <fieldset><legend>Qual tamanho você usa?</legend><div className="mv-rsvp-size-options">{SIZES.map((size) => <label key={size} className={form.outfitSize === size ? "is-selected" : ""}><input type="radio" name="outfitSize" value={size} checked={form.outfitSize === size} onChange={(event) => setForm({ ...form, outfitSize: event.target.value })}/><span>{size}</span></label>)}</div></fieldset>
            <fieldset><legend>Acompanhante adulto</legend><p className="mv-field-note mv-field-note-first">Você pode trazer no máximo um adulto: marido ou mãe.</p>
              <label className={!form.adultCompanionType ? "is-selected" : ""}><input type="radio" name="adultCompanionType" value="" checked={!form.adultCompanionType} onChange={() => setForm({ ...form, adultCompanionType: "" })}/><span><strong>Nenhum acompanhante adulto</strong></span></label>
              <label className={form.adultCompanionType === "husband" ? "is-selected" : ""}><input type="radio" name="adultCompanionType" value="husband" checked={form.adultCompanionType === "husband"} onChange={(event) => setForm({ ...form, adultCompanionType: event.target.value })}/><span><strong>Meu marido</strong></span></label>
              <label className={form.adultCompanionType === "mother" ? "is-selected" : ""}><input type="radio" name="adultCompanionType" value="mother" checked={form.adultCompanionType === "mother"} onChange={(event) => setForm({ ...form, adultCompanionType: event.target.value })}/><span><strong>Minha mãe</strong></span></label>
            </fieldset>
            <fieldset><legend>Criança</legend><p className="mv-field-note mv-field-note-first">O convite acolhe no máximo uma criança, sempre acompanhada.</p>
              <label className={form.childCount === 0 ? "is-selected" : ""}><input type="radio" name="childCount" value="0" checked={form.childCount === 0} onChange={() => setForm({ ...form, childCount: 0, childAge: "", childKitSize: "" })}/><span><strong>Nenhuma criança</strong></span></label>
              <label className={form.childCount === 1 ? "is-selected" : ""}><input type="radio" name="childCount" value="1" checked={form.childCount === 1} onChange={() => setForm({ ...form, childCount: 1 })}/><span><strong>Uma criança</strong></span></label>
              {form.childCount === 1 && <div className="mv-rsvp-child-fields"><label className="mv-text-field"><span>Idade da criança</span><input type="number" min="0" max="120" step="1" inputMode="numeric" aria-describedby="mv-child-age-note" value={form.childAge} onChange={(event) => setForm({ ...form, childAge: event.target.value })}/></label><p id="mv-child-age-note">A faixa de 0 a 120 é um limite técnico de armazenamento; a idade não limita a participação.</p><label className="mv-text-field"><span>Tamanho aproximado da criança</span><input maxLength="40" value={form.childKitSize} onChange={(event) => setForm({ ...form, childKitSize: event.target.value })}/></label><p>Possível surpresa infantil em confirmação; o tamanho não garante produto ou modelo.</p></div>}
            </fieldset>
            <fieldset className="mv-rsvp-transport"><legend>Transporte</legend><label><input type="checkbox" checked={form.transportInterest} onChange={(event) => setForm({ ...form, transportInterest: event.target.checked })}/><span><strong>Quero ser avisada caso haja transporte exclusivo disponível</strong><small>A disponibilidade será confirmada depois.</small></span></label></fieldset>
          </>}
          <fieldset className="mv-consents"><legend>Privacidade</legend><label><input type="checkbox" checked={form.privacyAccepted} onChange={(event) => setForm({ ...form, privacyAccepted: event.target.checked })}/><span>Li e compreendi a <a href="/?privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span></label><label><input type="checkbox" checked={form.imageConsent} onChange={(event) => setForm({ ...form, imageConsent: event.target.checked })}/><span>Autorizo o uso da minha imagem em registros e conteúdos do evento.<small>Opcional — sua escolha não altera a presença.</small></span></label><label className="mv-honeypot" aria-hidden="true">Site<input tabIndex="-1" autoComplete="off" value={form.siteUrl} onChange={(event) => setForm({ ...form, siteUrl: event.target.value })}/></label></fieldset>
          {message && <p className="mv-form-error" role="alert">{message}</p>}
          <button className="mv-primary" type="submit">Revisar resposta<ChevronRight size={18}/></button>
          <p className="mv-security"><ShieldCheck size={16}/>Seu link é individual. Seus dados não aparecem para outras convidadas.</p>
        </form>}
        {step === "review" && <div className="mv-rsvp-sheet-review"><h2 id="mv-rsvp-sheet-title" ref={stepHeadingRef} tabIndex="-1">Revise sua resposta</h2><dl className="mv-review"><div><dt>Presença</dt><dd>{form.response === "confirmed" ? "Confirmada" : "Acompanho de longe"}</dd></div>{form.response === "confirmed" && <><div><dt>Tamanho</dt><dd>{form.outfitSize}</dd></div><div><dt>Acompanhante adulto</dt><dd>{ADULT_COMPANION_LABELS[form.adultCompanionType] || "Nenhum"}</dd></div>{form.childCount === 1 && <><div><dt>Idade da criança</dt><dd>{form.childAge} ano(s) · somente para organização</dd></div><div><dt>Tamanho aproximado da criança</dt><dd>{form.childKitSize}</dd></div></>}<div><dt>Transporte</dt><dd>{form.transportInterest ? "Quero ser avisada" : "Sem interesse no momento"}</dd></div></>}<div><dt>Uso de imagem</dt><dd>{form.imageConsent ? "Autorizado" : "Não autorizado"}</dd></div></dl><button type="button" className="mv-link-button" onClick={() => setStep("form")}>Editar resposta</button><button type="button" className="mv-primary" onClick={submit} disabled={state === "submitting"}>{state === "submitting" ? <><LoaderCircle className="mv-spin"/>Registrando…</> : <>Confirmar resposta<ChevronRight size={18}/></>}</button></div>}
        {step === "success" && <div className="mv-rsvp-sheet-success"><div className="mv-success-mark"><Check aria-hidden="true"/></div><span className="mv-kicker">Resposta registrada</span><h2 id="mv-rsvp-sheet-title" ref={stepHeadingRef} tabIndex="-1">{form.response === "confirmed" ? "Presença confirmada." : "Obrigada por responder."}</h2><p>{form.response === "confirmed" ? "Sua confirmação foi registrada. Você pode editar essa resposta neste mesmo link." : "Sua resposta foi registrada e pode ser alterada neste mesmo link."}</p>{reference && <div className="mv-reference">Referência · {reference}</div>}<button type="button" className="mv-link-button" onClick={() => { setState("ready"); setStep("form"); }}>Editar minha resposta</button></div>}
      </section>
    </div>}
  </>;
}
