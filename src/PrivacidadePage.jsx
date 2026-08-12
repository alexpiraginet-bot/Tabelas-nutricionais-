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
        <p style={p}>Tratamos apenas os dados que você nos fornece voluntariamente nos formulários do site: <strong>nome, WhatsApp, e-mail e cidade</strong>; e, para a contratação de eventos, <strong>CPF ou CNPJ</strong> (necessário para o contrato). No <strong>Bentô em Movimento</strong>, tratamos a resposta ao convite, modalidade de participação, tamanhos de camiseta e roupa de treino da influenciadora, presença de marido ou mãe, presença, idade e tamanho aproximado da criança, interesse em transporte, versão da política aceita e consentimento opcional de uso de imagem. Para interessados em parceria, tratamos nome da empresa, responsável, e-mail, telefone, cota de interesse, tipo de contribuição e detalhes opcionais da proposta.</p>
        <p style={p}>Não solicitamos nome, documento ou dados de saúde da criança. A idade e o tamanho aproximado são usados somente para organizar a oficina e planejar um eventual kit.</p>
        <p style={p}>Nos links individuais do Bentô em Movimento, tratamos a identidade, público e validade do convite definidos pela equipe Bentô. Quando o link é acessado, registramos a primeira abertura para acompanhar o envio e manter o convite individual; depois, registramos a resposta ou seleção enviada pela pessoa convidada.</p>
        <p style={p}><strong>Localização:</strong> ao usar "qual loja está mais perto de mim" (Delivery), solicitamos a localização do seu dispositivo, com a sua permissão, apenas naquele momento e sem armazenar. Ao pedir um orçamento de evento, o <strong>endereço informado</strong> é usado para calcular a logística (distância).</p>

        <h2 style={h2}>3. Para que usamos</h2>
        <p style={p}>Para responder ao seu contato, elaborar orçamentos e contratos, viabilizar entregas e avaliar parcerias/revenda/franquia. No Bentô em Movimento, usamos as respostas para organizar convites, presença, roupas, limite de capacidade, oficina infantil e retorno aos interesses não vinculantes de cotas de parceria. Não usamos seus dados para finalidades incompatíveis com essas.</p>

        <h2 style={h2}>4. Com quem compartilhamos</h2>
        <p style={p}>Para prestar esses serviços, podemos utilizar: <strong>WhatsApp (Meta)</strong> para comunicação; <strong>OpenStreetMap/Nominatim</strong> para converter o endereço do evento em coordenadas e calcular a distância; nossa <strong>plataforma de pedidos</strong> (totem.bentogelateria.com) quando você pede entrega própria ou retirada; e o <strong>iFood</strong> quando seu endereço fica fora da nossa área de entrega. <strong>Não vendemos</strong> seus dados pessoais a terceiros.</p>

        <h2 style={h2}>5. Como armazenamos</h2>
        <p style={p}>Guardamos em nossos servidores os dados que você mesmo envia pelos formulários do site — nome, telefone, e-mail e, quando você pede orçamento de evento, CPF ou CNPJ e o endereço do evento. Usamos esses dados para responder ao seu pedido e executar o serviço contratado. Os formulários também chegam à nossa equipe por WhatsApp e por mensagem interna. Preferências como "favoritos" ficam apenas no seu navegador (armazenamento local), não em nossos servidores.</p>
        <p style={p}>Para elaborar contratos, nossa equipe pode usar inteligência artificial para redigir cláusulas e para ler documentos que você nos envia (por exemplo, cartão CNPJ ou comprovante). Nesses casos, o conteúdo é enviado à <strong>Anthropic PBC, nos Estados Unidos</strong>, que processa e devolve o resultado — é uma <strong>transferência internacional de dados</strong> feita para executar o contrato entre nós. Não guardamos a imagem do documento em nossos servidores: ela é usada para preencher os campos e descartada. Pela política do fornecedor, porém, o conteúdo enviado pode permanecer até 30 dias nos sistemas dele para controle de abuso. Nenhuma decisão sobre você é tomada automaticamente: toda cláusula e todo dado extraído passam por conferência humana antes de virar contrato.</p>
        <p style={p}>Também usamos serviços de terceiros para operar o site e guardar esses dados: <strong>Vercel</strong> (hospedagem), <strong>Upstash</strong> (banco de dados) e <strong>Supabase</strong> (armazenamento de arquivos e das respostas do Bentô em Movimento). Guardamos os dados de contrato pelo prazo legal de guarda de documentos fiscais e contratuais. As respostas do Bentô em Movimento serão excluídas ou anonimizadas em até 90 dias após o evento, salvo quando a conservação for necessária para cumprir obrigação legal ou exercer direitos. Para pedir acesso, correção ou exclusão dos seus dados, escreva para bentogelateria@gmail.com.</p>

        <h2 style={h2}>6. Seus direitos (LGPD)</h2>
        <p style={p}>Você pode solicitar, a qualquer momento, acesso, correção, exclusão ou portabilidade dos seus dados, bem como revogar consentimentos — basta escrever para <strong>bentogelateria@gmail.com</strong>. Atendemos conforme a Lei nº 13.709/2018 (LGPD).</p>

        <h2 style={h2}>7. Consentimento</h2>
        <p style={p}>Ao enviar os formulários do site, você declara estar ciente e de acordo com esta Política de Privacidade. No Bentô em Movimento, o consentimento para uso de imagem é separado e opcional: recusar esse uso não cancela a confirmação de presença.</p>

        <div style={{marginTop:24,paddingTop:12,borderTop:"1px solid #D9D2BD",fontSize:11,color:"#7E806C"}}>bentogelateria.com · Vitória — ES</div>
      </div>
    </div>
  );
}
