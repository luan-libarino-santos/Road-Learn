# API Road-Learn — camada para IA e Hub

> **Status:** implementado em `roadmaps/ai_services.py` + `api/ai_views.py` (rotas ativas em `/api/v1/ai/*`).

Especificação da camada **`/api/v1/ai/`** do Road-Learn (porta **8002**).

Objetivo: cada intenção do assistente ou de outro módulo do Hub se resolve em **1 chamada HTTP**, com **pouco JSON** e **sem carregar árvore inteira** de roadmaps/tarefas.

---

## 1. Problema hoje

A API genérica (`/roadmaps`, `/roadmaps/{id}`, `/analytics`, `/profile`) funciona para a SPA, mas é cara para consumo por IA:

| Intenção do usuário | Caminho atual | Custo |
|---------------------|---------------|-------|
| "O que devo estudar agora?" | `GET /roadmaps` → `GET /roadmaps/{id}` (N roadmaps) | Árvore completa, histórico, subtarefas, links |
| "Como está meu progresso?" | `GET /roadmaps` + cálculo na IA | Repete domínio/tarefas em cada roadmap |
| "Como foi minha semana?" | `GET /analytics` | Heatmap 84 dias, 8 semanas, progresso acumulado (~3–8 KB) |
| "Posso gerar projeto final?" | `GET /roadmaps/{id}` + regra 80% na IA | Lógica duplicada fora do backend |

A Personal AI e os demais módulos do Hub precisam de **respostas fechadas**, não de CRUDs para navegar.

---

## 2. Princípios de desempenho

| Princípio | Por quê |
|-----------|---------|
| **1 endpoint = 1 intenção** | Menos round-trips; roteador determinístico no assistente |
| **Resposta `summary` + `data`** | `summary` vai direto ao usuário; `data` só se o Gemini precisar elaborar |
| **Campos mínimos** | `id`, `titulo`, `status`, datas — sem anexos, HTML, histórico completo |
| **Janelas temporais nativas** | `hoje`, `semana`, `mes` como rotas ou query fixa, não filtros improvisados |
| **Comparações prontas** | "vs semana passada" calculado no servidor |
| **Snippets, não arquivos inteiros** | Trecho + score + path (padrão Arquivos no Hub) |
| **Erros estruturados** | `{ "ok": false, "code", "message" }` — IA não inventa |
| **Manifest de capacidades** | `GET /saude` lista o que o módulo oferece à IA |

### Envelope padrão

Toda rota `/api/v1/ai/*` retorna:

```json
{
  "ok": true,
  "summary": "Frase pronta para o usuário, em pt-BR.",
  "data": { }
}
```

- **`summary`**: 1–2 frases, factual, sem markdown pesado. O assistente pode repetir quase literalmente.
- **`data`**: payload mínimo para follow-up ou tool call. Pode ser omitido quando vazio.
- Campos extras no root (ex.: `roadmap`, `tarefa`) são permitidos **somente** quando reduzem aninhamento e continuam mínimos.

### Erros

```json
{
  "ok": false,
  "code": "ROADMAP_NAO_ENCONTRADO",
  "message": "Roadmap 'docker' não existe."
}
```

| HTTP | Quando |
|------|--------|
| 400 | Query inválida (`roadmap` inexistente, enum errado) |
| 404 | Recurso não encontrado |
| 503 | `GEMINI_API_KEY` ausente (rotas de geração IA) |

Códigos estáveis (`code`) para o roteador do assistente — não depender da string `message`.

---

## 3. Base, auth e manifest

### Base URL

```
http://<host>:8002/api/v1
```

Em produção, usar `HUB_ROADLEARN_URL` do `.env` dos outros módulos.

### Autenticação

| Consumidor | Header |
|------------|--------|
| Hub / Personal AI | `Authorization: Bearer <ROADLEARN_API_KEY>` |
| SPA (browser) | Sessão + CSRF (mutações) |

Rotas `/ai/*` são **somente leitura** (`GET`). `AllowAny` com API key opcional — mesma política monousuário do app.

### Manifest em `/saude`

Estender a resposta atual de `GET /api/v1/saude`:

