// Trava a validação determinística: é ela que impede um CPF/CNPJ lido errado
// pela IA de entrar no contrato.
import assert from "node:assert/strict";
import { cpfValido, cnpjValido, documentoValido, cepValido, tipoDaImagem } from "../lib/docvalida.js";
const ok=(c,m)=>{ console.log((c?'PASS':'FALHA')+' · '+m); if(!c) process.exitCode=1; };

// CNPJ real da ABB (o do próprio contrato) e o da filial
ok(cnpjValido("61.590.463/0001-45"), 'CNPJ da matriz valida');
ok(cnpjValido("61590463000226"), 'CNPJ da filial valida');
// troca de um caractere — o erro tipico de OCR (0/O, 8/B, 5/S)
ok(!cnpjValido("61590463000126"), 'CNPJ com um dígito trocado é RECUSADO');
ok(!cnpjValido("61.590.463/0001-44"), 'CNPJ com verificador errado é recusado');
ok(!cnpjValido("11111111111111"), 'CNPJ de dígitos repetidos é recusado');
ok(!cnpjValido("6159046300014"), 'CNPJ curto é recusado');

ok(cpfValido("529.982.247-25"), 'CPF válido passa');
ok(!cpfValido("529.982.247-24"), 'CPF com verificador errado é recusado');
ok(!cpfValido("11111111111"), 'CPF de dígitos repetidos é recusado');

ok(documentoValido("61590463000145")==="61.590.463/0001-45", 'CNPJ volta formatado');
ok(documentoValido("52998224725")==="529.982.247-25", 'CPF volta formatado');
ok(documentoValido("123")===null, 'lixo volta null (campo fica vazio, não errado)');
ok(cepValido("29055460")==="29055-460", 'CEP formata');
ok(cepValido("2905546")===null, 'CEP curto vira null');

// magic bytes: o content-type declarado nao vale nada
ok(tipoDaImagem(Buffer.from([0xff,0xd8,0xff,0xe0,0,0,0,0,0,0,0,0]))==="image/jpeg", 'JPEG reconhecido pelos bytes');
ok(tipoDaImagem(Buffer.from([0x89,0x50,0x4e,0x47,13,10,26,10,0,0,0,0]))==="image/png", 'PNG reconhecido');
ok(tipoDaImagem(Buffer.concat([Buffer.from("RIFF"),Buffer.alloc(4),Buffer.from("WEBP")]))==="image/webp", 'WebP reconhecido');
ok(tipoDaImagem(Buffer.from("%PDF-1.7 fake image"))===null, 'PDF disfarçado de imagem é RECUSADO');
ok(tipoDaImagem(Buffer.from('<svg onload="alert(1)"></svg>'))===null, 'SVG com script é RECUSADO');
ok(tipoDaImagem(Buffer.concat([Buffer.alloc(4),Buffer.from("ftypheic"),Buffer.alloc(4)]))===null, 'HEIC do iPhone é recusado (API não aceita)');
console.log('\nValidação de documento: travada.');
