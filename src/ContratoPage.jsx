// Contrato automático de eventos (uso interno). Carregado sob demanda (lazy)
// apenas quando a URL traz ?contrato=<base64> — fica fora do bundle inicial.
const CONTROLE_URL="https://bento-os-seven.vercel.app/"; // Bentô OS · Controle de Produção
export default function ContratoPage({data:d}){
  const hoje=new Date().toLocaleDateString("pt-BR");
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
    const desc=[`Contratante: ${d.nome} (${d.zap})`,`Convidados: ${d.convidados}`,`Produtos: ${d.tipo} - ate ${d.sabores} sabores`,`Equipe: ${d.promotoras} promotora(s)`,d.km!=null?`Logistica: ~${d.km} km - ref. Bento ${d.loja}`:"",`Total: ${money(d.total)}`].filter(Boolean).join("\\n");
    const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Bento Gelateria//Eventos//PT","CALSCALE:GREGORIAN","BEGIN:VEVENT",`UID:ev-${date}-${Date.now()}@bentogelateria.com`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${date}`,`DTEND;VALUE=DATE:${dateEnd}`,`SUMMARY:Evento Bento - ${esc(d.nome)} (${d.convidados} pax)`,`LOCATION:${esc(d.local)}`,`DESCRIPTION:${desc}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
    dl(`evento-bento-${date}.ics`,ics,"text/calendar");
  };
  const exportJSON=()=>dl(`evento-bento-${(d.data||"").replace(/\//g,"-")}.json`,JSON.stringify(d,null,2),"application/json");
  const enviarControle=()=>{
    const b64=btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
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
      `💰 Total: ${money(d.total)}`,
      `👤 ${d.nome} · ${d.zap}`].filter(Boolean).join("\n");
    if(navigator.share){navigator.share({title:"Evento Bentô",text:msg}).catch(()=>{});}
    else{window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank","noopener,noreferrer");}
  };
  return(
    <div style={{minHeight:"100vh",background:"#54594A",padding:"24px 8px",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        .ct-sheet{max-width:760px;margin:0 auto;background:#fff;color:#1a1a1a;padding:56px 58px;box-shadow:0 20px 60px -20px rgba(0,0,0,.5)}
        @media print{
          body *{visibility:visible}
          .ct-bar{display:none!important}
          .ct-wrap{padding:0!important;background:#fff!important}
          .ct-sheet{box-shadow:none!important;max-width:none!important;padding:0!important}
          .ed{background:transparent!important;border-bottom:none!important}
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
              <tr><td style={{border:"1px solid #1a1a1a",padding:"7px 10px",fontWeight:700}}>TOTAL</td><td style={{border:"1px solid #1a1a1a",padding:"7px 10px",textAlign:"right",fontWeight:700}}>{money(d.total)}</td></tr>
            </tbody>
          </table>
        </Clause>
        <Clause n="4ª" t="PAGAMENTO"><Ed block>50% (cinquenta por cento) do valor total na assinatura deste contrato, a título de sinal e reserva de data, e o saldo restante até 5 (cinco) dias úteis antes da data do evento, via Pix ou transferência bancária.</Ed></Clause>
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