```json
{
  "ok": true,
  "app": "road-learn",
  "armazenamento": "sqlite",
  "hub": { "dinheiro": "...", "treinos": "...", "tasks": "..." },
  "ai": {
    "versao": "1",
    "basePath": "/api/v1/ai",
    "intencoes": [
      { "id": "proximo", "metodo": "GET", "path": "/proximo", "descricao": "Próxima tarefa sugerida" },
      { "id": "progresso", "metodo": "GET", "path": "/progresso", "descricao": "Progresso global e por roadmap" },
      { "id": "resumo-semana", "metodo": "GET", "path": "/resumo-semana", "descricao": "Tempo e tarefas da semana vs anterior" },
      { "id": "hoje", "metodo": "GET", "path": "/hoje", "descricao": "Atividade do dia" },
      { "id": "revisao", "metodo": "GET", "path": "/revisao", "descricao": "Tarefas com revisão espaçada vencida" },
      { "id": "roadmap-resumo", "metodo": "GET", "path": "/roadmap/{id}/resumo", "descricao": "Snapshot enxuto de um roadmap" },
      { "id": "elegibilidade-projeto", "metodo": "GET", "path": "/roadmap/{id}/elegibilidade-projeto", "descricao": "Se pode gerar Projeto Final (≥80%)" }
    ]
  }
}
```

O assistente descobre capacidades com **1 GET** em `/saude` — sem hardcodar rotas por módulo.

---

## 4. Rotas `/api/v1/ai/*`

### 4.1 `GET /ai/proximo`

**Intenção:** "O que devo estudar agora?" / "Qual o próximo passo?"

**Query opcional:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `roadmap` | string | ID do roadmap. Se omitido, usa heurística global (ver abaixo) |

**Resposta 200:**

```json
{
  "ok": true,
  "summary": "Próximo: Docker — Redes (67% do roadmap). Tarefa liberada, prioridade alta.",
  "roadmap": {
    "id": "docker",
    "nome": "Docker",
    "progressoPct": 67,
    "dominioPct": 54
  },
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

**Regras de seleção (backend, determinísticas):**

1. Considerar apenas tarefas **não concluídas** e **não bloqueadas** (`dependsOn` satisfeito — reutilizar `tarefa_esta_bloqueada` em `roadmaps/normalize.py`).
2. Se `roadmap` informado: restringir a esse roadmap.
3. Se omitido: entre roadmaps com tarefas liberadas, preferir o de **menor progresso %** entre os que aparecem na sidebar (ordem de `SidebarAtribuicao`); empate → menor `ordem` da tarefa.
4. Ordenação da tarefa: revisão vencida (`reviewAfterDays` + `concluidaEm`) → `prioridade` (alta > média > baixa) → `dificuldade` (fácil primeiro para momentum) → `ordem`.
5. Retornar até **2 alternativas** (ids + título + motivo curto).
6. Se não houver tarefa liberada: `ok: true`, `summary` explicando (ex.: "Todas as tarefas de Docker estão bloqueadas ou concluídas."), `tarefa: null`.

**Ganho vs hoje:** 1 objeto (~400 B) em vez de roadmap inteiro (5–50 KB).

---

### 4.2 `GET /ai/progresso`

**Intenção:** "Como está meu progresso?" / "Quanto falta no Docker?"

**Query opcional:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `roadmap` | string | Se informado, detalha só esse roadmap |

**Resposta 200 (global):**

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
        "competenciasDestaque": [
          { "nome": "Networking", "dominioPct": 40 }
        ]
      }
    ]
  }
}
```

**Resposta 200 (`?roadmap=docker`):**

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

**Implementação:** reutilizar `calcular_dominio_geral`, `calcular_dominio_competencias` (`roadmaps/normalize.py`). Competências: top 3 por menor domínio (maior gap de estudo).

---

### 4.3 `GET /ai/resumo-semana`

**Intenção:** "Como foi minha semana?" / "Estudei mais que semana passada?"

Sem query — janela **segunda 00:00 → domingo 23:59** (timezone `America/Sao_Paulo`).

**Resposta 200:**

```json
{
  "ok": true,
  "summary": "Esta semana: 8,5 h e 14 tarefas concluídas (+2,5 h vs semana passada).",
  "data": {
    "periodo": { "inicio": "2026-08-11", "fim": "2026-08-17" },
    "atual": { "horas": 8.5, "tarefasConcluidas": 14 },
    "anterior": { "horas": 6.0, "tarefasConcluidas": 11 },
    "delta": { "horas": 2.5, "tarefasConcluidas": 3 },
    "porDia": [
      { "data": "2026-08-11", "rotulo": "Seg", "horas": 1.5, "concluidas": 2 }
    ],
    "roadmapsMaisAtivos": [
      { "id": "docker", "nome": "Docker", "tarefasConcluidas": 6, "horas": 4.0 }
    ]
  }
}
```

