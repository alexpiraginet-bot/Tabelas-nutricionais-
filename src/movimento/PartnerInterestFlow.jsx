import { useEffect, useMemo, useRef, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import X from "lucide-react/dist/esm/icons/x.js";
import { EVENT, PARTNER_TIERS } from "./movement-content.js";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']):not([tabindex='-1']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const PARTICIPATIONS = [
  { value: "select", label: "Select", includes: PARTNER_TIERS[0].includes },
  { value: "experience", label: "Experience", includes: PARTNER_TIERS[1].includes },
  { value: "signature", label: "Signature", includes: PARTNER_TIERS[2].includes },
  { value: "founding_circle", label: "Founding Circle", includes: PARTNER_TIERS[3].includes },
];
const CONTRIBUTIONS = [["financial", "Investimento financeiro"], ["product", "Produtos"], ["service", "Serviços"], ["mixed", "Combinação"], ["other", "Outra proposta"]];

function formFromInvite(invite, currentPartnerLead) {
  return {
    companyName: invite?.companyName || "",
    contactName: invite?.recipientName || "",
    email: currentPartnerLead?.email || "",
    phone: currentPartnerLead?.phone || "",
    tier: currentPartnerLead?.tier || "",
    contributionType: currentPartnerLead?.contributionType || "",
    contributionDetails: currentPartnerLead?.contributionDetails || "",
    privacyAccepted: Boolean(currentPartnerLead),
    siteUrl: "",
  };
}

