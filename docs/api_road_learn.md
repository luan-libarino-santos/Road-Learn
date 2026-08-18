# API Road-Learn — referência completa

> **Status:** implementado. Camada IA em `roadmaps/ai_services.py` + `api/ai_views.py`. API comum em `api/views.py`.

Contrato REST do Road-Learn (porta **8002**): endpoints da **SPA**, da **Personal AI** e dos **demais módulos do Hub**.

---

## 1. Visão geral

| Item | Valor |
|------|-------|
| Base URL | `http://<host>:8002/api/v1` |
| Produção | `HUB_ROADLEARN_URL` no `.env` dos outros apps |
| Formato | JSON UTF-8, **camelCase** nos campos |
| Locale | `pt-BR`, timezone `America/Sao_Paulo` |
| Datas | ISO 8601 (`2026-08-17T14:30:00-03:00` ou `…Z`) |
| Banco | SQLite (`db.sqlite3`) |

### Autenticação

| Consumidor | Como autenticar |
|------------|-----------------|
| **Hub / Personal AI** | `Authorization: Bearer <ROADLEARN_API_KEY>` (opcional — app monousuário) |
| **SPA (browser)** | Cookie de sessão Django + `X-CSRFToken` em mutações |

Mutações da SPA: obter token com `GET /api/v1/csrf` e enviar no header `X-CSRFToken`.

### Erros

**API comum** (`/roadmaps`, `/profile`, …):

```json
{ "erro": "Mensagem legível em pt-BR" }
```

**API IA** (`/ai/*`):

```json
{ "ok": false, "code": "ROADMAP_NAO_ENCONTRADO", "message": "Roadmap 'docker' não existe." }
```

**DRF** (raro): `{ "detail": "…" }`

### Convenções

- IDs: base36 + sufixo aleatório (`gerar_id()` em `core/ids.py`)
- Tipos de tarefa: `pratica`, `pesquisa`, `projeto`, `analise`
- Dificuldade: `facil`, `medio`, `dificil`
- Prioridade: `baixa`, `media`, `alta`
- Tipos de link: `video`, `artigo`, `doc`, `repo`, `outro`

---

## 2. Índice de endpoints

Prefixo: `/api/v1` (omitido na tabela).

### 2.1 Sistema

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/saude` | Health check + links Hub + manifest IA |
| GET | `/csrf` | Token CSRF para a SPA |
| GET | `/analytics` | Métricas globais (heatmap, streak, comparação semanal) |
| GET | `/timer` | Timer de tarefa aberto |

### 2.2 Roadmaps

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/roadmaps` | Lista roadmaps completos + domínio |
| POST | `/roadmaps` | Cria roadmap vazio |
| GET | `/roadmaps/{id}` | Detalhe completo + domínio |
| PUT | `/roadmaps/{id}` | Atualiza nome/descrição |
| DELETE | `/roadmaps/{id}` | Exclui roadmap |
| POST | `/roadmaps/import` | Importa roadmap(s) via JSON |
| POST | `/roadmaps/gerar/preview` | Preview do prompt IA (sem chamar Gemini) |
| POST | `/roadmaps/gerar` | Gera roadmap via Gemini |

### 2.3 Competências

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/roadmaps/{id}/competencias` | Adiciona competência |
| PUT | `/roadmaps/{id}/competencias/{cid}` | Atualiza competência |
| DELETE | `/roadmaps/{id}/competencias/{cid}` | Remove competência |

### 2.4 Tarefas e subtarefas

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/roadmaps/{id}/tarefas` | Cria tarefa |
| PUT | `/roadmaps/{id}/tarefas/reordenar` | Reordena tarefas |
| PUT | `/roadmaps/{id}/tarefas/{tid}` | Atualiza tarefa |
| DELETE | `/roadmaps/{id}/tarefas/{tid}` | Exclui tarefa |
| POST | `/roadmaps/{id}/tarefas/{tid}/tempo` | Registra horas manualmente |
| POST | `/roadmaps/{id}/tarefas/{tid}/timer/iniciar` | Inicia timer |
| POST | `/roadmaps/{id}/tarefas/{tid}/timer/parar` | Para timer e credita horas |
| PUT | `/roadmaps/{id}/tarefas/{tid}/mover` | Move tarefa ↑/↓ (`direcao`: 1 ou -1) |
| POST | `/roadmaps/{id}/tarefas/{tid}/subtarefas` | Cria subtarefa |
| PUT | `/roadmaps/{id}/tarefas/{tid}/subtarefas/{sid}` | Atualiza subtarefa |
| DELETE | `/roadmaps/{id}/tarefas/{tid}/subtarefas/{sid}` | Remove subtarefa |

