import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ArrowLeft, ChevronRight, Search, Leaf, Beaker, Filter, Heart, Scale, X, Sparkles, Target, Printer } from "lucide-react";
import { PRODUCTS, SHAKES, AVISO_POLIOL, MOOD_META, QUIZ, ALLERGENS, PODE_CONTER, lupaFrontal, proteinClaim } from "./data.js";
import { tk, award, T, DECK_URL, BentoLogo, GelatoSVG, PicoleSVG, ProductArt, MoodChip, Chip, MacroBar, useModal, onImgErr, IMG_FB, VD, br, orderIngredients } from "./shared.jsx";

/* Cabeçalho de modal com a arte (banner) no topo + botão de fechar flutuante. */
export function ModalArtHeader({img,alt,onClose}){
  return(
    <div style={{position:"relative",lineHeight:0}}>
      <img src={img} alt={alt||""} loading="eager" onError={onImgErr} style={{display:"block",width:"100%",height:"auto"}}/>
      <button onClick={onClose} aria-label="Fechar" style={{position:"absolute",top:10,right:10,background:"rgba(31,35,23,0.55)",backdropFilter:"blur(3px)",border:"none",borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",cursor:"pointer",lineHeight:0}}><X size={16}/></button>
    </div>
  );
}

export function QuizModal({onClose,onResult,onDelivery,onSaved}){
  useModal(onClose);
  const [step,setStep]=useState(0);const [ans,setAns]=useState([]);const [done,setDone]=useState(false);const [result,setResult]=useState(null);
  const pick=(val)=>{
    const na=[...ans,val];
    if(step<QUIZ.length-1){setAns(na);setStep(step+1);}
    else{
      const[goal,restrict,moment]=na;
      let pool=[...PRODUCTS];
      if(restrict==="nogluten")pool=pool.filter(p=>!p.flags.gluten);
      if(restrict==="nolactose")pool=pool.filter(p=>!p.flags.lactose);
      if(restrict==="both")pool=pool.filter(p=>!p.flags.gluten&&!p.flags.lactose);
      const mm={proteina:"proteina",refrescante:"refrescante",indulgente:"indulgente",premium:"premium",postreino:"postreino",comfort:"comfort",lanche:"leve",surprise:null};
      const g=mm[goal],m2=mm[moment];
      const sc=pool.map(p=>({...p,score:(g&&p.moods.includes(g)?3:0)+(m2&&p.moods.includes(m2)?2:0)+Math.random()*0.5})).sort((a,b)=>b.score-a.score);
      const win=sc[0]||PRODUCTS[0];
      setResult(win);setDone(true);setAns(na);
      tk("Quiz · Concluído");
      try{onSaved&&onSaved({id:win.id,name:win.name,ts:Date.now()});}catch{/* */}
    }
  };
  // Imagem de story 1080×1350 com o resultado (mesmo padrão do Sem culpa-ômetro).
  function gerarImagemQuiz(p){
    return new Promise((resolve)=>{
      const c=document.createElement("canvas"); c.width=1080; c.height=1350; const x=c.getContext("2d");
      const g=x.createLinearGradient(0,0,0,1350); g.addColorStop(0,"#222B1A"); g.addColorStop(1,"#0E120B"); x.fillStyle=g; x.fillRect(0,0,1080,1350);
      x.textAlign="center";
      x.fillStyle="#B8C97A"; x.font="700 52px Georgia, serif"; x.fillText("BENTÔ", 540, 150);
      x.fillStyle="#9FB089"; x.font="600 26px Helvetica"; x.fillText("M E U   S A B O R   I D E A L", 540, 200);
      let fs=110; x.font=`800 ${fs}px Georgia, serif`;
      while(fs>54&&x.measureText(p.name).width>940){fs-=6;x.font=`800 ${fs}px Georgia, serif`;}
      x.fillStyle="#fff"; x.fillText(p.name, 540, 600);
      x.fillStyle="#E3C46A"; x.font="800 96px Helvetica"; x.fillText(`${p.nutrition.protein}g de proteína`, 540, 780);
      x.fillStyle="#E9EFDC"; x.font="600 40px Helvetica";
      x.fillText(`${p.nutrition.kcal} kcal · ${p.nutrition.addedSugars>0?p.nutrition.addedSugars+"g açúcar adic.":"zero açúcar adicionado"}`, 540, 860);
      x.fillStyle="#B8C97A"; x.font="italic 700 44px Georgia, serif"; x.fillText("Qual é o seu? Faça o quiz:", 540, 1150);
      x.fillStyle="#9FB089"; x.font="500 32px Helvetica"; x.fillText("bentogelateria.com", 540, 1215);
      c.toBlob(b=>resolve(b),"image/png");
    });
  }
  async function compartilharQuiz(){
    if(!result)return;
    tk("Compartilhar · Quiz");award("sem-culpa");
    const msg=`Meu sabor Bentô ideal é ${result.name}: ${result.nutrition.protein}g de proteína e ${result.nutrition.kcal} kcal. Descubra o seu:`;
    const url="https://bentogelateria.com";
    try{
      const blob=await gerarImagemQuiz(result);
      const file=blob&&new File([blob],"meu-sabor-bento.png",{type:"image/png"});
      if(file&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:msg+" "+url});return;}
    }catch{/* */}
    try{if(navigator.share){await navigator.share({title:"Meu sabor Bentô",text:msg,url});return;}}catch{/* */}
    try{await navigator.clipboard.writeText(msg+" "+url);alert("Texto copiado! Cole no seu story ou conversa.");}catch{alert(msg+" "+url);}
  }
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Quiz: qual é o seu Bentô" style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:480,width:"100%",border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{background:T.ink,padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>{done?"Resultado":`Pergunta ${step+1} de ${QUIZ.length}`}</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:4}}>{done?"Seu Bentô ideal":"Qual é o seu Bentô?"}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        {!done&&<div style={{height:3,background:T.bgWarm}}><div style={{height:"100%",background:T.pistacheDark,width:`${((step+1)/QUIZ.length)*100}%`,transition:"width .4s ease"}}/></div>}
        <div style={{padding:22}}>
          {!done?(
            <>
              <p className="fb" style={{fontSize:15,color:T.ink,marginBottom:18,lineHeight:1.4}}>{QUIZ[step].q}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {QUIZ[step].opts.map(o=>(
                  <button key={o.val} onClick={()=>pick(o.val)} className="hl fb"
                    style={{padding:"13px 11px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:22}}>{o.icon}</span>
                    <span style={{fontSize:13,color:T.ink,lineHeight:1.3}}>{o.label}</span>
                  </button>
                ))}
              </div>
            </>
          ):result&&(
            <div className="fade">
              <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><ProductArt product={result} size={150}/></div>
              <div className="fd" style={{fontSize:26,color:T.ink,textAlign:"center",letterSpacing:"-0.01em"}}>{result.name}</div>
              <div className="fb" style={{fontSize:13,color:T.inkSoft,textAlign:"center",marginTop:6,lineHeight:1.5}}>{result.description}</div>
              <div className="hd" style={{margin:"14px 0"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>
                {[{l:"kcal",v:result.nutrition.kcal},{l:"proteína",v:`${result.nutrition.protein}g`,g:true},{l:"açúc. adic.",v:`${result.nutrition.addedSugars}g`}].map(s=>(
                  <div key={s.l} style={{textAlign:"center",background:T.bg,borderRadius:10,padding:"10px 6px"}}>
                    <div className="fm" style={{fontSize:9,color:T.inkSoft,letterSpacing:"0.18em",textTransform:"uppercase"}}>{s.l}</div>
                    <div className="fd" style={{fontSize:20,color:s.g?T.pistacheDark:T.ink,fontWeight:500,marginTop:2}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {/* Recompensa por concluir o quiz — fecha o loop e leva à loja (texto editável) */}
              <div style={{border:"1px solid #D9BE7A",background:"#FBF6E7",borderRadius:12,padding:"12px 14px",marginBottom:12,textAlign:"center"}}>
                <div className="fm" style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:"#A9831C",marginBottom:4}}>Recompensa do quiz</div>
                <div className="fb" style={{fontSize:12.5,color:T.ink,lineHeight:1.45}}>Mostre esta tela na loja e ganhe um <strong>Bentôlé Baby</strong> de cortesia.</div>
                <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:3}}>1 por pessoa · consumo no local</div>
              </div>
              <button onClick={()=>{onClose();onResult(result.id);}} style={{width:"100%",padding:"13px 0",background:T.pistacheDark,color:T.surface,border:"none",borderRadius:10,fontSize:14,fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>Ver ficha completa →</button>
              <button onClick={compartilharQuiz} className="fb" style={{width:"100%",marginTop:8,padding:"12px 0",background:"transparent",color:T.pistacheDark,border:`1px solid ${T.pistacheDark}`,borderRadius:10,fontSize:13.5,fontWeight:600,cursor:"pointer"}}>Compartilhar meu sabor</button>
              {onDelivery&&<button onClick={()=>tk("Conversão · iFood · Quiz",onDelivery)} className="fb" style={{width:"100%",marginTop:8,padding:"12px 0",background:T.pistacheDark,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",opacity:.94}}>Pedir agora no iFood</button>}
              <button onClick={()=>{setStep(0);setAns([]);setDone(false);setResult(null);}} style={{width:"100%",marginTop:8,padding:"10px 0",background:"transparent",color:T.inkSoft,border:`1px solid ${T.border}`,borderRadius:10,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>Refazer quiz</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========== CLUBE BENTÔ (hub de gamificação: missões, conquistas, recompensas) ========== */

export function ClubeBento({onClose,quiz,badgeList,albumCount,missions,onMerged}){
  useModal(onClose);
  const earned=badgeList.filter(b=>b.earned).length;
  const nivel=earned>=5?"Cliente Ouro":earned>=3?"Prata":earned>=1?"Bronze":"Boas-vindas";
  const quizProd=quiz?PRODUCTS.find(p=>p.id===quiz.id):null;
  const sec={fontSize:9.5,letterSpacing:"0.22em",textTransform:"uppercase",color:T.pistacheDark,margin:"16px 0 10px"};
  // Conta na nuvem (Degrau 2): telefone + sync + resgates + indicações.
  const[fone,setFone]=useState(()=>{try{return localStorage.getItem("bento:phone")||"";}catch{return "";}});
  const[foneInput,setFoneInput]=useState("");
  const[consent,setConsent]=useState(false);
  const[busy,setBusy]=useState(false);
  const[erro,setErro]=useState("");
  const[srv,setSrv]=useState(null); // {ref,ind,codes}
  const conectado=fone.replace(/\D/g,"").length>=10;
  const localState=()=>{
    let album=[],fichas=0,favs=[];
    try{album=JSON.parse(localStorage.getItem("bento:album")||"[]");}catch{/* */}
    try{fichas=Number(localStorage.getItem("bento:fichas"))||0;}catch{/* */}
    try{favs=JSON.parse(localStorage.getItem("bento:favs")||"[]");}catch{/* */}
    return {badges:badgeList.filter(b=>b.earned).map(b=>b.id),album,fichas,favs,quiz:quiz||null};
  };
  async function syncNow(ph){
    setBusy(true);setErro("");
    try{
      const r=await fetch("/api/clube",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"sync",phone:ph,consent:true,state:localState()})});
      const j=await r.json();
      if(j&&j.ok){try{localStorage.setItem("bento:phone",ph);}catch{/* */}setFone(ph);setSrv(j.state);if(onMerged)onMerged(j.state);}
      else setErro((j&&j.error)||"Não consegui sincronizar agora.");
    }catch{setErro("Sem conexão — tente novamente.");}
    setBusy(false);
  }
  useEffect(()=>{const ph=fone.replace(/\D/g,"");if(ph.length>=10)syncNow(ph);},[]); // eslint-disable-line react-hooks/exhaustive-deps
  async function resgatar(reward){
    const ph=fone.replace(/\D/g,"");if(!ph)return;
    setBusy(true);setErro("");
    try{
      const r=await fetch("/api/clube",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"resgate",phone:ph,reward})});
      const j=await r.json();
      if(j&&j.ok){tk("Clube · Resgate "+reward);setSrv(s=>({...(s||{}),codes:{...((s&&s.codes)||{}),[reward]:j.code}}));}
      else setErro((j&&j.error)||"Não consegui gerar o código.");
    }catch{setErro("Sem conexão — tente novamente.");}
    setBusy(false);
  }
  const codes=(srv&&srv.codes)||{};
  const ind=Math.max(0,Number(srv&&srv.ind)||0);
  const refLink=srv&&srv.ref?`https://bentogelateria.com/?amigo=${srv.ref}`:null;
  async function copiarLink(){
    if(!refLink)return;
    tk("Clube · Compartilhar indicação");
    const msg=`Descubra seu sabor Bentô ideal (e me ajude a ganhar um brinde): ${refLink}`;
    try{if(navigator.share){await navigator.share({title:"Clube Bentô",text:msg});return;}}catch{/* */}
    try{await navigator.clipboard.writeText(msg);alert("Link copiado! Envie para seus amigos.");}catch{alert(refLink);}
  }
  const CodePill=({code})=>(
    <div style={{marginTop:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:T.ink,borderRadius:10,padding:"10px 12px"}}>
      <span className="fm" style={{fontSize:18,letterSpacing:"0.18em",color:"#F2E7C8",fontWeight:700}}>{code}</span>
      <span className="fb" style={{fontSize:10,color:"#B9BBA6"}}>apresente na loja · 1 uso</span>
    </div>
  );
  const ResgateBtn=({reward})=>conectado?(codes[reward]?<CodePill code={codes[reward]}/>:(
    <button onClick={()=>resgatar(reward)} disabled={busy} className="fm" style={{marginTop:8,fontSize:9.5,letterSpacing:"0.12em",textTransform:"uppercase",background:T.pistacheDark,color:"#fff",border:"none",borderRadius:999,padding:"9px 15px",cursor:busy?"wait":"pointer"}}>{busy?"Gerando…":"Gerar código de resgate"}</button>
  )):(
    <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:6}}>Conecte seu WhatsApp abaixo para gerar o código de resgate.</div>
  );
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Clube Bentô" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:460,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:1}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:"#C9A24A",textTransform:"uppercase"}}>Sua jornada</div>
            <div className="fd" style={{fontSize:19,color:T.bg,marginTop:2}}>Clube Bentô</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:"14px 22px 22px"}}>

          {/* Nível */}
          <div style={{display:"flex",alignItems:"center",gap:12,background:T.bgWarm,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px"}}>
            <div style={{flex:1,minWidth:0}}>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:T.inkSoft}}>Seu nível</div>
              <div className="fd" style={{fontSize:19,color:T.ink,marginTop:2}}>{nivel}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{height:7,background:"#E6DEC8",borderRadius:999,overflow:"hidden"}} role="progressbar" aria-valuenow={earned} aria-valuemin={0} aria-valuemax={5} aria-label={`${earned} de 5 conquistas`}>
                <div style={{height:"100%",width:`${earned*20}%`,background:"linear-gradient(90deg,#C9A24A,#46583A)",transition:"width .4s"}}/>
              </div>
              <div className="fm" style={{fontSize:10,color:T.inkSoft,marginTop:4,textAlign:"right"}}>{earned}/5 conquistas</div>
            </div>
          </div>

          {/* Conta / progresso na nuvem */}
          <div className="fm" style={sec}>Sua conta</div>
          {conectado?(
            <div style={{background:"#EFF5E5",border:"1px solid #CBD9A6",borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div className="fb" style={{fontSize:12.5,color:T.ink}}>Conectado · <strong>{fone.replace(/^(\d{2})(\d{4,5})(\d{4})$/,"($1) $2-$3")}</strong></div>
                <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:2}}>{busy?"Sincronizando…":"Progresso salvo na nuvem — vale em qualquer aparelho."}</div>
              </div>
              <button onClick={()=>{try{localStorage.removeItem("bento:phone");}catch{/* */}setFone("");setSrv(null);}} className="fm" style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",background:"transparent",color:T.inkSoft,border:`1px solid ${T.border}`,borderRadius:999,padding:"6px 11px",cursor:"pointer"}}>Sair</button>
            </div>
          ):(
            <div style={{border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px"}}>
              <div className="fb" style={{fontSize:12.5,color:T.inkSoft,lineHeight:1.45}}>Salve seu progresso com o seu WhatsApp — vale em qualquer aparelho e libera os <strong style={{color:T.ink}}>códigos de resgate</strong> e o <strong style={{color:T.ink}}>indique-e-ganhe</strong>.</div>
              <input value={foneInput} onChange={e=>setFoneInput(e.target.value)} placeholder="(27) 99999-9999" inputMode="tel" aria-label="Seu WhatsApp com DDD" className="fb" style={{width:"100%",marginTop:10,padding:"11px 12px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:14,boxSizing:"border-box"}}/>
              <label style={{display:"flex",gap:8,alignItems:"flex-start",marginTop:9,cursor:"pointer"}}>
                <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{marginTop:2,accentColor:T.pistacheDark,width:15,height:15,flexShrink:0}}/>
                <span className="fb" style={{fontSize:10.5,color:T.inkSoft,lineHeight:1.4}}>Autorizo guardar meu progresso vinculado a este número, conforme a <a href="/?privacidade=1" target="_blank" rel="noopener noreferrer" style={{color:T.pistacheDark,textDecoration:"underline"}}>Política de Privacidade</a>.</span>
              </label>
              <button onClick={()=>{const ph=foneInput.replace(/\D/g,"");if(ph.length<10){setErro("Informe um WhatsApp válido (com DDD).");return;}if(!consent){setErro("Marque a autorização para continuar.");return;}tk("Clube · Entrar",()=>syncNow(ph));}} disabled={busy} className="fb" style={{width:"100%",marginTop:10,padding:"12px 0",background:T.pistacheDark,color:"#fff",border:"none",borderRadius:10,fontSize:13.5,fontWeight:600,cursor:busy?"wait":"pointer"}}>{busy?"Conectando…":"Entrar no Clube"}</button>
            </div>
          )}
          {erro&&<div className="fb" role="alert" style={{fontSize:11.5,color:"#A63838",marginTop:8}}>{erro}</div>}

          {/* Recompensas */}
          <div className="fm" style={sec}>Recompensas</div>
          {quizProd?(
            <div style={{border:"1px solid #D9BE7A",background:"#FBF6E7",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:"#A9831C"}}>Ativa · quiz concluído</div>
              <div className="fb" style={{fontSize:12.5,color:T.ink,lineHeight:1.45,marginTop:4}}>Seu sabor ideal é <strong>{quizProd.name}</strong>. Ganhe um <strong>Bentôlé Baby</strong> de cortesia na loja.</div>
              <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:3}}>1 por pessoa · consumo no local</div>
              <ResgateBtn reward="quiz-baby"/>
            </div>
          ):(
            <div style={{border:`1px dashed ${T.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div className="fb" style={{fontSize:12.5,color:T.inkSoft,lineHeight:1.45}}>Complete o quiz do sabor e desbloqueie um <strong style={{color:T.ink}}>Bentôlé Baby</strong> de cortesia na loja.</div>
            </div>
          )}
          {albumCount>=10?(
            <div style={{border:"1px solid #D9BE7A",background:"#FBF6E7",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:"#A9831C"}}>Ativa · álbum completo</div>
              <div className="fb" style={{fontSize:12.5,color:T.ink,lineHeight:1.45,marginTop:4}}>Você completou o <strong>álbum da Copa</strong>! Comemore com a gente na loja.</div>
              <ResgateBtn reward="album"/>
            </div>
          ):(
            <div style={{border:`1px dashed ${T.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div className="fb" style={{fontSize:12.5,color:T.inkSoft,lineHeight:1.45}}>Álbum da Copa: <strong style={{color:T.ink}}>{albumCount}/10 figurinhas</strong> — complete para desbloquear a comemoração na loja.</div>
            </div>
          )}
          {earned>=5?(
            <div style={{border:"1px solid #D9BE7A",background:"#FBF6E7",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div className="fm" style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:"#A9831C"}}>Ativa · Cliente Ouro</div>
              <div className="fb" style={{fontSize:12.5,color:T.ink,lineHeight:1.45,marginTop:4}}>Você é <strong>Cliente Ouro</strong>: acesso aos <strong>lançamentos antes de todo mundo</strong> — apresente seu código para garantir a pré-estreia.</div>
              <ResgateBtn reward="ouro"/>
            </div>
          ):(
            <div style={{border:`1px dashed ${T.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <div className="fb" style={{fontSize:12.5,color:T.inkSoft,lineHeight:1.45}}>Complete as <strong style={{color:T.ink}}>5 conquistas</strong> e vire <strong style={{color:T.ink}}>Cliente Ouro</strong>: acesso antecipado aos lançamentos, antes de todo mundo.</div>
            </div>
          )}
          <div className="fb" style={{fontSize:10.5,color:T.inkSoft,textAlign:"center",marginTop:2}}>Novas recompensas em breve — conquistas contam para o seu nível.</div>

          {/* Indique e ganhe */}
          {conectado&&refLink&&(
            <>
              <div className="fm" style={sec}>Indique e ganhe</div>
              <div style={{border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px"}}>
                <div className="fb" style={{fontSize:12.5,color:T.ink,lineHeight:1.45}}>Convide amigos com o seu link: quando <strong>3 completarem o quiz</strong>, você ganha um <strong>Bentôlé</strong> de cortesia.</div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                  <div style={{flex:1,height:7,background:T.bgWarm,borderRadius:999,overflow:"hidden"}} role="progressbar" aria-valuenow={Math.min(3,ind)} aria-valuemin={0} aria-valuemax={3} aria-label={`${Math.min(3,ind)} de 3 amigos indicados`}>
                    <div style={{height:"100%",width:`${Math.min(3,ind)/3*100}%`,background:"linear-gradient(90deg,#C9A24A,#46583A)",transition:"width .4s"}}/>
                  </div>
                  <span className="fm" style={{fontSize:11,color:T.ink,fontWeight:600}}>{Math.min(3,ind)}/3 amigos</span>
                </div>
                {ind>=3?(codes["indicacao"]?<CodePill code={codes["indicacao"]}/>:(
                  <button onClick={()=>resgatar("indicacao")} disabled={busy} className="fm" style={{marginTop:10,fontSize:9.5,letterSpacing:"0.12em",textTransform:"uppercase",background:T.pistacheDark,color:"#fff",border:"none",borderRadius:999,padding:"9px 15px",cursor:busy?"wait":"pointer"}}>{busy?"Gerando…":"Resgatar meu Bentôlé"}</button>
                )):(
                  <button onClick={copiarLink} className="fb" style={{width:"100%",marginTop:10,padding:"11px 0",background:"transparent",color:T.pistacheDark,border:`1px solid ${T.pistacheDark}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>Compartilhar meu link</button>
                )}
                <div className="fm" style={{fontSize:10,color:T.inkSoft,marginTop:8,wordBreak:"break-all",textAlign:"center"}}>{refLink}</div>
              </div>
            </>
          )}

          {/* Missões */}
          <div className="fm" style={sec}>Missões</div>
          <div>
            {missions.map(m=>(
              <div key={m.t} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 0",borderBottom:`1px solid ${T.borderSoft}`}}>
                <span aria-hidden="true" style={{width:22,height:22,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,background:m.done?T.pistacheDark:"transparent",border:`2px solid ${m.done?T.pistacheDark:T.border}`,color:m.done?"#F2E7C8":"transparent"}}>✓</span>
                <span className="fb" style={{flex:1,fontSize:13,color:m.done?T.inkSoft:T.ink,textDecoration:m.done?"line-through":"none",lineHeight:1.3}}>{m.t}</span>
                {!m.done&&<button onClick={m.go} className="fm" style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",background:"transparent",color:T.pistacheDark,border:`1px solid ${T.pistacheDark}`,borderRadius:999,padding:"6px 12px",cursor:"pointer",whiteSpace:"nowrap"}}>Ir</button>}
              </div>
            ))}
          </div>

          {/* Conquistas */}
          <div className="fm" style={sec}>Conquistas · {earned}/{badgeList.length}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(76px,1fr))",gap:8}}>
            {badgeList.map(b=>{const I=b.icon;return(
              <div key={b.title} title={b.desc} style={{textAlign:"center",opacity:b.earned?1:.38}}>
                <div style={{width:44,height:44,margin:"0 auto",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:b.earned?T.pistacheDark:T.bgWarm,border:`2px solid ${b.earned?"#C9A24A":T.border}`,color:b.earned?"#F2E7C8":T.inkSoft}}>{I?<I size={18}/>:null}</div>
                <div className="fb" style={{fontSize:9.5,color:b.earned?T.ink:T.inkSoft,marginTop:5,lineHeight:1.2}}>{b.title}</div>
              </div>
            );})}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== MEUS FAVORITOS ========== */

export function FavoritesModal({ids,onClose,onViewProduct,onCompare,onDelivery,onToggleFav,badgeList=[]}){
  useModal(onClose);
  const favs=PRODUCTS.filter(p=>ids.includes(p.id));
  const totProt=favs.reduce((a,p)=>a+p.nutrition.protein,0);
  const galeria=badgeList.length>0&&(
    <div style={{marginTop:16,borderTop:`1px solid ${T.borderSoft}`,paddingTop:14}}>
      <div className="fm" style={{fontSize:9.5,letterSpacing:"0.22em",textTransform:"uppercase",color:T.pistacheDark,marginBottom:10}}>Conquistas · {badgeList.filter(b=>b.earned).length}/{badgeList.length}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(76px,1fr))",gap:8}}>
        {badgeList.map(b=>{const I=b.icon;return(
          <div key={b.title} title={b.desc} style={{textAlign:"center",opacity:b.earned?1:.38}}>
            <div style={{width:44,height:44,margin:"0 auto",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:b.earned?T.pistacheDark:T.bgWarm,border:`2px solid ${b.earned?"#C9A24A":T.border}`,color:b.earned?"#F2E7C8":T.inkSoft}}>{I?<I size={18}/>:null}</div>
            <div className="fb" style={{fontSize:9.5,color:b.earned?T.ink:T.inkSoft,marginTop:5,lineHeight:1.2}}>{b.title}</div>
          </div>
        );})}
      </div>
    </div>
  );
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Meus sabores favoritos" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:440,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:1}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Sua coleção</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Meus favoritos{favs.length?` (${favs.length})`:""}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:"12px 22px 22px"}}>
          {favs.length===0?(
            <div style={{textAlign:"center",padding:"26px 8px"}}>
              <Heart size={34} style={{color:T.border}}/>
              <div className="fd" style={{fontSize:19,color:T.ink,marginTop:10}}>Sua coleção está vazia</div>
              <div className="fb" style={{fontSize:12.5,color:T.inkSoft,marginTop:6,lineHeight:1.5}}>Toque no coração nas fichas dos sabores para guardar seus favoritos aqui.</div>
              {galeria}
            </div>
          ):(
            <>
              {favs.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.borderSoft}`}}>
                  <button onClick={()=>onViewProduct(p.id)} aria-label={`Ver ficha de ${p.name}`} style={{background:"none",border:"none",padding:0,cursor:"pointer",lineHeight:0}}><ProductArt product={p} size={54}/></button>
                  <button onClick={()=>onViewProduct(p.id)} style={{flex:1,minWidth:0,background:"none",border:"none",padding:0,textAlign:"left",cursor:"pointer"}}>
                    <div className="fd" style={{fontSize:16,color:T.ink,lineHeight:1.15}}>{p.name}</div>
                    <div className="fm" style={{fontSize:10,color:T.inkSoft,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2}}>{p.nutrition.kcal} kcal · {p.nutrition.protein}g proteína</div>
                  </button>
                  <button onClick={()=>onToggleFav(p.id)} aria-label={`Remover ${p.name} dos favoritos`} style={{background:"none",border:"none",cursor:"pointer",padding:6,lineHeight:0}}><Heart size={17} fill={T.pistacheDark} style={{color:T.pistacheDark}}/></button>
                </div>
              ))}
              <div className="fb" style={{fontSize:11.5,color:T.inkSoft,margin:"12px 0 14px",textAlign:"center"}}>Sua coleção soma <strong style={{color:T.pistacheDark}}>{totProt}g de proteína</strong>.</div>
              {favs.length>=2&&<button onClick={()=>{tk("Favoritos · Comparar",()=>onCompare(favs.slice(0,3).map(p=>p.id)));}} className="fb" style={{width:"100%",padding:"12px 0",background:T.pistacheDark,color:"#fff",border:"none",borderRadius:10,fontSize:13.5,fontWeight:600,cursor:"pointer"}}>Comparar meus favoritos{favs.length>3?" (3 primeiros)":""}</button>}
              <button onClick={()=>tk("Conversão · iFood · Favoritos",onDelivery)} className="fb" style={{width:"100%",marginTop:8,padding:"12px 0",background:"transparent",color:T.pistacheDark,border:`1px solid ${T.pistacheDark}`,borderRadius:10,fontSize:13.5,fontWeight:600,cursor:"pointer"}}>Pedir no iFood</button>
              {galeria}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========== COMPARE ========== */

export function CompareModal({ids,onClose,onViewProduct}){
  useModal(onClose);
  const products=ids.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
  if(products.length<2)return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:100,background:"rgba(31,35,23,0.65)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="rise" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:360,width:"100%",border:`1px solid ${T.border}`,padding:"28px 24px",textAlign:"center"}}>
        <Scale size={28} style={{color:T.pistacheDark}}/>
        <div className="fd" style={{fontSize:20,color:T.ink,marginTop:10}}>Selecione 2 ou 3 sabores</div>
        <div className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6,lineHeight:1.5}}>Toque no ícone de balança ⚖️ nos cards para montar a comparação lado a lado.</div>
        <button onClick={onClose} className="fb" style={{marginTop:16,padding:"10px 20px",background:T.pistacheDark,color:T.surface,border:"none",borderRadius:10,fontSize:13,fontWeight:500}}>Entendi</button>
      </div>
    </div>
  );
  const fields=[{k:"kcal",l:"Energia (kcal)"},{k:"protein",l:"Proteínas (g)",hi:true},{k:"carbs",l:"Carboidratos (g)"},{k:"sugars",l:"Açúcares totais (g)"},{k:"addedSugars",l:"Açúc. adicionados (g)"},{k:"fat",l:"Gorduras totais (g)"},{k:"fiber",l:"Fibra alimentar (g)"},{k:"sodium",l:"Sódio (mg)"}];
  const best=(k)=>{const vs=products.map(p=>p.nutrition[k]);return(k==="protein"||k==="fiber")?Math.max(...vs):Math.min(...vs);};
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Comparar sabores" style={{position:"fixed",inset:0,zIndex:100,background:"rgba(31,35,23,0.65)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="rise" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:680,width:"100%",maxHeight:"88dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"14px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
          <span className="fd" style={{fontSize:18,color:T.bg}}>Comparando sabores</span>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th className="cmp-first" style={{padding:"14px 18px",textAlign:"left",borderBottom:`1px solid ${T.border}`,minWidth:120}}><span className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.inkSoft,textTransform:"uppercase"}}>Nutriente</span></th>
                {products.map(p=>(
                  <th key={p.id} style={{padding:"14px 18px",textAlign:"center",background:T.bg,borderBottom:`1px solid ${T.border}`,minWidth:140}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><ProductArt product={p} size={64}/></div>
                    <div className="fd" style={{fontSize:15,color:T.ink,lineHeight:1.2}}>{p.name}</div>
                    <div className="fm" style={{fontSize:9,color:T.inkSoft,textTransform:"uppercase",letterSpacing:"0.12em",marginTop:2}}>{p.category==="gelato"?"Gelato":"Bentôlé"} · {p.portionLabel}</div>
                    <button onClick={()=>{onClose();onViewProduct(p.id);}} className="fm" style={{marginTop:8,fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",background:"transparent",border:`1px solid ${T.border}`,borderRadius:9,padding:"6px 10px",color:T.inkSoft}}>Ver ficha</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((f,i)=>{
                const b=best(f.k);
                return(<tr key={f.k} style={{background:i%2===0?T.surface:T.bg}}>
                  <td className="fb cmp-first" style={{padding:"12px 18px",fontSize:13,color:f.hi?T.ink:T.inkSoft,fontWeight:f.hi?500:400,borderBottom:`1px solid ${T.borderSoft}`}}>{f.l}</td>
                  {products.map(p=>{const v=p.nutrition[f.k],iB=v===b;return(
                    <td key={p.id} style={{padding:"12px 18px",textAlign:"center",borderBottom:`1px solid ${T.borderSoft}`}}>
                      <span className="fm" style={{fontSize:15,fontWeight:500,color:iB?T.pistacheDark:T.ink}}>{v}</span>
                      {iB&&<span style={{marginLeft:4,fontSize:11}} aria-label="melhor valor">✓</span>}
                    </td>
                  );})}
                </tr>);
              })}
              {[{l:"Glúten",k:"gluten"},{l:"Lactose",k:"lactose"}].map(f=>(
                <tr key={f.k} style={{background:T.bgWarm}}>
                  <td className="fb cmp-first" style={{padding:"12px 18px",fontSize:13,color:T.inkSoft,background:T.bgWarm}}>{f.l}</td>
                  {products.map(p=><td key={p.id} style={{padding:"12px 18px",textAlign:"center"}}><span className="fm" style={{fontSize:11,color:p.flags[f.k]?"#7A5320":T.pistacheDark}}>{p.flags[f.k]?"Contém":"Não contém"}</span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{padding:"10px 22px",background:T.bgWarm,borderTop:`1px solid ${T.border}`}}>
          <span className="fm" style={{fontSize:9,color:T.inkSoft,letterSpacing:"0.14em"}}>✓ = melhor valor na comparação para esse nutriente</span>
        </div>
      </div>
    </div>
  );
}

/* ========== CARDÁPIO DIGITAL ========== */

const CARDAPIO = [
  { cat:"Bentôlé", emoji:"🍡", items:[
    { name:"Bentôlé P Proteico", info:"50 g (aprox. 55 g) · embalagem prateada", price:"14,90", img:"/cardapio/pic-p.jpg" },
    { name:"Bentôlé Proteico MEGA", info:"110 g aprox.", price:"26,90", img:"/cardapio/pic-mega.jpg" },
    { name:"Kit 4 Picolés Mega", info:"cada unidade sai a R$ 24,00", price:"96,00", img:"/cardapio/pic-kit4.jpg" },
    { name:"Kit 6 Bentôlés", info:"cada unidade sai a R$ 13,00", price:"78,00", img:"/cardapio/pic-kit6.jpg" },
    { name:"Bentôlé Baby", info:"cortesia · consumo local · até 1 un", price:"6,90", img:"/cardapio/pic-baby.jpg" },
  ]},
  { cat:"Gelatos", emoji:"🍨", items:[
    { name:"Gelato Box", info:"700 ml · até 3 sabores", price:"99,90", img:"/cardapio/gelato-box.jpg" },
    { name:"Tamanho M", info:"170 g · 1–2 sabores · p/ viagem", price:"28,90", img:"/cardapio/gelato-m.jpg" },
    { name:"Tamanho P", info:"120 g · 1–2 sabores · p/ viagem", price:"23,90", img:"/cardapio/gelato-p.jpg" },
  ]},
  { cat:"Shakes", emoji:"🥤", items:[
    { name:"Shake Morango c/ Maracujá", info:"Whey sabor leite + 200 g de fruta", price:"29,90", img:"/cardapio/morango-maracuja.jpg" },
    { name:"Shake Frutas Vermelhas", info:"Whey fior di latte + 200 g de fruta", price:"37,90", img:"/cardapio/frutas-vermelhas.jpg" },
    { name:"Shake Açaí com Banana", info:"Whey de coco + 100 g açaí + 100 g banana", price:"37,90", img:"/cardapio/acai-banana.jpg" },
    { name:"Shake Choco Power", info:"Whey sabor chocolate + cacau 100%", price:"37,90", img:"/cardapio/dark-chocolate.jpg" },
    { name:"Milkshake Pistache Zero", info:"gelato pistache zero batido c/ leite", price:"39,90", img:"/cardapio/milkshake-pistache.jpg" },
    { name:"Milkshake Doce de Leite Zero", info:"400 ml · gelato doce de leite zero", price:"39,90", img:"/cardapio/milkshake-doce-leite.jpg" },
  ]},
  { cat:"Bebidas", emoji:"🧃", items:[
    { name:"Brain-Up True", info:"lata", price:"14,90", img:"/cardapio/brain-up.jpg" },
    { name:"Pro Force", info:"bebida láctea proteica", price:"9,90", img:"/cardapio/pro-force.jpg" },
    { name:"Cold Brew 200 ml", info:"zero açúcar", price:"24,90", img:"/cardapio/cold-brew.jpg" },
  ]},
  { cat:"Cafeteria", emoji:"☕", items:[
    { name:"Café Expresso", info:"especial 85 pontos", price:"8,90", img:"/cardapio/cafe-expresso.jpg" },
    { name:"Café Expresso Duplo", info:"90 ml · 85 pontos", price:"14,90", img:"/cardapio/cafe-duplo.jpg" },
    { name:"Coado V60", info:"café especial 86 pontos", price:"14,90", img:"/cardapio/coado-v60.jpg" },
    { name:"Capuccino Italiano", info:"verificar disponibilidade", price:"16,90", img:"/cardapio/capuccino.jpg" },
    { name:"Affogato Proteico", info:"1 bola de gelato (100 g) à escolha", price:"24,90", img:"/cardapio/affogato.jpg" },
  ]},
  { cat:"Cafés Especiais", emoji:"🫘", items:[
    { name:"Café Moído 85+ Pontos", info:"250 g · Muniz Freire/Caparaó-ES", price:"49,90", img:"/cardapio/cafe-moido.jpg" },
    { name:"Café em Grãos 85+ Pontos", info:"250 g · 85 pontos", price:"49,90", img:"/cardapio/cafe-graos.jpg" },
    { name:"Drip Coffee c/ Creatina", info:"100% arábica · 3 g de creatina", price:"9,90", img:"/cardapio/drip-creatina.jpg" },
  ]},
];

export function CardapioDigital({onClose}){
  const ink="#181C12",cream="#F6F1E7",gold="#C9A86A",pist=T.pistache;
  const [c,setC]=useState(0);
  useModal(onClose);
  const cat=CARDAPIO[c];
  const grid="radial-gradient(rgba(201,168,106,0.10) 1px, transparent 1px)";
  return (
    <div className="fade" role="dialog" aria-modal="true" aria-label="Cardápio digital Bentô"
      style={{position:"fixed",inset:0,zIndex:200,background:ink,backgroundImage:grid,backgroundSize:"26px 26px",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><BentoLogo size={32}/><div><div className="fd" style={{fontSize:17,color:cream,lineHeight:1}}>Cardápio</div><div className="fm" style={{fontSize:8.5,letterSpacing:"0.24em",color:"#9A9C86",textTransform:"uppercase",marginTop:2}}>Digital</div></div></div>
        <button onClick={onClose} aria-label="Fechar" className="fm" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,168,106,0.3)",color:cream,borderRadius:11,padding:"8px 14px",fontSize:11,letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><X size={14}/>ESC</button>
      </div>
      {/* chips de categoria */}
      <div className="no-scrollbar" style={{display:"flex",gap:8,overflowX:"auto",padding:"4px 20px 14px",flexShrink:0}}>
        {CARDAPIO.map((k,idx)=>(
          <button key={k.cat} onClick={()=>setC(idx)} className="fm" style={{whiteSpace:"nowrap",flexShrink:0,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",padding:"9px 15px",borderRadius:999,cursor:"pointer",border:`1px solid ${idx===c?gold:"rgba(201,168,106,0.3)"}`,background:idx===c?gold:"transparent",color:idx===c?ink:cream}}>
{k.cat}
          </button>
        ))}
      </div>
      {/* itens */}
      <div key={c} className="rise" style={{flex:1,overflow:"auto",padding:"4px 16px 24px"}}>
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
          {cat.items.map(it=>(
            <div key={it.name} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",border:"1px solid rgba(201,168,106,0.2)",borderRadius:14,background:"rgba(255,255,255,0.02)"}}>
              {it.img
                ? <div style={{width:62,height:62,borderRadius:14,overflow:"hidden",flexShrink:0,border:"1px solid rgba(201,168,106,0.25)"}}><img src={it.img} alt={it.name} width={62} height={62} loading="lazy" style={{objectFit:"cover",display:"block"}} onError={onImgErr} /></div>
                : <div style={{width:62,height:62,borderRadius:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,rgba(201,168,106,0.18),rgba(124,139,78,0.16))",border:"1px solid rgba(201,168,106,0.25)"}}><BentoLogo size={30}/></div>}
              <div style={{flex:1,minWidth:0}}>
                <div className="fb" style={{fontSize:15,color:cream,fontWeight:500,lineHeight:1.2}}>{it.name}</div>
                <div className="fb" style={{fontSize:12,color:"#A9AB96",marginTop:3,lineHeight:1.35}}>{it.info}</div>
              </div>
              <div className="fm" style={{fontSize:15,color:gold,whiteSpace:"nowrap",fontWeight:500}}>R$ {it.price}</div>
            </div>
          ))}
        </div>
        <p className="fb" style={{textAlign:"center",fontSize:10.5,color:"#7E806C",marginTop:22,lineHeight:1.5}}>Preços e disponibilidade conforme a loja · sujeitos a alteração.<br/>Sabores de gelato e picolé: consulte a ficha nutricional completa no catálogo.</p>
      </div>
    </div>
  );
}

/* ========== PÁGINA PARCERIA / REVENDA ========== */

const PARC_PILARES=[
  {t:"Premium",d:"Estética sofisticada e percepção de valor superior ao congelado comum.",e:"✦"},
  {t:"Proteico",d:"Comunicação direta com o público fitness, wellness e consumidores de suplementos.",e:"💪"},
  {t:"Impulso",d:"Formato prático para consumo imediato e venda adicional no checkout.",e:"⚡"},
];

const PARC_PUBLICOS=["Lojas de suplementos","Empórios naturais","Academias","Studios de treino","Restaurantes saudáveis","Cafeterias premium","Mercados de alto padrão","Clínicas de estética","Espaços fitness & wellness"];

const PARC_PRODUTOS=[
  {n:"Picolé Bistrô",papel:"Entrada premium e impulso. O produto que faz o freezer girar.",badge:"Maior giro",img:"/portfolio/heros/pistache-choco-branco.jpg",pos:"center 30%"},
  {n:"Picolé Mega",papel:"Indulgência proteica de ticket alto e alto valor percebido.",badge:"Ticket maior",img:"/portfolio/heros/snickers.jpg",pos:"center 28%"},
  {n:"Gelato 140 ml",papel:"O potinho gourmet — a maior margem da linha para o parceiro.",badge:"Até 50% de margem",img:"/portfolio/potes-140.jpg",pos:"center 38%"},
];

const PARC_MODELOS=[
  {t:"Compra avulsa",d:"Para testar a aceitação sem compromisso mensal. Reposição conforme a demanda.",tag:"Flexível"},
  {t:"Compra recorrente",d:"Para parceiros com giro previsível e freezer próprio. Calendário de reposição.",tag:"Recorrência"},
  {t:"Freezer Bentô",d:"Equipamento personalizado no ponto, com exposição exclusiva da marca.",tag:"Mais margem"},
  {t:"Parceiro estratégico",d:"Alto volume, alto fluxo ou operação regional. Condição máxima em mix selecionado.",tag:"Top"},
];

const PARC_PASSOS=[
  {t:"Avaliação do ponto",d:"Perfil do público, fluxo, localização e estrutura."},
  {t:"Escolha do modelo",d:"Avulsa, recorrente, freezer Bentô ou parceiro estratégico."},
  {t:"Definição do mix",d:"Picolés Bistrô, Mega e gelatos 140 ml em sabores selecionados."},
  {t:"Condição comercial",d:"Margem definida conforme volume, recorrência e compromisso."},
  {t:"Início da operação",d:"Exposição, reposição e acompanhamento de giro."},
];

export function SejaParceiro({onClose,onForm}){
  // Identidade clara/creme (conceito Programa de Franquias): fundo creme, texto verde/ink, dourado fosco.
  const ink="#1F2317",cream="#1F3D2A",gold="#B8893C",pist="#46583A",soft="#5A5E4E",bg="#F3ECDB",surf="#FBF8EE",line="#E4D9BE";
  useModal(onClose);
  const grid="radial-gradient(rgba(184,137,60,0.07) 1px, transparent 1px)";
  const wa="https://wa.me/"+WHATS_REVENDA+"?text="+encodeURIComponent("Olá! Tenho interesse em revender a Bentô no meu ponto.");
  const Kicker=({children})=>(<div className="fm" style={{fontSize:10,letterSpacing:"0.3em",color:gold,textTransform:"uppercase",marginBottom:12}}>{children}</div>);
  const H=({children})=>(<h2 className="fd" style={{fontSize:"clamp(24px,4vw,38px)",color:cream,fontWeight:400,lineHeight:1.12,letterSpacing:"-0.02em",margin:0}}>{children}</h2>);
  const card={background:surf,border:`1px solid ${line}`,borderRadius:14,padding:"22px"};
  const wrap={maxWidth:980,margin:"0 auto",padding:"0 22px"};
  return(
    <div className="fade" role="dialog" aria-modal="true" aria-label="Seja um parceiro Bentô" style={{position:"fixed",inset:0,zIndex:200,background:bg,backgroundImage:grid,backgroundSize:"28px 28px",overflow:"auto"}}>
      <button onClick={onClose} aria-label="Fechar" className="fm" style={{position:"fixed",top:16,right:16,zIndex:10,background:"rgba(251,248,238,0.85)",backdropFilter:"blur(6px)",border:`1px solid ${line}`,color:ink,borderRadius:12,padding:"9px 14px",fontSize:11,letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><X size={14}/>FECHAR</button>

      {/* HERO */}
      <section style={{...wrap,paddingTop:64,paddingBottom:40}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}><BentoLogo size={34}/><div className="fm" style={{fontSize:9,letterSpacing:"0.26em",color:soft,textTransform:"uppercase"}}>Gelatos · Vitória-ES</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:28,alignItems:"center"}}>
          <div className="rise">
            <div className="fm" style={{display:"inline-block",fontSize:10,letterSpacing:"0.2em",color:ink,background:gold,textTransform:"uppercase",padding:"6px 12px",borderRadius:999,marginBottom:16}}>Condições exclusivas para lojistas</div>
            <h1 className="fd" style={{fontSize:"clamp(32px,6.4vw,60px)",color:cream,fontWeight:400,lineHeight:1.05,letterSpacing:"-0.025em",margin:0}}>Tenha a Bentô<br/>no seu <em style={{color:gold,fontStyle:"italic"}}>ponto</em>.</h1>
            <p className="fb" style={{fontSize:16,color:soft,lineHeight:1.6,marginTop:18,maxWidth:560}}>O picolé proteico mais desejado do mercado — e gelatos premium em potinhos — para lojas, academias, empórios e cafeterias que querem <strong style={{color:cream}}>aumentar ticket, desejo e percepção de valor</strong>.</p>
            <div className="fm" style={{fontSize:13,letterSpacing:"0.08em",color:gold,marginTop:16}}>Programa de revenda · margens de 30% a 50%</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:24}}>
              <button onClick={onForm} className="fb" style={{background:gold,color:ink,border:"none",borderRadius:12,padding:"15px 26px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Quero ser parceiro →</button>
              <a href={wa} target="_blank" rel="noreferrer" className="fb" style={{background:"transparent",color:cream,border:`1px solid ${gold}`,borderRadius:12,padding:"15px 22px",fontSize:15,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>WhatsApp direto</a>
              <a href="/?portfolio=1" target="_blank" rel="noreferrer" onClick={()=>tk("Parceria · Portfólio")} className="fb" style={{background:"transparent",color:cream,border:`1px solid ${gold}`,borderRadius:12,padding:"15px 22px",fontSize:15,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>Ver portfólio</a>
            </div>
          </div>
          <div className="rise" style={{borderRadius:18,overflow:"hidden",border:"1px solid rgba(201,168,106,0.25)",boxShadow:"0 30px 80px -36px rgba(31,35,23,0.35)"}}>
            <img src="/parceria/freezer.jpg" alt="Freezer Bentô personalizado em um ponto de venda" style={{width:"100%",display:"block"}} onError={onImgErr} />
          </div>
        </div>
      </section>

      {/* OPORTUNIDADE / PILARES */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>A oportunidade</Kicker>
        <H>Uma nova categoria premium de consumo por impulso.</H>
        <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:14,maxWidth:680}}>Transforme o freezer em um ponto de desejo dentro da loja — gerando tráfego, diferenciação e aumento do ticket médio, sem cozinha nem operação complexa.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:26}}>
          {PARC_PILARES.map(p=>(
            <div key={p.t} style={card}>
              <div style={{width:28,height:2,background:gold,borderRadius:2,marginBottom:14}}/>
              <div className="fd" style={{fontSize:21,color:cream}}>{p.t}</div>
              <div className="fb" style={{fontSize:13.5,color:soft,lineHeight:1.5,marginTop:6}}>{p.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VÍDEO — apresentação do programa de franquias (logo abaixo da revenda) */}
      <section style={{...wrap,paddingTop:10,paddingBottom:40}}>
        <Kicker>Programa de Franquias</Kicker>
        <H>Veja os modelos de negócio.</H>
        <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:14,maxWidth:680}}>Quiosque em shopping, aeroporto de alto fluxo e a loja conceito — a apresentação completa em ~20 segundos.</p>
        <div style={{maxWidth:360,margin:"24px auto 0",borderRadius:24,overflow:"hidden",border:`1px solid ${gold}`,boxShadow:"0 30px 70px -34px rgba(31,35,23,0.4)"}}>
          <video src="/franquias/programa-franquias.mp4" poster="/franquias/programa-franquias-poster.jpg" controls loop muted autoPlay playsInline preload="metadata" style={{width:"100%",display:"block",background:"#0e120b"}} />
        </div>
      </section>

      {/* PARA QUEM É */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>Para quem é</Kicker>
        <H>Produto certo para o ponto certo.</H>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:22}}>
          {PARC_PUBLICOS.map(p=>(
            <span key={p} className="fb" style={{fontSize:13.5,color:cream,border:"1px solid rgba(201,168,106,0.3)",borderRadius:999,padding:"10px 16px"}}>{p}</span>
          ))}
        </div>
      </section>

      {/* MARGENS / PRODUTOS */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>Arquitetura de produtos</Kicker>
        <H>Margens de <span style={{color:gold}}>30% a 50%</span>.</H>
        <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:14,maxWidth:680}}>Faixas de preço pensadas para preservar a percepção premium e entregar margem comercial real ao parceiro.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14,marginTop:26}}>
          {PARC_PRODUTOS.map(p=>(
            <div key={p.n} style={{...card,padding:0,overflow:"hidden"}}>
              <img src={p.img} alt={p.n} style={{width:"100%",height:170,objectFit:"cover",objectPosition:p.pos||"center",display:"block"}} onError={onImgErr} />
              <div style={{padding:"18px 20px"}}>
                <div className="fd" style={{fontSize:20,color:cream}}>{p.n}</div>
                <div className="fb" style={{fontSize:13,color:soft,marginTop:6,lineHeight:1.45}}>{p.papel}</div>
                <span className="fm" style={{display:"inline-block",marginTop:14,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:gold,border:`1px solid ${gold}`,borderRadius:999,padding:"6px 13px"}}>{p.badge}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="fb" style={{fontSize:13,color:soft,marginTop:18,lineHeight:1.55,maxWidth:680}}>Trabalhamos com <strong style={{color:cream}}>preço final sugerido protegido</strong> — você mantém a percepção premium e ainda garante uma margem saudável. As <strong style={{color:cream}}>condições exatas são reveladas após avaliarmos o seu ponto</strong>.</p>
      </section>

      {/* MODELOS */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>Modelos de parceria</Kicker>
        <H>Quanto maior o compromisso, melhor a margem.</H>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:26}}>
          {PARC_MODELOS.map((m,i)=>(
            <div key={m.t} style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span className="fm" style={{fontSize:13,color:gold}}>0{i+1}</span>
                <span className="fm" style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#fff",background:pist,borderRadius:999,padding:"4px 9px"}}>{m.tag}</span>
              </div>
              <div className="fd" style={{fontSize:19,color:cream}}>{m.t}</div>
              <div className="fb" style={{fontSize:13.5,color:soft,lineHeight:1.5,marginTop:6}}>{m.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <Kicker>Como funciona</Kicker>
        <H>Cinco passos para começar.</H>
        <div style={{marginTop:24,display:"flex",flexDirection:"column",gap:0}}>
          {PARC_PASSOS.map((s,i)=>(
            <div key={s.t} style={{display:"flex",gap:18,alignItems:"flex-start",padding:"16px 0",borderTop:i?"1px solid rgba(201,168,106,0.16)":"none"}}>
              <div className="fd" style={{fontSize:30,color:gold,lineHeight:1,minWidth:46}}>{i+1}</div>
              <div><div className="fd" style={{fontSize:19,color:cream}}>{s.t}</div><div className="fb" style={{fontSize:14,color:soft,marginTop:4,lineHeight:1.5}}>{s.d}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* MODELO DE NEGÓCIO / FRANQUIA */}
      <section style={{...wrap,paddingTop:30,paddingBottom:40}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:28,alignItems:"center"}}>
          <div>
            <Kicker>Para futuros franqueados</Kicker>
            <H>Um modelo de negócio para chamar de seu.</H>
            <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:14}}>Mais do que um freezer: um <strong style={{color:cream}}>destino</strong>. Nosso quiosque em shopping transforma o gelato proteico em experiência premium — o modelo de negócio que inspira a franquia Bentô.</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:18}}>
              {["Quiosque premium","Alto valor percebido","Experiência de marca"].map(t=>(
                <span key={t} className="fb" style={{fontSize:12.5,color:cream,border:"1px solid rgba(201,168,106,0.3)",borderRadius:999,padding:"8px 14px"}}>{t}</span>
              ))}
            </div>
            <div className="fb" style={{fontSize:12.5,color:soft,marginTop:18,lineHeight:1.5}}>A <strong style={{color:cream}}>franquia é um projeto futuro</strong>. Registre seu interesse e seja o primeiro a saber quando abrirmos.</div>
            <button onClick={onForm} className="fb" style={{marginTop:18,background:gold,color:ink,border:"none",borderRadius:12,padding:"14px 24px",fontSize:14.5,fontWeight:600,cursor:"pointer"}}>Quero ser avisado →</button>
          </div>
          <div style={{borderRadius:18,overflow:"hidden",border:"1px solid rgba(201,168,106,0.25)",boxShadow:"0 30px 80px -36px rgba(31,35,23,0.35)"}}>
            <img src="/parceria/estande.jpg" alt="Quiosque Bentô Gelatos em shopping — modelo de negócio para franquia" style={{width:"100%",display:"block"}} onError={onImgErr} />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{...wrap,paddingTop:20,paddingBottom:70}}>
        <div style={{background:"linear-gradient(135deg, rgba(201,168,106,0.16), rgba(124,139,78,0.12))",border:"1px solid rgba(201,168,106,0.3)",borderRadius:18,padding:"40px 28px",textAlign:"center"}}>
          <H>Vamos conversar?</H>
          <p className="fb" style={{fontSize:15,color:soft,lineHeight:1.6,marginTop:12,maxWidth:520,marginLeft:"auto",marginRight:"auto"}}>Conte sobre o seu ponto e a sua região. Avaliamos o perfil e montamos a melhor condição para você.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:24}}>
            <button onClick={onForm} className="fb" style={{background:gold,color:ink,border:"none",borderRadius:12,padding:"15px 28px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Preencher meus dados →</button>
            <a href={wa} target="_blank" rel="noreferrer" className="fb" style={{background:pist,color:"#fff",borderRadius:12,padding:"15px 24px",fontSize:15,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>Chamar no WhatsApp</a>
          </div>
          <div className="fm" style={{fontSize:12,color:soft,marginTop:22,letterSpacing:"0.06em"}}>WhatsApp (27) 99915-9995 · Instagram @bentogelateria · Vitória-ES</div>
          <div className="fb" style={{fontSize:11.5,color:soft,marginTop:14,maxWidth:520,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>Pensando em <strong style={{color:cream}}>franquia</strong>? É um projeto futuro — registre seu interesse no formulário e avisamos você primeiro.</div>
        </div>
      </section>
    </div>
  );
}

/* ========== EVENTOS ========== */

const EV_PERS=["Carrinho personalizado","Potinhos personalizados","Outra personalização"];

const fmtBRL=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

const EV_KM_RATE=2.0;     // R$/km rodado (combustível + deslocamento + tempo, média)

const EV_ROTA=1.3;        // fator linha reta → rota real

const EV_POTINHO=0.5;     // R$ por potinho personalizado (2 por pessoa)

const EV_CARRINHO=200;    // R$ personalização do carrinho

function evHaversine(a,b,c,d){const R=6371,r=x=>x*Math.PI/180;const h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
async function evGeocode(text){
  const base=(text||"").trim();
  if(!base) return{ok:false};
  try{const c=sessionStorage.getItem("bento:geo:"+base.toLowerCase());if(c)return JSON.parse(c);}catch{}
  const parts=base.split(/[-–—,\/·]/).map(t=>t.trim()).filter(Boolean);
  const tries=[...new Set([base, parts.at(-1)?parts.at(-1)+" ES":"", parts[0]||""].filter(Boolean))].slice(0,3);
  let res={ok:false};
  for(const t of tries){
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(t)}`,
        {headers:{"Accept-Language":"pt-BR"},signal:AbortSignal.timeout(6000)});
      if(!r.ok) continue;            // 429/403 etc. → tenta a próxima variação
      const j=await r.json();
      if(j&&j[0]){
        const la=+j[0].lat,lo=+j[0].lon;
        let best=null;
        for(const s of LOJAS){const km=evHaversine(la,lo,s.lat,s.lng);if(!best||km<best.km)best={km,loja:s.nome};}
        res={ok:true,km:Math.max(1,Math.round(best.km*EV_ROTA)),loja:best.loja};
        break;
      }
    }catch(e){ /* timeout/rede: tenta próxima; se todas falharem, retorna ok:false */ }
  }
  try{sessionStorage.setItem("bento:geo:"+base.toLowerCase(),JSON.stringify(res));}catch{}
  return res;
}

function calcEvento(g,tipo="Mix (gelatos + picolés)",pers=[],km=null){
  const n=Math.max(1,Number(g)||0);
  let rend;
  if(tipo==="Gelatos") rend=`~${Math.round(n*0.15)} L de gelato · 150 ml/pessoa`;
  else if(tipo==="Picolés") rend=`~${n*2} picolés Bistrô · 2 por pessoa`;
  else rend=`~${Math.round(n*0.075)} L de gelato + ~${n} picolés · 1 + 1 por pessoa`;
  const base=n*27;                                                        // R$ 27 por pessoa
  const potinhos=pers.includes("Potinhos personalizados")?n*2*EV_POTINHO:0; // 2 potinhos/pessoa
  const carrinho=pers.includes("Carrinho personalizado")?EV_CARRINHO:0;
  const persACombinar=pers.filter(p=>p!=="Potinhos personalizados"&&p!=="Carrinho personalizado");
  const logistica=km!=null?Math.round(km*2*EV_KM_RATE):null;              // ida e volta × R$/km
  return{
    sabores:n>=150?6:Math.max(2,Math.round(n*6/150)),   // até 6 sabores (150+); proporcional abaixo
    rend,
    promotoras:n>300?2:1,                                // até 2 promotoras acima de 300
    base,potinhos,carrinho,persACombinar,logistica,
    total:base+potinhos+carrinho+(logistica||0),
    corporativo:n>300,
  };
}

export function EventosModal({onClose}){
  useModal(onClose);
  const[step,setStep]=useState(1);
  const[ev,setEv]=useState({data:"",hora:"",local:"",convidados:150,tipo:"Mix (gelatos + picolés)",pers:[]});
  const[cad,setCad]=useState({nome:"",doc:"",email:"",zap:"",empresa:"",obs:"",consent:false});
  const setE=(k,v)=>setEv(f=>({...f,[k]:v}));
  const setC=(k,v)=>setCad(f=>({...f,[k]:v}));
  const togglePers=p=>setE("pers",ev.pers.includes(p)?ev.pers.filter(x=>x!==p):[...ev.pers,p]);
  const[geo,setGeo]=useState(null);   // {ok,km,loja} após geocodificar o local
  const[busy,setBusy]=useState(false);
  const[conflict,setConflict]=useState(false);   // data já reservada → aviso suave
  const q=calcEvento(ev.convidados,ev.tipo,ev.pers,geo&&geo.ok?geo.km:null);
  const nConv=Number(ev.convidados)||0;
  const zapOk=cad.zap.replace(/\D/g,"").length>=10;
  // Captura do lead no nosso banco (não perder contato mesmo sem enviar o WhatsApp)
  const postLead=(payload)=>{try{fetch("/api/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});}catch{}};
  // Monta o orçamento completo + link interno (?contrato=) que a ContratoPage renderiza como PDF
  const mkPayload=(qq,gg)=>({nome:cad.nome.trim(),doc:cad.doc.trim(),email:cad.email.trim(),zap:cad.zap.trim(),empresa:cad.empresa.trim(),
    data:ev.data?ev.data.split("-").reverse().join("/"):"",hora:ev.hora,local:ev.local.trim(),convidados:nConv,tipo:ev.tipo,
    sabores:qq.sabores,rend:qq.rend,promotoras:qq.promotoras,pers:ev.pers,persAC:qq.persACombinar,
    base:qq.base,logistica:qq.logistica,km:gg&&gg.ok?gg.km:null,loja:gg&&gg.ok?gg.loja:null,
    potinhos:qq.potinhos,carrinho:qq.carrinho,total:qq.total,obs:cad.obs.trim()});
  const mkLink=(p)=>"https://bentogelateria.com/?contrato="+btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  // Campos do orçamento a guardar junto do lead (para abrir o PDF completo no painel)
  const orcFields=(qq,gg,link)=>({link,sabores:qq.sabores,rend:qq.rend,promotoras:qq.promotoras,base:qq.base,logistica:qq.logistica,potinhos:qq.potinhos,carrinho:qq.carrinho,pers:ev.pers});
  const verOrcamento=async()=>{
    setBusy(true);
    const g=await evGeocode(ev.local);
    setGeo(g);
    setBusy(false);
    const q2=calcEvento(ev.convidados,ev.tipo,ev.pers,g&&g.ok?g.km:null);
    const link2=mkLink(mkPayload(q2,g));
    tk("Lead · Orçamento gerado");
    postLead({stage:"orçamento",phone:cad.zap.trim(),nome:cad.nome.trim(),data:ev.data,hora:ev.hora,local:ev.local.trim(),convidados:nConv,tipo:ev.tipo,total:q2.total,km:g&&g.ok?g.km:null,loja:g&&g.ok?g.loja:null,...orcFields(q2,g,link2)});
    setStep(2);
  };
  const menor=nConv>0&&nConv<70;
  const ok1=ev.data&&ev.local.trim()&&nConv>=70&&zapOk;
  const waMenor=()=>{
    const l=["*Evento Bentô — até 70 convidados* 🎉","Olá! Gostaria de levar a Bentô para um evento menor e ver outras possibilidades de serviço.",
      ev.data&&`*Data:* ${ev.data.split("-").reverse().join("/")}`,
      ev.hora&&`*Horário previsto:* ${ev.hora}`,
      ev.local.trim()&&`*Local:* ${ev.local.trim()}`,
      nConv>0&&`*Convidados:* ${nConv}`].filter(Boolean);
    tk("Conversão · Evento (até 70)");
    window.open(`https://wa.me/${WHATS_REVENDA}?text=${encodeURIComponent(l.join("\n"))}`,"_blank","noopener,noreferrer");
  };
  const emailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const docOk=d2=>[11,14].includes(d2.replace(/\D/g,"").length);
  const ok3=cad.nome.trim()&&docOk(cad.doc)&&emailOk(cad.email)&&cad.zap.replace(/\D/g,"").length>=10&&cad.consent;
  const doEnviar=(conflito)=>{
    // link interno: abre o contrato pré-preenchido para a equipe revisar e gerar o PDF
    const payload=mkPayload(q,geo);
    const linkContrato=mkLink(payload);
    const linhas=[
      "*Novo orçamento — Eventos Bentô* 🎉","",
      conflito&&"⚠️ *Atenção:* esta data pode já ter um evento confirmado. Gostaria de verificar a disponibilidade (outro horário ou formato) para o meu também. 🙏","",
      "*— Dados do contratante —*",
      `*Nome:* ${cad.nome.trim()}`,
      `*CPF/CNPJ:* ${cad.doc.trim()}`,
      `*E-mail:* ${cad.email.trim()}`,
      `*WhatsApp:* ${cad.zap.trim()}`,
      cad.empresa.trim()&&`*Empresa:* ${cad.empresa.trim()}`,"",
      "*— Dados do evento —*",
      `*Data:* ${ev.data.split("-").reverse().join("/")}`,
      ev.hora&&`*Horário previsto para início:* ${ev.hora}`,
      `*Local:* ${ev.local.trim()}`,
      `*Convidados:* ${ev.convidados}`,
      `*Produtos:* ${ev.tipo}`,
      `*Sabores:* até ${q.sabores}`,
      `*Rendimento:* ${q.rend}`,
      `*Promotoras:* ${q.promotoras} uniformizada${q.promotoras>1?"s":""} e treinada${q.promotoras>1?"s":""}`,"",
      "*— Orçamento online —*",
      `*Serviço (R$ 27 × ${ev.convidados}):* ${fmtBRL(q.base)}`,
      geo&&geo.ok?`*Logística (~${geo.km} km · Bentô ${geo.loja} · ida e volta):* ${fmtBRL(q.logistica)}`:"*Logística:* a confirmar",
      q.potinhos>0&&`*Potinhos personalizados (2/pessoa):* ${fmtBRL(q.potinhos)}`,
      q.carrinho>0&&`*Personalização do carrinho:* ${fmtBRL(q.carrinho)}`,
      q.persACombinar.length>0&&`*A combinar:* ${q.persACombinar.join(", ")}`,
      q.corporativo&&"*Evento corporativo 300+:* condições especiais",
      `*Total estimado:* ${fmtBRL(q.total)}`,
      cad.obs.trim()&&`*Observações:* ${cad.obs.trim()}`,"",
      "_Solicito a formulação do contrato para assinatura online._","",
      `📄 *Contrato pré-preenchido (uso interno):*\n${linkContrato}`,
    ].filter(Boolean);
    tk("Conversão · Orçamento de evento");
    postLead({stage:"contrato",phone:cad.zap.trim(),nome:cad.nome.trim(),email:cad.email.trim(),doc:cad.doc.trim(),empresa:cad.empresa.trim(),obs:cad.obs.trim(),data:ev.data,hora:ev.hora,local:ev.local.trim(),convidados:nConv,tipo:ev.tipo,total:q.total,km:geo&&geo.ok?geo.km:null,loja:geo&&geo.ok?geo.loja:null,...orcFields(q,geo,linkContrato)});
    window.open(`https://wa.me/${WHATS_REVENDA}?text=${encodeURIComponent(linhas.join("\n"))}`,"_blank","noopener,noreferrer");
  };
  // Antes de fechar: checa se a data já tem evento reservado (bloqueio suave, não trava o negócio)
  const enviar=async()=>{
    setBusy(true);
    let booked=false;
    try{
      const r=await fetch(`/api/booked?d=${encodeURIComponent(ev.data)}`,{cache:"no-store"});
      if(r.ok){ const j=await r.json(); booked=!!(j&&j.booked); }
    }catch{}
    setBusy(false);
    if(booked){ tk("Eventos · Data já reservada"); setConflict(true); return; }
    doEnviar(false);
  };
  const inp={width:"100%",padding:"11px 12px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:14,outline:"none",boxSizing:"border-box"};
  const lab={fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:T.inkSoft,display:"block",marginBottom:5,marginTop:14};
  const Row=({l,v,strong})=>(
    <div style={{display:"flex",justifyContent:"space-between",gap:10,padding:"9px 0",borderBottom:`1px solid ${T.borderSoft}`}}>
      <span className="fb" style={{fontSize:13,color:T.inkSoft}}>{l}</span>
      <span className={strong?"fd":"fb"} style={{fontSize:strong?16:13,color:strong?T.pistacheDark:T.ink,fontWeight:strong?600:500,textAlign:"right"}}>{v}</span>
    </div>
  );
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Nos leve para seu evento" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:540,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:1}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Eventos · Passo {step} de 3</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Nos leve para seu evento</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          {step===1&&(<>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gridTemplateRows:"76px 76px",gap:8,marginBottom:14}}>
              <img src="/eventos/carrinho-1.jpg" alt="Carrinho Bentô em casamento" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:12,gridRow:"1 / span 2",border:`1px solid ${T.border}`}} onError={onImgErr} />
              <img src="/eventos/carrinho-2.jpg" alt="Carrinho Bentô em área externa" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:12,border:`1px solid ${T.border}`}} onError={onImgErr} />
              <img src="/eventos/carrinho-3.jpg" alt="Carrinho Bentô servindo em evento real" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:12,border:`1px solid ${T.border}`}} onError={onImgErr} />
            </div>
            <div className="fb" style={{fontSize:13,color:T.inkSoft}}>Nosso carrinho de gelateria no seu evento — casamentos, festas e corporativo. Preencha e veja seu orçamento na hora:</div>
            <span className="fm" style={lab}>Deixe seu WhatsApp (com DDD) *</span>
            <input className="fb" style={inp} value={cad.zap} onChange={e=>setC("zap",e.target.value)} placeholder="(27) 99999-9999" inputMode="tel"/>
            <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:5,lineHeight:1.4}}>Deixe seu contato para a gente te enviar o orçamento e mais informações do evento. Sem compromisso.</div>
            <span className="fm" style={lab}>Data do evento *</span>
            <input type="date" className="fb" style={inp} value={ev.data} onChange={e=>setE("data",e.target.value)}/>
            <span className="fm" style={lab}>Horário previsto para início</span>
            <input type="time" className="fb" style={inp} value={ev.hora} onChange={e=>setE("hora",e.target.value)}/>
            <span className="fm" style={lab}>Local (cidade / espaço) *</span>
            <input className="fb" style={inp} value={ev.local} onChange={e=>setE("local",e.target.value)} placeholder="Ex.: Vitória — Cerimonial X"/>
            <span className="fm" style={lab}>Quantidade de convidados * (mín. 70)</span>
            <input type="number" min={70} className="fb" style={inp} value={ev.convidados} onChange={e=>setE("convidados",e.target.value===""?"":Number(e.target.value))} inputMode="numeric"/>
            <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
              {[70,100,150,300,500].map(n=>(
                <button key={n} onClick={()=>setE("convidados",n)} className="fm" style={{fontSize:10,padding:"6px 12px",borderRadius:999,border:`1px solid ${Number(ev.convidados)===n?T.pistacheDark:T.border}`,background:Number(ev.convidados)===n?T.pistacheDark:"transparent",color:Number(ev.convidados)===n?T.surface:T.inkSoft,cursor:"pointer"}}>{n}</button>
              ))}
            </div>
            <span className="fm" style={lab}>O que servir?</span>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["Gelatos","Picolés","Mix (gelatos + picolés)"].map(o=>(
                <button key={o} onClick={()=>setE("tipo",o)} className="fb" style={{flex:1,minWidth:110,padding:"11px 8px",borderRadius:10,border:`1px solid ${ev.tipo===o?T.pistacheDark:T.border}`,background:ev.tipo===o?T.pistacheDark:"transparent",color:ev.tipo===o?T.surface:T.ink,fontSize:12.5,fontWeight:500,cursor:"pointer"}}>{o}</button>
              ))}
            </div>
            <span className="fm" style={lab}>Personalização (opcional · custo a combinar)</span>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {EV_PERS.map(p=>(
                <button key={p} onClick={()=>togglePers(p)} className="fb" style={{fontSize:12,padding:"9px 12px",borderRadius:999,border:`1px solid ${ev.pers.includes(p)?T.pistacheDark:T.border}`,background:ev.pers.includes(p)?"#EFF5E5":"transparent",color:T.ink,cursor:"pointer"}}>{ev.pers.includes(p)?"✓ ":""}{p}</button>
              ))}
            </div>
            {menor?(
              <div style={{marginTop:18,background:"#EFF5E5",border:`1px solid ${T.pistacheDark}55`,borderRadius:12,padding:"16px"}}>
                <div className="fd" style={{fontSize:16,color:T.ink}}>Evento com menos de 70 convidados?</div>
                <div className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:6,lineHeight:1.5}}>O orçamento online é para eventos a partir de <strong>70 pessoas</strong>. Para grupos menores temos <strong>outras possibilidades de serviço</strong> — fale com a gente que montamos algo sob medida.</div>
                <button onClick={waMenor} className="fb" style={{width:"100%",marginTop:14,padding:"13px",borderRadius:10,border:"none",background:"#25D366",color:"#fff",fontSize:14.5,fontWeight:600,cursor:"pointer"}}>💬 Falar no WhatsApp</button>
              </div>
            ):(<>
              <button onClick={verOrcamento} disabled={!ok1||busy} className="fb" style={{width:"100%",marginTop:20,padding:"14px",borderRadius:10,border:"none",background:ok1&&!busy?T.pistacheDark:T.border,color:ok1&&!busy?T.surface:T.inkSoft,fontSize:15,fontWeight:600,cursor:ok1&&!busy?"pointer":"not-allowed"}}>{busy?"Montando seu orçamento…":"Ver meu orçamento →"}</button>
              {!ok1&&<div className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:8}}>Preencha WhatsApp, data, local e ao menos 70 convidados.</div>}
            </>)}
          </>)}

          {step===2&&(<>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.25em",color:T.pistacheDark,textTransform:"uppercase",marginBottom:10}}>Seu orçamento online</div>
            <div style={{background:T.bg,border:`1.5px solid ${T.pistacheDark}`,borderRadius:12,padding:"6px 16px 4px"}}>
              <Row l="Convidados" v={ev.convidados}/>
              <Row l="Produtos" v={ev.tipo}/>
              <Row l="Sabores inclusos" v={`até ${q.sabores}`}/>
              <Row l="Rendimento" v={q.rend}/>
              <Row l="Equipe" v={`${q.promotoras} promotora${q.promotoras>1?"s":""} uniformizada${q.promotoras>1?"s":""} e treinada${q.promotoras>1?"s":""}`}/>
              <Row l={`Serviço (R$ 27 × ${ev.convidados})`} v={fmtBRL(q.base)}/>
              {geo&&geo.ok
                ? <Row l={`Logística · ~${geo.km} km da Bentô ${geo.loja} (ida e volta)`} v={fmtBRL(q.logistica)}/>
                : <Row l="Logística (deslocamento)" v="a confirmar"/>}
              {q.potinhos>0&&<Row l={`Potinhos personalizados (2/pessoa · R$ 0,50)`} v={fmtBRL(q.potinhos)}/>}
              {q.carrinho>0&&<Row l="Personalização do carrinho" v={fmtBRL(q.carrinho)}/>}
              {q.persACombinar.length>0&&<Row l={q.persACombinar.join(" · ")} v="a combinar ✨"/>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0 10px"}}>
                <span className="fb" style={{fontSize:13,color:T.inkSoft}}>Total estimado</span>
                <span className="fd" style={{fontSize:28,color:T.pistacheDark,fontWeight:600}}>{fmtBRL(q.total)}</span>
              </div>
            </div>
            {geo&&!geo.ok&&(
              <div className="fb" style={{marginTop:10,fontSize:12,color:T.inkSoft,lineHeight:1.5}}>📍 Não conseguimos localizar o endereço para calcular a logística — confirmamos o deslocamento no fechamento. Dica: volte e inclua bairro e cidade no local.</div>
            )}
            {geo&&geo.ok&&(
              <div className="fb" style={{marginTop:10,fontSize:11.5,color:T.inkSoft,lineHeight:1.5}}>🚚 Logística estimada a partir da nossa loja mais próxima (Bentô {geo.loja}), incluindo combustível e deslocamento médios.</div>
            )}
            {q.corporativo&&(
              <div className="fb" style={{marginTop:12,background:"#EFF5E5",border:`1px solid ${T.pistacheDark}55`,borderRadius:10,padding:"11px 14px",fontSize:12.5,color:T.ink,lineHeight:1.5}}>🏢 <strong>Evento corporativo com mais de 300 pessoas?</strong> Você tem condições especiais — o valor final pode ficar ainda melhor no fechamento.</div>
            )}
            {q.persACombinar.length>0&&(
              <div className="fb" style={{marginTop:10,fontSize:12,color:T.inkSoft,lineHeight:1.5}}>✨ {q.persACombinar.join(", ")}: valores combinados diretamente com nossa equipe.</div>
            )}
            <div className="fb" style={{marginTop:10,fontSize:11,color:T.inkSoft,lineHeight:1.5,fontStyle:"italic"}}>Estimativa online sujeita a confirmação de data, logística e proposta final em contrato.</div>
            <div style={{display:"flex",gap:8,marginTop:18}}>
              <button onClick={()=>setStep(1)} className="fb" style={{padding:"14px 18px",borderRadius:10,border:`1px solid ${T.border}`,background:"transparent",color:T.ink,fontSize:14,cursor:"pointer"}}>← Ajustar</button>
              <button onClick={()=>setStep(3)} className="fb" style={{flex:1,padding:"14px",borderRadius:10,border:"none",background:T.pistacheDark,color:T.surface,fontSize:15,fontWeight:600,cursor:"pointer"}}>Fechar orçamento →</button>
            </div>
          </>)}

          {step===3&&(<>
            <div className="fb" style={{fontSize:13,color:T.inkSoft}}>Quase lá! Com seus dados, nossa equipe formula o <strong style={{color:T.ink}}>contrato para assinatura online</strong> e confirma os detalhes:</div>
            <span className="fm" style={lab}>Nome completo *</span>
            <input className="fb" style={inp} value={cad.nome} onChange={e=>setC("nome",e.target.value)} placeholder="Seu nome"/>
            <span className="fm" style={lab}>CPF ou CNPJ *</span>
            <input className="fb" style={inp} value={cad.doc} onChange={e=>setC("doc",e.target.value)} placeholder="000.000.000-00" inputMode="numeric"/>
            <span className="fm" style={lab}>E-mail *</span>
            <input type="email" className="fb" style={inp} value={cad.email} onChange={e=>setC("email",e.target.value)} placeholder="voce@email.com"/>
            <span className="fm" style={lab}>WhatsApp (com DDD) *</span>
            <input className="fb" style={inp} value={cad.zap} onChange={e=>setC("zap",e.target.value)} placeholder="(27) 99999-9999" inputMode="tel"/>
            <span className="fm" style={lab}>Empresa (se corporativo)</span>
            <input className="fb" style={inp} value={cad.empresa} onChange={e=>setC("empresa",e.target.value)} placeholder="Opcional"/>
            <span className="fm" style={lab}>Observações</span>
            <textarea className="fb" rows={2} style={{...inp,resize:"vertical"}} value={cad.obs} onChange={e=>setC("obs",e.target.value)} placeholder="Horário, tema da festa, restrições…"/>
            <div style={{background:T.bgWarm,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",marginTop:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span className="fb" style={{fontSize:12,color:T.inkSoft}}>{ev.convidados} convidados · {ev.data.split("-").reverse().join("/")}</span>
              <span className="fd" style={{fontSize:18,color:T.pistacheDark,fontWeight:600}}>{fmtBRL(q.total)}</span>
            </div>
            <label style={{display:"flex",gap:9,alignItems:"flex-start",marginTop:16,cursor:"pointer"}}>
              <input type="checkbox" checked={cad.consent} onChange={e=>setC("consent",e.target.checked)} style={{marginTop:3,accentColor:T.pistacheDark,width:16,height:16,flexShrink:0}}/>
              <span className="fb" style={{fontSize:11.5,color:T.inkSoft,lineHeight:1.45}}>Autorizo o uso dos meus dados para contato e elaboração do orçamento/contrato, conforme a <a href="/?privacidade=1" target="_blank" rel="noopener noreferrer" style={{color:T.pistacheDark,textDecoration:"underline"}}>Política de Privacidade</a>.</span>
            </label>
            {conflict?(
              <div style={{marginTop:14,background:"#F2E2C5",border:"1px solid #D9BD8A",borderRadius:12,padding:"14px 16px"}}>
                <div className="fb" style={{fontSize:13.5,color:"#7A5320",fontWeight:600,lineHeight:1.4}}>⚠️ Já temos um evento confirmado nessa data.</div>
                <div className="fb" style={{fontSize:12.5,color:"#7A5320",marginTop:6,lineHeight:1.5}}>Mas calma — às vezes conseguimos encaixar no mesmo dia em <strong>outro horário ou formato</strong>. Fale com a gente que verificamos a disponibilidade pro seu evento também! 💛</div>
                <button onClick={()=>doEnviar(true)} className="fb" style={{width:"100%",marginTop:12,padding:"13px",borderRadius:10,border:"none",background:"#25D366",color:"#fff",fontSize:14.5,fontWeight:600,cursor:"pointer"}}>💬 Falar com a equipe sobre a data</button>
                <button onClick={()=>{setConflict(false);setStep(1);}} className="fb" style={{width:"100%",marginTop:8,padding:"11px",borderRadius:10,border:`1px solid ${T.border}`,background:"transparent",color:T.inkSoft,fontSize:13,cursor:"pointer"}}>📅 Escolher outra data</button>
              </div>
            ):(
              <button onClick={enviar} disabled={!ok3||busy} className="fb" style={{width:"100%",marginTop:14,padding:"14px",borderRadius:10,border:"none",background:ok3&&!busy?"#25D366":T.border,color:ok3&&!busy?"#fff":T.inkSoft,fontSize:15,fontWeight:600,cursor:ok3&&!busy?"pointer":"not-allowed"}}>{busy?"Verificando disponibilidade…":"💬 Enviar e solicitar contrato"}</button>
            )}
            <div className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:10,lineHeight:1.5}}>Seu orçamento completo abre no WhatsApp — é só confirmar o envio.<br/>Retornamos com o contrato para assinatura online. 📄</div>
            <button onClick={()=>setStep(2)} className="fb" style={{width:"100%",marginTop:10,padding:"10px",borderRadius:10,border:"none",background:"transparent",color:T.inkSoft,fontSize:12,cursor:"pointer"}}>← Voltar ao orçamento</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ========== FAQ NUTRICIONAL ========== */

const FAQ=[
  {q:"Posso comer na dieta?",a:"Sim, com equilíbrio! Nossos gelatos não levam açúcar adicionado e são ricos em proteína (whey hidrolisado). Mas atenção: não são alimentos de baixo valor energético — cada sabor tem sua ficha nutricional completa aqui no app, com calorias e macros por porção, pra você encaixar na sua meta."},
  {q:"Quem tem diabetes pode consumir?",a:"Nossos produtos não têm açúcar adicionado — a doçura vem de polióis e stévia. Porém, contêm carboidratos e açúcares próprios dos ingredientes (frutas, leite). Por isso, a recomendação responsável é: consulte seu médico ou nutricionista e confira a ficha nutricional de cada sabor antes de incluir na sua rotina."},
  {q:"O que são polióis? Por que o aviso de efeito laxativo?",a:"Polióis (como maltitol e sorbitol) são adoçantes que usamos no lugar do açúcar. São seguros e amplamente utilizados, mas — como todo poliol — em consumo excessivo podem ter efeito laxativo em pessoas sensíveis. Por isso mantemos o aviso nas fichas, por transparência."},
  {q:"Tem lactose?",a:"A maioria dos sabores contém leite e whey (derivado do leite). Os sorbets de fruta, como Limão Siciliano e Maracujá, não levam leite na receita. Confira o selo 'Zero Lactose' na ficha de cada sabor aqui no app — é a fonte mais segura."},
  {q:"Tem glúten?",a:"A grande maioria dos sabores não contém glúten. As exceções são sabores com ingredientes como kadaif ou cookies (ex.: Chocolate Dubai, Cookies & Cream), sempre indicadas na ficha do sabor. Todos os produtos trazem a declaração de alérgenos conforme a RDC 26/2015."},
  {q:"Qual é o sabor mais proteico?",a:"Nossos gelatos levam whey hidrolisado (proteína de alta absorção). O ranking 'mais ricos em proteína' fica na área de Tabelas Nutricionais — em geral, os sabores cremosos com whey passam de 9 g de proteína por porção."},
  {q:"Como conservar em casa?",a:"Mantenha sempre no freezer. Para a textura perfeita de gelato, tire alguns minutos antes de consumir e evite descongelar e recongelar — isso preserva a cremosidade e a qualidade do produto."},
  {q:"Onde compro?",a:"Em nossas duas lojas em Vitória-ES (Praia do Canto e Jardim Camburi) ou em casa, pelo iFood — é só tocar no botão Delivery na tela inicial. 🛵"},
];

export function FaqModal({onClose}){
  useModal(onClose);
  const[open,setOpen]=useState(0);
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Dúvidas frequentes" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:520,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:1}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Nutrição · Transparência</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Dúvidas frequentes ❓</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:"14px 18px 20px"}}>
          {FAQ.map((f,i)=>(
            <div key={i} style={{borderBottom:i<FAQ.length-1?`1px solid ${T.borderSoft}`:"none"}}>
              <button onClick={()=>setOpen(open===i?-1:i)} aria-expanded={open===i} className="fb" style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:"14px 4px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,cursor:"pointer"}}>
                <span className="fd" style={{fontSize:16.5,color:open===i?T.pistacheDark:T.ink,lineHeight:1.25}}>{f.q}</span>
                <span className="fd" style={{fontSize:20,color:T.pistacheDark,flexShrink:0,transform:open===i?"rotate(45deg)":"none",transition:"transform .2s"}}>+</span>
              </button>
              {open===i&&<p className="fb fade" style={{fontSize:13.5,color:T.inkSoft,lineHeight:1.6,padding:"0 4px 16px",margin:0}}>{f.a}</p>}
            </div>
          ))}
          <p className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:14,lineHeight:1.5}}>Conteúdo informativo — não substitui orientação de médico ou nutricionista.<br/>Ainda com dúvida? Chame a gente no WhatsApp (27) 99915-9995.</p>
        </div>
      </div>
    </div>
  );
}

