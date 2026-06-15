// Portfólio de produtos para parceiros. Página standalone (?portfolio=1), também imprimível em PDF.
const C={bg:"#EAE3CE",surface:"#FBF8EE",ink:"#1F2317",soft:"#5A5E4E",pist:"#5C6B3A",gold:"#C4A882",border:"#D9D2BD"};
const SERIF="'Fraunces',Georgia,serif", SANS="'DM Sans',system-ui,sans-serif", MONO="'JetBrains Mono',ui-monospace,monospace";

const PICOLES=[
  {n:"Pistache & Choco Branco", d:"Recheio + cobertura + pistaches inteiros", prot:"10 g", kcal:61, img:"/portfolio/heros/pistache-choco-branco.jpg"},
  {n:"Chocolate Dubai", d:"Cacau · pistache · kadaif · stracciatella", prot:"10 g", kcal:108, img:"/portfolio/heros/chocolate-dubai.jpg"},
  {n:"Opereta", d:"Chocolate branco Latissimo · castanhas", prot:"9,9 g", kcal:86, img:"/portfolio/heros/opereta.jpg"},
  {n:"Snickers", d:"Amendoim · doce de leite · chocolate 70%", prot:"9,6 g", kcal:95, img:"/portfolio/heros/snickers.jpg"},
  {n:"Prestígio", d:"Coco cremoso · cobertura de chocolate", prot:"8 g", kcal:91, img:"/portfolio/heros/prestigio.jpg"},
  {n:"Franuí", d:"Framboesa · choco branco · choco 70% — o mais leve", prot:"1,2 g", kcal:42, img:"/portfolio/heros/franui.jpg"},
  {n:"Magnésio + Inositol Relief 3.0", d:"Tangerina com Maracujá", soon:true, prot:null, kcal:null, img:"/portfolio/heros/magnesio.jpg"},
];
const POTES=[
  {n:"Chocolate Dubai", d:"Chocolate com creme crocante e granela crocante", prot:"12 g"},
  {n:"Pistache", d:"Pistache mesclado e granela", prot:"10 g"},
  {n:"Doce de Leite", d:"Doce de leite mesclado e granela", prot:"11 g"},
];

