# Road-Learn

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Aplicação web local para criar, organizar e acompanhar roadmaps de aprendizado. O Road-Learn combina tarefas, competências, dependências, revisão espaçada e métricas de tempo sem exigir conta ou banco de dados em servidor dedicado.

## Funcionalidades

- Roadmaps com nome, descrição, competências e progresso.
- Tarefas de prática, pesquisa ou análise.
- Dependências entre tarefas e visualização em árvore.
- Critérios de conclusão, dificuldade, prioridade, tags e prazos.
- Links, subtarefas, histórico e revisão espaçada.
- Registro manual de horas e timer de estudo.
- Painel com domínio por competência, XP, nível, radar e heatmap.
- Organização da sidebar em grupos.
- Importação de roadmaps completos por JSON, inclusive conteúdo gerado por IA.

Consulte a visão detalhada em [Capacidades](docs/CAPACIDADES.md).

## Tecnologias

- Node.js e Express no servidor.
- HTML, CSS e JavaScript no frontend.
- **SQLite** (`better-sqlite3`) para persistência local.
- API REST para roadmaps, sidebar, perfil e projetos.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior (ambiente alvo: **Linux**).
- npm, incluído na instalação do Node.js.
- Ferramentas de build nativo para compilar `better-sqlite3` (ex. em Debian/Ubuntu: `build-essential` e `python3`).

```bash
# Debian/Ubuntu (se o npm install falhar ao compilar better-sqlite3)
sudo apt-get update
sudo apt-get install -y build-essential python3
```

## Instalação

```bash
git clone https://github.com/luan-libarino-santos/Road-Learn.git
cd Road-Learn
npm install
```

## Execução

Inicie a aplicação:

```bash
npm start
```

Durante o desenvolvimento, use o recarregamento automático:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). O terminal também mostra o endereço para acesso por outro dispositivo conectado à mesma rede.

## Primeiro roadmap

Na primeira execução, o Road-Learn cria o banco SQLite em `data/road-learn.db`. Para começar com conteúdo de exemplo:

1. Abra um dos arquivos em [`docs/templates/`](docs/templates/).
2. Na interface, clique em **⤓ JSON** na sidebar.
3. Cole o conteúdo ou selecione o arquivo e confirme a importação.

O arquivo [`roadmap-html.json`](docs/templates/roadmap-html.json) é um bom ponto de partida. Para criar seu próprio conteúdo, veja [Como gerar roadmaps em JSON](docs/GERAR_ROADMAP.md) e [Instruções para IA](docs/INSTRUCOES_IA_ROADMAP.md).

## Configuração

A aplicação principal funciona sem chaves de API. A porta pode ser definida pela variável de ambiente `PORT`; o padrão é `3000`.

O arquivo [`.env.example`](.env.example) documenta integrações externas opcionais do motor de recuperação de informações, atualmente experimental e ainda não exposto pela aplicação principal. Nunca envie seu arquivo `.env` ou chaves privadas ao repositório.

## Armazenamento

Os dados ficam somente na máquina que executa a aplicação, no arquivo SQLite:

- `data/road-learn.db` — roadmaps, tarefas, sidebar, perfil, projetos finais e integrados.

O banco é criado em tempo de execução e ignorado pelo Git. Faça backup de `data/road-learn.db` (e, se existirem, `data/road-learn.db-wal` / `data/road-learn.db-shm`) antes de reinstalar ou mover o projeto.

JSON permanece apenas como **formato de importação/exportação** de roadmaps (templates em `docs/templates/` e `POST /api/roadmaps/import`), não como persistência interna.

## API

Com o servidor em execução, os principais endpoints são:

- `GET /api/status`: verifica se o servidor está disponível (`armazenamento: "sqlite"`).
- `GET`, `POST`, `PUT` e `DELETE /api/roadmaps`: gerenciam roadmaps.
- `POST /api/roadmaps/import`: importa um ou vários roadmaps em JSON.
- Rotas em `/api/roadmaps/:id/tarefas`: gerenciam tarefas, subtarefas e tempo.
- Rotas em `/api/sidebar`: gerenciam grupos, ordem e atribuições.
- Rotas em `/api/projetos-finais`: Projeto Final (sugerir tópicos, gerar, CRUD, toggles).
- Rotas em `/api/projetos-integrados`: Projetos Integrados multi-roadmap.

Os formatos aceitos na importação estão documentados em [GERAR_ROADMAP.md](docs/GERAR_ROADMAP.md).

## Estrutura do projeto

```text
Road-Learn/
├── data/                   # SQLite gerado em execução (road-learn.db)
├── docs/                   # guias e templates de roadmaps
├── server/
│   ├── db/                 # schema SQLite, conexão e repositórios
│   ├── ir/                 # motor experimental de recuperação
│   ├── routes/             # rotas HTTP
│   └── index.js            # entrada do servidor Express
├── web/                    # interface web
├── .env.example            # exemplo de configuração opcional
└── package.json
```

## Documentação

- [Capacidades do sistema](docs/CAPACIDADES.md)
- [Geração e importação de roadmaps](docs/GERAR_ROADMAP.md)
- [Instruções para geração com IA](docs/INSTRUCOES_IA_ROADMAP.md)
- [Instruções — tópicos de Projeto Final](docs/INSTRUCOES_IA_TOPICOS_PROJETO_FINAL.md)
- [Instruções — Projeto Final completo](docs/INSTRUCOES_IA_PROJETO_FINAL.md)
- [Templates de exemplo](docs/templates/)

## Limitações atuais

- Os dados são locais e não possuem sincronização entre dispositivos.
- Não há autenticação nem suporte a múltiplos usuários.
- Um único processo Node deve escrever no banco (adequado ao uso local).
- O motor de recuperação de informações permanece experimental.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).