/* ========== DELIVERY (IFOOD) ========== */

const LOJAS=[
  {id:"praia-do-canto",nome:"Praia do Canto",bairro:"Praia do Canto · Vitória-ES",lat:-20.2947,lng:-40.2925,
   ifood:"https://www.ifood.com.br/delivery/vitoria-es/bento-gelatos-saudaveis-praia-do-canto/fcfff152-838e-4743-88f3-0e18eff6b867?utm_medium=share",
   maps:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("Bentô Gelatos Praia do Canto Vitória ES")},
  {id:"jardim-camburi",nome:"Jardim Camburi",bairro:"Jardim Camburi · Vitória-ES",lat:-20.2547,lng:-40.2670,
   ifood:"https://www.ifood.com.br/delivery/vitoria-es/bento-gelatos-jardim-camburi/e654e388-ebc8-480c-bb0d-7d0c31f6cc3a?utm_medium=share",
   maps:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("Bentô Gelatos Jardim Camburi Vitória ES")},
];

export function DeliveryModal({onClose}){
  useModal(onClose);
  const[near,setNear]=useState(null); // id da loja mais próxima
  const[geoMsg,setGeoMsg]=useState("");
  const locate=()=>{
    if(!navigator.geolocation){setGeoMsg("Seu navegador não permite localização — escolha pela lista.");return;}
    setGeoMsg("Localizando…");
    navigator.geolocation.getCurrentPosition(pos=>{
      const{latitude:la,longitude:lo}=pos.coords;
      const d=s=>Math.hypot(s.lat-la,(s.lng-lo)*Math.cos(la*Math.PI/180));
      const best=[...LOJAS].sort((a,b)=>d(a)-d(b))[0];
      setNear(best.id);setGeoMsg("");
    },()=>setGeoMsg("Não foi possível obter sua localização — escolha pela lista."),{timeout:8000});
  };
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Delivery Bentô" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:480,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <ModalArtHeader img="/banners/delivery.webp" alt="Delivery / Nos encontre — peça no iFood ou veja onde estamos" onClose={onClose}/>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13,color:T.inkSoft,marginBottom:14}}>Temos duas lojas em Vitória. Escolha a mais perto de você — ou deixe a gente descobrir:</div>
          <button onClick={locate} className="fb" style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid ${T.pistacheDark}`,background:"transparent",color:T.pistacheDark,fontSize:13.5,fontWeight:600,cursor:"pointer",marginBottom:6}}>Qual loja está mais perto de mim?</button>
          {geoMsg&&<div className="fb" style={{fontSize:11.5,color:T.inkSoft,textAlign:"center",marginBottom:6}}>{geoMsg}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:10}}>
            {LOJAS.map(l=>(
              <div key={l.id} style={{border:`1.5px solid ${near===l.id?T.pistacheDark:T.border}`,background:near===l.id?"#EFF5E5":T.bg,borderRadius:12,padding:"16px 16px 14px",position:"relative"}}>
                {near===l.id&&<span className="fm" style={{position:"absolute",top:-9,left:14,fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",background:T.pistacheDark,color:T.surface,borderRadius:999,padding:"3px 10px"}}>Mais próxima de você</span>}
                <div className="fd" style={{fontSize:20,color:T.ink}}>Bentô {l.nome}</div>
                <div className="fb" style={{fontSize:12,color:T.inkSoft,marginTop:2}}>{l.bairro}</div>
                <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                  <a href={l.ifood} onClick={()=>tk("Conversão · iFood · "+l.nome)} target="_blank" rel="noreferrer" className="fb" style={{flex:1,minWidth:140,textAlign:"center",background:T.pistacheDark,color:"#fff",borderRadius:10,padding:"12px 14px",fontSize:13.5,fontWeight:600,textDecoration:"none"}}>Pedir agora no iFood</a>
                  <a href={l.maps} target="_blank" rel="noreferrer" className="fb" style={{textAlign:"center",border:`1px solid ${T.border}`,color:T.ink,borderRadius:10,padding:"12px 14px",fontSize:13,textDecoration:"none"}}>Ver no mapa</a>
                </div>
              </div>
            ))}
          </div>
          <div className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:14,lineHeight:1.5}}>Área e taxa de entrega são calculadas pelo iFood conforme seu endereço.</div>
        </div>
      </div>
    </div>
  );
}

/* ========== SEJA BENTÔ (REVENDA / FRANQUIA) ========== */

const WHATS_REVENDA="5527999159995"; // DDI+DDD+número, só dígitos

export function SejaBento({onClose}){
  useModal(onClose);
  const[form,setForm]=useState({interesse:"Revenda",nome:"",zap:"",cidade:"",ponto:"",msg:"",consent:false});
  const[sent,setSent]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ok=form.nome.trim()&&form.zap.replace(/\D/g,"").length>=10&&form.cidade.trim()&&form.consent;
  const postLead=(p)=>{try{fetch("/api/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p),keepalive:true}).catch(()=>{});}catch{}};
  const enviar=()=>{
    const linhas=[
      "*Nova solicitação — Seja Bentô*",
      `*Interesse:* ${form.interesse}`,
      `*Nome:* ${form.nome.trim()}`,
      `*WhatsApp:* ${form.zap.trim()}`,
      `*Cidade/UF:* ${form.cidade.trim()}`,
      form.ponto&&`*Ponto comercial:* ${form.ponto}`,
      form.msg.trim()&&`*Mensagem:* ${form.msg.trim()}`,
    ].filter(Boolean);
    tk("Conversão · Revenda/Franquia");
    // registra o lead no nosso banco (aparece no painel) mesmo que não conclua o envio no WhatsApp
    postLead({stage:"parceria",ref:"seja-parceiro",interesse:form.interesse,nome:form.nome.trim(),phone:form.zap.trim(),cidade:form.cidade.trim(),ponto:form.ponto,msg:form.msg.trim()});
    window.open(`https://wa.me/${WHATS_REVENDA}?text=${encodeURIComponent(linhas.join("\n"))}`,"_blank","noopener,noreferrer");
    setSent(true); // libera o download do PDF só depois de gerar o lead
  };
  const inp={width:"100%",padding:"11px 12px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:14,outline:"none",boxSizing:"border-box"};
  const lab={fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:T.inkSoft,display:"block",marginBottom:5,marginTop:14};
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Seja um revendedor ou franqueado" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:480,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Expansão</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Seja Bentô</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        {sent?(
          <div style={{padding:"34px 24px",textAlign:"center"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:T.pistacheDark,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,fontWeight:700,margin:"0 auto"}}>✓</div>
            <div className="fd" style={{fontSize:23,color:T.ink,marginTop:14}}>Recebemos seu interesse!</div>
            <div className="fb" style={{fontSize:13.5,color:T.inkSoft,marginTop:8,lineHeight:1.5}}>Abrimos o WhatsApp com sua mensagem pronta — é só confirmar o envio. Enquanto isso, baixe a apresentação completa do <strong style={{color:T.ink}}>Programa de Franquias</strong>:</div>
            <a href="/franquias/programa-franquias.pdf" download target="_blank" rel="noopener" onClick={()=>tk("Franquia · Download PDF")} className="fb" style={{display:"inline-block",marginTop:20,background:T.pistacheDark,color:"#fff",borderRadius:12,padding:"15px 26px",fontSize:15,fontWeight:600,textDecoration:"none"}}>Baixar apresentação (PDF)</a>
            <div className="fb" style={{fontSize:11,color:T.inkSoft,marginTop:14}}>~1 MB · 6 páginas · documento confidencial</div>
            <button onClick={onClose} className="fb" style={{display:"block",margin:"18px auto 0",background:"transparent",border:"none",color:T.inkSoft,fontSize:12.5,textDecoration:"underline",cursor:"pointer"}}>Fechar</button>
          </div>
        ):(
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13,color:T.inkSoft}}>Quer levar a Bentô para a sua cidade? Preencha abaixo — a mensagem chega direto no nosso WhatsApp e respondemos rapidinho.</div>
          <span className="fm" style={lab}>Tenho interesse em</span>
          <div style={{display:"flex",gap:8}}>
            {["Revenda","Franquia (futuro)"].map(o=>(
              <button key={o} onClick={()=>set("interesse",o)} className="fb" style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${form.interesse===o?T.pistacheDark:T.border}`,background:form.interesse===o?T.pistacheDark:"transparent",color:form.interesse===o?T.surface:T.ink,fontSize:13,fontWeight:500}}>{o}</button>
            ))}
          </div>
          {form.interesse==="Franquia (futuro)"&&<div className="fb" style={{fontSize:11.5,color:T.inkSoft,marginTop:8,lineHeight:1.45}}>A franquia é um projeto futuro — registramos seu interesse e avisamos você primeiro. Ao enviar, você recebe a apresentação completa do Programa de Franquias em PDF.</div>}
          <span className="fm" style={lab}>Nome completo *</span>
          <input className="fb" style={inp} value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Seu nome"/>
          <span className="fm" style={lab}>Seu WhatsApp (com DDD) *</span>
          <input className="fb" style={inp} value={form.zap} onChange={e=>set("zap",e.target.value)} placeholder="(27) 99999-9999" inputMode="tel"/>
          <span className="fm" style={lab}>Cidade / Estado *</span>
          <input className="fb" style={inp} value={form.cidade} onChange={e=>set("cidade",e.target.value)} placeholder="Ex.: Vitória / ES"/>
          <span className="fm" style={lab}>Já possui ponto comercial?</span>
          <div style={{display:"flex",gap:8}}>
            {["Sim","Não","Ainda avaliando"].map(o=>(
              <button key={o} onClick={()=>set("ponto",form.ponto===o?"":o)} className="fb" style={{flex:1,padding:"10px 6px",borderRadius:10,border:`1px solid ${form.ponto===o?T.pistacheDark:T.border}`,background:form.ponto===o?T.pistacheDark:"transparent",color:form.ponto===o?T.surface:T.ink,fontSize:12.5}}>{o}</button>
            ))}
          </div>
          <span className="fm" style={lab}>Mensagem (opcional)</span>
          <textarea className="fb" rows={3} style={{...inp,resize:"vertical"}} value={form.msg} onChange={e=>set("msg",e.target.value)} placeholder="Conte um pouco sobre você, sua experiência ou sua região…"/>
          <label style={{display:"flex",gap:9,alignItems:"flex-start",marginTop:16,cursor:"pointer"}}>
            <input type="checkbox" checked={form.consent} onChange={e=>set("consent",e.target.checked)} style={{marginTop:3,accentColor:T.pistacheDark,width:16,height:16,flexShrink:0}}/>
            <span className="fb" style={{fontSize:11.5,color:T.inkSoft,lineHeight:1.45}}>Autorizo o uso dos meus dados para contato, conforme a <a href="/?privacidade=1" target="_blank" rel="noopener noreferrer" style={{color:T.pistacheDark,textDecoration:"underline"}}>Política de Privacidade</a>.</span>
          </label>
          <button onClick={enviar} disabled={!ok} className="fb" style={{width:"100%",marginTop:14,padding:"14px",borderRadius:10,border:"none",background:ok?T.pistacheDark:T.border,color:ok?"#fff":T.inkSoft,fontSize:15,fontWeight:600,cursor:ok?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            Enviar pelo WhatsApp
          </button>
          <div className="fb" style={{fontSize:11,color:T.inkSoft,textAlign:"center",marginTop:10}}>Ao enviar, o WhatsApp abre com a mensagem pronta e você recebe a <strong style={{color:T.inkSoft}}>apresentação em PDF</strong>.</div>
        </div>
        )}
      </div>
    </div>
  );
}

/* ========== MONTE SEU POTE ========== */

const CUPS=[{id:"P",label:"Pote P",g:120},{id:"M",label:"Pote M",g:170}];

export function PoteBuilder({onClose,onDelivery}){
  useModal(onClose);
  const gelatos=useMemo(()=>PRODUCTS.filter(p=>p.category==="gelato"),[]);
  const [cup,setCup]=useState("P");
  const [aId,setAId]=useState(gelatos[0]?.id);
  const [bId,setBId]=useState(gelatos[1]?.id ?? gelatos[0]?.id);
  const [ratio,setRatio]=useState(50);
  const A=gelatos.find(p=>p.id===aId)||gelatos[0];
  const B=gelatos.find(p=>p.id===bId)||gelatos[1];
  if(gelatos.length<2) return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Monte seu pote" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:14,maxWidth:380,width:"100%",padding:24,textAlign:"center",border:`1px solid ${T.border}`}}>
        <div className="fd" style={{fontSize:18,color:T.ink}}>Em breve 🍦</div>
        <div className="fb" style={{fontSize:13,color:T.inkSoft,marginTop:8,lineHeight:1.5}}>Precisamos de pelo menos 2 sabores de gelato para montar seu pote. Volte já já!</div>
        <button onClick={onClose} className="fb" style={{marginTop:16,padding:"11px 18px",borderRadius:12,border:"none",background:T.pistacheDark,color:"#fff",fontWeight:600,cursor:"pointer"}}>Fechar</button>
      </div>
    </div>
  );
  const g=CUPS.find(c=>c.id===cup).g;
  const gA=Math.round(g*ratio/100), gB=g-gA;
  const per=(p,k)=>p.nutrition[k]/p.serving;       // por grama
  const tot=k=>per(A,k)*gA+per(B,k)*gB;            // total no pote
  const proteico=tot("protein")>=20;               // celebração + conquista
  useEffect(()=>{if(proteico)award("mestre-pote");},[proteico]);
  const comboTxt=`Pote ${cup} (${g} g): ${ratio}% ${A.name} + ${100-ratio}% ${B.name} · ${Math.round(tot("kcal"))} kcal · ${tot("protein").toFixed(1)}g de proteína`;
  async function compartilharPote(){
    tk("Compartilhar · Monte seu pote");award("sem-culpa");
    const url="https://bentogelateria.com";
    try{
      const blob=await new Promise((resolve)=>{
        const c=document.createElement("canvas"); c.width=1080; c.height=1350; const x=c.getContext("2d");
        const gr=x.createLinearGradient(0,0,0,1350); gr.addColorStop(0,"#222B1A"); gr.addColorStop(1,"#0E120B"); x.fillStyle=gr; x.fillRect(0,0,1080,1350);
        x.textAlign="center";
        x.fillStyle="#B8C97A"; x.font="700 52px Georgia, serif"; x.fillText("BENTÔ", 540, 150);
        x.fillStyle="#9FB089"; x.font="600 26px Helvetica"; x.fillText("M E U   P O T E", 540, 200);
        let fs=84; const l1=`${ratio}% ${A.name}`, l2=`${100-ratio}% ${B.name}`;
        x.font=`800 ${fs}px Georgia, serif`;
        while(fs>44&&Math.max(x.measureText(l1).width,x.measureText(l2).width)>940){fs-=6;x.font=`800 ${fs}px Georgia, serif`;}
        x.fillStyle="#fff"; x.fillText(l1, 540, 520); x.fillText("+", 540, 620); x.fillText(l2, 540, 720);
        x.fillStyle="#E3C46A"; x.font="800 84px Helvetica"; x.fillText(`${tot("protein").toFixed(1)}g de proteína`, 540, 900);
        x.fillStyle="#E9EFDC"; x.font="600 40px Helvetica"; x.fillText(`${Math.round(tot("kcal"))} kcal no pote de ${g} g`, 540, 975);
        x.fillStyle="#B8C97A"; x.font="italic 700 44px Georgia, serif"; x.fillText("Monte o seu:", 540, 1150);
        x.fillStyle="#9FB089"; x.font="500 32px Helvetica"; x.fillText("bentogelateria.com", 540, 1215);
        c.toBlob(b=>resolve(b),"image/png");
      });
      const file=blob&&new File([blob],"meu-pote-bento.png",{type:"image/png"});
      if(file&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:comboTxt+" · "+url});return;}
    }catch{/* */}
    try{if(navigator.share){await navigator.share({title:"Meu pote Bentô",text:comboTxt,url});return;}}catch{/* */}
    try{await navigator.clipboard.writeText(comboTxt+" · "+url);alert("Combinação copiada! Cole no seu story ou conversa.");}catch{alert(comboTxt);}
  }
  const Sel=({value,onChange,label})=>(
    <select value={value} onChange={e=>onChange(e.target.value)} aria-label={label} className="fb" style={{width:"100%",padding:"8px 10px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:13}}>
      {gelatos.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Monte seu pote" style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:12,maxWidth:480,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:T.ink,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:T.border,textTransform:"uppercase"}}>Calculadora</div>
            <div className="fd" style={{fontSize:18,color:T.bg,marginTop:2}}>Monte seu pote</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:T.bg}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13,color:T.inkSoft,marginBottom:12}}>Escolha o tamanho e combine 2 sabores. As calorias e a proteína são calculadas para o peso real do pote.</div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {CUPS.map(c=>(
              <button key={c.id} onClick={()=>setCup(c.id)} className="fb" style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${cup===c.id?T.pistacheDark:T.border}`,background:cup===c.id?T.pistacheDark:"transparent",color:cup===c.id?T.surface:T.ink,fontSize:13,fontWeight:500}}>{c.label} · {c.g} g</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1,textAlign:"center"}}>
              <ProductArt product={A} size={84}/>
              <div className="fm" style={{fontSize:11,color:T.pistacheDark,fontWeight:600,marginTop:4}}>{gA} g</div>
              <div style={{marginTop:8}}><Sel value={aId} onChange={setAId} label="Sabor 1"/></div>
            </div>
            <div className="fd" style={{fontSize:26,color:T.pistacheDark,alignSelf:"center",paddingTop:24}}>+</div>
            <div style={{flex:1,textAlign:"center"}}>
              <ProductArt product={B} size={84}/>
              <div className="fm" style={{fontSize:11,color:T.pistacheDark,fontWeight:600,marginTop:4}}>{gB} g</div>
              <div style={{marginTop:8}}><Sel value={bId} onChange={setBId} label="Sabor 2"/></div>
            </div>
          </div>
          <div style={{marginTop:18}}>
            <input type="range" min={0} max={100} step={5} value={ratio} onChange={e=>setRatio(Number(e.target.value))} aria-label="Proporção entre os sabores" style={{width:"100%",accentColor:T.pistacheDark}}/>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span className="fm" style={{fontSize:10,color:T.inkSoft}}>{ratio}% {A.name}</span>
              <span className="fm" style={{fontSize:10,color:T.inkSoft}}>{B.name} {100-ratio}%</span>
            </div>
          </div>
          <div style={{marginTop:18,background:T.ink,border:proteico?"1px solid #C9A24A":"1px solid transparent",borderRadius:12,padding:"16px 18px",display:"flex",gap:12,alignItems:"center",position:"relative"}}>
            {proteico&&<span className="fm" style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",fontSize:8.5,letterSpacing:"0.16em",textTransform:"uppercase",background:"#C9A24A",color:"#16241A",borderRadius:999,padding:"3px 11px",whiteSpace:"nowrap",fontWeight:700}}>Pote proteico · 20g+</span>}
            <div style={{flex:1,textAlign:"center"}}>
              <div className="fd" style={{fontSize:34,color:T.bg,fontWeight:500,lineHeight:1}}>{Math.round(tot("kcal"))}</div>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.border,textTransform:"uppercase",marginTop:4}}>kcal no pote</div>
            </div>
            <div style={{width:1,alignSelf:"stretch",background:"rgba(255,255,255,0.15)"}}/>
            <div style={{flex:1,textAlign:"center"}}>
              <div className="fd" style={{fontSize:34,color:"#B8C97A",fontWeight:500,lineHeight:1}}>{tot("protein").toFixed(1)}g</div>
              <div className="fm" style={{fontSize:9,letterSpacing:"0.2em",color:T.border,textTransform:"uppercase",marginTop:4}}>proteína</div>
            </div>
          </div>
          <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[["Carboidratos",tot("carbs")],["Gorduras",tot("fat")],["Fibras",tot("fiber")]].map(([l,v])=>(
              <div key={l} style={{background:T.bg,borderRadius:10,padding:"9px 6px",textAlign:"center"}}>
                <div className="fd" style={{fontSize:16,color:T.ink}}>{v.toFixed(1)}g</div>
                <div className="fm" style={{fontSize:8,letterSpacing:"0.12em",color:T.inkSoft,textTransform:"uppercase",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <p className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:12,lineHeight:1.5,textAlign:"center"}}>Referência padrão: 100 g · valores calculados proporcionalmente para o pote de {g} g.</p>
          <button onClick={compartilharPote} className="fb" style={{width:"100%",marginTop:14,padding:"12px 14px",background:"transparent",color:T.pistacheDark,border:`1px solid ${T.pistacheDark}`,borderRadius:12,fontSize:13.5,fontWeight:600,cursor:"pointer"}}>Compartilhar meu pote</button>
          {onDelivery&&<button onClick={()=>{try{navigator.clipboard&&navigator.clipboard.writeText(comboTxt).catch(()=>{});}catch{/* */}tk("Conversão · iFood · Monte seu pote",onDelivery);}} className="fb" style={{width:"100%",marginTop:8,padding:"13px 14px",background:T.pistacheDark,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer"}}>Montar de verdade — pedir no iFood</button>}
          {onDelivery&&<div className="fb" style={{fontSize:10.5,color:T.inkSoft,textAlign:"center",marginTop:6}}>Sua combinação é copiada — é só colar na observação do pedido.</div>}
        </div>
      </div>
    </div>
  );
}

/* ========== PITCH DECK (interativo, tech, on-brand) ========== */

function PitchKicker({n,total,label,gold}){
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
      <span className="fm" style={{fontSize:12,letterSpacing:"0.3em",color:gold}}>{String(n).padStart(2,"0")} / {String(total).padStart(2,"0")}</span>
      <span style={{flex:"0 0 28px",height:1,background:gold,opacity:0.6}}/>
      <span className="fm" style={{fontSize:10,letterSpacing:"0.34em",textTransform:"uppercase",color:"#B9BBA6"}}>{label}</span>
    </div>
  );
}

function PitchStat({v,u,l,gold,cream}){
  return (
    <div style={{border:"1px solid rgba(196,168,130,0.28)",borderRadius:12,padding:"18px 16px",background:"rgba(255,255,255,0.02)"}}>
      <div className="fm" style={{fontSize:"clamp(30px,5vw,46px)",color:gold,lineHeight:1,fontWeight:500}}>{v}<span style={{fontSize:"0.5em",color:cream,opacity:0.7}}>{u}</span></div>
      <div className="fb" style={{fontSize:12.5,color:cream,opacity:0.72,marginTop:8,lineHeight:1.4}}>{l}</div>
    </div>
  );
}

export function PitchDeck({onClose,onCatalog,onFaq}){
  const ink="#181C12",cream="#F6F1E7",gold="#C9A86A",pist=T.pistache,pistD="#7C8B4E";
  const G=useMemo(()=>PRODUCTS.filter(p=>p.category==="gelato"),[]);
  const B=useMemo(()=>PRODUCTS.filter(p=>p.category==="bentole"),[]);
  const thumbs=useMemo(()=>[G[7],G[6],G[8],G[2],B[0],B[5]].filter(Boolean),[G,B]);
  const H1={fontFamily:"'Fraunces',Georgia,serif",color:cream,fontSize:"clamp(30px,6.2vw,60px)",lineHeight:1.04,letterSpacing:"-0.02em",fontWeight:400};
  const BODY={fontSize:"clamp(14px,2.4vw,18px)",color:cream,opacity:0.8,lineHeight:1.6,maxWidth:640};
  const card=(title,desc)=>(
    <div key={title} style={{flex:"1 1 180px",minWidth:170,border:"1px solid rgba(196,168,130,0.25)",borderRadius:12,padding:"18px 18px",background:"rgba(255,255,255,0.02)"}}>
      <div className="fd" style={{fontSize:18,color:gold,marginBottom:8}}>{title}</div>
      <div className="fb" style={{fontSize:13.5,color:cream,opacity:0.72,lineHeight:1.5}}>{desc}</div>
    </div>
  );
  const pill=t=><span key={t} className="fm" style={{fontSize:11,letterSpacing:"0.16em",color:cream,border:`1px solid ${gold}`,borderRadius:999,padding:"7px 14px",textTransform:"uppercase"}}>{t}</span>;

  const slides=[
    // 0 — Capa
    <div key="s0" style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <span className="fm" style={{fontSize:11,letterSpacing:"0.42em",color:gold,marginBottom:26}}>PITCH DECK · 2026</span>
      <BentoLogo size={104}/>
      <h1 style={{...H1,marginTop:26,fontSize:"clamp(38px,8vw,76px)"}}>Gelato com <i style={{color:pist,fontStyle:"italic"}}>propósito</i></h1>
      <p style={{...BODY,marginTop:18,opacity:0.85}}>A primeira linha brasileira de gelato funcional: sabor de sobremesa, ficha técnica de suplemento.</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:28}}>{["Zero açúcar adicionado","Rico em proteína","Rótulo limpo"].map(pill)}</div>
      <div className="fm" style={{fontSize:11,letterSpacing:"0.3em",color:"#9A9C86",marginTop:34,textTransform:"uppercase"}}>Espírito Santo · Brasil</div>
    </div>,
    // 1 — Problema
    <div key="s1">
      <PitchKicker n={1} total={10} label="O problema" gold={gold}/>
      <h1 style={H1}>Prazer gelado ainda<br/>é sinônimo de culpa.</h1>
      <p style={{...BODY,marginTop:22}}>Um público crescente — fitness, low-carb, controle glicêmico, alimentação limpa — não encontra sobremesa gelada que entregue prazer real sem comprometer a dieta. O “fit” tradicional falha em sabor e confunde no rótulo.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:30}}>{[["Mercado grande","sorvete é hábito nacional"],["Mal atendido","sabor ruim ou rótulo opaco"],["Tendência clara","alta proteína + menos açúcar"]].map(([t,d])=>card(t,d))}</div>
    </div>,
    // 2 — Solução
    <div key="s2">
      <PitchKicker n={2} total={10} label="A solução" gold={gold}/>
      <h1 style={H1}>Gelato italiano,<br/>reformulado do zero.</h1>
      <p style={{...BODY,marginTop:22}}>Reengenharia de formulação para unir cremosidade real e desempenho nutricional — sem sacarose adicionada em toda a linha.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:30}}>{[["Base ZERO","fibras e polióis no lugar do açúcar"],["Whey hidrolisado","proteína de alta absorção"],["0 g sacarose","adoçado por stévia e polióis"]].map(([t,d])=>card(t,d))}</div>
    </div>,
    // 3 — Portfólio
    <div key="s3">
      <PitchKicker n={3} total={10} label="Portfólio" gold={gold}/>
      <h1 style={H1}>{PRODUCTS.length} sabores. Duas linhas.</h1>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:24}}>
        <div style={{flex:"1 1 240px",border:"1px solid rgba(196,168,130,0.25)",borderRadius:12,padding:"18px"}}>
          <div className="fm" style={{fontSize:10,letterSpacing:"0.24em",color:gold,textTransform:"uppercase"}}>01 · Vitrine</div>
          <div className="fd" style={{fontSize:26,color:cream,marginTop:4}}>Gelatos <span style={{color:pist}}>· {G.length}</span></div>
          <div className="fb" style={{fontSize:13,color:cream,opacity:0.7,marginTop:6,lineHeight:1.5}}>Cremosos e proteicos. Clássicos e premium (Pistache, Dubai, Doce de Leite) e sorbets funcionais.</div>
        </div>
        <div style={{flex:"1 1 240px",border:"1px solid rgba(196,168,130,0.25)",borderRadius:12,padding:"18px"}}>
          <div className="fm" style={{fontSize:10,letterSpacing:"0.24em",color:gold,textTransform:"uppercase"}}>02 · Take-home</div>
          <div className="fd" style={{fontSize:26,color:cream,marginTop:4}}>Bentôlé <span style={{color:pist}}>· {B.length}</span></div>
          <div className="fb" style={{fontSize:13,color:cream,opacity:0.7,marginTop:6,lineHeight:1.5}}>Mini picolés premium de alta proteína. Leve para onde for.</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:18,flexWrap:"wrap"}}>{thumbs.map(p=><div key={p.id} style={{width:74,height:74,borderRadius:12,overflow:"hidden",border:"1px solid rgba(196,168,130,0.3)"}}><ProductArt product={p} size={74}/></div>)}</div>
    </div>,
    // 4 — Números
    <div key="s4">
      <PitchKicker n={4} total={10} label="Números que vendem" gold={gold}/>
      <h1 style={H1}>Indulgência com<br/>ficha de suplemento.</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:28}}>
        <PitchStat v="13" u="g" l="proteína por porção (Paçoca, Brigadeiro)" gold={gold} cream={cream}/>
        <PitchStat v="61" u="kcal" l="campeão Pistache & Choco Branco — com 10 g de proteína" gold={gold} cream={cream}/>
        <PitchStat v="0" u="g" l="açúcar adicionado em toda a linha" gold={gold} cream={cream}/>
        <PitchStat v="42" u="kcal" l="o mais leve (Franui)" gold={gold} cream={cream}/>
      </div>
    </div>,
    // 5 — Engenharia / regulatório
    <div key="s5">
      <PitchKicker n={5} total={10} label="Engenharia & conformidade" gold={gold}/>
      <h1 style={H1}>Técnica que o<br/>“fit” não entrega.</h1>
      <p style={{...BODY,marginTop:22}}>Balanço PAC/POD calibrado para textura cremosa real, whey hidrolisado e chocolates sem adição de açúcar. Rotulagem limpa, auditável e pronta para escala.</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:26}}>{["RDC 429/2020","IN 75/2020","RDC 26/2015 · alérgicos","RDC 727/2022"].map(pill)}</div>
    </div>,
    // 6 — Transparência / app
    <div key="s6">
      <PitchKicker n={6} total={10} label="Transparência como marca" gold={gold}/>
      <h1 style={H1}>Índice nutricional<br/>digital, no PDV.</h1>
      <p style={{...BODY,marginTop:22}}>Um QR code no balcão leva o cliente à ficha completa de cada sabor: informação nutricional, ingredientes, alérgicos, comparador e calculadora de proteína. Transparência radical vira conversão.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:28}}>{[["Ficha completa","IN 75/2020 por sabor"],["Comparador","lado a lado"],["Calculadora","proteína por meta"]].map(([t,d])=>card(t,d))}</div>
    </div>,
    // 7 — Monte seu Pote
    <div key="s7">
      <PitchKicker n={7} total={10} label="Experiência interativa" gold={gold}/>
      <h1 style={H1}>Monte seu pote.</h1>
      <p style={{...BODY,marginTop:22}}>O cliente combina 2 sabores no pote P (120 g) ou M (170 g) e vê na hora as calorias e a proteína exatas da combinação. Personalização que engaja, aumenta o ticket e reforça o posicionamento funcional.</p>
      <div style={{display:"flex",gap:16,alignItems:"center",marginTop:30,flexWrap:"wrap"}}>
        <div className="fm" style={{fontSize:"clamp(28px,5vw,44px)",color:gold}}>2 <span style={{fontSize:"0.42em",color:cream,opacity:0.7}}>SABORES</span></div>
        <span style={{color:pist,fontSize:28}}>→</span>
        <div className="fm" style={{fontSize:"clamp(28px,5vw,44px)",color:gold}}>kcal + proteína <span style={{fontSize:"0.4em",color:cream,opacity:0.7}}>NA HORA</span></div>
      </div>
    </div>,
    // 8 — Mercado & modelo
    <div key="s8">
      <PitchKicker n={8} total={10} label="Mercado & modelo" gold={gold}/>
      <h1 style={H1}>Público premium,<br/>escala por franquia.</h1>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:26}}>{[["Público","musculação, low-carb, controle glicêmico, clean label"],["Canais","vitrine, franquia, take-home, e-commerce, academias"],["Escala","~100 picolés por receita de Bentôlé"],["Recorrência","assinatura e cross-sell entre linhas"]].map(([t,d])=>card(t,d))}</div>
    </div>,
    // 9 — Visão / CTA
    <div key="s9" style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <PitchKicker n={9} total={10} label="Visão" gold={gold}/>
      <h1 style={{...H1,fontSize:"clamp(32px,7vw,64px)"}}>A referência nacional<br/>em sobremesa funcional.</h1>
      <p style={{...BODY,marginTop:20,textAlign:"center"}}>Zero açúcar adicionado. Alta proteína. Rótulo limpo. Sem abrir mão do prazer.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginTop:34}}>
        <a href={DECK_URL} target="_blank" rel="noopener noreferrer" className="fb" style={{background:gold,color:ink,border:"none",borderRadius:11,padding:"13px 24px",fontSize:14,fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}><Printer size={15}/>Baixar PDF</a>
        <button onClick={onCatalog} className="fb" style={{background:"transparent",color:cream,border:`1px solid ${gold}`,borderRadius:11,padding:"13px 24px",fontSize:14,display:"flex",alignItems:"center",gap:8}}>Explorar catálogo <ChevronRight size={14}/></button>
        {onFaq&&<button onClick={onFaq} className="fb" style={{background:"transparent",color:cream,border:`1px solid ${gold}`,borderRadius:11,padding:"13px 24px",fontSize:14,display:"flex",alignItems:"center",gap:8}}>Dúvidas frequentes <ChevronRight size={14}/></button>}
      </div>
      <div className="fm" style={{fontSize:11,letterSpacing:"0.3em",color:"#9A9C86",marginTop:30,textTransform:"uppercase"}}>Bentô · Functional Nutrition</div>
    </div>,
  ];
  const n=slides.length;
  const [i,setI]=useState(0);
  const go=useCallback(d=>setI(v=>Math.max(0,Math.min(n-1,v+d))),[n]);
  useModal(onClose);
  useEffect(()=>{
    const h=e=>{if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();go(1);}else if(e.key==="ArrowLeft")go(-1);};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[go]);
  const tx=useRef(null);
  const grid="radial-gradient(rgba(201,168,106,0.10) 1px, transparent 1px)";
  return (
    <div className="fade" role="dialog" aria-modal="true" aria-label="Pitch deck Bentô"
      onTouchStart={e=>tx.current=e.touches[0].clientX}
      onTouchEnd={e=>{if(tx.current==null)return;const d=e.changedTouches[0].clientX-tx.current;if(Math.abs(d)>50)go(d<0?1:-1);tx.current=null;}}
      style={{position:"fixed",inset:0,zIndex:200,background:ink,backgroundImage:grid,backgroundSize:"26px 26px",display:"flex",flexDirection:"column"}}>
      {/* topo */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><BentoLogo size={30}/><span className="fm" style={{fontSize:10,letterSpacing:"0.28em",color:"#9A9C86",textTransform:"uppercase"}}>Pitch</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {onFaq&&<button onClick={onFaq} aria-label="Dúvidas frequentes" className="fm" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,168,106,0.3)",color:cream,borderRadius:11,padding:"8px 14px",fontSize:11,letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>Dúvidas</button>}
          <button onClick={onClose} aria-label="Fechar" className="fm" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,168,106,0.3)",color:cream,borderRadius:11,padding:"8px 14px",fontSize:11,letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><X size={14}/>ESC</button>
        </div>
      </div>
      {/* slide */}
      <div style={{flex:1,overflow:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 24px"}}>
        <div key={i} className="rise" style={{width:"100%",maxWidth:880}}>{slides[i]}</div>
      </div>
      {/* progresso */}
      <div style={{height:2,background:"rgba(255,255,255,0.08)",flexShrink:0}}><div style={{height:"100%",width:`${((i+1)/n)*100}%`,background:gold,transition:"width .4s cubic-bezier(.2,.8,.2,1)"}}/></div>
      {/* base */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",flexShrink:0,gap:12}}>
        <div style={{display:"flex",gap:7}}>{slides.map((_,k)=><button key={k} onClick={()=>setI(k)} aria-label={`Slide ${k+1}`} style={{width:k===i?22:8,height:8,borderRadius:999,border:"none",background:k===i?gold:"rgba(255,255,255,0.22)",transition:"all .3s",cursor:"pointer"}}/>)}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className="fm" style={{fontSize:12,color:"#9A9C86",minWidth:54,textAlign:"right"}}>{String(i+1).padStart(2,"0")} / {String(n).padStart(2,"0")}</span>
          <button onClick={()=>go(-1)} disabled={i===0} aria-label="Anterior" style={{background:"transparent",border:`1px solid rgba(201,168,106,${i===0?0.15:0.4})`,color:i===0?"#555":cream,borderRadius:11,width:38,height:34,cursor:i===0?"default":"pointer"}}><ArrowLeft size={15} style={{verticalAlign:"middle"}}/></button>
          <button onClick={()=>go(1)} disabled={i===n-1} aria-label="Próximo" style={{background:i===n-1?"transparent":gold,border:`1px solid ${gold}`,color:i===n-1?"#555":ink,borderRadius:11,width:38,height:34,cursor:i===n-1?"default":"pointer"}}><ChevronRight size={16} style={{verticalAlign:"middle"}}/></button>
        </div>
      </div>
    </div>
  );
}

/* ========== HEADER ========== */

const SORVETE_REF = { kcal:207, sugars:21, protein:3.5 };

function Linha({rotulo, bento, comum, unidade}){
  const max=Math.max(bento,comum,0.001);
  const pb=Math.round(bento/max*100), pc=Math.round(comum/max*100);
  const row=(nome,val,w,cor,strong)=>(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
      <span style={{width:58,fontSize:11,color:strong?T.pistacheDark:T.inkSoft,fontWeight:strong?700:500}}>{nome}</span>
      <div style={{flex:1,background:"#EDE4CF",borderRadius:12,height:18,overflow:"hidden"}}>
        <div style={{width:w+"%",height:"100%",background:cor,transition:"width .6s cubic-bezier(.2,.8,.2,1)"}}/>
      </div>
      <span style={{width:70,textAlign:"right",fontSize:12,fontWeight:strong?700:500,color:strong?T.ink:T.inkSoft}}>{val.toFixed(1)}{unidade}</span>
    </div>
  );
  return(
    <div style={{marginBottom:16}}>
      <div className="fm" style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:T.inkSoft,marginBottom:7}}>{rotulo}</div>
      {row("Bentô",bento,pb,"linear-gradient(90deg,#8FA050,#46583A)",true)}
      {row("Comum",comum,pc,"#C9A98F",false)}
    </div>
  );
}