export default function PortfolioPage(){
  const sectionTag={fontFamily:MONO,fontSize:11,letterSpacing:"0.26em",textTransform:"uppercase",color:C.pist};
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:SANS,color:C.ink}}>
      <style>{`
        @media print {
          .noprint{display:none!important}
          .pf-sec{break-inside:avoid}
          body{background:#fff}
        }
        .pf-card{transition:transform .25s, box-shadow .25s}
        .pf-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px -18px rgba(0,0,0,.35)}
      `}</style>

      {/* barra de ações (não imprime) */}
      <div className="noprint" style={{position:"sticky",top:0,zIndex:10,background:"rgba(31,35,23,.96)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"12px 18px",flexWrap:"wrap"}}>
        <a href="/" style={{color:C.surface,fontSize:13,textDecoration:"none",fontFamily:MONO,letterSpacing:"0.1em"}}>← Voltar ao site</a>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <a href="/portfolio-bento.pdf" download style={{background:C.gold,color:C.ink,fontWeight:700,fontSize:13,textDecoration:"none",borderRadius:6,padding:"9px 16px"}}>↓ Baixar PDF</a>
          <button onClick={()=>window.print()} style={{background:"transparent",color:C.surface,border:`1px solid ${C.gold}`,fontSize:13,borderRadius:6,padding:"9px 16px",cursor:"pointer"}}>🖨 Salvar como PDF</button>
        </div>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"40px 22px 60px"}}>
        {/* HERO */}
        <header style={{textAlign:"center",marginBottom:44}}>
          <img src="/bento-logo.webp" alt="Bentô" width={84} height={84} style={{borderRadius:"50%"}}/>
          <div style={{...sectionTag,marginTop:14}}>Bentô Gelatos · para parceiros</div>
          <h1 style={{fontFamily:SERIF,fontSize:"clamp(34px,6vw,60px)",lineHeight:1.02,margin:"10px 0 8px",fontWeight:600,letterSpacing:"-0.02em"}}>Portfólio de Produtos</h1>
          <p style={{fontSize:15,color:C.soft,maxWidth:560,margin:"0 auto",lineHeight:1.5}}>Linha proteica, sem açúcar adicionado e rótulo limpo. Picolés Bentôlé e potes selados de 140 ml — premium, com whey WPH e margem atrativa para o parceiro.</p>
        </header>

        {/* PROPOSTA */}
        <div className="pf-sec" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:50}}>
          {[["Premium","Estética sofisticada e percepção de valor superior ao congelado comum."],
            ["Proteico","Whey WPH — diálogo direto com o público fitness e wellness."],
            ["Sem açúcar adicionado","Rótulo limpo · opções low-carb e para controle glicêmico."],
            ["Margem atrativa","Picolés e potes 140 ml com boa margem e alto giro."]].map(([t,d])=>(
            <div key={t} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 16px"}}>
              <div style={{fontFamily:SERIF,fontSize:18,color:C.pist,marginBottom:4}}>{t}</div>
              <div style={{fontSize:12.5,color:C.soft,lineHeight:1.45}}>{d}</div>
            </div>
          ))}
        </div>

        {/* PICOLÉS */}
        <section className="pf-sec" style={{marginBottom:54}}>
          <div style={sectionTag}>01 · Linha Take-Home</div>
          <h2 style={{fontFamily:SERIF,fontSize:"clamp(26px,4vw,40px)",margin:"6px 0 4px",fontWeight:500}}>Picolés Bentôlé</h2>
          <p style={{fontSize:13.5,color:C.soft,marginBottom:18}}>Mini picolés proteicos · tamanhos <strong>P (55 g)</strong> e <strong>G (110 g)</strong> · embalagem individual premium.</p>
          <figure style={{margin:"0 auto 22px",maxWidth:560}}>
            <img src="/portfolio/picoles-poster.jpg" alt="Linha de picolés Bentôlé" loading="lazy" style={{width:"100%",display:"block",borderRadius:12,border:`1px solid ${C.border}`}}/>
            <figcaption style={{fontSize:10,color:C.soft,textAlign:"center",marginTop:5,fontStyle:"italic"}}>Imagem meramente ilustrativa</figcaption>
          </figure>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(232px,1fr))",gap:12}}>
            {PICOLES.map(p=>(
              <div key={p.n} className="pf-card" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                {p.img&&<img src={p.img} alt={p.n} loading="lazy" width={232} height={300} style={{width:"100%",height:300,objectFit:"cover",objectPosition:"center 30%"}}/>}
                <div style={{padding:"12px 14px",flex:1,display:"flex",flexDirection:"column"}}>
                  <div style={{fontSize:9,color:C.soft,fontStyle:"italic",marginBottom:6}}>Imagem meramente ilustrativa</div>
                  <div style={{fontFamily:SERIF,fontSize:18,lineHeight:1.15}}>{p.n}</div>
                  <div style={{fontSize:12,color:C.soft,marginTop:4,lineHeight:1.4,flex:1}}>{p.d}</div>
                  <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                    {p.soon
                      ? <span style={{fontFamily:MONO,fontSize:11,background:"#F3E2C5",color:"#8A5A1E",borderRadius:3,padding:"3px 8px"}}>Lançamento em breve</span>
                      : <>
                          {p.prot&&<span style={{fontFamily:MONO,fontSize:11,background:"#E5EBD3",color:C.pist,borderRadius:3,padding:"3px 8px"}}>{p.prot} prot</span>}
                          {p.kcal&&<span style={{fontFamily:MONO,fontSize:11,background:C.bg,color:C.soft,borderRadius:3,padding:"3px 8px"}}>{p.kcal} kcal · P</span>}
                        </>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{fontSize:11,color:C.soft,marginTop:12,lineHeight:1.5}}>Valores nutricionais por unidade no tamanho P (~55 g). Magnésio + Inositol Relief 3.0 disponível apenas no tamanho P. Fichas completas em bentogelateria.com.</p>
        </section>

        {/* POTES */}
        <section className="pf-sec" style={{marginBottom:48}}>
          <div style={sectionTag}>02 · Linha Vitrine</div>
          <h2 style={{fontFamily:SERIF,fontSize:"clamp(26px,4vw,40px)",margin:"6px 0 4px",fontWeight:500}}>Potes Selados 140 ml</h2>
          <p style={{fontSize:13.5,color:C.soft,marginBottom:18}}>Gelato proteico em pote selado de 140 ml — pronto para vitrine, take-home e delivery.</p>
          <figure style={{margin:"0 auto 22px",maxWidth:620}}>
            <img src="/portfolio/potes-140.jpg" alt="Potes selados de 140 ml" loading="lazy" style={{width:"100%",display:"block",borderRadius:12,border:`1px solid ${C.border}`}}/>
            <figcaption style={{fontSize:10,color:C.soft,textAlign:"center",marginTop:5,fontStyle:"italic"}}>Imagem meramente ilustrativa</figcaption>
          </figure>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
            {POTES.map(p=>(
              <div key={p.n} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 16px"}}>
                <div style={{fontFamily:SERIF,fontSize:20,marginBottom:4}}>{p.n}</div>
                <div style={{fontSize:12.5,color:C.soft,lineHeight:1.45,marginBottom:10}}>{p.d}</div>
                <span style={{fontFamily:MONO,fontSize:11,background:"#E5EBD3",color:C.pist,borderRadius:3,padding:"3px 8px"}}>{p.prot} de proteína</span>
              </div>
            ))}
          </div>
          <p style={{fontSize:11,color:C.soft,marginTop:12,lineHeight:1.5}}>Proteína de referência por porção de 60 g. Sem açúcar adicionado. Pote selado de 140 ml.</p>
        </section>

        {/* CONTATO */}
        <section className="pf-sec" style={{background:"linear-gradient(135deg,#222B1A,#3A472A)",borderRadius:14,padding:"30px 26px",textAlign:"center",color:C.surface}}>
          <h2 style={{fontFamily:SERIF,fontSize:28,margin:"0 0 8px",fontWeight:500}}>Vamos ser parceiros?</h2>
          <p style={{fontSize:14,color:"rgba(255,255,255,.85)",maxWidth:520,margin:"0 auto 18px",lineHeight:1.5}}>Lojas de suplementos, academias, empórios, cafeterias e mercados premium. Fale com a gente para condições de revenda.</p>
          <div className="noprint" style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <a href="https://wa.me/5527999159995?text=Quero%20ser%20parceiro%20Bent%C3%B4" target="_blank" rel="noopener noreferrer" style={{background:"#1FA855",color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none",borderRadius:8,padding:"12px 22px"}}>WhatsApp (27) 99915-9995</a>
            <a href="/portfolio-bento.pdf" download style={{background:C.gold,color:C.ink,fontWeight:700,fontSize:14,textDecoration:"none",borderRadius:8,padding:"12px 22px"}}>↓ Baixar este portfólio (PDF)</a>
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.8)",marginTop:16,fontFamily:MONO,letterSpacing:"0.04em"}}>bentogelateria@gmail.com · bentogelateria.com</div>
        </section>

        <div style={{textAlign:"center",fontSize:11,color:C.soft,marginTop:24}}>© {new Date().getFullYear()} ABB Gelateria Ltda · Bentô Gelatos · Vitória — ES</div>
      </div>
    </div>
  );
}
