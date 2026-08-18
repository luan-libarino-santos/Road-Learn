# Padrão de desenvolvimento — Hub Pessoal

Guia para construir um **novo módulo do Hub** com a mesma aparência, stack e comportamento dos apps existentes (Dinheiro, Tasks, Arquivos, Treinos, Road-Learn).

Use este documento como briefing completo para um agente ou desenvolvedor. Os repositórios de referência são:

- `dinheiro-do-luan` — finanças (porta **8000**)
- `tasks` — tarefas (porta **8001**)
- `sistema_arquivos` — documentos (porta **8003**)
- `road-learn` — aprendizado (porta **3000**)
- `treinos` — treinos (porta **3001**)

---

## 1. Visão do Hub

| Princípio | Detalhe |
|-----------|---------|
| **Monousuário** | Sem login Django na UI. Quem alcança a porta vê e edita tudo. Proteção = firewall (e Nginx/Basic Auth opcional). |
| **Self-hosted** | VM Ubuntu pequena (~1 GB RAM, 2 threads), Oracle Always Free ou similar. |
| **Um processo por app** | Gunicorn + PM2. Node só no **build** do front; nada de `npm run dev` em produção. |
| **SQLite** | WAL, `foreign_keys=ON`. Sem Postgres/Redis/Celery por padrão. |
| **SPA integrada** | React compilado em `static/app/`; Django serve `index.html` para todas as rotas não-API. |
| **API REST** | Prefixo `/api/v1/`. JSON UTF-8. Datas ISO 8601. Locale `pt-BR`, timezone `America/Sao_Paulo`. |
| **Integração leve** | Apps conversam via HTTP + API key (`Authorization: Bearer`). Sidebar com links cruzados via `.env`. |

---

## 2. Stack obrigatória

Stack fixa de qualquer módulo do Hub. Não substituir camadas sem decisão explícita documentada no `README.md` do módulo.

| Camada | Tecnologia |
|--------|------------|
| Backend | Django |
| API | Django REST Framework |
| Frontend | React + TypeScript |
| Build | Vite |
| UI/CSS | Tailwind CSS |
| Ícones | Lucide |
| Gráficos | Recharts |
| Banco | SQLite3 |
| Django server | Gunicorn |
| SO | Ubuntu Linux |
| Controle | `ecosystem.config.cjs` para PM2 |
| Instalador / atualizador | `scripts/install.sh` — um script completo que serve para **instalar** e para **update** |

### Detalhes e versões em uso (referência)

| Item | Versão / pacote |
|------|-----------------|
| Python | 3.12+ |
| Django | 5.x |
| DRF | 3.15+ |
| Config | `django-environ` |
| Gunicorn | `--workers 1 --threads 2` (VM ~1 GB — não aumentar workers) |
| Estáticos | WhiteNoise (`CompressedStaticFilesStorage`) |
| React | 19 |
| TypeScript | 5.9+ |
| Vite | 7 |
| Tailwind | 4 (`@tailwindcss/vite`) |
| Rotas | `react-router-dom` 7 |
| Testes | `pytest` + `pytest-django` |

**`install.sh`:** na primeira execução cria `.venv`, `.env`, migrate, build do front e sobe PM2; nas seguintes faz rebuild (backend + frontend) e `pm2 restart`. Flags: `--pull` (git pull antes), `--no-system`, `--no-pm2`.

**`ecosystem.config.cjs`:** define o processo Gunicorn (`name`, porta, `cwd`, env). PM2 gerencia start/restart no boot (`pm2 save`, `pm2 startup`).

**Recharts:** incluir no `package.json` quando o módulo tem dashboards ou relatórios com gráficos (Dinheiro, Arquivos). Módulos sem charts (ex.: Tasks) podem omitir a dependência.

**Node em produção:** só roda durante `npm run build` no `install.sh`. Em runtime não fica processo Node — só Gunicorn via PM2.

### O que **não** entra por padrão

- shadcn/ui, MUI, Chakra
- Postgres, Redis, Celery, Elasticsearch
- Scanner da VM, Drive/Dropbox
- Login multiusuário Django na UI
- Node em runtime (sem `tsx`, sem `next start`)

