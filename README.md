# Portfólio — Leonardo dos Santos

Site de portfólio pessoal, feito em HTML, CSS e JavaScript puro, sem framework e sem build.

**Site no ar:** <https://leonardo-sferreira.github.io/portfolio/>

## Projetos apresentados

| Projeto | Status | Stack | Links |
| --- | --- | --- | --- |
| **Fila Prioritária — Pronto-Socorro** (Prioriza) | Finalizado · acadêmico (Impacta) | Reflex, Xano, OpenSpec | [Repositório](https://github.com/leonardo-sferreira/ps-fila-prioritaria) · [Documentação](https://leonardo-sferreira.github.io/ps-fila-prioritaria/) |
| **ConectaRH** | Em desenvolvimento · acadêmico | Streamlit, Xano, Supabase | [Repositório](https://github.com/leonardo-sferreira/conectahr) |
| **Sabor Local** | Protótipo · acadêmico | Figma, FlutterFlow, UX/UI | [Protótipo no Figma](https://www.figma.com/design/iRn8igu0iCwyqYTathrz9P/Sabor-local?node-id=0-1) |
| **Bot de Finanças** | Em uso pessoal | Python, Telegram Bot API, Notion API | Repositório privado |

Cada projeto tem um "case completo" no site, aberto num modal com galeria de telas, papel no time e números do projeto.

## Seções do site

- **Hero:** nome, proposta de valor, área em destaque girando (Web, Mobile, Automações, Banco de Dados) e rede de partículas que reage ao mouse.
- **Números:** contadores animados.
- **Sobre**
- **Serviços:** rolagem fixa em quatro etapas (Web, Mobile, Automações, Banco de Dados), com anel de progresso e ícones desenhados.
- **Trajetória:** os quatro projetos, com navegação lateral que acompanha a rolagem.
- **Contato:** e-mail, LinkedIn e download do CV.

## Estrutura

```text
index.html                     conteúdo e marcação de todas as seções
style.css                      tema escuro, layout responsivo e animações
script.js                      interações e dados dos cases (objeto PROJECTS)
assets/CV-Leonardo-dos-Santos.pdf
assets/projetos/               capturas de tela usadas nos cards e no modal
```

Para editar o texto de um case completo, altere o objeto `PROJECTS` em `script.js`. O card que aparece na página fica em `index.html`.

## Interações

Pre-loader com constelação, barra de progresso de rolagem, efeito glitch no menu, texto revelado palavra por palavra, imagens com revelação e inclinação 3D, botões magnéticos e modal acessível (foco preso, `Esc` para fechar, galeria que aceita arrastar). As animações pesadas são desligadas quando o sistema pede movimento reduzido (`prefers-reduced-motion`).

## Rodando localmente

Abra `index.html` no navegador ou suba um servidor local:

```bash
python -m http.server 8080
```

e acesse `http://localhost:8080`.

## Publicação

O site é publicado pelo GitHub Pages a partir da branch `master`. Cada push atualiza o site no ar.
