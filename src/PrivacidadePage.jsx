// Política de Privacidade (LGPD). Carregada sob demanda quando a URL traz ?privacidade.
export default function PrivacidadePage(){
  const wrap={maxWidth:760,margin:"0 auto",background:"#FBF8EE",borderRadius:8,padding:"40px 34px",boxShadow:"0 20px 60px -24px rgba(0,0,0,.25)"};
  const h2={fontFamily:"'Fraunces',Georgia,serif",fontSize:18,color:"#1F2317",marginTop:26,marginBottom:6};
  const p={fontSize:13.5,lineHeight:1.65,color:"#3a3f30",margin:"0 0 8px"};
  const hoje=new Date().toLocaleDateString("pt-BR");
  return(
    <div style={{minHeight:"100vh",background:"#EAE3CE",padding:"28px 14px",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={wrap}>
        <a href="/" style={{color:"#5C6B3A",fontSize:13,textDecoration:"underline"}}>← Voltar ao site</a>
        <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:26,color:"#1F2317",margin:"14px 0 2px"}}>Política de Privacidade</h1>
        <div style={{fontSize:11.5,color:"#7E806C",letterSpacing:"0.04em"}}>Bentô Gelateria · atualizada em {hoje}</div>

        <h2 style={h2}>1. Quem é o responsável (controlador)</h2>
        <p style={p}><strong>ABB Gelateria Ltda</strong> (nome fantasia Bentô Gelateria), CNPJ 61.590.463/0001-45, com sede na R. Joaquim Lírio, 455, Praia do Canto, Vitória — ES. Contato para assuntos de privacidade: <strong>bentogelateria@gmail.com</strong> · WhatsApp (27) 99915-9995.</p>

        <h2 style={h2}>2. Quais dados tratamos</h2>
        <p style={p}>Tratamos apenas os dados que você nos fornece voluntariamente nos formulários do site: <strong>nome, WhatsApp, e-mail e cidade</strong>; e, para a contratação de eventos, <strong>CPF ou CNPJ</strong> (necessário para o contrato).</p>
        <p style={p}><strong>Localização:</strong> ao usar "qual loja está mais perto de mim" (Delivery), solicitamos a localização do seu dispositivo, com a sua permissão, apenas naquele momento e sem armazenar. Ao pedir um orçamento de evento, o <strong>endereço informado</strong> é usado para calcular a logística (distância).</p>

        <h2 style={h2}>3. Para que usamos</h2>
        <p style={p}>Para responder ao seu contato, elaborar orçamentos e contratos, viabilizar entregas e avaliar parcerias/revenda/franquia. Não usamos seus dados para finalidades incompatíveis com essas.</p>

        <h2 style={h2}>4. Com quem compartilhamos</h2>
        <p style={p}>Para prestar esses serviços, podemos utilizar: <strong>WhatsApp (Meta)</strong> para comunicação; <strong>OpenStreetMap/Nominatim</strong> para converter o endereço do evento em coordenadas e calcular a distância; e <strong>iFood</strong> quando você opta por pedir delivery. <strong>Não vendemos</strong> seus dados pessoais a terceiros.</p>

        <h2 style={h2}>5. Como armazenamos</h2>
        <p style={p}>Este site é estático e não mantém banco de dados próprio: as informações dos formulários são transmitidas à nossa equipe pelo WhatsApp. Preferências como "favoritos" ficam apenas no seu navegador (armazenamento local), não em nossos servidores.</p>

        <h2 style={h2}>6. Seus direitos (LGPD)</h2>
        <p style={p}>Você pode solicitar, a qualquer momento, acesso, correção, exclusão ou portabilidade dos seus dados, bem como revogar consentimentos — basta escrever para <strong>bentogelateria@gmail.com</strong>. Atendemos conforme a Lei nº 13.709/2018 (LGPD).</p>

        <h2 style={h2}>7. Consentimento</h2>
        <p style={p}>Ao enviar os formulários do site, você declara estar ciente e de acordo com esta Política de Privacidade.</p>

        <div style={{marginTop:24,paddingTop:12,borderTop:"1px solid #D9D2BD",fontSize:11,color:"#7E806C"}}>bentogelateria.com · Vitória — ES</div>
      </div>
    </div>
  );
}