Exceções documentadas no `README.md` e `FEATURES.md` do módulo (ex.: worker PM2 do Arquivos para `processar_fila`).

---

## 3. Estrutura de pastas

```
<modulo>/
├── config/                 # settings, urls, wsgi
├── core/                   # spa, backup, hub.py
├── api/                    # views DRF, serializers, urls, auth.py
├── <app_django>/           # models, services, migrations (1 ou mais apps)
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, ErrorBoundary, forms, rows
│   │   ├── pages/          # uma página por rota principal
│   │   ├── lib/            # api.ts, catalogo.ts, format.ts, types.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css       # @theme + tokens de cor do módulo
│   ├── vite.config.ts
│   └── package.json
├── static/app/             # output do Vite (gitignored ou versionado após build)
├── scripts/
│   ├── install.sh          # venv + migrate + build + PM2
│   └── backup_sqlite.sh
├── tests/                  # test_regras.py ou test_*.py
├── docs/
│   ├── API.md
│   ├── DEPLOY.md
│   └── PENDENTE.md         # opcional
├── ecosystem.config.cjs
├── manage.py
├── requirements.txt
├── pyproject.toml            # black, ruff, pytest
├── .env.example
├── FEATURES.md
├── README.md
└── LICENSE                   # MIT
```

**Apps Django:** domínio em apps separados (`tarefas`, `arquivos`, `transacoes`…), API concentrada em `api/`, utilitários compartilhados em `core/`.

**Dados pesados:** preferir diretório dedicado (`data/` no Arquivos) em vez de misturar com o código. Nunca apagar `data/` no `install.sh update`.

---

## 4. Convenções estéticas (UI)

Todos os módulos compartilham a **mesma gramática visual**. A identidade de cada app é a **cor de destaque** + ícone no header.

### 4.1 Tipografia

```css
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@380;480;580;700&family=Syne:wght@700;800&display=swap");
```

- **Corpo:** Outfit (`font-sans`)
- **Títulos de página:** Syne (`font-display`, classe `.page-title`)
- Tamanho do título: `clamp(1.6rem, 5vw, 2.1rem)`

### 4.2 Paleta base (sempre igual)

| Token Tailwind | Uso | Valor típico |
|----------------|-----|--------------|
| `ink` | fundo principal | `#0c0e12` – `#09090b` |
| `ink-2` | sidebar | um tom acima de `ink` |
| `panel` | cards, hover de nav | `#1a1f2b` – `#18181b` |
| `line` | bordas | `#2a3142` – `#27272a` |
| `sand` | texto principal | `#e8eaef` – `#e4e4e7` |
| `mute` | texto secundário | `#9aa3b5` – `#71717a` |

### 4.3 Cor de destaque por módulo (única variável de identidade)

| Módulo | Token | Exemplo | Ícone Lucide no header |
|--------|-------|---------|------------------------|
| Dinheiro | `violet` | `#a78bfa` | `Wallet` |
| Tasks | `gold` | `#f5c542` | `CheckSquare` |
| Arquivos | `steel` | `#d4d4d8` | `File` |

- Nav ativa: `bg-<accent> text-ink`
- Hover de links Hub: `hover:text-<accent>`
- Botão de ação primário do módulo: `bg-<accent>`
- `::selection`: fundo = accent, texto = `ink`
- Gradiente radial no `body` com o accent em ~10–14% de opacidade

### 4.4 Layout (copiar de `Layout.tsx`)

Grid `lg:grid-cols-[260px_1fr]`, sidebar fixa em mobile:

```
┌─────────────────────────────────────────┐
│ [ícone] Nome do App    "Hub pessoal"    │  ← header sidebar
│ nav principal (NavLink rounded-xl)      │
│ seção dinâmica (listas/pastas…)         │
│ ─────────────────────────────────────   │
│ HUB  [Dinheiro] [Tasks] [Treinos]…      │  ← mt-auto, border-t
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ [≡] 🔍 Busca global (sticky, blur)      │  ← top bar
├─────────────────────────────────────────┤
│ main: max-w-4xl ou max-w-none (wide)    │
└─────────────────────────────────────────┘
```

**Must-haves de layout:**

