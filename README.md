# Portfólio — Leonardo dos Santos

Portfólio pessoal em duas versões, as duas em HTML, CSS e JavaScript puro, sem build:

- **Portfólio jogável** (página inicial): crie seu lutador voxel, explore a ilha e abra os projetos nos dojos.
- **Versão clássica** (`classico.html`): o mesmo conteúdo em página de leitura rápida.

**Site no ar:** <https://leonardo-sferreira.github.io/portfolio/> · **Versão clássica:** <https://leonardo-sferreira.github.io/portfolio/classico.html>

## Projetos apresentados

| Projeto | Status | Stack | Links |
| --- | --- | --- | --- |
| **Fila Prioritária — Pronto-Socorro** (Prioriza) | Finalizado · acadêmico (Impacta) | Reflex, Xano, OpenSpec | [Repositório](https://github.com/leonardo-sferreira/ps-fila-prioritaria) · [Documentação](https://leonardo-sferreira.github.io/ps-fila-prioritaria/) |
| **ConectaRH** | Finalizado e publicado · acadêmico | Streamlit, Xano, Supabase | [Repositório](https://github.com/leonardo-sferreira/conectahr) · [Documentação](https://leonardo-sferreira.github.io/conectahr/) |
| **Sabor Local** | Protótipo · acadêmico | Figma, FlutterFlow, UX/UI | [Protótipo no Figma](https://www.figma.com/design/iRn8igu0iCwyqYTathrz9P/Sabor-local?node-id=0-1) · [Telas](https://github.com/leonardo-sferreira/SaborLocal-Figma) |
| **Bot de Finanças** | Em uso pessoal | Python, Telegram Bot API, Notion API | Repositório privado |

## O jogo

Feito com [Three.js](https://threejs.org) (r128, via CDN), sem modelos de terceiros: tudo é montado com cubos no código.

| O que tem | Como funciona |
| --- | --- |
| **Criação de personagem** | Pele, cabelo, roupa, cores, faixa e nome; fica salvo no navegador (`C` reabre) |
| **Movimento** | `WASD` ou setas, `Shift` corre, `Espaço` pula; no celular, joystick na tela |
| **Luta** | Clique esquerdo ou `J` dá soco, clique direito ou `K` dá chute, com combo, partículas, tremor e som (`M` liga e desliga) |
| **Boneco de treino** | Mostra os números dos projetos como "dano" |
| **Dojos dos projetos** | Três golpes no totem (ou `E`) abrem o case com imagem, papel, números e links |
| **Sobre mim e contato** | Pedra "Sobre mim" e portal de contato, que abre ao atravessar |
| **Missões** | Seis missões e barra de progresso; zerar mostra uma comemoração |
| **Acessibilidade e desempenho** | Versão clássica sempre a um clique; sem WebGL, redireciona para ela; reduz resolução e sombras sozinho em aparelhos lentos; respeita `prefers-reduced-motion` |

## Estrutura

```text
index.html                     portfólio jogável (página inicial)
jogo/jogo.js                   mundo, personagem, luta, conteúdo, missões e controles
jogo/jogo.css                  telas do jogo: criação, HUD, painéis e controles de toque
classico.html                  versão clássica
style.css · script.js          estilo e interações da versão clássica
assets/CV-Leonardo-dos-Santos.pdf
assets/projetos/               capturas de tela usadas nas duas versões
```

Para editar o conteúdo de um projeto: no jogo, o objeto `PROJECTS` em `jogo/jogo.js`; na versão clássica, o objeto `PROJECTS` em `script.js` e o card em `classico.html`.

## Rodando localmente

Suba um servidor local na pasta do projeto (o jogo carrega arquivos e não funciona abrindo o HTML direto):

```bash
python -m http.server 8080
```

e acesse `http://localhost:8080` (jogo) ou `http://localhost:8080/classico.html`.

## Publicação

O site é publicado pelo GitHub Pages a partir da branch `master`. Cada push atualiza o site no ar.