function isLocalDemo(token) {
  return token === "demo" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export default function PartnerInterestFlow({ token, invite, currentPartnerLead }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => formFromInvite(invite, currentPartnerLead));
  const [step, setStep] = useState("form");
  const [state, setState] = useState("ready");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const dialogRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const triggerRef = useRef(null);
  const initializedLead = useRef(currentPartnerLead);
  const stateRef = useRef(state);
  const demo = useMemo(() => isLocalDemo(token), [token]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (initializedLead.current === currentPartnerLead) return;
    initializedLead.current = currentPartnerLead;
    setForm(formFromInvite(invite, currentPartnerLead));
  }, [invite, currentPartnerLead]);

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
    if (form.companyName.trim().length < 2 || form.contactName.trim().length < 2) return "A identidade deste convite não está disponível.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Informe um e-mail profissional válido.";
    if (!PARTICIPATIONS.some(({ value }) => value === form.tier)) return "Escolha uma participação.";
    if (!CONTRIBUTIONS.some(([value]) => value === form.contributionType)) return "Escolha como pretende contribuir.";
    if (!form.privacyAccepted) return "Confirme a leitura da Política de Privacidade.";
    return "";
  })();

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
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
      setReference("DEMO-PARCEIRO");
      setState("success");
      setStep("success");
      return;
    }
    try {
      const response = await fetch("/api/movimento-parceiros", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível registrar agora.");
      setReference(body.reference || "");
      setState("success");
      setStep("success");
    } catch (submissionError) {
      setMessage(submissionError.message || "Não foi possível registrar agora. Sua seleção continua nesta tela.");
      setState("ready");
      setStep("form");
    }
  }

  const participationLabel = PARTICIPATIONS.find(({ value }) => value === form.tier)?.label || "";
  const contributionLabel = CONTRIBUTIONS.find(([value]) => value === form.contributionType)?.[1] || "";

  return <>
    <button ref={triggerRef} type="button" className="mv-partner-persistent-cta" aria-haspopup="dialog" aria-expanded={open} aria-controls="mv-partner-sheet" onClick={() => { setOpen(true); setStep("form"); setMessage(""); }}>
      Escolher participação<ChevronRight size={18}/>
    </button>
    {open && <div className="mv-partner-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && state !== "submitting") setOpen(false); }}>
      <section id="mv-partner-sheet" ref={dialogRef} className="mv-partner-sheet" role="dialog" aria-modal="true" aria-labelledby="mv-partner-sheet-title" tabIndex="-1">
        <div className="mv-partner-sheet-header"><span className="mv-kicker">Proposta pessoal</span><button type="button" className="mv-partner-sheet-close" aria-label="Fechar seleção" onClick={() => setOpen(false)} disabled={state === "submitting"}><X aria-hidden="true"/></button></div>
        {step === "form" && <form className="mv-partner-sheet-form" onSubmit={review} noValidate>
          <h2 id="mv-partner-sheet-title" ref={stepHeadingRef} tabIndex="-1">{form.companyName}, escolha sua participação.</h2>
          <p className="mv-partner-sheet-lead">{EVENT.dateLong} · {EVENT.location}. A escolha registra interesse e não constitui reserva, exclusividade ou contrato.</p>
          <fieldset><legend>Participação</legend><div className="mv-partner-participation-options">{PARTICIPATIONS.map(({ value, label, includes }) => <label key={value} className={form.tier === value ? "is-selected" : ""}><input type="radio" name="tier" value={value} checked={form.tier === value} onChange={(event) => change("tier", event.target.value)}/><span><strong>{label}</strong><small>Inclui</small><ul>{includes.map((item) => <li key={item}>{item}</li>)}</ul></span></label>)}</div></fieldset>
          <p className="mv-field-note">Nenhuma opção promete preço, exclusividade, alcance, publicação, categoria protegida ou continuidade anual.</p>
          <fieldset><legend>Identidade e contato</legend><div className="mv-text-grid"><label className="mv-text-field"><span>Marca ou empresa</span><input value={form.companyName} readOnly aria-readonly="true" autoComplete="organization"/></label><label className="mv-text-field"><span>Pessoa responsável</span><input value={form.contactName} readOnly aria-readonly="true" autoComplete="name"/></label><label className="mv-text-field"><span>E-mail profissional</span><input type="email" value={form.email} onChange={(event) => change("email", event.target.value)} autoComplete="email" maxLength="160"/></label><label className="mv-text-field"><span>Telefone ou WhatsApp</span><input type="tel" value={form.phone} onChange={(event) => change("phone", event.target.value)} autoComplete="tel" maxLength="32"/></label></div></fieldset>
          <fieldset><legend>Como pretende contribuir?</legend><div className="mv-partner-contribution-options">{CONTRIBUTIONS.map(([value, label]) => <label key={value} className={form.contributionType === value ? "is-selected" : ""}><input type="radio" name="contributionType" value={value} checked={form.contributionType === value} onChange={(event) => change("contributionType", event.target.value)}/><span><strong>{label}</strong></span></label>)}</div><label className="mv-text-field mv-textarea"><span>Conte um pouco sobre a proposta</span><textarea value={form.contributionDetails} onChange={(event) => change("contributionDetails", event.target.value)} maxLength="1200" rows="5"/></label></fieldset>
          <fieldset className="mv-consents"><legend>Privacidade</legend><label><input type="checkbox" checked={form.privacyAccepted} onChange={(event) => change("privacyAccepted", event.target.checked)}/><span>Li e compreendi a <a href="/?privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span></label><label className="mv-honeypot" aria-hidden="true">Site<input tabIndex="-1" autoComplete="off" value={form.siteUrl} onChange={(event) => change("siteUrl", event.target.value)}/></label></fieldset>
          {message && <p className="mv-form-error" role="alert">{message}</p>}
          <button className="mv-primary" type="submit">Revisar seleção<ChevronRight size={18}/></button><p className="mv-security"><ShieldCheck size={16}/>Os dados são usados apenas para avaliar e responder à proposta de parceria.</p>
        </form>}
        {step === "review" && <div className="mv-partner-sheet-review"><span className="mv-kicker">Revise sua seleção</span><h2 id="mv-partner-sheet-title" ref={stepHeadingRef} tabIndex="-1">Está tudo certo?</h2><dl className="mv-review"><div><dt>Marca</dt><dd>{form.companyName}</dd></div><div><dt>Responsável</dt><dd>{form.contactName}</dd></div><div><dt>Participação</dt><dd>{participationLabel}</dd></div><div><dt>Contribuição</dt><dd>{contributionLabel}</dd></div><div><dt>Contato</dt><dd>{form.email}{form.phone ? ` · ${form.phone}` : ""}</dd></div></dl><p className="mv-field-note">A seleção registra interesse e não constitui reserva, exclusividade ou contrato. O escopo será conversado separadamente.</p>{message && <p className="mv-form-error" role="alert">{message}</p>}<div className="mv-form-actions"><button type="button" className="mv-link-button" onClick={() => setStep("form")} disabled={state === "submitting"}>Voltar</button><button type="button" className="mv-primary" onClick={submit} disabled={state === "submitting"}>{state === "submitting" ? <><LoaderCircle className="mv-spin"/>Registrando…</> : <>Enviar seleção<ChevronRight size={18}/></>}</button></div></div>}
        {step === "success" && <div className="mv-partner-sheet-success"><div className="mv-success-mark"><Check aria-hidden="true"/></div><span className="mv-kicker">Interesse registrado</span><h2 id="mv-partner-sheet-title" ref={stepHeadingRef} tabIndex="-1">Agora desenhamos o encaixe.</h2><p>Recebemos a preferência da {form.companyName}. A escolha permanece não vinculante até uma conversa de escopo e uma proposta aprovada.</p>{reference && <div className="mv-reference">Referência · {reference}</div>}<button type="button" className="mv-link-button" onClick={() => setStep("form")}>Editar seleção</button></div>}
      </section>
    </div>}
  </>;
}