- Sidebar `id="menu-principal"`, overlay `bg-black/60` em mobile
- `safe-area-inset` em top/bottom (`pt-[max(1rem,env(safe-area-inset-top))]`)
- Menu mobile: `Escape` fecha, `body overflow hidden` enquanto aberto
- `aria-label`, `aria-expanded`, `aria-controls` no botão do menu
- Barra de busca global no topo (placeholder contextual)
- Links Hub: `<a href>` (não `NavLink`) com `hubHref()` no front
- `min-h-dvh` / `h-dvh` em vez de só `min-h-screen`

### 4.5 Componentes e classes recorrentes

| Elemento | Classes |
|----------|---------|
| Card / row | `rounded-2xl border border-line bg-panel/60 p-3` |
| Input | `rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none` |
| Nav link | `rounded-xl px-3 py-2.5 text-sm` |
| Modal | `rounded-2xl border border-line bg-ink-2 p-4 shadow-2xl max-w-lg` |
| Erro | `rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-200` |
| Chip Hub | `rounded-lg border border-line px-2 py-1 text-xs text-mute` |
| Loading | `text-sm text-mute` — "Carregando…" |
| Título de página | `<h1 className="page-title">` |

**Cantos:** `rounded-xl` (botões, inputs), `rounded-2xl` (cards, ícone do app).

**Sem** tema claro. **Sem** CSS modules ou styled-components — só Tailwind utility + `index.css` mínimo.

### 4.6 Ícones

Sempre `lucide-react`, tamanho 16 no nav, 20 no header/menu. Não misturar bibliotecas de ícones.

### 4.7 Wide layout

Páginas com grade larga (kanban, calendário, timeline, detalhe de arquivo) usam `max-w-none` no `<main>`. O resto usa `max-w-4xl` ou `max-w-5xl`.

---

## 5. Convenções funcionais (backend)

### 5.1 `config/settings.py`

Padrão comum em todos os módulos:

```python
env = environ.Env(DEBUG=(bool, False), ALLOWED_HOSTS=(list, ["*"]), ALLOW_ANY_HOST=(bool, True))
environ.Env.read_env(BASE_DIR / ".env")

# Chave do módulo: <MODULO>_API_KEY
# Links hub: HUB_<OUTRO>_URL (vazio = esconde atalho na UI)

ALLOW_ANY_HOST → append "*" se não presente
SQLite: PRAGMA foreign_keys + journal_mode=WAL no signal connection_created

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"

STORAGES staticfiles → whitenoise CompressedStaticFilesStorage
REST_FRAMEWORK → ApiKeyAuthentication + SessionAuthentication, AllowAny
```

**Oracle VM:** `ALLOWED_HOSTS=*` porque o browser manda IP público, não o da VNIC. Documentar no `.env.example`.

**CSRF:** listar origens do Vite (`5173`), Gunicorn (`PORT`), IP público. Dinheiro também usa `USE_X_FORWARDED_HOST` + `SECURE_PROXY_SSL_HEADER` quando há Nginx na porta 80.

### 5.2 `core/hub.py`

Função idêntica em todos os repos:

```python
def hub_publico(request, url: str) -> str:
    """Troca localhost/127.0.0.1 pelo Host da requisição, mantendo a porta do app."""
```

Usada no `GET /api/v1/saude` para devolver URLs clicáveis no browser da VM.

### 5.3 `core/views.py` — SPA

```python
def spa(request):
    # static/app/index.html → FileResponse
    # Se não existe: 503 com mensagem "cd frontend && npm run dev" / "npm run build"
```

`config/urls.py`:

```python
path("admin/", ...)
path("api/v1/", include("api.urls"))
path("backup/", BackupDownloadView.as_view())
# media/<path> se o app tem uploads
re_path(r"^(?!api/|admin/|static/|backup/|media/).*$", spa)
```

### 5.4 Autenticação API (`api/auth.py`)

```python
class ApiKeyAuthentication(BaseAuthentication):
    keyword = "Bearer"
    # Sem header → None (pedido aceito — monousuário)
    # Header presente + chave errada → 401
    # Header presente + API_KEY vazia no settings → 401 "não configurada"
```

