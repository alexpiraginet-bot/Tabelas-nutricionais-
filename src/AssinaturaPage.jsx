// Página de assinatura do contrato — aberta pelo cliente em ?assinar=<token>.
//
// O que ela NÃO faz, de propósito: não recebe dados pela URL. A URL traz só o
// token; o contrato vem do servidor, do snapshot congelado. É o que separa este
// fluxo do anterior, em que o texto assinado vinha do próprio signatário.
//
// O contrato é renderizado pelo MESMO componente que a equipe usa, em modo
// somente leitura. Um componente separado para o cliente divergiria com o tempo,
// e aí ninguém saberia dizer o que de fato foi assinado.
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { T, tk } from "./shared.jsx";

const ContratoPage = lazy(() => import("./ContratoPage.jsx"));

const cx = { maxWidth: 900, margin: "0 auto", padding: "0 16px" };

export default function AssinaturaPage({ token }) {
  const [estado, setEstado] = useState("carregando"); // carregando | pronto | erro | assinado
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState(null);
  const [aceiteConteudo, setAceiteConteudo] = useState(false);
  const [aceiteCancel, setAceiteCancel] = useState(false);
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [recibo, setRecibo] = useState(null);
  // Pedido de ajuste: quem discorda de uma cláusula precisa de um caminho aqui
  // dentro. No WhatsApp o pedido se perde fora do registro do contrato.
  const [pedindo, setPedindo] = useState(false);
  const [pedido, setPedido] = useState("");
  const [pedidoFeito, setPedidoFeito] = useState(false);

  // trilha de leitura — indício de que o cliente viu o documento
  const abertoEm = useRef(Date.now());
  const rolouAteOFim = useRef(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/contrato?t=" + encodeURIComponent(token), { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!vivo) return;
        if (!j.ok) { setErro(j.error || "Não consegui abrir este contrato."); setEstado("erro"); return; }
        setDados(j);
        if (j.status === "assinado") { setEstado("assinado"); setRecibo({ em: j.assinadoEm, hash: j.hash }); return; }
        if (j.expirado) { setErro("Este link expirou. Peça um novo à nossa equipe."); setEstado("erro"); return; }
        setEstado("pronto");
        tk("Contrato · Abriu para assinar");
      })
      .catch(() => { if (vivo) { setErro("Falha de conexão. Verifique a internet e recarregue."); setEstado("erro"); } });
    return () => { vivo = false; };
  }, [token]);

  useEffect(() => {
    const onScroll = () => {
      const faltam = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (faltam < 240) rolouAteOFim.current = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [estado]);

  const assinar = async () => {
    setEnviando(true); setErro("");
    try {
      const r = await fetch("/api/contrato", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "assinar", token,
          aceiteConteudo, aceiteCancelamento: aceiteCancel,
          nomeDigitado: nome,
          hashVisto: dados.hash,   // servidor recusa se não bater com o gravado
          rolouAteOFim: rolouAteOFim.current,
          segundosNaPagina: Math.round((Date.now() - abertoEm.current) / 1000),
          tela: window.innerWidth + "x" + window.innerHeight,
          fuso: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        }),
      });
      const j = await r.json();
      if (!j.ok) { setErro(j.error || "Não consegui registrar a assinatura."); setEnviando(false); return; }
      setRecibo({ em: j.assinadoEm, hash: j.hash });
      setEstado("assinado");
      tk("Conversão · Contrato assinado");
    } catch {
      setErro("Falha de conexão ao assinar. Tente de novo.");
      setEnviando(false);
    }
  };

  const enviarPedido = async () => {
    setErro("");
    try {
      const r = await fetch("/api/contrato", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "pedir-ajuste", token, pedido }),
      });
      const j = await r.json();
      if (!j.ok) { setErro(j.error || "Não consegui enviar seu pedido."); return; }
      setPedidoFeito(true); setPedindo(false);
      tk("Contrato · Cliente pediu ajuste");
    } catch { setErro("Falha de conexão. Tente de novo."); }
  };

  if (estado === "carregando") return <Aviso titulo="Abrindo seu contrato…" />;
  if (estado === "erro" && !dados) return <Aviso titulo="Não foi possível abrir" texto={erro} />;

  const podeAssinar = aceiteConteudo && aceiteCancel && nome.trim().length >= 3 && !enviando;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ ...cx, paddingTop: 22, paddingBottom: 6 }}>
        <div className="fm" style={{ fontSize: 9.5, letterSpacing: "0.26em", textTransform: "uppercase", color: T.inkSoft }}>
          Bentô Gelateria · Contrato
        </div>
        <h1 className="fd" style={{ fontSize: "clamp(21px,4vw,29px)", color: T.ink, margin: "5px 0 0" }}>
          {estado === "assinado" ? "Contrato assinado" : "Leia e assine seu contrato"}
        </h1>
        {estado !== "assinado" && (
          <p className="fb" style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, margin: "8px 0 0" }}>
            Role até o fim, confira os dados e assine no rodapé desta página. Nada aqui é editável — este é o
            texto exato que ficou registrado quando o contrato foi emitido.
          </p>
        )}
      </div>

      {dados && (
        <Suspense fallback={<Aviso titulo="Carregando o documento…" />}>
          {/* O ContratoPage recebe `total` como SUBTOTAL e aplica `desconto` ele
              mesmo — é o formato dele desde sempre. Traduzir aqui, num lugar só,
              evita que o documento exibido mostre um valor e o snapshot afirme
              outro. O teste e2e trava exatamente isso. */}
          <ContratoPage somenteLeitura data={{ ...dados.snapshot, total: dados.snapshot.subtotal }}
            assinaturas={{ contratada: dados.assinaturaContratada, contratante: dados.assinatura }} />
        </Suspense>
      )}

      <div style={cx}>
        {estado === "assinado" ? (
          <div style={caixa(T.pistacheDark)}>
            <div className="fd" style={{ fontSize: 19, color: T.pistacheDark }}>Assinatura registrada</div>
            <p className="fb" style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6, marginTop: 8 }}>
              Registramos sua assinatura em <strong>{fmtData(recibo && recibo.em)}</strong> (horário de Brasília).
              Guarde esta página ou tire um print — o código abaixo identifica de forma única o texto que você assinou.
            </p>
            <div className="fm" style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 10, wordBreak: "break-all", lineHeight: 1.6 }}>
              {recibo && recibo.hash}
            </div>
            <p className="fb" style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.55, marginTop: 12 }}>
              Você tem <strong>7 dias corridos</strong> para desistir, com devolução integral, conforme a cláusula 8ª.
              É só falar com a gente no WhatsApp (27) 99915-9995.
            </p>
          </div>
        ) : (
          <div style={caixa(T.border)}>
            <div className="fd" style={{ fontSize: 19, color: T.ink }}>Assinar</div>

            {/* A cláusula 9ª diz que a Bentô confere e assina antes de enviar.
                Mostrar quem assinou e quando é o que transforma a frase do
                contrato em algo que o cliente consegue verificar na tela. */}
            {dados && dados.assinaturaContratada && (
              <div className="fb" style={{ fontSize: 12.5, color: T.pistacheDark, lineHeight: 1.55, marginTop: 9,
                                           borderLeft: `2px solid ${T.pistacheDark}`, paddingLeft: 10 }}>
                A Bentô Gelateria já conferiu e assinou este contrato em{" "}
                <strong>{fmtData(dados.assinaturaContratada.em)}</strong>, por {dados.assinaturaContratada.porNome}.
              </div>
            )}

            <label style={linha}>
              <input type="checkbox" checked={aceiteConteudo} onChange={(e) => setAceiteConteudo(e.target.checked)} style={chk} />
              <span className="fb" style={txt}>
                Li o contrato acima e <strong>concordo com todos os seus termos</strong>, incluindo datas, valores e formas de pagamento.
              </span>
            </label>

            <label style={linha}>
              <input type="checkbox" checked={aceiteCancel} onChange={(e) => setAceiteCancel(e.target.checked)} style={chk} />
              <span className="fb" style={txt}>
                Li e entendi especificamente a <strong>cláusula 7ª (cancelamento e remarcação)</strong> e a{" "}
                <strong>cláusula 8ª (direito de arrependimento de 7 dias)</strong>.
              </span>
            </label>

            <div style={{ marginTop: 14 }}>
              <div className="fm" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.inkSoft }}>
                Digite seu nome completo
              </div>
              <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name"
                placeholder="Como consta no seu documento"
                className="fb"
                style={{ width: "100%", marginTop: 6, padding: "12px 13px", borderRadius: 10,
                         border: `1px solid ${T.border}`, background: T.surface, color: T.ink, fontSize: 15 }} />
            </div>

            {erro && <div className="fb" role="alert" style={{ fontSize: 13, color: "#8A2B2B", marginTop: 11, lineHeight: 1.5 }}>{erro}</div>}

            <button onClick={assinar} disabled={!podeAssinar} className="fm"
              style={{ width: "100%", marginTop: 15, padding: "15px 18px", borderRadius: 12, border: "none",
                       fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
                       cursor: podeAssinar ? "pointer" : "not-allowed",
                       background: podeAssinar ? T.pistacheDark : T.borderSoft,
                       color: podeAssinar ? T.surface : T.inkSoft }}>
              {enviando ? "Registrando…" : "Assinar contrato"}
            </button>

            {/* Sai do caminho do botão de assinar: quem quer ajustar não deve
                tropeçar em "Assinar", e quem vai assinar não deve se distrair. */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${T.borderSoft}`, paddingTop: 14 }}>
              {pedidoFeito ? (
                <div className="fb" role="status" style={{ fontSize: 13, color: T.pistacheDark, lineHeight: 1.55, fontWeight: 600 }}>
                  Recebemos seu pedido. Nossa equipe vai analisar e, se houver mudança, você recebe um
                  contrato novo para assinar. Este link fica parado até lá.
                </div>
              ) : pedindo ? (
                <>
                  <div className="fm" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.inkSoft }}>
                    O que precisa mudar?
                  </div>
                  <textarea value={pedido} onChange={(e) => setPedido(e.target.value)} rows={4}
                    placeholder="Ex.: nosso pagamento é integral, por depósito, em até 15 dias após o envio da nota fiscal."
                    className="fb"
                    style={{ width: "100%", marginTop: 6, padding: "11px 12px", borderRadius: 10, resize: "vertical",
                             border: `1px solid ${T.border}`, background: T.surface, color: T.ink, fontSize: 14, lineHeight: 1.5 }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
                    <button onClick={enviarPedido} disabled={pedido.trim().length < 5} className="fm"
                      style={{ padding: "11px 16px", borderRadius: 10, border: "none", fontSize: 11,
                               letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
                               cursor: pedido.trim().length < 5 ? "not-allowed" : "pointer",
                               background: pedido.trim().length < 5 ? T.borderSoft : T.ink,
                               color: pedido.trim().length < 5 ? T.inkSoft : T.bg }}>
                      Enviar pedido
                    </button>
                    <button onClick={() => setPedindo(false)} className="fm"
                      style={{ padding: "11px 16px", borderRadius: 10, border: `1px solid ${T.border}`,
                               background: "transparent", color: T.inkSoft, fontSize: 11,
                               letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => setPedindo(true)} className="fb"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
                           color: T.pistacheDark, fontSize: 13, textDecoration: "underline" }}>
                  Preciso ajustar algo antes de assinar
                </button>
              )}
            </div>

            <p className="fb" style={{ fontSize: 11.5, color: T.inkSoft, lineHeight: 1.55, marginTop: 12 }}>
              Ao assinar, registramos a data e a hora do nosso servidor, seu endereço IP e o navegador utilizado,
              junto com o texto exato acima. Guardamos esses dados para comprovar a contratação, pelo prazo legal.
              Dúvidas sobre seus dados: bentogelateria@gmail.com.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const caixa = (cor) => ({
  background: T.surface, border: `1px solid ${cor}`, borderRadius: 16,
  padding: "20px 20px 22px", marginTop: 22,
  boxShadow: "0 14px 34px -26px rgba(35,38,25,.55)",
});
const linha = { display: "flex", gap: 11, alignItems: "flex-start", marginTop: 13, cursor: "pointer" };
const chk = { width: 20, height: 20, flexShrink: 0, marginTop: 1, accentColor: "#46583A" };
const txt = { fontSize: 13.5, color: T.ink, lineHeight: 1.55 };

function fmtData(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  } catch { return iso; }
}

function Aviso({ titulo, texto }) {
  return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...caixa(T.border), maxWidth: 460, marginTop: 0, textAlign: "center" }}>
        <div className="fd" style={{ fontSize: 20, color: T.ink }}>{titulo}</div>
        {texto && <p className="fb" style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, marginTop: 9 }}>{texto}</p>}
      </div>
    </div>
  );
}