### 2.5 Sidebar

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/sidebar` | Grupos + atribuições de roadmaps |
| POST | `/sidebar/grupos` | Cria grupo |
| PUT | `/sidebar/grupos/reordenar` | Reordena grupos |
| PUT | `/sidebar/grupos/{grupo_id}` | Renomeia grupo |
| DELETE | `/sidebar/grupos/{grupo_id}` | Exclui grupo |
| PUT | `/sidebar/atribuicoes/{roadmap_id}` | Atribui roadmap a grupo |
| PUT | `/sidebar/reordenar` | Reordena roadmaps dentro de grupo ou “todos” |

### 2.6 Perfil (gamificação)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/profile` | Ficha: XP, nível, habilidades, identidade |
| POST | `/profile/rebuild` | Recalcula perfil a partir dos roadmaps |
| PATCH | `/profile/identidade` | Atualiza nome/ícone/cor de exibição |

### 2.7 Projetos finais (1 por roadmap)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/projetos-finais?roadmapId=` | Obtém projeto final do roadmap |
| POST | `/projetos-finais` | Cria/atualiza projeto final (JSON manual) |
| GET | `/projetos-finais/{id}` | Detalhe por ID do projeto |
| PUT | `/projetos-finais/{id}` | Atualiza projeto |
| DELETE | `/projetos-finais/{id}` | Exclui projeto |
| PUT | `/projetos-finais/{id}/itens` | Marca item de checklist |
| POST | `/projetos-finais/sugerir-topicos` | IA sugere 3 tópicos (Gemini) |
| POST | `/projetos-finais/gerar` | IA gera projeto completo (Gemini) |

### 2.8 Projetos integrados (multi-roadmap)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/projetos-integrados` | Lista projetos integrados |
| POST | `/projetos-integrados` | Cria projeto integrado |
| GET | `/projetos-integrados/{id}` | Detalhe |
| PUT | `/projetos-integrados/{id}` | Atualiza |
| DELETE | `/projetos-integrados/{id}` | Exclui |
| PUT | `/projetos-integrados/{id}/itens` | Marca item de checklist |
| POST | `/projetos-integrados/sugerir-topicos` | IA sugere 3 tópicos |
| POST | `/projetos-integrados/gerar` | IA gera projeto completo |

### 2.9 Camada IA (Personal AI / Hub)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/ai/proximo` | Próxima tarefa sugerida |
| GET | `/ai/progresso` | Progresso global ou por roadmap |
| GET | `/ai/resumo-semana` | Semana atual vs anterior |
| GET | `/ai/hoje` | Atividade do dia |
| GET | `/ai/revisao` | Tarefas com revisão espaçada vencida |
| GET | `/ai/roadmap/{id}/resumo` | Snapshot enxuto de um roadmap |
| GET | `/ai/roadmap/{id}/elegibilidade-projeto` | Elegível para Projeto Final (≥80%) |