Nome da setting: `<MODULO>_API_KEY` (`TASKS_API_KEY`, `DINHEIRO_API_KEY`, `ARQUIVOS_API_KEY`).

### 5.5 Endpoints obrigatórios

| Método | Caminho | Resposta |
|--------|---------|----------|
| GET | `/api/v1/saude` | `{ ok, app, armazenamento, hub: { ... } }` |
| GET | `/api/v1/csrf` | `{ csrfToken }` — SPA chama no boot |

`app`: slug curto (`tasks`, `dinheiro`, `arquivos`).  
`armazenamento`: `"sqlite"` (ou descrever se diferente).  
`hub`: dict com chaves estáveis (`dinheiro`, `tasks`, `treinos`, `roadlearn`, `arquivos` — só as que existem).

### 5.6 Erros

JSON `{ "detail": "..." }` ou `{ "campo": ["..."] }`. Códigos: **400** validação, **401** API key, **404** inexistente.

### 5.7 Serviços e models

- Lógica de negócio em `services.py`, não em views gigantes
- Views DRF: `viewsets` + `@action` para sub-recursos
- Seed de dados iniciais via migration ou `post_migrate` (Inbox, status sistema, etc.)
- Testes em `tests/test_regras.py` cobrindo regras de negócio e `/saude`

---

## 6. Convenções funcionais (frontend)

### 6.1 `vite.config.ts`

```typescript
base: command === "build" ? "/static/app/" : "/",
build: { outDir: "../static/app", emptyOutDir: true },
server: {
  port: 5173,
  proxy: { "/api": { target: "http://127.0.0.1:<PORT>", changeOrigin: true }, ... }
}
```

### 6.2 `lib/api.ts`

- `fetch` com `credentials: "same-origin"`
- CSRF: ler cookie `csrftoken`, enviar `X-CSRFToken` em mutações
- `Content-Type: application/json` exceto `FormData`
- Erros: extrair `detail` ou JSON stringify
- Prefixo fixo `/api/v1/`

### 6.3 `lib/catalogo.ts` + `App.tsx`

- `CatalogoContext` com dados compartilhados (listas, tags, hub links…)
- Boot: `api.csrf()` → `api.saude()` + listagens → `setPronto(true)`
- Banner vermelho se API falha, mas app continua renderizando
- Páginas com `React.lazy` + `Suspense` + `ErrorBoundary`

### 6.4 `lib/format.ts`

Funções comuns (copiar/adaptar):

- `hubHref(url)` — troca localhost pelo hostname atual no browser
- `formatPrazo`, `toDatetimeLocal` — `pt-BR`
- Helpers de data (`ymd`, `inicioDoDiaIso`…) se o domínio usa datas

### 6.5 Rotas

- `BrowserRouter` em `main.tsx`
- `Layout` como parent route com `<Outlet />`
- `path="*"` → `Navigate to="/"`
- Query params para modais (`?nova=1`) quando fizer sentido (Dinheiro)

### 6.6 Textos

- UI em **português brasileiro**
- Labels curtos, confirmações com `window.confirm`, erros com `window.alert` ou banner inline
- Placeholders descritivos ("Busca global", "Nova lista", "Buscar arquivos e documentos…")

---

## 7. Portas, PM2 e deploy

### 7.1 Mapa de portas (reservar uma nova sem colidir)

| App | Porta Gunicorn | PM2 name |
|-----|----------------|----------|
| Dinheiro | 8000 | `dinheiro` |
| Tasks | 8001 | `tasks` |
| Road-Learn | 3000 | (próprio stack) |
| Treinos | 3001 | (próprio stack) |
| Arquivos | 8003 | `arquivos` + `arquivos-worker` |

Novo módulo: escolher porta livre (ex. **8002**, **8004**), documentar em `docs/DEPLOY.md`.

### 7.2 `ecosystem.config.cjs`

```javascript
{
  name: "<slug>",
  script: ".venv/bin/gunicorn",
  args: "--workers 1 --threads 2 --timeout 60 --max-requests 500 --max-requests-jitter 50 --bind 0.0.0.0:<PORT> config.wsgi:application",
  cwd: __dirname,
  interpreter: "none",
  env: { DJANGO_SETTINGS_MODULE: "config.settings", HOST: "0.0.0.0", PORT: "<PORT>" },
}
```

