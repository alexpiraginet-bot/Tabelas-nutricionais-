// Termos de Uso & Direitos Autorais. Carregada sob demanda quando a URL traz ?termos.
export default function TermosPage(){
  const wrap={maxWidth:760,margin:"0 auto",background:"#FBF8EE",borderRadius:8,padding:"40px 34px",boxShadow:"0 20px 60px -24px rgba(0,0,0,.25)"};
  const h2={fontFamily:"'Fraunces',Georgia,serif",fontSize:18,color:"#1F2317",marginTop:26,marginBottom:6};
  const p={fontSize:13.5,lineHeight:1.65,color:"#3a3f30",margin:"0 0 8px"};
  const hoje=new Date().toLocaleDateString("pt-BR");
  return(
    <div style={{minHeight:"100vh",background:"#EAE3CE",padding:"28px 14px",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={wrap}>
        <a href="/" style={{color:"#5C6B3A",fontSize:13,textDecoration:"underline"}}>← Voltar ao site</a>
        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:26,color:"#1F2317",margin:"14px 0 2px"}}>Termos de Uso & Direitos Autorais</h1>
        <div style={{fontSize:11.5,color:"#7E806C",letterSpacing:"0.04em"}}>Bentô Gelatos · atualizada em {hoje}</div>

        <h2 style={h2}>1. Titularidade</h2>
        <p style={p}>Este site (<strong>bentogelateria.com</strong>), incluindo seu código-fonte, layout, design, textos, imagens, ilustrações, identidade visual, marca e demais elementos, é de propriedade exclusiva da <strong>ABB Gelateria Ltda</strong> (nome fantasia Bentô Gelatos), CNPJ 61.590.463/0001-45, Vitória — ES.</p>

        <h2 style={h2}>2. Proteção legal</h2>
        <p style={p}>Todo o conteúdo é protegido pela <strong>Lei nº 9.610/1998</strong> (Direitos Autorais) e pela <strong>Lei nº 9.279/1996</strong> (Propriedade Industrial). A marca "Bentô Gelatos" e seus sinais distintivos são de uso exclusivo da titular.</p>

        <h2 style={h2}>3. Usos proibidos</h2>
        <p style={p}>É expressamente proibido, sem autorização prévia e por escrito da titular: copiar, reproduzir, clonar, espelhar, distribuir, modificar ou criar obras derivadas do site, total ou parcialmente; extrair seu código, design ou conteúdo por meios manuais ou automatizados (scraping); e usar a marca, o nome ou a identidade visual de forma que cause confusão com a Bentô Gelatos.</p>

        <h2 style={h2}>4. Uso permitido</h2>
        <p style={p}>Você pode acessar e navegar livremente pelo site para fins pessoais e informativos, compartilhar os links das nossas páginas e utilizar os canais de contato e pedido (iFood, WhatsApp) para os fins a que se destinam.</p>

        <h2 style={h2}>5. Violações e providências</h2>
        <p style={p}>Identificada cópia ou uso indevido, a titular poderá adotar as medidas cabíveis, incluindo notificação extrajudicial, pedidos de remoção (DMCA/notice-and-takedown) junto a provedores e plataformas, e as ações cíveis e criminais previstas em lei. Denúncias e solicitações: <strong>bentogelateria@gmail.com</strong>.</p>

        <h2 style={h2}>6. Isenção</h2>
        <p style={p}>As informações nutricionais e de produtos são apresentadas de boa-fé e podem ser ajustadas sem aviso. Em caso de divergência, prevalecem as informações do rótulo oficial do produto.</p>

        <div style={{marginTop:24,paddingTop:12,borderTop:"1px solid #D9D2BD",fontSize:11,color:"#7E806C"}}>© {new Date().getFullYear()} ABB Gelateria Ltda · bentogelateria.com · Vitória — ES · Todos os direitos reservados.</div>
      </div>
    </div>
  );
}
