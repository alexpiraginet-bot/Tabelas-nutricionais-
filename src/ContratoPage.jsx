// Contrato automático de eventos (uso interno). Carregado sob demanda (lazy)
// apenas quando a URL traz ?contrato=<base64> — fica fora do bundle inicial.
import { useState } from "react";
const CONTROLE_URL="https://bento-os-seven.vercel.app/"; // Bentô OS · Controle de Produção
export default function ContratoPage({data:d}){
  const hoje=new Date().toLocaleDateString("pt-BR");
  const subtotal=Number(d.total)||0;
  // Desconto negociado (editável pela equipe ao emitir o contrato) — recalcula o total na hora.
  const[desc,setDesc]=useState(Math.max(0,Number(d.desconto)||0));
  const[motivo,setMotivo]=useState(d.descMotivo||"Desconto comercial");
  const descV=Math.min(subtotal,Math.max(0,Number(desc)||0));
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
  const Ed=({children,block})=>( // campo editável pela equipe antes de imprimir
    <span contentEditable suppressContentEditableWarning spellCheck={false}
      style={{background:"#FFF7D6",borderBottom:"1px dashed #C9A86A",padding:"0 2px",display:block?"block":"inline",outline:"none"}}
      className="ed">{children}</span>
  );
  const Clause=({n,t,children})=>(
    <div style={{marginTop:14}}>
      <div style={{fontWeight:700,fontSize:11.5,letterSpacing:"0.04em"}}>CLÁUSULA {n} — {t}</div>
      <div style={{fontSize:11,lineHeight:1.55,marginTop:4,textAlign:"justify"}}>{children}</div>
    </div>
  );
  const money=v=>typeof v==="number"?v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}):v;
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
        <button onClick={avisarEquipe} style={{background:"#1FA855",border:"none",borderRadius:6,padding:"12px 16px",fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer"}}>📣 Avisar equipe</button>
        <button onClick={enviarControle} style={{background:"#3A4528",border:"none",borderRadius:6,padding:"12px 16px",fontSize:13,fontWeight:700,color:"#F1ECDD",cursor:"pointer"}}>🏭 Enviar p/ Controle Indústria</button>
        <a href="/" style={{color:"#F1ECDD",fontSize:13,textDecoration:"underline"}}>← Voltar ao site</a>
        <span style={{color:"#D9D2BD",fontSize:11.5,flexBasis:"100%"}}>Uso interno · campos amarelos editáveis. <strong>Fluxo de assinatura:</strong> a Bentô assina primeiro (conferência) e, em seguida, o cliente. Modelo automático — recomendamos validação jurídica.</span>
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
                d.potinhos>0?["Potinhos personalizados (2 por pessoa)",money(d.potinhos)]:null,
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
                  −&nbsp;R$&nbsp;<input className="descInput" type="number" min="0" step="1" value={desc}
                    onChange={e=>setDesc(e.target.value)} aria-label="Valor do desconto em reais"/>
                </td>
              </tr>
              <tr><td style={{border:"1px solid #1a1a1a",padding:"7px 10px",fontWeight:700}}>TOTAL</td><td style={{border:"1px solid #1a1a1a",padding:"7px 10px",textAlign:"right",fontWeight:700,whiteSpace:"nowrap"}}>{money(total)}</td></tr>
            </tbody>
          </table>
          <div className="ct-bar" style={{fontSize:9.5,color:"#A9831C",marginTop:5}}>Para preços negociados, ajuste o <strong>desconto</strong> (em R$) — o total recalcula sozinho. Deixe em 0 se não houver. Some o valor à descrição se preferir percentual.</div>
        </Clause>
        <Clause n="4ª" t="PAGAMENTO">
          <Ed block>50% (cinquenta por cento) do valor total na assinatura deste contrato, a título de sinal e reserva de data, e o saldo restante (os 50% remanescentes) até 7 (sete) dias antes da data do evento. Pagamentos via Pix ou transferência bancária, conforme os dados abaixo.</Ed>
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:8,fontSize:11}}>
            <tbody>
              <tr><td style={{border:"1px solid #999",padding:"6px 10px"}}>Entrada (sinal · 50%) — na assinatura</td><td style={{border:"1px solid #999",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap",fontWeight:700}}>{money(entrada)}</td></tr>
              <tr><td style={{border:"1px solid #999",padding:"6px 10px"}}>Saldo (50%) — até 7 dias antes do evento</td><td style={{border:"1px solid #999",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap",fontWeight:700}}>{money(saldo)}</td></tr>
              {antecipadoOk&&<tr style={{background:"#EEF5E2"}}><td style={{border:"1px solid #1FA855",padding:"6px 10px"}}>💸 <strong>Ou pagamento integral antecipado via Pix — 7% de desconto</strong> (evento com mais de 30 dias). Economia de {money(economia7)}.</td><td style={{border:"1px solid #1FA855",padding:"6px 10px",textAlign:"right",whiteSpace:"nowrap",fontWeight:700,color:"#1B7A40"}}>{money(integralDesc)}</td></tr>}
            </tbody>
          </table>
          <div style={{marginTop:8,border:"1px solid #C9A86A",borderRadius:6,padding:"10px 12px",fontSize:11,lineHeight:1.7,background:"#FCFAF2"}}>
            <div style={{fontWeight:700,letterSpacing:"0.04em",marginBottom:3}}>DADOS PARA PAGAMENTO</div>
            Titular: <strong>ABB GELATERIA LTDA</strong><br/>
            <strong>Pix (CNPJ):</strong> 61.590.463/0002-26<br/>
            Banco: <strong>Sicoob</strong> · Agência: <strong>3010</strong> · Conta corrente: <strong>292.558-3</strong>
            <div className="noprint" style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:9}}>
              <button onClick={()=>copyTxt(pixKey,"Chave Pix (CNPJ)")} style={{background:"#C9A86A",border:"none",borderRadius:5,padding:"8px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>📋 Copiar chave Pix</button>
              <button onClick={()=>copyTxt(pixCode(),"Pix Copia e Cola")} style={{background:"#3A4528",color:"#F1ECDD",border:"none",borderRadius:5,padding:"8px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>📲 Copiar Pix Copia e Cola</button>
              {antecipadoOk&&<button onClick={()=>copyTxt(pixCodeAmount(integralDesc),"Pix integral com 7% de desconto")} style={{background:"#1FA855",color:"#fff",border:"none",borderRadius:5,padding:"8px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>💸 Copiar Pix integral −7% ({money(integralDesc)})</button>}
            </div>
            <div className="noprint" style={{fontSize:9.5,color:"#A9831C",marginTop:5}}>O “Pix Copia e Cola” leva titular e chave — cole no app e digite o valor (entrada ou saldo). {antecipadoOk?<>O botão verde já vem com o <strong>valor integral e o 7% de desconto</strong> aplicado.</>:null}</div>
          </div>
        </Clause>
        <Clause n="5ª" t="OBRIGAÇÕES DA CONTRATADA">Fornecer os produtos na quantidade e qualidade contratadas, dentro dos padrões sanitários; disponibilizar equipe uniformizada e treinada; montar e desmontar a estrutura; manter os produtos em temperatura adequada durante o serviço.</Clause>
        <Clause n="6ª" t="OBRIGAÇÕES DO CONTRATANTE">Garantir acesso ao local com antecedência mínima de <Ed>[2 horas]</Ed> para montagem; disponibilizar ponto de energia elétrica <Ed>[220V]</Ed> próximo ao local de instalação; informar com antecedência alterações de data, local ou número de convidados.</Clause>
        <Clause n="7ª" t="CANCELAMENTO E REMARCAÇÃO"><Ed block>Em caso de cancelamento pelo CONTRATANTE com mais de 30 dias de antecedência, será restituído o valor pago, deduzido de 20% a título de custos administrativos. Com menos de 30 dias, o sinal não será restituído. Remarcações estão sujeitas à disponibilidade de agenda da CONTRATADA.</Ed></Clause>
        <Clause n="8ª" t="ASSINATURA E ACEITE">As partes assinam este instrumento por meio eletrônico, com a seguinte ordem: <strong>primeiro a CONTRATADA</strong>, que confere e valida os termos e valores, e <strong>em seguida a CONTRATANTE</strong>, cuja assinatura formaliza a integral concordância com as condições aqui pactuadas. A assinatura eletrônica é reconhecida como válida nos termos da legislação vigente (MP 2.200-2/2001 e Lei 14.063/2020).</Clause>
        <Clause n="9ª" t="DISPOSIÇÕES GERAIS">Casos de força maior serão tratados conforme a legislação vigente. Fica eleito o foro da Comarca de <strong>Vitória — ES</strong> para dirimir quaisquer controvérsias oriundas deste contrato.</Clause>
        <div style={{marginTop:30,fontSize:11}}>Vitória — ES, <Ed>{hoje}</Ed>.</div>
        <div style={{display:"flex",gap:40,marginTop:46}}>
          {[["1ª · CONTRATADA","ABB Gelateria Ltda · Bentô Gelateria","assina e confere primeiro"],["2ª · CONTRATANTE",d.nome,"assina após a conferência"]].map(([t,n,o])=>(
            <div key={t} style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:8.5,letterSpacing:"0.12em",color:"#A9831C",fontWeight:700,marginBottom:34}}>{o.toUpperCase()}</div>
              <div style={{borderTop:"1px solid #1a1a1a",paddingTop:6,fontSize:10.5}}><strong>{t}</strong><br/>{n}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:34,paddingTop:10,borderTop:"1px solid #ccc",fontSize:8.5,color:"#777",textAlign:"center"}}>Documento gerado automaticamente em {hoje} a partir do orçamento online · bentogelateria.com</div>
      </div></div>
    </div>
  );
}
