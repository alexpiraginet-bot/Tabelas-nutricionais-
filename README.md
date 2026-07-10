<div align="center">

# 🥗 Tabelas Nutricionais — Bentô Gelatos

**Site público da Bentô Gelatos com as tabelas nutricionais dos produtos, alimentado por fichas técnicas com salvamento automático e publicação em um clique.**

![Status](https://img.shields.io/badge/status-ativo-22c55e)
![Site](https://img.shields.io/badge/site-p%C3%BAblico-0ea5e9)

[🌐 Abrir o site](https://project-my3gq.vercel.app) · [🗂 Ver no Alex Hub](https://alex-hub-three.vercel.app/repo/tabelas-nutricionais)

</div>

---

## 💡 O que é & motivação

A **Bentô Gelatos** produz gelato e picolé **proteico, sem açúcar adicionado**, com opções low-carb e para diabéticos — e para esse público a **informação nutricional não é detalhe, é decisão de compra**.

Este projeto resolve isso de ponta a ponta:

- **Site público** com as tabelas nutricionais e informações dos produtos, otimizado para busca (SEO local — Vitória/ES);
- **Fichas técnicas** dos sabores com **salvamento automático** e **sincronização**;
- Botão **"Publicar tabela no site"** — a ficha vira tabela publicada, sem etapa manual de deploy de conteúdo.

A motivação: acabar com PDFs desatualizados e retrabalho — a mesma fonte de dados que a produção mantém é a que o cliente vê no site.

## 🎬 Demo

![Demo do site](https://alex-hub-three.vercel.app/images/repos/tabelas-nutricionais/demo.gif)

| Desktop                                                                                       | Mobile (iPhone)                                                                                     |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ![Tela desktop](https://alex-hub-three.vercel.app/images/repos/tabelas-nutricionais/home.png) | ![Tela mobile](https://alex-hub-three.vercel.app/images/repos/tabelas-nutricionais/home.mobile.png) |

> 📸 As imagens acima são **recapturadas automaticamente toda segunda-feira** pelo [Alex Hub](https://alex-hub-three.vercel.app/repo/tabelas-nutricionais) — sempre mostram a versão em produção.

## 🧱 Stack

- **JavaScript / TypeScript** — site e fichas
- **HTML + CSS** — páginas públicas leves, mobile-first
- **Python** — apoio a processamento/geração de dados nutricionais

## 🚀 Instalação & como rodar

```bash
git clone https://github.com/alexpiraginet-bot/Tabelas-nutricionais-.git
cd Tabelas-nutricionais-
# páginas estáticas: sirva a raiz do projeto
python3 -m http.server 8000   # abra http://localhost:8000
```

> Partes do fluxo de fichas usam sincronização própria — o site público funciona 100% com o servidor estático acima.

## 🧪 Como testar (usuários & recrutadores)

1. **Abra** 👉 <https://project-my3gq.vercel.app> — de preferência **no celular**, como um cliente na loja faria (o QR code da página do hub abre direto).
2. Navegue até a **tabela nutricional** de um produto e repare no rótulo limpo: proteína, zero açúcar adicionado, opções low-carb.
3. **Recrutadores:** o interessante aqui é o pipeline de conteúdo — ficha técnica → salvamento automático → sincronização → **publicação no site em um clique**. As telas (desktop + mobile) e o status de disponibilidade ficam sempre atualizados na [página do hub](https://alex-hub-three.vercel.app/repo/tabelas-nutricionais).

## 🔗 Links

- 🌐 **Site ao vivo:** <https://project-my3gq.vercel.app>
- 🗂 **Página no hub (telas + status + docs):** <https://alex-hub-three.vercel.app/repo/tabelas-nutricionais>
- 📦 **Repositório:** <https://github.com/alexpiraginet-bot/Tabelas-nutricionais->
