# Road-Learn

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Aplicação web local para criar, organizar e acompanhar roadmaps de aprendizado. Combina tarefas, competências, dependências, revisão espaçada e métricas de tempo — sem conta e com persistência SQLite.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | Django 5 + Django REST Framework |
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS, Lucide, Recharts |
| Banco | SQLite3 |
| Servidor | Gunicorn (porta **8002**) |
| Processo | PM2 |
| SO alvo | Ubuntu Linux |

Consulte a visão detalhada em [Capacidades](docs/CAPACIDADES.md) e o deploy em [DEPLOY.md](docs/DEPLOY.md).

## Instalação (Ubuntu)

```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

O mesmo script instala e atualiza (`--pull`, `--no-system`, `--no-pm2`). Acesse [http://localhost:8002](http://localhost:8002).

## Desenvolvimento

```bash
python -m venv .venv
# Linux: source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate

cd frontend
npm install
npm run dev
```

Em outro terminal:

```bash
python manage.py runserver 8002
```

O Vite (porta 5173) faz proxy de `/api` para o Django em `8002`.

## Primeiro roadmap

1. Abra um arquivo em [`docs/templates/`](docs/templates/).
2. Na interface, **JSON** na navegação.
3. Cole o conteúdo ou gere com IA (requer `GEMINI_API_KEY` no `.env`).

O arquivo [`roadmap-html.json`](docs/templates/roadmap-html.json) é um bom ponto de partida. Ver [GERAR_ROADMAP.md](docs/GERAR_ROADMAP.md) e [Instruções para IA](docs/INSTRUCOES_IA_ROADMAP.md).

## Configuração

O arquivo [`.env.example`](.env.example) documenta `SECRET_KEY`, `ROADLEARN_API_KEY`, `GEMINI_API_KEY` e links do hub. Nunca envie o `.env` ao repositório.

Dados: `db.sqlite3` na raiz do projeto (criado no migrate). Backup em `/backup/` e via `scripts/backup_sqlite.sh`.

## API

- `GET /api/v1/saude`
- `GET/POST /api/v1/roadmaps`
- `POST /api/v1/roadmaps/import`
- `POST /api/v1/roadmaps/gerar`
- Rotas de tarefas, sidebar, perfil, projetos finais e integrados em `/api/v1/`

## Estrutura

```text
Road-Learn/
├── config/                 # Django settings / urls / wsgi
├── api/                    # Django REST Framework
├── roadmaps/ perfil/ projetos/
├── frontend/               # React + Vite
├── static/app/             # build da SPA
├── docs/                   # guias e templates
├── scripts/install.sh
└── ecosystem.config.cjs
```

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).