**Implementação:** extrair de `calcular_analytics_globais` apenas `comparacaoSemanal`, `diasDaSemana` e agregar por `roadmapId` — **não** retornar `heatmap`, `semanas[8]`, `progressoTempo`.

---

### 4.4 `GET /ai/hoje`

**Intenção:** "O que fiz hoje?" / "Quantas horas hoje?"

**Resposta 200:**

```json
{
  "ok": true,
  "summary": "Hoje: 1,5 h registradas, 2 tarefas concluídas. Timer ativo em 'Redes' (Docker).",
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

**Implementação:** `horasHoje` + tarefas com `concluidaEm` no dia + `GET /timer` enxuto.

---

### 4.5 `GET /ai/revisao`

**Intenção:** "O que preciso revisar?" (revisão espaçada)

**Query opcional:** `limite` (default 5, max 10)

**Resposta 200:**

```json
{
  "ok": true,
  "summary": "3 tarefas pedem revisão: Controllers (Laravel), Middleware, Rotas.",
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

**Regra:** tarefa concluída com `reviewAfterDays > 0` e `hoje > concluidaEm + reviewAfterDays`.

---

### 4.6 `GET /ai/roadmap/{id}/resumo`

**Intenção:** contexto mínimo de um roadmap sem árvore completa.

**Resposta 200:**

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
    "competencias": [
      { "nome": "Images", "dominioPct": 80 },
      { "nome": "Networking", "dominioPct": 40 }
    ],
    "proximaLiberada": { "id": "abc12", "titulo": "Redes" },
    "bloqueadas": 2,
    "revisaoPendente": 1
  }
}
```

---

### 4.7 `GET /ai/roadmap/{id}/elegibilidade-projeto`

**Intenção:** "Posso gerar o Projeto Final deste roadmap?"

**Resposta 200:**

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

**Implementação:** regra `PROGRESSO_MINIMO = 80` de `projetos/services.py` + checagem `ProjetoFinal` por `roadmap_id`.

---

## 5. Mapa intenção → rota (Personal AI)

| Pergunta do usuário | Rota | Enviar `data` ao Gemini? |
|---------------------|------|----------------------------|
| O que estudar agora? | `/ai/proximo` | Não — `summary` basta |
| Progresso geral | `/ai/progresso` | Só se pedir detalhe por skill |
| Progresso do Docker | `/ai/progresso?roadmap=docker` | Raramente |
| Como foi a semana? | `/ai/resumo-semana` | Não |
| O que fiz hoje? | `/ai/hoje` | Não |
| O que revisar? | `/ai/revisao` | Se lista > 3 itens |
| Fala do roadmap X | `/ai/roadmap/{id}/resumo` | Só se pergunta técnica |
| Posso fazer projeto final? | `/ai/roadmap/{id}/elegibilidade-projeto` | Não |

**Meta:** ≥ 80% das perguntas de estudo respondidas só com `summary`, sem segunda chamada ao Gemini.

---

## 6. API genérica vs camada AI

| | `/api/v1/roadmaps`, `/analytics`, … | `/api/v1/ai/*` |
|--|--------------------------------------|----------------|
| **Consumidor** | SPA React | Personal AI, Tasks, Hub |
| **Formato** | Recursos completos | Intenção + summary |
| **Tamanho** | KB a dezenas de KB | ~200 B – 2 KB |
| **Mutações** | POST/PUT/DELETE | Apenas GET |
| **Cache** | Curto / invalidação por mutação | Cache 30–60 s aceitável |

A SPA **não** migra para `/ai/*` — continua com endpoints ricos. A camada AI é paralela, não substituta.

---

## 7. Implementação sugerida

### 7.1 Arquivos

```
roadmaps/
  ai_views.py      # handlers finos (ou api/ai_views.py)
  ai_services.py   # proximo, progresso, resumo_semana, revisao, elegibilidade
api/
  urls.py          # path("ai/proximo", ...), prefixo ai/
```

### 7.2 Dependências internas (já existentes)

| Função / módulo | Uso |
|-----------------|-----|
| `listar_roadmaps()` | Fonte única de roadmaps |
| `tarefa_esta_bloqueada()` | Filtro de tarefas liberadas |
| `calcular_dominio_geral()` / `calcular_dominio_competencias()` | Progresso e domínio |
| `calcular_analytics_globais()` | Extrair fatias temporais |
| `projetos/services.py` | Elegibilidade projeto final |
| `sidebar` persist | Ordem de roadmaps ativos |

### 7.3 Rotas em `api/urls.py`

```python
path("ai/proximo", views.ai_proximo),
path("ai/progresso", views.ai_progresso),
path("ai/resumo-semana", views.ai_resumo_semana),
path("ai/hoje", views.ai_hoje),
path("ai/revisao", views.ai_revisao),
path("ai/roadmap/<str:roadmap_id>/resumo", views.ai_roadmap_resumo),
path("ai/roadmap/<str:roadmap_id>/elegibilidade-projeto", views.ai_elegibilidade_projeto),
```

### 7.4 Testes mínimos

- `test_ai_proximo_retorna_tarefa_liberada`
- `test_ai_proximo_roadmap_inexistente_404`
- `test_ai_progresso_global_e_filtrado`
- `test_ai_resumo_semana_delta`
- `test_ai_revisao_respeita_review_after_days`
- `test_saude_inclui_manifest_ai`

---

## 8. Integração Hub

### 8.1 Personal AI (router)

1. `GET {ROADLEARN}/api/v1/saude` → ler `ai.intencoes`
2. Classificar intenção do usuário → 1 rota `/ai/*`
3. Responder com `summary`; incluir `data` no prompt do Gemini só quando necessário

### 8.2 Tasks (exemplo)

Criar lembrete de revisão sem duplicar lógica:

```http
GET /api/v1/ai/revisao?limite=3
Authorization: Bearer <ROADLEARN_API_KEY>
```

Se `data.total > 0`, Tasks pode `POST /api/v1/tarefas/` com `origem: "road-learn"`, `origem_id: "revisao:{tarefaId}"`.

### 8.3 Variáveis `.env`

```env
ROADLEARN_API_KEY=...
HUB_ROADLEARN_URL=http://150.230.230.89:8002
```

---

## 9. Limites e anti-padrões

**Não fazer:**

- Retornar `tarefas[]` completo com `historico`, `subtarefas`, `links` em rotas `/ai/*`
- Expor `GET /ai/roadmaps` espelhando `GET /roadmaps` (duplicata sem ganho)
- Delegar comparação semanal ao Gemini com 2× `GET /analytics`
- Usar `?view=ai` em rotas genéricas **e** `/ai/*` ao mesmo tempo (escolher um — este doc adota prefixo `/ai/`)

**Limites:**

| Item | Valor |
|------|-------|
| `alternativas` em `/proximo` | máx. 2 |
| `revisao?limite` | máx. 10 |
| `competencias` em resumos | máx. 5 |
| `porRoadmap` em progresso global | todos os roadmaps da sidebar (tipicamente < 10) |

---

## 10. Roadmap de entrega

| Fase | Entrega | Impacto |
|------|---------|---------|
| **P0** | `/ai/proximo`, `/ai/progresso`, `/ai/resumo-semana` + manifest em `/saude` | Cobre 3 perguntas mais frequentes |
| **P1** | `/ai/hoje`, `/ai/revisao`, `/ai/roadmap/{id}/resumo` | Ritmo diário e revisão espaçada |
| **P2** | `/ai/roadmap/{id}/elegibilidade-projeto` | Integração com fluxo de projetos |
| **P3** | Cache leve + testes de contrato para Personal AI | Estabilidade em produção |

---

## 11. Referência rápida

```http
GET /api/v1/saude
GET /api/v1/ai/proximo
GET /api/v1/ai/proximo?roadmap=docker
GET /api/v1/ai/progresso
GET /api/v1/ai/progresso?roadmap=docker
GET /api/v1/ai/resumo-semana
GET /api/v1/ai/hoje
GET /api/v1/ai/revisao?limite=5
GET /api/v1/ai/roadmap/{id}/resumo
GET /api/v1/ai/roadmap/{id}/elegibilidade-projeto
```

Documentação relacionada: [CAPACIDADES.md](./CAPACIDADES.md) (domínio do produto), [padrao_desenvolvimento.md](./padrao_desenvolvimento.md) (padrão Hub).