### 2.10 Fora de `/api/v1`

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/backup/` | Download do `db.sqlite3` |
| * | `/*` | SPA React (exceto `api/`, `admin/`, `static/`, `backup/`) |

---

## 3. API comum — detalhes

### 3.1 `GET /saude`

Health check e manifest para integração Hub.

**Resposta 200:**

```json
{
  "ok": true,
  "app": "road-learn",
  "armazenamento": "sqlite",
  "hub": {
    "dinheiro": "http://host:8000",
    "treinos": "http://host:3001",
    "tasks": "http://host:8001"
  },
  "ai": {
    "versao": "1",
    "basePath": "/api/v1/ai",
    "intencoes": [
      { "id": "proximo", "metodo": "GET", "path": "/proximo", "descricao": "Próxima tarefa sugerida" }
    ]
  }
}
```

---

### 3.2 `GET /csrf`

**Resposta 200:** `{ "csrfToken": "…" }`

---

### 3.3 `GET /analytics`

Métricas globais de estudo. Payload grande (~3–8 KB) — **preferir `/ai/resumo-semana`** para consumo por IA.

**Resposta 200 (campos principais):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `totalRoadmaps` | number | Quantidade de roadmaps |
| `totalTarefas` | number | Total de tarefas |
| `totalConcluidas` | number | Tarefas concluídas |
| `porTipo` | object | Contagem por `pratica`, `pesquisa`, `projeto`, `analise` |
| `horasEstimadas` / `horasReais` | number | Soma global |
| `atributos` | array | Horas por atributo (Back-end, Front-end…) |
| `streak` / `diasEmSequencia` | number | Dias consecutivos com atividade |
| `heatmap` | array[84] | Atividade diária (`data`, `concluidas`, `horas`, `nivel`) |
| `semanas` | array[8] | Resumo semanal (`rotulo`, `concluidas`, `horas`) |
| `diasDaSemana` | array[7] | Semana corrente dia a dia |
| `comparacaoSemanal` | object | `atual`, `anterior`, `deltaHoras`, `deltaConcluidas` |
| `horasHoje` | number | Horas registradas hoje |
| `horasSemanaAtual` / `horasMesAtual` | number | Acumulados |
| `concluidasSemanaAtual` / `concluidasMesAtual` | number | Tarefas concluídas no período |

---

### 3.4 `GET /timer`

**Resposta 200:**

```json
{
  "aberta": {
    "tarefaId": "abc12",
    "roadmapId": "docker",
    "titulo": "Redes",
    "timerAtivoDesde": "2026-08-17T14:30:00-03:00"
  }
}
```

`aberta` é `null` se nenhum timer ativo.

---

### 3.5 Roadmaps

#### `GET /roadmaps`

Lista **todos** os roadmaps com tarefas completas, histórico, subtarefas e links. Inclui `dominio` e `competenciasDominio` calculados.

> **Personal AI:** para listar roadmaps com pouco JSON, usar `GET /ai/progresso` → `data.porRoadmap` (id, nome, progresso, domínio).

#### `POST /roadmaps`

**Body:** `{ "nome": "Docker", "descricao": "opcional" }`

**201:** roadmap criado (vazio, sem tarefas).

**400:** `{ "erro": "Nome é obrigatório" }`

#### `GET /roadmaps/{id}`

Roadmap completo + `dominio` + `competenciasDominio`.

**404:** `{ "erro": "Roadmap não encontrado" }`

#### `PUT /roadmaps/{id}`

**Body:** `{ "nome": "…", "descricao": "…" }` (campos opcionais).

#### `DELETE /roadmaps/{id}`

**204** sem corpo.

#### `POST /roadmaps/import`

Importa um ou mais roadmaps a partir de JSON (formato de `docs/templates/`).

**Body:** objeto roadmap ou `{ "roadmaps": [ … ] }`.

**201:**

```json
{
  "quantidade": 1,
  "avisos": [],
  "roadmaps": [ { "id": "…", "nome": "…", "tarefas": [ … ] } ]
}
```

#### `POST /roadmaps/gerar/preview`

Monta o prompt sem chamar o Gemini.

**Body:** `{ "tema": "Docker", "nivel": "intermediário", … }` (ver `docs/GERAR_ROADMAP.md`).

#### `POST /roadmaps/gerar`

Gera roadmap via Gemini e persiste.

**Body:** mesmo do preview + confirmação.

**Resposta:** roadmap criado + `modeloUsado`.

**503:** `GEMINI_API_KEY` ausente.

---

### 3.6 Competências

#### `POST /roadmaps/{id}/competencias`

**Body:** `{ "nome": "Networking", "descricao": "…" }`

**201:** competência criada `{ id, nome, descricao, ordem }`.

#### `PUT /roadmaps/{id}/competencias/{cid}`

**Body:** `{ "nome": "…", "descricao": "…" }`

#### `DELETE /roadmaps/{id}/competencias/{cid}`

**204**

---

### 3.7 Tarefas

#### `POST /roadmaps/{id}/tarefas`

**Body (campos principais):**

```json
{
  "titulo": "Redes",
  "tipo": "pratica",
  "descricao": "",
  "prazo": "",
  "horasEstimadas": 2,
  "dificuldade": "medio",
  "prioridade": "alta",
  "tags": [],
  "atributos": ["Back-end"],
  "dependsOn": ["tarefa_anterior_id"],
  "competenciasIds": ["comp_id"],
  "reviewAfterDays": 7,
  "criterioConclusao": "…",
  "links": []
}
```

**201:** tarefa criada.

**400:** tarefa bloqueada por dependência ao tentar concluir via PUT.

#### `PUT /roadmaps/{id}/tarefas/reordenar`

**Body:** `{ "ids": ["t3", "t1", "t2"] }`

#### `PUT /roadmaps/{id}/tarefas/{tid}`

Atualização parcial. Campos comuns: `concluida`, `titulo`, `horasReais`, `prioridade`, `dependsOn`, etc.

Ao marcar `concluida: true`: dispara XP/habilidades no perfil. Subtarefas todas concluídas auto-concluem a tarefa pai.

#### `DELETE /roadmaps/{id}/tarefas/{tid}`

**204**

#### `POST /roadmaps/{id}/tarefas/{tid}/tempo`

**Body:** `{ "horas": 1.5 }`

#### `POST /roadmaps/{id}/tarefas/{tid}/timer/iniciar`

Inicia timer (para timer anterior se houver).

#### `POST /roadmaps/{id}/tarefas/{tid}/timer/parar`

Para timer e credita horas em `horasReais`.

#### `PUT /roadmaps/{id}/tarefas/{tid}/mover`

**Body:** `{ "direcao": 1 }` (↑) ou `{ "direcao": -1 }` (↓).

---

### 3.8 Subtarefas

#### `POST /roadmaps/{id}/tarefas/{tid}/subtarefas`

**Body:** `{ "titulo": "Ler capítulo 3" }`

#### `PUT /roadmaps/{id}/tarefas/{tid}/subtarefas/{sid}`

**Body:** `{ "titulo": "…", "concluida": true }`

#### `DELETE /roadmaps/{id}/tarefas/{tid}/subtarefas/{sid}`

**204**

---

### 3.9 Sidebar

#### `GET /sidebar`

```json
{
  "grupos": [{ "id": "g1", "nome": "Back-end", "ordem": 0 }],
  "atribuicoes": {
    "roadmap_id": { "grupoId": "g1", "ordem": 0, "ordemTodos": 1 }
  }
}
```

#### `POST /sidebar/grupos`

**Body:** `{ "nome": "DevOps" }`

#### `PUT /sidebar/grupos/reordenar`

**Body:** `{ "ids": ["g1", "g2"] }`

#### `PUT /sidebar/grupos/{grupo_id}`

**Body:** `{ "nome": "Novo nome" }`

#### `PUT /sidebar/atribuicoes/{roadmap_id}`

**Body:** `{ "grupoId": "g1" }` ou `{ "grupoId": null }` para “sem grupo”.

#### `PUT /sidebar/reordenar`

**Body:** `{ "grupoId": "g1", "ids": ["rm1", "rm2"] }` — `grupoId` null = ordem global (`ordemTodos`).

---

### 3.10 Perfil

#### `GET /profile`

Retorna ficha completa: `xp`, `nivel`, `habilidades`, `habilidadesBase`, `habilidadesEspeciais`, `identidade`, `logXp`, `badge`.

#### `POST /profile/rebuild`

Recalcula XP e habilidades a partir de todos os roadmaps.

#### `PATCH /profile/identidade`

**Body:** `{ "nomeExibicao": "Luan", "icone": "book", "cor": "blue" }`

---

### 3.11 Projetos finais

Regra de elegibilidade: **≥ 80%** das tarefas do roadmap concluídas (`PROGRESSO_MINIMO`).

#### `GET /projetos-finais?roadmapId={id}`

Retorna projeto ou `null`.

#### `POST /projetos-finais`

**Body:** `{ "roadmapId": "…", … }` — upsert manual.

#### `GET /PUT /DELETE /projetos-finais/{id}`

CRUD por ID do projeto.

#### `PUT /projetos-finais/{id}/itens`

**Body:**

```json
{
  "colecao": "checklistImplementacao",
  "itemId": "item_1",
  "concluido": true,
  "etapaId": "opcional_para_etapas"
}
```

Coleções: `requisitosTecnicos`, `requisitosFuncionais`, `checklistImplementacao`, `boasPraticas`.

#### `POST /projetos-finais/sugerir-topicos`

**Body:** `{ "roadmapId": "…" }`

**Resposta:** `{ "topicos": [ … ], "modeloUsado": "…" }` — 3 tópicos `Topico`.

#### `POST /projetos-finais/gerar`

**Body:** `{ "roadmapId": "…", "topico": { … } }`

**Resposta:** projeto final completo persistido.

---

### 3.12 Projetos integrados

Regra: **≥ 2 roadmaps**, cada um com **≥ 80%** de tarefas concluídas.

#### `GET /projetos-integrados`

Lista todos os projetos integrados.

#### `POST /projetos-integrados`

**Body:** `{ "nome": "…", "roadmapIds": ["id1", "id2"], … }`

#### `GET /PUT /DELETE /projetos-integrados/{id}`

CRUD padrão.

#### `PUT /projetos-integrados/{id}/itens`

Mesmo contrato de `projetos-finais/{id}/itens`.

#### `POST /projetos-integrados/sugerir-topicos`

**Body:** `{ "roadmapIds": ["id1", "id2"] }`

#### `POST /projetos-integrados/gerar`

**Body:** `{ "roadmapIds": ["…"], "topico": { … } }`

---

## 4. Modelos de dados (API comum)

### Roadmap

```json
{
  "id": "abc123",
  "nome": "Docker",
  "descricao": "…",
  "criadoEm": "2026-01-15T10:00:00Z",
  "competencias": [{ "id": "c1", "nome": "Networking", "descricao": "" }],
  "tarefas": [],
  "dominio": { "dominio": 54, "total": 5, "cobertas": 4 },
  "competenciasDominio": [{ "id": "c1", "nome": "Networking", "dominio": 40, "totalTarefas": 5, "tarefasConcluidas": 2, "coberta": true }]
}
```

### Tarefa

```json
{
  "id": "t1",
  "titulo": "Redes",
  "descricao": "",
  "prazo": "",
  "horasEstimadas": 2,
  "horasReais": 1.5,
  "concluida": false,
  "concluidaEm": null,
  "tipo": "pratica",
  "ordem": 0,
  "dificuldade": "medio",
  "prioridade": "alta",
  "tags": [],
  "atributos": ["Back-end"],
  "dependsOn": ["t0"],
  "competenciasIds": ["c1"],
  "reviewAfterDays": 7,
  "timerAtivoDesde": null,
  "links": [{ "id": "l1", "titulo": "Doc", "url": "https://…", "tipo": "doc" }],
  "subtarefas": [{ "id": "s1", "titulo": "…", "concluida": false }],
  "historico": [{ "id": "h1", "em": "…", "tipo": "concluida", "detalhe": "…" }],
  "criadaEm": "…"
}
```

### Topico (IA — projetos)

```json
{
  "id": "top1",
  "titulo": "API REST com Docker",
  "resumo": "…",
  "categoria": "portfólio",
  "stackSugerida": ["Node", "Docker"],
  "competenciasAlvoIds": ["c1"]
}
```

---

## 5. API IA (`/api/v1/ai/*`)

Camada otimizada para **Personal AI** e Hub: 1 endpoint = 1 intenção, resposta com `summary` + `data` mínimo.

### Princípios

| Princípio | Detalhe |
|-----------|---------|
| Somente leitura | Todos os endpoints são `GET` |
| Envelope | `{ ok, summary, data? }` — campos extras no root quando reduzem aninhamento |
| Erros | `{ ok: false, code, message }` com HTTP 400/404 |
| Descoberta | `GET /saude` → `ai.intencoes` |

### Quando usar IA vs comum

| Pergunta / necessidade | Use |
|------------------------|-----|
| Quais roadmaps tenho? | `GET /ai/progresso` → `porRoadmap` |
| O que estudar agora? | `GET /ai/proximo` |
| Progresso geral ou de um roadmap | `GET /ai/progresso` |
| Como foi a semana? | `GET /ai/resumo-semana` |
| Editar tarefa, importar JSON, timer | API comum (`/roadmaps/…`) |
| Heatmap completo, gráficos SPA | `GET /analytics` |
| Gerar roadmap/projeto com Gemini | `POST /roadmaps/gerar`, `/projetos-finais/gerar` |

---

### 5.1 `GET /ai/proximo`

**Intenção:** "O que devo estudar agora?"

| Query | Descrição |
|-------|-----------|
| `roadmap` | ID do roadmap (opcional) |

**Resposta 200:**

```json
{
  "ok": true,
  "summary": "Próximo: Docker — Redes (67% do roadmap). Tarefa liberada, prioridade alta.",
  "roadmap": { "id": "docker", "nome": "Docker", "progressoPct": 67, "dominioPct": 54 },
  "tarefa": {
    "id": "abc12",
    "titulo": "Redes",
    "tipo": "pratica",
    "prioridade": "alta",
    "dificuldade": "medio",
    "horasEstimadas": 2,
    "motivo": "pendente, sem bloqueio, maior prioridade entre liberadas"
  },
  "alternativas": [
    { "id": "def34", "titulo": "Volumes", "roadmapId": "docker", "motivo": "segunda prioridade" }
  ]
}
```

**Regras de seleção:**

1. Apenas tarefas não concluídas e não bloqueadas (`dependsOn` satisfeito).
2. Com `roadmap`: restringe a esse roadmap.
3. Sem `roadmap`: roadmap com tarefas liberadas e **menor progresso %** (ordem sidebar como desempate).
4. Ordenação: revisão vencida → prioridade (alta > média > baixa) → dificuldade (fácil primeiro) → `ordem`.
5. Até **2 alternativas**.
6. Sem tarefa liberada: `tarefa: null`, `summary` explicativo.

**404:** roadmap inexistente (`ROADMAP_NAO_ENCONTRADO`).

---

### 5.2 `GET /ai/progresso`

**Intenção:** "Como está meu progresso?" / listar roadmaps com métricas.

| Query | Descrição |
|-------|-----------|
| `roadmap` | Detalha um roadmap (opcional) |

**Global (sem query):**

```json
{
  "ok": true,
  "summary": "3 roadmaps ativos: 142 tarefas, 89 concluídas (63%). Domínio médio 58%.",
  "data": {
    "global": {
      "roadmapsAtivos": 3,
      "tarefasTotal": 142,
      "tarefasConcluidas": 89,
      "progressoPct": 63,
      "dominioPct": 58,
      "horasEstimadas": 210,
      "horasReais": 87.5
    },
    "porRoadmap": [
      {
        "id": "docker",
        "nome": "Docker",
        "progressoPct": 67,
        "dominioPct": 54,
        "tarefasConcluidas": 12,
        "tarefasTotal": 18,
        "competenciasDestaque": [{ "nome": "Networking", "dominioPct": 40 }]
      }
    ]
  }
}
```

**Filtrado (`?roadmap=docker`):**

```json
{
  "ok": true,
  "summary": "Docker: 67% das tarefas, domínio 54%. Faltam 6 tarefas (2 bloqueadas).",
  "data": {
    "id": "docker",
    "nome": "Docker",
    "progressoPct": 67,
    "dominioPct": 54,
    "tarefas": { "total": 18, "concluidas": 12, "liberadas": 4, "bloqueadas": 2 },
    "competencias": [
      { "id": "c1", "nome": "Networking", "dominioPct": 40, "tarefasConcluidas": 2, "tarefasTotal": 5 }
    ]
  }
}
```

---

### 5.3 `GET /ai/resumo-semana`

**Intenção:** "Como foi minha semana?"

Janela: segunda 00:00 → domingo 23:59 (`America/Sao_Paulo`).

```json
{
  "ok": true,
  "summary": "Esta semana: 8,5 h e 14 tarefas concluídas (+2,5 h vs semana passada).",
  "data": {
    "periodo": { "inicio": "2026-08-11", "fim": "2026-08-17" },
    "atual": { "horas": 8.5, "tarefasConcluidas": 14 },
    "anterior": { "horas": 6.0, "tarefasConcluidas": 11 },
    "delta": { "horas": 2.5, "tarefasConcluidas": 3 },
    "porDia": [{ "data": "2026-08-11", "rotulo": "Seg", "horas": 1.5, "concluidas": 2 }],
    "roadmapsMaisAtivos": [{ "id": "docker", "nome": "Docker", "tarefasConcluidas": 6, "horas": 4.0 }]
  }
}
```

---

### 5.4 `GET /ai/hoje`

```json
{
  "ok": true,
  "summary": "Hoje: 1,5 h registradas, 2 tarefas concluídas. Timer ativo em 'Redes' (docker).",
  "data": {
    "data": "2026-08-17",
    "horas": 1.5,
    "tarefasConcluidas": 2,
    "timerAtivo": {
      "roadmapId": "docker",
      "tarefaId": "abc12",
      "titulo": "Redes",
      "desde": "2026-08-17T14:30:00-03:00"
    },
    "concluidas": [
      { "roadmapId": "docker", "tarefaId": "xyz99", "titulo": "Imagens", "em": "2026-08-17T10:15:00-03:00" }
    ]
  }
}
```

`timerAtivo` é `null` se não houver timer aberto.

---

### 5.5 `GET /ai/revisao`

| Query | Default | Máx |
|-------|---------|-----|
| `limite` | 5 | 10 |

Tarefa concluída com `reviewAfterDays > 0` e prazo de revisão vencido.

```json
{
  "ok": true,
  "summary": "3 tarefas pedem revisão: Controllers, Middleware, Rotas.",
  "data": {
    "total": 3,
    "tarefas": [
      {
        "roadmapId": "laravel",
        "tarefaId": "t1",
        "titulo": "Controllers",
        "concluidaEm": "2026-08-01T18:00:00-03:00",
        "reviewAfterDays": 7,
        "diasDesdeConclusao": 16,
        "atrasoDias": 9
      }
    ]
  }
}
```

---

### 5.6 `GET /ai/roadmap/{id}/resumo`

Snapshot enxuto sem árvore de tarefas.

```json
{
  "ok": true,
  "summary": "Docker: 18 tarefas, 67% concluídas. Próxima liberada: Redes.",
  "data": {
    "id": "docker",
    "nome": "Docker",
    "descricao": "Containerização do zero ao deploy",
    "progressoPct": 67,
    "dominioPct": 54,
    "competencias": [{ "nome": "Images", "dominioPct": 80 }],
    "proximaLiberada": { "id": "abc12", "titulo": "Redes" },
    "bloqueadas": 2,
    "revisaoPendente": 1
  }
}
```

---

### 5.7 `GET /ai/roadmap/{id}/elegibilidade-projeto`

```json
{
  "ok": true,
  "summary": "Docker atinge 85% — elegível para Projeto Final.",
  "data": {
    "roadmapId": "docker",
    "progressoPct": 85,
    "minimoPct": 80,
    "elegivel": true,
    "projetoFinalExiste": false
  }
}
```

---

### 5.8 Mapa intenção → rota (Personal AI)

| Pergunta do usuário | Rota | Enviar `data` ao Gemini? |
|---------------------|------|----------------------------|
| Quais roadmaps tenho? | `/ai/progresso` | Não — `porRoadmap` ou `summary` |
| O que estudar agora? | `/ai/proximo` | Não |
| Progresso geral | `/ai/progresso` | Só se pedir detalhe por skill |
| Progresso do Docker | `/ai/progresso?roadmap=docker` | Raramente |
| Como foi a semana? | `/ai/resumo-semana` | Não |
| O que fiz hoje? | `/ai/hoje` | Não |
| O que revisar? | `/ai/revisao` | Se lista > 3 itens |
| Contexto do roadmap X | `/ai/roadmap/{id}/resumo` | Só se pergunta técnica |
| Posso fazer projeto final? | `/ai/roadmap/{id}/elegibilidade-projeto` | Não |
| Criar/editar tarefa | `/roadmaps/{id}/tarefas` | — (API comum) |
| Gerar roadmap com IA | `/roadmaps/gerar` | — (API comum) |

**Fluxo recomendado:**

1. `GET /saude` → descobrir `ai.intencoes`
2. Classificar intenção → 1 rota `/ai/*` ou API comum
3. Responder com `summary`; incluir `data` no Gemini só quando necessário

---

## 6. Integração Hub

### Variáveis `.env`

```env
ROADLEARN_API_KEY=…
HUB_ROADLEARN_URL=http://150.230.230.89:8002
HUB_DINHEIRO_URL=…
HUB_TASKS_URL=…
HUB_TREINOS_URL=…
GEMINI_API_KEY=…
```

### Exemplo: Personal AI

```http
GET http://host:8002/api/v1/ai/proximo
Authorization: Bearer <ROADLEARN_API_KEY>
```

### Exemplo: Tasks criar lembrete de revisão

```http
GET /api/v1/ai/revisao?limite=3
```

Se `data.total > 0`, Tasks pode `POST` em seu próprio `/api/v1/tarefas/` com `origem: "road-learn"`, `origem_id: "revisao:{tarefaId}"`.

---

## 7. Limites e anti-padrões (camada IA)

| Item | Limite |
|------|--------|
| `alternativas` em `/ai/proximo` | máx. 2 |
| `revisao?limite` | máx. 10 |
| `competencias` em resumos | máx. 5 |
| Cache aceitável | 30–60 s |

**Evitar:**

- Usar `GET /roadmaps` na IA quando `GET /ai/progresso` ou `/ai/roadmap/{id}/resumo` bastam
- Usar `GET /analytics` na IA quando `GET /ai/resumo-semana` ou `/ai/hoje` bastam
- Duplicar lógica de elegibilidade (80%) ou seleção de próxima tarefa no Gemini

---

## 8. Referência rápida (todas as rotas)

```http
# Sistema
GET  /api/v1/saude
GET  /api/v1/csrf
GET  /api/v1/analytics
GET  /api/v1/timer

# IA
GET  /api/v1/ai/proximo
GET  /api/v1/ai/proximo?roadmap={id}
GET  /api/v1/ai/progresso
GET  /api/v1/ai/progresso?roadmap={id}
GET  /api/v1/ai/resumo-semana
GET  /api/v1/ai/hoje
GET  /api/v1/ai/revisao?limite=5
GET  /api/v1/ai/roadmap/{id}/resumo
GET  /api/v1/ai/roadmap/{id}/elegibilidade-projeto

# Roadmaps
GET    /api/v1/roadmaps
POST   /api/v1/roadmaps
GET    /api/v1/roadmaps/{id}
PUT    /api/v1/roadmaps/{id}
DELETE /api/v1/roadmaps/{id}
POST   /api/v1/roadmaps/import
POST   /api/v1/roadmaps/gerar/preview
POST   /api/v1/roadmaps/gerar

# Competências
POST   /api/v1/roadmaps/{id}/competencias
PUT    /api/v1/roadmaps/{id}/competencias/{cid}
DELETE /api/v1/roadmaps/{id}/competencias/{cid}

# Tarefas
POST   /api/v1/roadmaps/{id}/tarefas
PUT    /api/v1/roadmaps/{id}/tarefas/reordenar
PUT    /api/v1/roadmaps/{id}/tarefas/{tid}
DELETE /api/v1/roadmaps/{id}/tarefas/{tid}
POST   /api/v1/roadmaps/{id}/tarefas/{tid}/tempo
POST   /api/v1/roadmaps/{id}/tarefas/{tid}/timer/iniciar
POST   /api/v1/roadmaps/{id}/tarefas/{tid}/timer/parar
PUT    /api/v1/roadmaps/{id}/tarefas/{tid}/mover
POST   /api/v1/roadmaps/{id}/tarefas/{tid}/subtarefas
PUT    /api/v1/roadmaps/{id}/tarefas/{tid}/subtarefas/{sid}
DELETE /api/v1/roadmaps/{id}/tarefas/{tid}/subtarefas/{sid}

# Sidebar
GET    /api/v1/sidebar
POST   /api/v1/sidebar/grupos
PUT    /api/v1/sidebar/grupos/reordenar
PUT    /api/v1/sidebar/grupos/{grupo_id}
DELETE /api/v1/sidebar/grupos/{grupo_id}
PUT    /api/v1/sidebar/atribuicoes/{roadmap_id}
PUT    /api/v1/sidebar/reordenar

# Perfil
GET    /api/v1/profile
POST   /api/v1/profile/rebuild
PATCH  /api/v1/profile/identidade

# Projetos finais
GET    /api/v1/projetos-finais?roadmapId={id}
POST   /api/v1/projetos-finais
GET    /api/v1/projetos-finais/{id}
PUT    /api/v1/projetos-finais/{id}
DELETE /api/v1/projetos-finais/{id}
PUT    /api/v1/projetos-finais/{id}/itens
POST   /api/v1/projetos-finais/sugerir-topicos
POST   /api/v1/projetos-finais/gerar

# Projetos integrados
GET    /api/v1/projetos-integrados
POST   /api/v1/projetos-integrados
GET    /api/v1/projetos-integrados/{id}
PUT    /api/v1/projetos-integrados/{id}
DELETE /api/v1/projetos-integrados/{id}
PUT    /api/v1/projetos-integrados/{id}/itens
POST   /api/v1/projetos-integrados/sugerir-topicos
POST   /api/v1/projetos-integrados/gerar

# Backup
GET    /backup/
```

---

## 9. Implementação (referência de código)

| Camada | Arquivo |
|--------|---------|
| Rotas | `api/urls.py` |
| Views comuns | `api/views.py` |
| Views IA | `api/ai_views.py` |
| Serviços IA | `roadmaps/ai_services.py` |
| Persistência | `roadmaps/persist.py`, `roadmaps/services.py` |
| Analytics | `roadmaps/analytics.py` |
| Projetos + Gemini | `projetos/services.py`, `projetos/ia.py` |
| Testes IA | `tests/test_ai_api.py` |

Documentação relacionada: [CAPACIDADES.md](./CAPACIDADES.md), [padrao_desenvolvimento.md](./padrao_desenvolvimento.md), [GERAR_ROADMAP.md](./GERAR_ROADMAP.md).