**Não aumentar workers** em VM 1 GB. Timeout maior (300) só se uploads pesados.

### 7.3 `scripts/install.sh`

Flags padrão: `--pull`, `--no-system`, `--no-pm2`.

Fluxo:

1. `python3 -m venv .venv` + `pip install -r requirements.txt`
2. Primeira vez: copiar `.env.example` → `.env`, gerar `SECRET_KEY` e `<MODULO>_API_KEY`, `DEBUG=False`
3. Ajustar `ALLOWED_HOSTS=*`, `CSRF_TRUSTED_ORIGINS`, URLs do hub
4. `manage.py migrate --noinput`
5. `cd frontend && npm ci && npm run build` com `NODE_OPTIONS=--max-old-space-size=384`
6. Verificar `static/app/index.html`
7. `collectstatic --noinput`
8. `pm2 start|restart` + `pm2 save`

Update **nunca** apaga `.env`, `db.sqlite3` ou `data/`.

### 7.4 Backup

- `scripts/backup_sqlite.sh` + rota `GET /backup/` (download do SQLite)
- Cron em horário distinto dos outros apps (ex.: Dinheiro 03:00, Tasks 03:20)
- Incluir `media/` ou `data/storage/` no rsync se houver arquivos

---

## 8. Integração entre módulos

### 8.1 Sidebar Hub (`.env`)

Cada app declara links para os outros:

```env
HUB_DINHEIRO_URL=http://150.230.230.89:8000
HUB_TASKS_URL=http://150.230.230.89:8001
HUB_TREINOS_URL=http://150.230.230.89:3001
HUB_ROADLEARN_URL=http://150.230.230.89:3000
HUB_ARQUIVOS_URL=http://150.230.230.89:8003   # adicionar nos outros quando Arquivos existir
```

URL vazia → atalho não aparece. `install.sh` pode preencher IP público da Oracle na primeira instalação.

### 8.2 Tasks — criar tarefa de outro app

```http
POST /api/v1/tarefas/
Authorization: Bearer <TASKS_API_KEY>
Content-Type: application/json

{
  "titulo": "Pagar fatura",
  "lista_slug": "inbox",
  "origem": "dinheiro-do-luan",
  "origem_id": "despesa:123",
  "origem_url": "/despesas/123/",
  "prazo": "2026-08-20T12:00:00-03:00",
  "prioridade": "alta"
}
```

- `origem` = slug estável do app de origem
- `origem_id` = id estável no domínio (`despesa:123`, `sessao:9`)
- Par `(origem, origem_id)` é **idempotente** (segundo POST → 200 com tarefa existente)
- `origem_url` = path relativo no app de origem (chip clicável no Tasks)

### 8.3 Arquivos — relação genérica

```http
POST /api/v1/relacoes/
Authorization: Bearer <ARQUIVOS_API_KEY>

{ "arquivo": 42, "tipo_entidade": "despesa", "id_entidade": "123" }
```

### 8.4 Chamadas HTTP entre backends

- Usar `requests` ou `urllib` com API key
- Timeouts curtos (5–10 s)
- Falha da integração **não** deve quebrar o fluxo principal (log + seguir)
- Nunca hardcodar `127.0.0.1` em produção — ler URL do `.env`

---

## 9. Documentação obrigatória

Cada módulo deve ter:

| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | O que é, stack, setup local, testes, link para API/deploy |
| `FEATURES.md` | O que o sistema **faz hoje** (por seção/rota) |
| `docs/API.md` | Contrato REST completo com exemplos |
| `docs/DEPLOY.md` | Porta, PM2, firewall, cron backup, RAM |
| `docs/PENDENTE.md` | Fora de escopo / backlog (opcional mas recomendado) |
| `.env.example` | Todas as variáveis com comentários |

---

## 10. Checklist — novo módulo

### Estrutura e stack