export function CulpaModal({onClose,onDelivery,productId}){
  useModal(onClose);
  // Comparação por PORÇÃO real — dinâmica por sabor (padrão: Pistache, o best-seller).
  const gelatos=PRODUCTS.filter(p=>p.category==="gelato");
  const [pid,setPid]=useState(productId&&gelatos.some(p=>p.id===productId)?productId:"pistache");
  const pis = gelatos.find(p=>p.id===pid)||gelatos[0];
  const sc = pis.serving/100; // sorvete comum (por 100 g) reescalado p/ a mesma porção
  const cSug=SORVETE_REF.sugars*sc, cProt=SORVETE_REF.protein*sc, cKcal=Math.round(SORVETE_REF.kcal*sc);
  const bSug=pis.nutrition.addedSugars, bProt=pis.nutrition.protein, bKcal=pis.nutrition.kcal;
  const cubos = Math.max(0, Math.round((cSug - bSug)/4)); // 1 torrão ≈ 4 g
  const protMais = Math.max(0, bProt - cProt);

  function gerarImagem(){
    return new Promise((resolve)=>{
      const c=document.createElement("canvas"); c.width=1080; c.height=1350; const x=c.getContext("2d");
      const g=x.createLinearGradient(0,0,0,1350); g.addColorStop(0,"#222B1A"); g.addColorStop(1,"#0E120B"); x.fillStyle=g; x.fillRect(0,0,1080,1350);
      x.textAlign="center";
      x.fillStyle="#B8C97A"; x.font="700 52px Georgia, serif"; x.fillText("BENTÔ", 540, 150);
      x.fillStyle="#9FB089"; x.font="600 26px Helvetica"; x.fillText("S E M   C U L P A - Ô M E T R O", 540, 200);
      x.fillStyle="#fff"; x.font="800 230px Helvetica"; x.fillText("−"+cubos, 540, 560);
      x.fillStyle="#E9EFDC"; x.font="600 38px Helvetica"; x.fillText("torrões de açúcar adicionado por porção", 540, 625);
      x.fillStyle="#E3C46A"; x.font="800 180px Helvetica"; x.fillText("+"+protMais.toFixed(0)+"g", 540, 900);
      x.fillStyle="#E9EFDC"; x.font="600 38px Helvetica"; x.fillText("de proteína vs sorvete comum", 540, 965);
      x.fillStyle="#B8C97A"; x.font="italic 700 44px Georgia, serif"; x.fillText(pis.name+" · "+bKcal+" kcal por porção", 540, 1190);
      x.fillStyle="#9FB089"; x.font="500 30px Helvetica"; x.fillText("bentogelateria.com", 540, 1245);
      c.toBlob(b=>resolve(b),"image/png");
    });
  }
  const msg = `No nosso ${pis.name}: ~${cubos} torrões de açúcar adicionado a MENOS, +${protMais.toFixed(0)}g de proteína e só ${bKcal} kcal por porção vs sorvete comum.`;
  const url = "https://bentogelateria.com";
  async function compartilhar(){
    tk("Compartilhar · Sem culpa-ômetro");award("sem-culpa");
    try{
      const blob = await gerarImagem();
      const file = blob && new File([blob],"bento-sem-culpa.png",{type:"image/png"});
      if(file && navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file],text:msg+" "+url}); return; }
    }catch{}
    try{ if(navigator.share){ await navigator.share({title:"Bentô — sem culpa",text:msg,url}); return; } }catch{}
    try{ await navigator.clipboard.writeText(msg+" "+url); alert("Texto copiado! Cole no seu story ou conversa. 🍦"); }catch{ alert(msg+" "+url); }
  }
  async function baixar(){
    tk("Baixar imagem · Sem culpa-ômetro");
    const blob = await gerarImagem(); if(!blob) return;
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="bento-sem-culpa.png"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }

  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sem culpa-ômetro" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:14,maxWidth:460,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:"linear-gradient(135deg,#222B1A,#3A472A)",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:"#B8C97A",textTransform:"uppercase"}}>Inteligência nutricional</div>
            <div className="fd" style={{fontSize:20,color:"#fff",marginTop:2}}>Sem culpa-ômetro 🍦</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.14)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13,color:T.inkSoft,marginBottom:10,lineHeight:1.5}}>O que você ganha trocando o sorvete comum pelo nosso <strong style={{color:T.ink}}>{pis.name}</strong> — por porção de {pis.portionLabel}:</div>
          <select value={pid} onChange={e=>{setPid(e.target.value);tk("Sem culpa · Trocar sabor");}} aria-label="Escolher o sabor da comparação" className="fb" style={{width:"100%",padding:"9px 11px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg,color:T.ink,fontSize:13,marginBottom:14}}>
            {gelatos.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <div style={{display:"flex",gap:10,marginBottom:18}}>
            <div style={{flex:1,background:"#EFF5E5",border:"1px solid #CBD9A6",borderRadius:16,padding:"14px 10px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:30,color:T.pistacheDark,lineHeight:1}}>−{cubos}</div>
              <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>torrões de açúcar 🧊</div>
            </div>
            <div style={{flex:1,background:"#EAF0F8",border:"1px solid #BFD2EC",borderRadius:16,padding:"14px 10px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:30,color:"#1A4FAA",lineHeight:1}}>+{protMais.toFixed(0)}g</div>
              <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>de proteína 💪</div>
            </div>
            <div style={{flex:1,background:"#F6EEDD",border:"1px solid #E0CBA0",borderRadius:16,padding:"14px 10px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:30,color:"#A9831C",lineHeight:1}}>{bKcal}</div>
              <div className="fb" style={{fontSize:10.5,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>kcal por porção 🍃</div>
            </div>
          </div>

          <Linha rotulo="Açúcar adicionado (g / porção)" bento={bSug} comum={cSug} unidade="g"/>
          <Linha rotulo="Proteína (g / porção)" bento={bProt} comum={cProt} unidade="g"/>

          <div style={{display:"flex",alignItems:"center",gap:10,background:"#EFF5E5",border:"1px solid #CBD9A6",borderRadius:16,padding:"12px 14px",marginBottom:4}}>
            <div className="fd" style={{fontSize:26,color:T.pistacheDark,fontWeight:600,lineHeight:1,whiteSpace:"nowrap"}}>{bKcal} kcal</div>
            <div className="fb" style={{fontSize:11.5,color:T.inkSoft,lineHeight:1.35}}>por porção de {pis.portionLabel} — leve, <b style={{color:T.ink}}>sem açúcar adicionado</b> e com {bProt} g de proteína. <span style={{color:T.inkSoft}}>(comum ≈ {cKcal} kcal)</span></div>
          </div>

          <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
            <button onClick={compartilhar} className="fb" style={{flex:1,minWidth:150,background:T.pistacheDark,color:"#fff",border:"none",borderRadius:14,padding:"13px 14px",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>Compartilhar no story</button>
            <button onClick={baixar} className="fb" style={{background:"transparent",color:T.pistacheDark,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 14px",fontSize:13,cursor:"pointer"}}>Baixar imagem</button>
          </div>
          <button onClick={onDelivery} className="fb" style={{width:"100%",marginTop:10,background:T.pistacheDark,color:"#fff",border:"none",borderRadius:14,padding:"13px 14px",fontSize:13.5,fontWeight:600,cursor:"pointer",opacity:.94}}>Provar sem culpa — pedir no iFood</button>

          <div className="fb" style={{fontSize:10.5,color:T.inkSoft,textAlign:"center",marginTop:14,lineHeight:1.5}}>Comparativo ilustrativo. Bentô {pis.name} (porção de {pis.portionLabel}, da nossa ficha). “Comum” = sorvete de massa tradicional (média de mercado, ~21 g de açúcar/100 g), na mesma porção.</div>
        </div>
      </div>
    </div>
  );
}

/* ========== ALIADO DA CANETA (análogos de GLP-1) ========== */

export function GLP1Modal({onClose,onSelectProduct,onTabelas,onDelivery}){
  useModal(onClose);
  const top = PRODUCTS.filter(p=>p.category==="gelato").slice().sort((a,b)=>b.nutrition.protein-a.nutrition.protein).slice(0,6);
  const maxP = top.length?top[0].nutrition.protein:1;
  return(
    <div className="fade" onClick={onClose} role="dialog" aria-modal="true" aria-label="Aliado de quem usa GLP-1" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(31,35,23,0.62)",backdropFilter:"blur(4px)",padding:16}}>
      <div className="rise gn" onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:14,maxWidth:480,width:"100%",maxHeight:"92dvh",overflow:"auto",border:`1px solid ${T.border}`}}>
        <div style={{background:"linear-gradient(135deg,#2A2238,#3E2F58)",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="fm" style={{fontSize:9,letterSpacing:"0.3em",color:"#D9C7F2",textTransform:"uppercase"}}>Tabelas em foco</div>
            <div className="fd" style={{fontSize:20,color:"#fff",marginTop:2}}>Aliado de quem usa a caneta 💉</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{background:"rgba(255,255,255,0.14)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0}}><X size={16}/></button>
        </div>
        <div style={{padding:22}}>
          <div className="fb" style={{fontSize:13.5,color:T.ink,marginBottom:8,lineHeight:1.55}}>Análogos de <strong>GLP-1</strong> (como semaglutida e tirzepatida) reduzem o apetite. Comendo menos, fica difícil bater a <strong>proteína do dia</strong> — e é ela que protege a sua <strong>massa magra</strong>.</div>
          <div className="fb" style={{fontSize:13.5,color:T.ink,marginBottom:16,lineHeight:1.55}}>O Bentô resolve isso: <strong>muita proteína numa porção pequena</strong>, fácil de comer mesmo sem fome, com <strong>zero açúcar adicionado</strong>.</div>

          <div style={{display:"flex",gap:10,marginBottom:18}}>
            <div style={{flex:1,background:"#EAF0F8",border:"1px solid #BFD2EC",borderRadius:16,padding:"14px 8px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:26,color:"#1A4FAA",lineHeight:1}}>até {maxP}g</div>
              <div className="fb" style={{fontSize:10,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>proteína / bola</div>
            </div>
            <div style={{flex:1,background:"#EFF5E5",border:"1px solid #CBD9A6",borderRadius:16,padding:"14px 8px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:26,color:T.pistacheDark,lineHeight:1}}>0</div>
              <div className="fb" style={{fontSize:10,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>açúcar adicionado</div>
            </div>
            <div style={{flex:1,background:"#F4EEF8",border:"1px solid #D9C7F2",borderRadius:16,padding:"14px 8px",textAlign:"center"}}>
              <div className="fd" style={{fontSize:26,color:"#6A3DA8",lineHeight:1}}>60g</div>
              <div className="fb" style={{fontSize:10,color:T.inkSoft,marginTop:4,lineHeight:1.25}}>porção fácil de comer</div>
            </div>
          </div>

          <div className="fm" style={{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:T.inkSoft,marginBottom:8}}>Ranking de proteína</div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
            {top.map(p=>(
              <button key={p.id} onClick={()=>onSelectProduct(p.id)} className="hl" style={{display:"flex",alignItems:"center",gap:10,textAlign:"left",background:T.bg,border:`1px solid ${T.border}`,borderRadius:14,padding:"10px 12px",cursor:"pointer"}}>
                <span style={{fontSize:22,flexShrink:0}}>{p.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="fd" style={{fontSize:14,color:T.ink,lineHeight:1.1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                  <div style={{background:"#E6EAD8",borderRadius:11,height:7,overflow:"hidden",marginTop:5}}><div style={{width:Math.round(p.nutrition.protein/maxP*100)+"%",height:"100%",background:"linear-gradient(90deg,#8FA050,#46583A)"}}/></div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div className="fd" style={{fontSize:16,color:"#1A4FAA",lineHeight:1}}>{p.nutrition.protein}g</div>
                  <div className="fb" style={{fontSize:9,color:T.inkSoft}}>{p.portionLabel}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={onTabelas} className="fb" style={{flex:1,minWidth:150,background:T.pistacheDark,color:"#fff",border:"none",borderRadius:14,padding:"13px 14px",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>📋 Ver todas as tabelas</button>
            <button onClick={onDelivery} className="fb" style={{flex:1,minWidth:150,background:"#EA1D2C",color:"#fff",border:"none",borderRadius:14,padding:"13px 14px",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>🗺️ Pedir no iFood</button>
          </div>

          <div style={{background:"#FBF4E6",border:"1px solid #E8D9B5",borderRadius:14,padding:"12px 14px",marginTop:14}}>
            <div className="fb" style={{fontSize:11,color:"#7A5E1C",lineHeight:1.5}}>⚠️ Conteúdo informativo sobre nutrição — <strong>não é conselho médico</strong> e não substitui o acompanhamento do seu médico ou nutricionista. O uso de medicamentos deve ser sempre orientado por um profissional de saúde.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

