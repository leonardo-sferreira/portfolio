# Portfólio — Leonardo dos Santos

Portfólio pessoal em HTML, CSS e JavaScript puro, sem build.

**Site no ar:** <https://leonardo-sferreira.github.io/portfolio/>

## Projetos apresentados

| Projeto | Status | Stack | Links |
| --- | --- | --- | --- |
| **Fila Prioritária — Pronto-Socorro** (Prioriza) | Finalizado · acadêmico (Impacta) | Reflex, Xano, OpenSpec | [Repositório](https://github.com/leonardo-sferreira/ps-fila-prioritaria) · [Documentação](https://leonardo-sferreira.github.io/ps-fila-prioritaria/) |
| **ConectaRH** | Finalizado e publicado · acadêmico | Streamlit, Xano, Supabase | [Repositório](https://github.com/leonardo-sferreira/conectahr) · [Documentação](https://leonardo-sferreira.github.io/conectahr/) |
| **Sabor Local** | Protótipo · acadêmico | Figma, FlutterFlow, UX/UI | [Protótipo no Figma](https://www.figma.com/design/iRn8igu0iCwyqYTathrz9P/Sabor-local?node-id=0-1) · [Telas](https://github.com/leonardo-sferreira/SaborLocal-Figma) |
| **Bot de Finanças** | Em uso pessoal | Python, Telegram Bot API, Notion API | Repositório privado |

## Portfólio jogável (desativado)

A pasta `jogo/` guarda uma versão em jogo voxel feita com Three.js: criação de personagem, luta com clique, dojos dos projetos e missões. Ela está **desativada**: o código fica no repositório, mas o `_config.yml` impede que seja publicada. A última versão no ar está na tag `jogo-voxel-v1`.

Para reativar, remova `jogo` da lista `exclude` do `_config.yml`; o jogo passa a abrir em `/portfolio/jogo/`.

## Estrutura

```text
index.html                     página do portfólio
style.css · script.js          estilo e interações
jogo/                          portfólio jogável (desativado, não publicado)
_config.yml                    exclui a pasta jogo/ do GitHub Pages
assets/CV-Leonardo-dos-Santos.pdf
assets/projetos/               capturas de tela usadas nas duas versões
```

Para editar o conteúdo de um projeto: o objeto `PROJECTS` em `script.js` e o card em `index.html`.

## Rodando localmente

Suba um servidor local na pasta do projeto:

```bash
python -m http.server 8080
```

e acesse `http://localhost:8080`.

## Publicação

O site é publicado pelo GitHub Pages a partir da branch `master`. Cada push atualiza o site no ar.
