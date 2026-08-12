import { useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";

const TIERS = [
  { value: "founding", label: "Cota Fundadora", includes: ["Marca em destaque no painel coletivo e na camiseta oficial", "Presença na abertura do projeto", "Prioridade na construção de um capítulo do ciclo anual", "Possibilidade de integração à experiência, ao kit e ao conteúdo"] },
  { value: "experience", label: "Cota Experiência", includes: ["Ativação presencial em um momento definido do encontro", "Marca no painel coletivo e na camiseta oficial", "Registro contextual da ativação no conteúdo do capítulo"] },
  { value: "kit", label: "Cota Kit", includes: ["Produto ou serviço aprovado no kit da influenciadora", "Crédito de marca ligado ao item oferecido", "Marca no painel coletivo e na camiseta oficial"] },
  { value: "mobility", label: "Cota Mobilidade Premium", includes: ["Presença cenográfica de um veículo no acesso ou na área acordada", "Integração editorial à jornada de chegada", "Assinatura no painel coletivo e nos materiais aprovados", "Captação contextual da experiência, sem promessa de alcance"] },
  { value: "support", label: "Cota Apoio", includes: ["Crédito coletivo pelo apoio operacional, serviço ou fornecimento", "Marca no painel coletivo e na camiseta oficial", "Aplicação definida conforme a contribuição confirmada"] },
  { value: "custom", label: "Cota Sob Medida", includes: ["Combinação personalizada de experiência, kit, conteúdo ou continuidade", "Marca no painel e na camiseta conforme o escopo aprovado", "Entregas finais definidas em proposta individual"] },
];

const CONTRIBUTIONS = [
  ["financial", "Investimento financeiro"],
  ["product", "Produtos"],
  ["service", "Serviços"],
  ["mixed", "Combinação"],
  ["other", "Outra proposta"],
];

const initialForm = { companyName: "", contactName: "", email: "", phone: "", tier: "", contributionType: "", contributionDetails: "", privacyAccepted: false, siteUrl: "" };

export default function PartnerInterestFlow() {
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState("form");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    if (form.companyName.trim().length < 2) return "Informe a marca ou empresa.";
    if (form.contactName.trim().length < 2) return "Informe a pessoa responsável.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Informe um e-mail válido.";
    if (!TIERS.some(({ value }) => value === form.tier)) return "Escolha uma cota de interesse.";
    if (!CONTRIBUTIONS.some(([value]) => value === form.contributionType)) return "Escolha o tipo de contribuição.";
    if (!form.privacyAccepted) return "Confirme a leitura da Política de Privacidade.";
    return "";
  }

  function review(event) {
    event.preventDefault();
    const error = validate();
    if (error) { setMessage(error); return; }
    setMessage("");
    setState("review");
  }

  async function submit() {
    setState("submitting");
    setMessage("");
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setReference("DEMO-PARCEIRO");
      setState("success");
      return;
    }
    try {
      const response = await fetch("/api/movimento-parceiros", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(body.error || "Não foi possível registrar agora."); setState("form"); return; }
      setReference(body.reference);
      setState("success");
    } catch {
      setMessage("Não foi possível registrar agora. Seus dados continuam nesta tela.");
      setState("form");
    }
  }

  const tierLabel = TIERS.find(({ value }) => value === form.tier)?.label || "";
  const contributionLabel = CONTRIBUTIONS.find(([value]) => value === form.contributionType)?.[1] || "";

  if (state === "success") return <section id="cotas" className="mv-section mv-partner-form mv-partner-success"><div className="mv-success-mark"><Check aria-hidden="true"/></div><span className="mv-kicker">Interesse registrado</span><h2>Agora desenhamos o encaixe.</h2><p>Recebemos a preferência da {form.companyName}. A seleção é uma manifestação de interesse e não constitui reserva, exclusividade ou contrato.</p><div className="mv-reference">Referência · {reference}</div><button type="button" className="mv-link-button" onClick={() => setState("form")}>Editar resposta</button></section>;

  if (state === "review" || state === "submitting") return <section id="cotas" className="mv-section mv-partner-form"><span className="mv-kicker">Revise a manifestação de interesse</span><h2>Está tudo certo?</h2><dl className="mv-review"><div><dt>Marca</dt><dd>{form.companyName}</dd></div><div><dt>Responsável</dt><dd>{form.contactName}</dd></div><div><dt>Cota de interesse</dt><dd>{tierLabel}</dd></div><div><dt>Contribuição</dt><dd>{contributionLabel}</dd></div></dl><p className="mv-field-note">Esta seleção não gera reserva, exclusividade ou obrigação comercial. O escopo final depende de proposta e aprovação.</p>{message && <p className="mv-form-error" role="alert">{message}</p>}<div className="mv-form-actions"><button type="button" className="mv-link-button" onClick={() => setState("form")} disabled={state === "submitting"}>Voltar</button><button type="button" className="mv-primary" onClick={submit} disabled={state === "submitting"}>{state === "submitting" ? <><LoaderCircle className="mv-spin"/>Registrando…</> : <>Enviar interesse<ChevronRight size={18}/></>}</button></div></section>;

  return <section id="cotas" className="mv-section mv-partner-form"><div className="mv-section-head"><span className="mv-kicker">Escolha seu ponto de entrada</span><h2>O que cada cota contempla.</h2><p>Selecione a estrutura que mais combina com o papel da sua marca. Nesta etapa, apresentamos somente as entregas incluídas.</p></div><form className="mv-form" onSubmit={review} noValidate><fieldset><legend>Cota de interesse</legend><div className="mv-tier-options">{TIERS.map(({ value, label, includes }) => <label key={value} className={form.tier === value ? "is-selected" : ""}><input type="radio" name="tier" value={value} checked={form.tier === value} onChange={(event) => change("tier", event.target.value)}/><span><strong>{label}</strong><small className="mv-tier-includes-title">Inclui</small><ul>{includes.map((item) => <li key={item}>{item}</li>)}</ul></span></label>)}</div></fieldset><fieldset><legend>Dados para contato</legend><div className="mv-text-grid"><label className="mv-text-field"><span>Marca ou empresa</span><input value={form.companyName} onChange={(event) => change("companyName", event.target.value)} autoComplete="organization" maxLength="120"/></label><label className="mv-text-field"><span>Pessoa responsável</span><input value={form.contactName} onChange={(event) => change("contactName", event.target.value)} autoComplete="name" maxLength="120"/></label><label className="mv-text-field"><span>E-mail profissional</span><input type="email" value={form.email} onChange={(event) => change("email", event.target.value)} autoComplete="email" maxLength="160"/></label><label className="mv-text-field"><span>Telefone ou WhatsApp</span><input type="tel" value={form.phone} onChange={(event) => change("phone", event.target.value)} autoComplete="tel" maxLength="32"/></label></div></fieldset><fieldset><legend>Como pretende contribuir?</legend><div className="mv-contribution-options">{CONTRIBUTIONS.map(([value, label]) => <label key={value} className={form.contributionType === value ? "is-selected" : ""}><input type="radio" name="contributionType" value={value} checked={form.contributionType === value} onChange={(event) => change("contributionType", event.target.value)}/><span><strong>{label}</strong></span></label>)}</div><label className="mv-text-field mv-textarea"><span>Conte um pouco sobre a proposta</span><textarea value={form.contributionDetails} onChange={(event) => change("contributionDetails", event.target.value)} maxLength="1200" rows="5"/></label></fieldset><fieldset className="mv-consents"><label><input type="checkbox" checked={form.privacyAccepted} onChange={(event) => change("privacyAccepted", event.target.checked)}/><span>Li e compreendi a <a href="/?privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span></label><label className="mv-honeypot" aria-hidden="true">Site<input tabIndex="-1" autoComplete="off" value={form.siteUrl} onChange={(event) => change("siteUrl", event.target.value)}/></label></fieldset><p className="mv-field-note">A escolha é uma manifestação de interesse, não uma contratação nem uma concessão de exclusividade.</p>{message && <p className="mv-form-error" role="alert">{message}</p>}<button className="mv-primary" type="submit">Revisar interesse<ChevronRight size={18}/></button><p className="mv-security"><ShieldCheck size={16}/>Os dados são usados apenas para avaliar e responder à proposta de parceria.</p></form></section>;
}