- [ ] Stack da tabela §2: Django + DRF, React + TS, Vite, Tailwind, Lucide, SQLite3, Gunicorn
- [ ] Recharts no `package.json` se o módulo tem gráficos
- [ ] `ecosystem.config.cjs` para PM2 + deploy em Ubuntu
- [ ] `scripts/install.sh` único para instalar e atualizar (`--pull`, `--no-system`, `--no-pm2`)
- [ ] Python 3.12+, WhiteNoise, Gunicorn 1w/2t
- [ ] `frontend/` build → `static/app/`, `base` `/static/app/` em produção
- [ ] `pytest` com testes de regras + `/saude`

### Backend

- [ ] `api/auth.py` com `<MODULO>_API_KEY`
- [ ] `GET /api/v1/saude` com `hub` e `hub_publico`
- [ ] `GET /api/v1/csrf`
- [ ] `core/views.py` spa + backup
- [ ] `ALLOWED_HOSTS=*`, `CSRF_TRUSTED_ORIGINS` documentados
- [ ] Seed/migration de dados iniciais se necessário

### Frontend

- [ ] `index.css` com Outfit + Syne e **uma** cor accent
- [ ] `Layout.tsx` seguindo o molde (sidebar 260px, busca, Hub footer)
- [ ] `hubHref()` no front + `hubItems` alinhado ao `saude.hub`
- [ ] `CatalogoContext`, lazy pages, ErrorBoundary
- [ ] `api.ts` com CSRF e credentials
- [ ] Mobile: menu drawer, safe-area, Escape fecha menu
- [ ] Textos em pt-BR

### Deploy

- [ ] `ecosystem.config.cjs` com porta única
- [ ] `scripts/install.sh` completo (flags `--pull`, `--no-system`, `--no-pm2`)
- [ ] `scripts/backup_sqlite.sh` + `/backup/`
- [ ] `docs/DEPLOY.md` com porta no mapa do hub
- [ ] `.env.example` com `HUB_*_URL` e API key

### Hub

- [ ] Adicionar `HUB_<NOVO>_URL` nos `.env.example` dos **outros** módulos
- [ ] Adicionar atalho na sidebar dos outros (quando fizer sentido)
- [ ] Documentar integrações (Tasks, Arquivos, etc.)

### Segurança

- [ ] Sem secrets no git
- [ ] Firewall na porta do app
- [ ] Uploads: limites de tamanho, extensão, contagem (se aplicável)

---

## 11. Anti-padrões (não fazer)

- Login Django na UI sem pedido explícito
- Múltiplos workers Gunicorn em VM 1 GB
- `npm run dev` ou processo Node em produção
- Cores/fontes diferentes de Outfit + Syne + paleta ink/sand/mute
- Sidebar sem links Hub ou sem busca global
- API sem `/saude` e sem `/csrf`
- Build Vite com `base: "/"` em produção (quebra assets no Django)
- Hardcodar IP/localhost nas integrações em vez de `.env`
- Commits com `.env`, `db.sqlite3`, `node_modules/`, `.venv/`
- shadcn/MUI "porque é mais fácil"
- Postgres/Celery/Redis "para o futuro" sem necessidade real

---

## 12. Referência rápida — arquivos para copiar como molde

Ao iniciar um módulo novo, use estes arquivos do repo **Tasks** (ou Dinheiro/Arquivos) como template e adapte:

| Arquivo | O que preservar |
|---------|-----------------|
| `core/hub.py` | Idêntico |
| `core/views.py` | spa + backup |
| `api/auth.py` | Só trocar nome da API key |
| `config/urls.py` | Padrão de rotas |
| `frontend/src/components/Layout.tsx` | Estrutura; trocar nav, accent, hubItems |
| `frontend/src/index.css` | @theme; trocar accent |
| `frontend/src/lib/api.ts` | Padrão fetch + CSRF |
| `frontend/src/lib/format.ts` | `hubHref` + formatadores |
| `frontend/src/App.tsx` | CatalogoContext + lazy routes |
| `frontend/vite.config.ts` | base, outDir, proxy |
| `ecosystem.config.cjs` | workers/threads/porta |
| `scripts/install.sh` | Fluxo completo |
| `pyproject.toml` | black, ruff, pytest |

---

*Última revisão: agosto 2026 — baseado em `tasks`, `dinheiro-do-luan` e `sistema_arquivos`.*
