// Contrato automático de eventos (uso interno). Carregado sob demanda (lazy)
// apenas quando a URL traz ?contrato=<base64> — fica fora do bundle inicial.
import { useState } from "react";
const CONTROLE_URL="https://bento-os-seven.vercel.app/"; // Bentô OS · Controle de Produção
// somenteLeitura: usado pela página de assinatura. O cliente precisa ver
// EXATAMENTE o texto que está congelado no servidor — nenhum campo editável,
// nenhum valor recalculado na tela. É o mesmo componente de propósito: dois
// componentes diferentes divergiriam, e aí ninguém saberia o que foi assinado.
// assinaturas: {contratada, contratante} vindas do REGISTRO, não do snapshot —
// assinar não pode mudar o texto assinado (mudaria o hash). Quando existem, o
// rodapé mostra a assinatura de verdade no lugar da linha em branco.
export default function ContratoPage({data:d,somenteLeitura,assinaturas}){
  const hoje=new Date().toLocaleDateString("pt-BR");
  const asC=assinaturas&&assinaturas.contratada, asT=assinaturas&&assinaturas.contratante;
  const fmtQuando=(iso)=>{ try{ return new Date(iso).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"}); }catch(e){ return iso||""; } };
  const subtotal=Number(d.total)||0;
  // Desconto negociado (editável pela equipe ao emitir o contrato) — recalcula o total na hora.
  const[desc,setDesc]=useState(Math.max(0,Number(d.desconto)||0));
  const[motivo,setMotivo]=useState(d.descMotivo||"Desconto comercial");
  const descV=Math.min(subtotal,Math.max(0,Number(desc)||0));
  // ---- Transformar em contrato assinável, sem sair desta tela ----
  // A equipe já está com o documento na frente; mandá-la ao painel para redigitar
  // seria o mesmo erro do formulário manual. O que vai para o registro é o que
  // está NA TELA: o desconto editado aqui e o texto de pagamento, se foi mexido.
  const[reg,setReg]=useState(null);      // {link,hash} depois de registrar
  const[regErro,setRegErro]=useState("");
  const[regBusy,setRegBusy]=useState(false);
  const registrar=async()=>{
    setRegErro("");
    // Um contrato sem qualificação do contratante não identifica quem assina —
    // e o link do orçamento é montado ANTES de o cliente informar nome e CPF.
    // Recusar aqui é o que impede o contrato de nascer sem parte.
    const falta=[];
    if(!String(d.nome||"").trim()) falta.push("nome do contratante");
    if(!String(d.doc||"").trim()) falta.push("CPF ou CNPJ");
    if(falta.length){
      setRegErro("Falta "+falta.join(" e ")+". Este link veio da etapa de orçamento, antes de o cliente se identificar — peça os dados e gere o contrato pelo painel, na aba Contratos.");
      return;
    }
    let chave="";
    try{ chave=localStorage.getItem("bento:panelkey")||""; }catch{/* */}
    if(!chave){ chave=window.prompt("Senha do painel para registrar o contrato:")||""; if(!chave) return;
      try{ localStorage.setItem("bento:panelkey",chave); }catch{/* */} }
    setRegBusy(true);
    try{
      // pagamento: só vai se a equipe REALMENTE mexeu no texto padrão
      let pagamento="";
      try{
        const el=document.querySelector('[data-campo="pagamento"]');
        const t=el?el.textContent.trim():"";
        if(t&&!t.startsWith("50% (cinquenta por cento)")) pagamento=t;
      }catch{/* */}
      const r=await fetch("/api/contrato",{method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+chave},
        body:JSON.stringify({acao:"criar",
          nome:d.nome,doc:d.doc,email:d.email,zap:d.zap,empresa:d.empresa,
          data:d.data,horario:d.hora,local:d.local,convidados:d.convidados,
          subtotal, desconto:descV, descMotivo:motivo, observacoes:d.obs, pagamento})});
      const j=await r.json();
      setRegBusy(false);
      if(!j.ok){ setRegErro(j.error||"Não consegui registrar."); return; }
      setReg({link:location.origin+"/?assinar="+encodeURIComponent(j.token),hash:j.hash,id:j.id});
    }catch(e){ setRegBusy(false); setRegErro("Falha: "+(e&&e.message?e.message:"rede")); }
  };
  // A Bentô assina aqui, no instante em que o contrato nasce — é o que a
  // cláusula 9ª descreve. Deixar para depois, no painel, é deixar para nunca: o
  // link já saiu e o cliente assina um documento que a outra parte não assinou.
  const[assC,setAssC]=useState(null);      // {porNome,porCargo,em} depois de assinar
  const[assErro,setAssErro]=useState("");
  const[assBusy,setAssBusy]=useState(false);
  const assinarComoBento=async()=>{
    setAssErro("");
    let quem="";
    try{ quem=localStorage.getItem("bento:assinante")||""; }catch(e){/* */}
    quem=window.prompt("Quem está assinando pela Bentô? (nome completo)",quem)||"";
    if(quem.trim().length<3) return;
    try{ localStorage.setItem("bento:assinante",quem.trim()); }catch(e){/* */}
    let cargo="";
    try{ cargo=localStorage.getItem("bento:assinantecargo")||"Representante legal"; }catch(e){ cargo="Representante legal"; }
    cargo=window.prompt("Cargo de quem assina:",cargo)||"";
    if(cargo.trim()){ try{ localStorage.setItem("bento:assinantecargo",cargo.trim()); }catch(e){/* */} }
    let chave="";
    try{ chave=localStorage.getItem("bento:panelkey")||""; }catch(e){/* */}
    setAssBusy(true);
    try{
      const r=await fetch("/api/contrato",{method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+chave},
        body:JSON.stringify({acao:"assinar-contratada",id:reg.id,porNome:quem.trim(),porCargo:cargo.trim(),hashVisto:reg.hash})});
      const j=await r.json();
      setAssBusy(false);
      if(!j.ok){ setAssErro(j.error||"Não consegui registrar a assinatura."); return; }
      setAssC({porNome:j.porNome,porCargo:j.porCargo,em:j.em});
    }catch(e){ setAssBusy(false); setAssErro("Falha: "+(e&&e.message?e.message:"rede")); }
  };
  const total=Math.max(0,subtotal-descV);
  const entrada=Math.round(total/2), saldo=total-entrada;   // sinal 50% + saldo 50%
  // Pix (filial) — chave = CNPJ. Gera um "Pix Copia e Cola" (BR Code EMV) estático, sem valor.
  const pixKey="61590463000226";
  const emv=(id,v)=>id+String(v.length).padStart(2,"0")+v;
  const crc16=(s)=>{let c=0xFFFF;for(let i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(let j=0;j<8;j++)c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF;}return c.toString(16).toUpperCase().padStart(4,"0");};
  const pixCode=()=>{
    const mai=emv("26",emv("00","BR.GOV.BCB.PIX")+emv("01",pixKey));
    const body=emv("00","01")+mai+emv("52","0000")+emv("53","986")+emv("58","BR")+emv("59","ABB GELATERIA LTDA")+emv("60","VITORIA")+emv("62",emv("05","***"))+"6304";
    return body+crc16(body);
  };
  // Pix com valor (para pagamento integral antecipado).
  const pixCodeAmount=(amount)=>{
    const mai=emv("26",emv("00","BR.GOV.BCB.PIX")+emv("01",pixKey));
    const body=emv("00","01")+mai+emv("52","0000")+emv("53","986")+emv("54",Number(amount).toFixed(2))+emv("58","BR")+emv("59","ABB GELATERIA LTDA")+emv("60","VITORIA")+emv("62",emv("05","***"))+"6304";
    return body+crc16(body);
  };
  // Dias até o evento → desconto de 7% no pagamento integral antecipado (eventos com +30 dias).
  const diasEvento=(()=>{const p=(d.data||"").split("/");if(p.length!==3)return null;const ev=new Date(Number(p[2]),Number(p[1])-1,Number(p[0]));const hj=new Date();hj.setHours(0,0,0,0);const dd=Math.round((ev-hj)/86400000);return isNaN(dd)?null:dd;})();
  const antecipadoOk=diasEvento!=null&&diasEvento>30;
  const integralDesc=Math.round(total*0.93*100)/100; // 7% off
  const economia7=Math.round(total*0.07*100)/100;
  const copyTxt=async(txt,label)=>{
    try{ await navigator.clipboard.writeText(txt); }
    catch{ const t=document.createElement("textarea");t.value=txt;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();try{document.execCommand("copy");}catch{}document.body.removeChild(t); }
    alert(label+" copiado! ✅");
  };
  const Ed=({children,block,campo})=>( // campo editável pela equipe antes de imprimir
    somenteLeitura
      ? <span style={{display:block?"block":"inline"}}>{children}</span>
      : <span contentEditable suppressContentEditableWarning spellCheck={false} data-campo={campo}
      style={{background:"#FFF7D6",borderBottom:"1px dashed #C9A86A",padding:"0 2px",display:block?"block":"inline",outline:"none"}}
      className="ed">{children}</span>
  );
  const Clause=({n,t,children})=>(
    <div style={{marginTop:14}}>
      <div style={{fontWeight:700,fontSize:11.5,letterSpacing:"0.04em"}}>CLÁUSULA {n} — {t}</div>
      <div style={{fontSize:11,lineHeight:1.55,marginTop:4,textAlign:"justify"}}>{children}</div>
    </div>
  );
  // Centavos aparecem quando existem: o Pix é gerado com toFixed(2), então esconder
  // os centavos aqui fazia o botão anunciar um valor e o app cobrar outro.
  const money=v=>typeof v==="number"?v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0,maximumFractionDigits:2}):v;
  const dl=(name,text,mime)=>{const b=new Blob([text],{type:mime});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);};
  const exportICS=()=>{
    const [dd,mm,yy]=(d.data||"").split("/");if(!dd||!mm||!yy){alert("Data do evento inválida — não foi possível gerar o .ics.");return;}
    const date=`${yy}${mm.padStart(2,"0")}${dd.padStart(2,"0")}`;
    const end=new Date(Number(yy),Number(mm)-1,Number(dd)+1); // all-day: DTEND = dia seguinte
    const dateEnd=`${end.getFullYear()}${String(end.getMonth()+1).padStart(2,"0")}${String(end.getDate()).padStart(2,"0")}`;
    const stamp=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    const esc=s=>String(s||"").replace(/([,;\\])/g,"\\$1").replace(/\n/g,"\\n");
    const desc=[`Contratante: ${d.nome} (${d.zap})`,`Convidados: ${d.convidados}`,`Produtos: ${d.tipo} - ate ${d.sabores} sabores`,`Equipe: ${d.promotoras} promotora(s)`,d.km!=null?`Logistica: ~${d.km} km - ref. Bento ${d.loja}`:"",descV>0?`Subtotal: ${money(subtotal)} | Desconto: -${money(descV)}`:"",`Total: ${money(total)}`].filter(Boolean).join("\\n");
    const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Bento Gelateria//Eventos//PT","CALSCALE:GREGORIAN","BEGIN:VEVENT",`UID:ev-${date}-${Date.now()}@bentogelateria.com`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${date}`,`DTEND;VALUE=DATE:${dateEnd}`,`SUMMARY:Evento Bento - ${esc(d.nome)} (${d.convidados} pax)`,`LOCATION:${esc(d.local)}`,`DESCRIPTION:${desc}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
    dl(`evento-bento-${date}.ics`,ics,"text/calendar");
  };
  const dWithDesc=()=>({...d,desconto:descV,descMotivo:motivo,subtotal,total});
  const exportJSON=()=>dl(`evento-bento-${(d.data||"").replace(/\//g,"-")}.json`,JSON.stringify(dWithDesc(),null,2),"application/json");
  const enviarControle=()=>{
    const b64=btoa(unescape(encodeURIComponent(JSON.stringify(dWithDesc())))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    window.open(`${CONTROLE_URL}?evento=${b64}`,"_blank","noopener,noreferrer");
  };
  const avisarEquipe=()=>{
    const msg=["🎉 *EVENTO CONFIRMADO — Bentô*",
      `📅 ${d.data}${d.hora?`  ⏰ início ${d.hora}`:""}   📍 ${d.local}`,
      `👥 ${d.convidados} convidados · ${d.tipo}`,
      `🍨 até ${d.sabores} sabores · ${d.rend}`,
      `🧑‍🍳 ${d.promotoras} promotora${d.promotoras>1?"s":""} (uniformizada${d.promotoras>1?"s":""})`,
      d.km!=null?`🚚 ~${d.km} km · referência loja ${d.loja} (ida e volta)`:"🚚 logística a confirmar",
      d.pers&&d.pers.length?`✨ ${d.pers.join(", ")}`:"",
      descV>0?`🏷️ ${motivo}: -${money(descV)} (de ${money(subtotal)})`:"",
      `💰 Total: ${money(total)}`,
      `👤 ${d.nome} · ${d.zap}`].filter(Boolean).join("\n");
    if(navigator.share){navigator.share({title:"Evento Bentô",text:msg}).catch(()=>{});}
    else{window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank","noopener,noreferrer");}
  };
  return(
    <div style={{minHeight:"100vh",background:"#54594A",padding:"24px 8px",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        .ct-sheet{max-width:760px;margin:0 auto;background:#fff;color:#1a1a1a;padding:56px 58px;box-shadow:0 20px 60px -20px rgba(0,0,0,.5)}
        .descInput{width:78px;text-align:right;font:inherit;color:#1a1a1a;background:#FFF7D6;border:none;border-bottom:1px dashed #C9A86A;padding:1px 3px;outline:none;-moz-appearance:textfield}
        .descInput::-webkit-outer-spin-button,.descInput::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .descMotivo{width:100%;font:inherit;color:#1a1a1a;background:#FFF7D6;border:none;border-bottom:1px dashed #C9A86A;padding:1px 3px;outline:none}
        @media print{
          body *{visibility:visible}
          .ct-bar{display:none!important}
          .ct-wrap{padding:0!important;background:#fff!important}
          .ct-sheet{box-shadow:none!important;max-width:none!important;padding:0!important}
          .ed{background:transparent!important;border-bottom:none!important}
          .descInput,.descMotivo{background:transparent!important;border-bottom:none!important}
          .ct-desc-zero{display:none!important}
          .noprint{display:none!important}
          @page{margin:22mm 18mm}
        }
      `}</style>
      <div className="ct-bar" style={{maxWidth:760,margin:"0 auto 14px",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>window.print()} style={{background:"#C9A86A",border:"none",borderRadius:6,padding:"12px 20px",fontSize:14,fontWeight:700,cursor:"pointer"}}>🖨️ Imprimir / Salvar PDF</button>
        <button onClick={exportICS} style={{background:"transparent",border:"1px solid #C9A86A",borderRadius:6,padding:"12px 16px",fontSize:13,fontWeight:600,color:"#F1ECDD",cursor:"pointer"}}>📅 Agenda (.ics)</button>
        <button onClick={exportJSON} style={{background:"transparent",border:"1px solid #C9A86A",borderRadius:6,padding:"12px 16px",fontSize:13,fontWeight:600,color:"#F1ECDD",cursor:"pointer"}}>⬇️ Dados (JSON)</button>
        <button onClick={avisarEquipe} style={{background:"#0F7F42",border:"none",borderRadius:6,padding:"12px 16px",fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer"}}>📣 Avisar equipe</button>
        <button onClick={enviarControle} style={{background:"#3A4528",border:"none",borderRadius:6,padding:"12px 16px",fontSize:13,fontWeight:700,color:"#F1ECDD",cursor:"pointer"}}>🏭 Enviar p/ Controle Indústria</button>
        <a href="/" style={{color:"#F1ECDD",fontSize:13,textDecoration:"underline"}}>← Voltar ao site</a>
        <span style={{color:"#D9D2BD",fontSize:11.5,flexBasis:"100%"}}>Uso interno · campos amarelos editáveis. <strong>Fluxo de assinatura:</strong> a Bentô assina primeiro (conferência) e, em seguida, o cliente. Modelo automático — recomendamos validação jurídica.</span>
        {/* Registrar daqui mesmo: a equipe já está com o documento na frente, e
            mandá-la ao painel para redigitar seria o erro que já cometemos uma vez.
            O que sobe é o que está na tela — desconto e pagamento inclusive. */}
        {!somenteLeitura&&!reg&&(
          <div style={{flexBasis:"100%",marginTop:4}}>
            <button onClick={registrar} disabled={regBusy}
              style={{background:"#3A4528",color:"#F1ECDD",border:"1px solid #6E7F53",borderRadius:6,padding:"12px 20px",fontSize:14,fontWeight:700,cursor:regBusy?"wait":"pointer"}}>
              {regBusy?"Registrando…":"✍️ Transformar em contrato para assinar"}
            </button>
            <div style={{color:"#D9D2BD",fontSize:11,marginTop:6,lineHeight:1.6,maxWidth:620}}>
              Grava o contrato com o texto congelado e devolve o link de assinatura do cliente.
              Vai o que está nesta tela, incluindo o desconto e a cláusula de pagamento se você editou.
              Os demais campos amarelos servem só para a versão impressa.
            </div>
            {regErro&&<div role="alert" style={{color:"#F0C9C9",fontSize:12.5,marginTop:8,lineHeight:1.55,maxWidth:620}}>{regErro}</div>}
          </div>
        )}
        {reg&&(
          <div style={{flexBasis:"100%",marginTop:6,border:"1px solid #6E7F53",borderRadius:8,padding:"12px 14px",background:"#2A331E"}}>
            <div style={{color:"#F1ECDD",fontSize:13,fontWeight:700,marginBottom:6}}>Contrato registrado — envie este link ao cliente</div>
            <div style={{color:"#C7D6A8",fontSize:12,wordBreak:"break-all",lineHeight:1.6,fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>{reg.link}</div>
            <button onClick={()=>copyTxt(reg.link,"Link de assinatura")}
              style={{marginTop:9,background:"#C9A86A",border:"none",borderRadius:6,padding:"9px 15px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Copiar link</button>
            <div style={{color:"#9FB07E",fontSize:10.5,marginTop:7,lineHeight:1.6}}>
              Aparece uma única vez. hash {String(reg.hash).slice(0,24)}…
            </div>
            <div style={{marginTop:11,paddingTop:10,borderTop:"1px solid #4C5B36"}}>
              {assC?(
                <div style={{color:"#C7D6A8",fontSize:12,lineHeight:1.6}}>
                  ✓ Assinado pela Bentô — <strong>{assC.porNome}</strong> ({assC.porCargo}), {new Date(assC.em).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"})}.
                </div>
              ):(
                <>
                  <button onClick={assinarComoBento} disabled={assBusy}
                    style={{background:"transparent",color:"#C7D6A8",border:"1px solid #6E7F53",borderRadius:6,padding:"9px 15px",fontSize:12.5,fontWeight:700,cursor:assBusy?"wait":"pointer"}}>
                    {assBusy?"Registrando…":"✍️ Assinar como Bentô (conferi os termos)"}
                  </button>
                  <div style={{color:"#9FB07E",fontSize:10.5,marginTop:6,lineHeight:1.6,maxWidth:560}}>
                    Assine antes de mandar o link: o contrato diz que a CONTRATADA confere e assina primeiro.
                    Dá para fazer depois na aba Contratos do painel, mas aí o cliente já recebeu.
                  </div>
                </>
              )}
              {assErro&&<div role="alert" style={{color:"#F0C9C9",fontSize:12,marginTop:8,lineHeight:1.55}}>{assErro}</div>}
            </div>
          </div>
        )}
      </div>
      <div className="ct-wrap"><div className="ct-sheet">
        <div style={{textAlign:"center",borderBottom:"2px solid #1a1a1a",paddingBottom:14}}>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:600}}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</div>
          <div style={{fontSize:11,letterSpacing:"0.18em",marginTop:4}}>GELATERIA PARA EVENTOS · BENTÔ GELATOS</div>
        </div>
        <div style={{marginTop:18,fontSize:11,lineHeight:1.6}}>
          <strong>CONTRATADA:</strong> ABB GELATERIA LTDA (nome fantasia <strong>Bentô Gelateria</strong>), CNPJ 61.590.463/0001-45, com sede na R. Joaquim Lírio, 455, Quiosque 02, Praia do Canto, Vitória — ES, CEP 29.055-460, WhatsApp (27) 99915-9995, e-mail bentogelateria@gmail.com.<br/>
          <strong>CONTRATANTE:</strong> {d.nome}, CPF/CNPJ {d.doc}{d.empresa?<> , representando <strong>{d.empresa}</strong></>:null}, e-mail {d.email}, WhatsApp {d.zap}.
        </div>
        <Clause n="1ª" t="OBJETO">Prestação de serviço de gelateria para evento, incluindo carrinho Bentô, produtos e equipe, a realizar-se em <strong>{d.data}</strong>{d.hora?<> com início previsto às <strong>{d.hora}</strong></>:null}, no endereço <strong>{d.local}</strong>, para aproximadamente <strong>{d.convidados} convidados</strong>.</Clause>
        <Clause n="2ª" t="DETALHAMENTO DO SERVIÇO">
          Produtos: <strong>{d.tipo}</strong>, com até <strong>{d.sabores} sabores</strong> ({d.rend}). Equipe: <strong>{d.promotoras} promotora{d.promotoras>1?"s":""}</strong> uniformizada{d.promotoras>1?"s":""} e treinada{d.promotoras>1?"s":""}. {d.pers&&d.pers.length>0?<>Personalização contratada: <strong>{d.pers.join(", ")}</strong>. </>:null}
          Duração do serviço: <Ed>[definir horário de início e término]</Ed>.
        </Clause>
        <Clause n="3ª" t="VALORES">
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:6,fontSize:11}}>
            <tbody>
              {[["Serviço de gelateria (R$ 27 × "+d.convidados+" convidados)",money(d.base)],
                d.logistica!=null?["Logística — ~"+d.km+" km · referência Bentô "+d.loja+" (ida e volta)",money(d.logistica)]:["Logística (deslocamento)","a confirmar"],
                d.potinhos>0?["Potinhos ou rótulos personalizados (2 por pessoa)",money(d.potinhos)]:null,
                d.carrinho>0?["Personalização do carrinho",money(d.carrinho)]:null,
                d.persAC&&d.persAC.length>0?[d.persAC.join(", "),"a combinar"]:null,
              ].filter(Boolean).map(([l,v],i)=>(
                <tr key={i}><td style={{border:"1px solid #999",padding:"6px 10px"}}>{l}</td><td style={{border:"1px solid #999",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap"}}>{v}</td></tr>
              ))}
              <tr><td style={{border:"1px solid #999",padding:"6px 10px"}}>Subtotal</td><td style={{border:"1px solid #999",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap"}}>{money(subtotal)}</td></tr>
              <tr className={"ct-desc"+(descV>0?"":" ct-desc-zero")}>
                <td style={{border:"1px solid #999",padding:"6px 10px"}}>
                  <input className="descMotivo" value={motivo} onChange={e=>setMotivo(e.target.value)} aria-label="Descrição do desconto"/>
                </td>
                <td style={{border:"1px solid #999",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap"}}>
                  −&nbsp;{somenteLeitura
                    ? money(descV)
                    : <>R$&nbsp;<input className="descInput" type="number" min="0" step="1" value={desc}
                        onChange={e=>setDesc(e.target.value)} aria-label="Valor do desconto em reais"/></>}
                </td>
              </tr>
              <tr><td style={{border:"1px solid #1a1a1a",padding:"7px 10px",fontWeight:700}}>TOTAL</td><td style={{border:"1px solid #1a1a1a",padding:"7px 10px",textAlign:"right",fontWeight:700,whiteSpace:"nowrap"}}>{money(total)}</td></tr>
            </tbody>
          </table>
          <div className="ct-bar" style={{fontSize:9.5,color:"#A9831C",marginTop:5}}>Para preços negociados, ajuste o <strong>desconto</strong> (em R$) — o total recalcula sozinho. Deixe em 0 se não houver. Some o valor à descrição se preferir percentual.</div>
        </Clause>
        <Clause n="4ª" t="PAGAMENTO">
          {/* Pagamento ACORDADO com este cliente. O padrão 50/50 serve para a
              maioria, mas cliente empresa costuma pagar integral por depósito
              contra nota, com prazo — e um contrato afirmando 50/50 quando o
              combinado foi outro é briga na certa. Com d.pagamento preenchido,
              ele manda, e a tabela de sinal/saldo some junto. */}
          {d.pagamento
            ? <div style={{whiteSpace:"pre-wrap"}}>{d.pagamento}</div>
            : <Ed block campo="pagamento">50% (cinquenta por cento) do valor total na assinatura deste contrato, a título de sinal e reserva de data, e o saldo restante (os 50% remanescentes) até 7 (sete) dias antes da data do evento. Pagamentos via Pix ou transferência bancária, conforme os dados abaixo.</Ed>}
          {!d.pagamento&&<table style={{width:"100%",borderCollapse:"collapse",marginTop:8,fontSize:11}}>
            <tbody>
              <tr><td style={{border:"1px solid #999",padding:"6px 10px"}}>Entrada (sinal · 50%) — na assinatura</td><td style={{border:"1px solid #999",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap",fontWeight:700}}>{money(entrada)}</td></tr>
              <tr><td style={{border:"1px solid #999",padding:"6px 10px"}}>Saldo (50%) — até 7 dias antes do evento</td><td style={{border:"1px solid #999",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap",fontWeight:700}}>{money(saldo)}</td></tr>
              {antecipadoOk&&<tr style={{background:"#EEF5E2"}}><td style={{border:"1px solid #1FA855",padding:"6px 10px"}}>💸 <strong>Ou pagamento integral antecipado via Pix — 7% de desconto</strong> (evento com mais de 30 dias). Economia de {money(economia7)}.</td><td style={{border:"1px solid #1FA855",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap",fontWeight:700,color:"#1B7A40"}}>{money(integralDesc)}</td></tr>}
            </tbody>
          </table>}
          <div style={{marginTop:8,border:"1px solid #C9A86A",borderRadius:6,padding:"10px 12px",fontSize:11,lineHeight:1.7,background:"#FCFAF2"}}>
            <div style={{fontWeight:700,letterSpacing:"0.04em",marginBottom:3}}>DADOS PARA PAGAMENTO</div>
            Titular: <strong>ABB GELATERIA LTDA</strong><br/>
            <strong>Pix (CNPJ):</strong> 61.590.463/0002-26 <span style={{fontWeight:400}}>— filial da CONTRATADA, mesma pessoa jurídica (raiz de CNPJ 61.590.463); o pagamento a esta chave quita a obrigação.</span><br/>
            Banco: <strong>Sicoob</strong> · Agência: <strong>3010</strong> · Conta corrente: <strong>292.558-3</strong>
            <div className="noprint" style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:9}}>
              <button onClick={()=>copyTxt(pixKey,"Chave Pix (CNPJ)")} style={{background:"#C9A86A",border:"none",borderRadius:5,padding:"8px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>📋 Copiar chave Pix</button>
              <button onClick={()=>copyTxt(pixCode(),"Pix Copia e Cola")} style={{background:"#3A4528",color:"#F1ECDD",border:"none",borderRadius:5,padding:"8px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>📲 Copiar Pix Copia e Cola</button>
              {antecipadoOk&&<button onClick={()=>copyTxt(pixCodeAmount(integralDesc),"Pix integral com 7% de desconto")} style={{background:"#0F7F42",color:"#fff",border:"none",borderRadius:5,padding:"8px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>💸 Copiar Pix integral −7% ({money(integralDesc)})</button>}
            </div>
            <div className="noprint" style={{fontSize:9.5,color:"#A9831C",marginTop:5}}>O “Pix Copia e Cola” leva titular e chave — cole no app e digite o valor (entrada ou saldo). {antecipadoOk?<>O botão verde já vem com o <strong>valor integral e o 7% de desconto</strong> aplicado.</>:null}</div>
          </div>
        </Clause>
        <Clause n="5ª" t="OBRIGAÇÕES DA CONTRATADA">Fornecer os produtos na quantidade e qualidade contratadas, dentro dos padrões sanitários; disponibilizar equipe uniformizada e treinada; montar e desmontar a estrutura; manter os produtos em temperatura adequada durante o serviço.</Clause>
        <Clause n="6ª" t="OBRIGAÇÕES DO CONTRATANTE">Garantir acesso ao local com antecedência mínima de <Ed>[2 horas]</Ed> para montagem; disponibilizar ponto de energia elétrica <Ed>[220V]</Ed> próximo ao local de instalação; informar com antecedência alterações de data, local ou número de convidados.</Clause>
        {/* Cláusulas negociadas com ESTE cliente. Entram numeradas na sequência,
            antes do cancelamento, para não empurrar a numeração das que já
            existem — o contrato assinado precisa manter as referências ("cláusula
            7ª") que os aceites e o texto citam. */}
        {Array.isArray(d.clausulas)&&d.clausulas.length>0&&d.clausulas.map((c,i)=>(
          <Clause key={i} n={"6."+(i+1)} t={c.titulo||"CLÁUSULA ESPECIAL"}>
            <div style={{whiteSpace:"pre-wrap"}}>{c.texto}</div>
          </Clause>
        ))}
        <Clause n="7ª" t="CANCELAMENTO E REMARCAÇÃO"><div style={{border:"2px solid #8A2B2B",borderRadius:6,padding:"9px 11px",background:"#FDF6F6",fontWeight:600}}><Ed block>Em caso de cancelamento pelo CONTRATANTE com mais de 30 dias de antecedência, será restituído o valor pago, deduzido de 20% a título de custos administrativos. Com menos de 30 dias, o sinal não será restituído. Remarcações estão sujeitas à disponibilidade de agenda da CONTRATADA.</Ed></div></Clause>
        <Clause n="8ª" t="DIREITO DE ARREPENDIMENTO">Quando a contratação ocorrer <strong>fora do estabelecimento comercial</strong> — inclusive por assinatura eletrônica à distância —, o CONTRATANTE pode desistir do contrato em até <strong>7 (sete) dias corridos</strong> contados da assinatura, com <strong>devolução integral</strong> de todo valor pago, nos termos do art. 49 do Código de Defesa do Consumidor. A desistência deve ser comunicada pelo WhatsApp ou e-mail indicados neste instrumento. Passado esse prazo, aplica-se a cláusula 7ª.</Clause>
        <Clause n="9ª" t="ASSINATURA E ACEITE">Este instrumento é assinado eletronicamente <strong>pelas duas partes</strong>: pela CONTRATADA, que confere e valida os termos e valores — em regra antes do envio ao CONTRATANTE —, e pelo CONTRATANTE, cuja assinatura formaliza a integral concordância com as condições aqui pactuadas. <strong>A data e a hora de cada assinatura são registradas pelo servidor da CONTRATADA</strong> e constam do dossiê, que é a fonte sobre quando e em que ordem cada parte assinou. As partes <strong>admitem expressamente como válida entre si</strong> a assinatura eletrônica aqui empregada, ainda que não baseada em certificado ICP-Brasil, na forma do <strong>art. 10, §2º, da MP 2.200-2/2001</strong>. Para tanto, a CONTRATADA registra e conserva: o texto integral do contrato no momento da assinatura e seu resumo criptográfico (hash SHA-256), a data e a hora do servidor, o endereço IP e o navegador utilizados, o aceite expresso do CONTRATANTE e a identificação de quem assinou pela CONTRATADA — dossiê que fica à disposição das partes.</Clause>
        <Clause n="10ª" t="DISPOSIÇÕES GERAIS">Casos de força maior serão tratados conforme a legislação vigente. Fica eleito o foro da Comarca de <strong>Vitória — ES</strong> para dirimir controvérsias oriundas deste contrato, <strong>ressalvado ao CONTRATANTE consumidor o direito de propor a ação no foro de seu domicílio</strong>, nos termos do art. 101, I, do Código de Defesa do Consumidor.</Clause>
        <div style={{marginTop:30,fontSize:11}}>Vitória — ES, <Ed>{hoje}</Ed>.</div>
        {/* Linha em branco enquanto ninguém assinou; assinatura REGISTRADA quando
            existe. O espaço vazio no lugar de uma assinatura que já foi dada faz
            o documento parecer pendente — e era exatamente o que acontecia com a
            CONTRATADA, que não tinha como assinar em lugar nenhum. */}
        <div style={{display:"flex",gap:40,marginTop:46}}>
          {[["1ª · CONTRATADA","ABB Gelateria Ltda · Bentô Gelateria","assina e confere primeiro",asC&&{quem:asC.porNome,papel:asC.porCargo,em:asC.em}],
            ["2ª · CONTRATANTE",d.nome,"assina após a conferência",asT&&{quem:asT.nomeDigitado,papel:"Contratante",em:asT.em}]].map(([t,n,o,as])=>(
            <div key={t} style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:8.5,letterSpacing:"0.12em",color:as?"#3A5A2E":"#A9831C",fontWeight:700,marginBottom:as?6:34}}>
                {as?"ASSINADO ELETRONICAMENTE":o.toUpperCase()}
              </div>
              {as&&(
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,lineHeight:1.25,paddingBottom:3}}>{as.quem}</div>
              )}
              {as&&(
                <div style={{fontSize:8.5,color:"#555",marginBottom:2}}>{as.papel} · {fmtQuando(as.em)}</div>
              )}
              <div style={{borderTop:"1px solid #1a1a1a",paddingTop:6,fontSize:10.5}}><strong>{t}</strong><br/>{n}</div>
            </div>
          ))}
        </div>
        {(asC||asT)&&(
          <div style={{marginTop:14,fontSize:9,color:"#555",lineHeight:1.6,textAlign:"center"}}>
            Assinaturas eletrônicas registradas pela CONTRATADA na forma do art. 10, §2º, da MP 2.200-2/2001.
            Data e hora do servidor (horário de Brasília); IP e navegador de cada assinatura constam do dossiê.
          </div>
        )}
        <div style={{marginTop:34,paddingTop:10,borderTop:"1px solid #ccc",fontSize:8.5,color:"#777",textAlign:"center"}}>Documento gerado automaticamente em {hoje} a partir do orçamento online · bentogelateria.com</div>
      </div></div>
    </div>
  );
}
