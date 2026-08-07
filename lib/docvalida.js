// Validação determinística dos documentos lidos por IA.
//
// POR QUE ISTO EXISTE: modelo de visão erra caractere em documento amassado,
// borrado ou fotografado torto — 0/O, 1/I, 5/S, 8/B. Num CPF ou CNPJ, um
// caractere errado é a identidade errada no contrato. O dígito verificador pega
// exatamente esse tipo de erro, e pega SEM depender de o modelo cooperar.
//
// Regra: campo que reprova volta null com aviso, NUNCA preenchido. Melhor a
// equipe digitar do que o contrato sair com o CPF de outra pessoa.

const digitos = (s) => String(s || "").replace(/\D/g, "");

export function cpfValido(v) {
  const c = digitos(v);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;      // 111.111.111-11 e afins passam no módulo 11
  for (const [ate, pos] of [[9, 10], [10, 11]]) {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(c[i]) * (pos - i);
    let d = (soma * 10) % 11;
    if (d === 10) d = 0;
    if (d !== Number(c[ate])) return false;
  }
  return true;
}

export function cnpjValido(v) {
  const c = digitos(v);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  const calc = (base) => {
    let peso = base.length - 7, soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (calc(c.slice(0, 12)) !== Number(c[12])) return false;
  if (calc(c.slice(0, 13)) !== Number(c[13])) return false;
  return true;
}

// Aceita CPF (11) ou CNPJ (14) e devolve formatado, ou null se não passar.
export function documentoValido(v) {
  const c = digitos(v);
  if (c.length === 11 && cpfValido(c)) return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (c.length === 14 && cnpjValido(c)) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return null;
}

export function cepValido(v) {
  const c = digitos(v);
  return c.length === 8 ? c.replace(/(\d{5})(\d{3})/, "$1-$2") : null;
}

// Tipo REAL do arquivo, pelos bytes. O content-type vem de quem envia e por isso
// não vale nada: HEIC declarado como image/jpeg faz a API responder 400 opaco, e
// SVG com script declarado como imagem é problema de outra ordem.
export function tipoDaImagem(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;   // HEIC, PDF, SVG, qualquer outra coisa: recusa
}

export const MODELO_VISAO = "claude-opus-4-8";
