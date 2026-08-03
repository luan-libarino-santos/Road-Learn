# Como gerar roadmaps em JSON

Este guia explica o formato JSON aceito pelo sistema e como criar roadmaps completos (com **competências**, tarefas, dependências, critérios, tags, links tipados e revisão espaçada) sem cadastrar item a item na interface.

## Formas de importar

| Forma | Como |
|-------|------|
| **Interface** | Botão **⤓ JSON** na sidebar → colar JSON ou escolher arquivo `.json` |
| **API** | `POST /api/roadmaps/import` com body JSON |
| **Arquivo vivo** | Editar `data/roadmaps.json` (só se souber o que está fazendo) |

Templates:

- [`templates/roadmap.template.json`](templates/roadmap.template.json) — um roadmap enriquecido
- [`templates/roadmaps-lote.template.json`](templates/roadmaps-lote.template.json) — vários de uma vez

---

## Formatos aceitos no import

### 1. Um único roadmap (mais comum)

```json
{
  "nome": "Laravel",
  "descricao": "Fundamentos do framework",
  "competencias": [
    { "id": "c_routing", "nome": "Routing" },
    { "id": "c_controllers", "nome": "Controllers" }
  ],
  "tarefas": [ ... ]
}
```

### 2. Array de roadmaps

```json
[
  { "nome": "JS", "tarefas": [] },
  { "nome": "CSS", "tarefas": [] }
]
```

### 3. Envelope com chave `roadmaps`

```json
{
  "roadmaps": [
    { "nome": "JS", "tarefas": [] }
  ]
}
```

O sistema aceita **camelCase** e **snake_case** (ex.: `dependsOn` ou `depends_on`).

**Dica para dependências:** atribua `id` estáveis às tarefas (`"t1"`, `"t2"`…) e referencie esses ids em `dependsOn`.

**Dica para competências:** defina a lista na raiz do roadmap e referencie por `id` (ex.: `c_routing`) ou pelo **nome** (`"Routing"`) em cada tarefa.

---

## Schema completo

### Roadmap

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| `nome` | string | **sim** | — | Título na sidebar |
| `descricao` | string | não | `""` | Objetivo / contexto |
| `competencias` | array | **recomendado** | `[]` | Skills que o roadmap desenvolve |
| `tarefas` | array | não | `[]` | Lista ordenada |
| `id` | string | não | gerado | Identificador único |
| `criadoEm` | string ISO | não | agora | Timestamp |

### Competência

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | string | **sim** | Ex.: `Routing`, `Eloquent` |
| `id` | string | recomendado | Ex.: `c_routing` (estável para a IA) |
| `descricao` | string | não | Opcional |

Também aceita lista de strings: `"competencias": ["Routing", "Blade"]`.

### Tarefa

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| `titulo` | string | **sim** | — | Nome da tarefa |
| `descricao` | string | **recomendado** | `""` | Propósito da tarefa — o que ela desenvolve e por que é importante |
| `id` | string | recomendado* | gerado | *Use ids estáveis se houver `dependsOn` |
| `competencias` | string[] | **recomendado** | `[]` | Ids ou nomes das skills que a tarefa desenvolve |
| `tipo` | string | não | `"pratica"` | `pratica` \| `pesquisa` \| `analise` |
| `dificuldade` | string | não | `"medio"` | `facil` \| `medio` \| `dificil` |
| `prioridade` | string | não | `"media"` | `baixa` \| `media` \| `alta` |
| `horasEstimadas` | number | não | `0` | Estimativa (aceita decimal) |
| `prazo` | string | não | `""` | `YYYY-MM-DD` ou vazio |
| `criterioConclusao` | string | **recomendado** | `""` | Como saber que terminou de verdade |
| `observacoes` | string | não | `""` | Notas livres |
| `tags` | string[] | não | `[]` | Ex.: `["fundamentos","revisão"]` |
| `atributos` | string[] | **recomendado** | `[]` | Áreas da ficha: `["Back-end","Front-end"]` — alimentam o radar/XP |
| `dependsOn` | string[] | não | `[]` | Ids de tarefas pré-requisito |
| `reviewAfterDays` | number | não | `0` | Dias após conclusão para revisar (0 = off) |
| `concluida` | boolean | não | `false` | Já concluída? |
| `links` | array | não | `[]` | Recursos tipados |
| `subtarefas` | array | não | `[]` | Checklist |
| `ordem` | number | não | índice | Posição na lista |

Campos geridos pelo sistema (não precisa enviar na geração por IA):

| Campo | Descrição |
|-------|-----------|
| `horasReais` | Tempo realmente registrado (manual ou timer) |
| `historico` | Changelog (criada, concluída, tempo, etc.) |
| `concluidaEm` | Timestamp da conclusão |
| `timerAtivoDesde` | Timer em andamento |

Aliases aceitos: `depends_on`, `criterio_conclusao`, `review_after_days`, `horas_reais`.

### Link

| Campo | Tipo | Padrão | Valores |
|-------|------|--------|---------|
| `titulo` | string | `""` | — |
| `url` | string | `""` | — |
| `tipo` | string | `"outro"` | `video` \| `artigo` \| `doc` \| `repo` \| `outro` |
| `id` | string | gerado | — |

### Subtarefa

| Campo | Tipo | Padrão |
|-------|------|--------|
| `titulo` | string | `""` |
| `concluida` | boolean | `false` |
| `id` | string | gerado |

---

## Tipos de tarefa (`tipo`)

| Valor | Uso sugerido |
|-------|----------------|
| `pratica` | Exercícios, projetos, código hands-on |
| `pesquisa` | Leitura, vídeos, documentação, teoria |
| `analise` | Comparar opções, revisar, retrospectiva — combine com `reviewAfterDays` |

---

## Exemplo completo (competências + dependências)

```json
{
  "nome": "Laravel",
  "descricao": "Fundamentos até um CRUD sólido",
  "competencias": [
    { "id": "c_routing", "nome": "Routing" },
    { "id": "c_controllers", "nome": "Controllers" },
    { "id": "c_blade", "nome": "Blade" },
    { "id": "c_validation", "nome": "Validation" },
    { "id": "c_eloquent", "nome": "Eloquent" }
  ],
  "tarefas": [
    {
      "id": "t1",
      "titulo": "Rotas e controllers básicos",
      "descricao": "Entender como o Laravel recebe requisições HTTP e as direciona para controllers. Base para qualquer funcionalidade web no framework.",
      "tipo": "pesquisa",
      "horasEstimadas": 2,
      "criterioConclusao": "Criar 3 rotas REST com controllers",
      "competencias": ["c_routing", "c_controllers"],
      "dependsOn": [],
      "tags": ["fundamentos"]
    },
    {
      "id": "t2",
      "titulo": "Criar CRUD",
      "descricao": "Praticar o ciclo completo de criação, leitura, atualização e exclusão de registros usando Eloquent, Blade e validação do Laravel.",
      "tipo": "pratica",
      "horasEstimadas": 5,
      "criterioConclusao": "CRUD com validação e Blade funcionando",
      "competencias": ["c_routing", "c_controllers", "c_blade", "c_validation"],
      "dependsOn": ["t1"],
      "tags": ["prática"]
    },
    {
      "id": "t3",
      "titulo": "Revisão do CRUD",
      "descricao": "Consolidar o aprendizado identificando pontos fracos, gaps de entendimento e oportunidades de refatoração no código produzido.",
      "tipo": "analise",
      "horasEstimadas": 1,
      "criterioConclusao": "Resumo + 3 gaps listados",
      "competencias": ["c_routing", "c_controllers", "c_blade", "c_validation"],
      "dependsOn": ["t2"],
      "reviewAfterDays": 7,
      "tags": ["revisão"]
    }
  ]
}
```

**Como o domínio é calculado:** para cada competência, peso das tarefas concluídas ÷ peso total (peso = `horasEstimadas`, mínimo 1). Ex.: se “Routing” aparece em 2 tarefas de 2h e 5h e só a de 2h está feita → domínio ≈ 29%.

No app, `t2` fica **bloqueada** até `t1`; o painel de competências mostra barras de domínio; o grafo mostra a progressão.

---

## Boas práticas ao montar um roadmap

1. **Descrição da tarefa sempre** — descreva o propósito: o que a tarefa desenvolve e por que ela está no plano.
2. **Critério de conclusão sempre** — evita marcar como feito sem evidência de aprendizado.
2. **Dependências reais** — só bloqueie o que for pré-requisito lógico.
3. **Ids estáveis** (`t1`, `t2`…) quando houver `dependsOn`.
4. **Alterne tipos** — pesquisa → prática → análise.
5. **Tags curtas** — `fundamentos`, `avançado`, `revisão`.
6. **Links tipados** — facilita escolher vídeo curto vs. doc longa.
7. **`reviewAfterDays` em análises** — 3, 7 ou 14 dias costumam funcionar bem.
8. **Prioridade alta** nas tarefas liberadas que destravam o restante do plano.

### Densidade sugerida

| Nível | Tarefas | Subtarefas por tarefa |
|-------|---------|------------------------|
| Curto (1–2 semanas) | 4–8 | 2–4 |
| Médio (1 mês) | 8–15 | 2–5 |
| Longo (trimestre) | 15–30 | 2–6 |

---

## Geração avançada por módulos (máximo detalhe, mínimo de tokens)

A abordagem modular divide a geração em **duas fases conversacionais**. Na Fase 1 a IA entrega apenas a estrutura de módulos (barato em tokens). Na Fase 2 ela expande cada módulo em tarefas completas, já cruzando dependências entre módulos. O resultado é mais rico e coerente do que gerar tudo de uma vez.

```
┌─────────────────────────────────────────────────┐
│  FASE 1 — Planejamento de módulos               │
│  Entrada: tema, nível, duração                  │
│  Saída: lista de módulos com ids e competências │
└────────────────────┬────────────────────────────┘
                     │ (barato em tokens)
                     ▼
┌─────────────────────────────────────────────────┐
│  FASE 2 — Expansão por módulo                   │
│  Entrada: lista de módulos + to-do interno      │
│  Saída: JSON completo com dependências cruzadas │
└─────────────────────────────────────────────────┘
```

### Fase 1 — Planejamento de módulos

Envie este prompt primeiro. A IA responde apenas com a estrutura, sem gerar tarefas.

```
Você vai criar um roadmap de aprendizado sobre [TEMA].
Nível: [iniciante | intermediário | avançado]
Duração: [ex.: 6 semanas]

FASE 1 — planejamento de módulos:
Quebre o conteúdo em módulos lógicos de aprendizado (mínimo 3, máximo 8).
Para cada módulo responda em JSON com este formato (somente isso, sem tarefas ainda):

{
  "modulos": [
    {
      "id": "m1",
      "nome": "Nome do módulo",
      "descricao": "O que o aluno domina ao concluir este módulo",
      "competencias": ["id_competencia_1", "id_competencia_2"],
      "dependeDeModulos": []
    }
  ],
  "competencias": [
    { "id": "id_competencia_1", "nome": "Nome da competência" }
  ]
}

Regras:
- Ids de módulo: "m1", "m2", … (estáveis, serão referenciados na Fase 2).
- Ids de competência: snake_case prefixado com "c_" (ex.: "c_routing").
- "dependeDeModulos": lista de ids de módulos que devem ser concluídos antes.
- Responda APENAS com o JSON, sem markdown.
```

### Fase 2 — Expansão em tarefas (com to-do interno)

Após receber a lista de módulos, envie esta instrução. A IA usa o to-do interno para percorrer cada módulo sistematicamente antes de gerar o JSON final.

```
Agora execute a FASE 2 com o seguinte processo interno (to-do por módulo):

Para CADA módulo da lista acima, faça mentalmente:
  [ ] Listar as tarefas necessárias para cobrir as competências do módulo
  [ ] Definir a sequência interna (dependsOn entre tarefas do mesmo módulo)
  [ ] Verificar quais tarefas de OUTROS módulos são pré-requisito (dependsOn cruzado)
  [ ] Garantir pelo menos um ciclo pesquisa → prática → análise por módulo
  [ ] Atribuir criterioConclusao objetivo para cada tarefa

Regras de ids:
- Tarefas: "m{N}_t{K}" — ex.: "m1_t1", "m1_t2", "m2_t1" (nunca reutilize ids).
- Isso torna óbvio o módulo de origem de cada tarefa e facilita dependências cruzadas.

Regras de dependências cruzadas:
- A primeira tarefa de um módulo que depende de outro módulo DEVE referenciar
  a tarefa de análise (revisão) do módulo anterior em "dependsOn".
- Exemplo: m2_t1 → dependsOn: ["m1_t3"] (t3 sendo a análise final do módulo 1).

Regras do schema (cada tarefa DEVE ter):
- "id" (padrão m{N}_t{K})
- "titulo"
- "descricao" — o que a tarefa desenvolve, por que é importante, o que será praticado
- "tipo": "pratica" | "pesquisa" | "analise"
- "dificuldade": "facil" | "medio" | "dificil"
- "prioridade": "baixa" | "media" | "alta"
- "horasEstimadas" (número)
- "criterioConclusao" (evidência concreta de aprendizado)
- "competencias" (array de ids de competências que a tarefa desenvolve)
- "tags" — inclua sempre a tag do módulo (ex.: "modulo-1") e tags temáticas
- "atributos" (áreas: "Back-end", "Front-end", "Banco de Dados", "DevOps", "Fundamentos"…)
- "dependsOn" (ids de pré-requisitos; [] se nenhum)
- "reviewAfterDays" (7 ou 14 em tarefas "analise"; 0 nas demais)
- "links" (array de { "titulo", "url", "tipo": "video"|"artigo"|"doc"|"repo"|"outro" })
- "subtarefas" (array de { "titulo" } — passos concretos, 2 a 5 por tarefa)

Formato de saída — JSON único e válido, sem markdown, sem comentários:
{
  "nome": "[TEMA]",
  "descricao": "...",
  "competencias": [ /* lista completa da Fase 1 */ ],
  "tarefas": [ /* todas as tarefas de todos os módulos, em ordem de módulo */ ]
}

Não inclua: horasReais, historico, concluidaEm, timerAtivoDesde, criadoEm.
Responda APENAS com o JSON.
```

### Por que esta abordagem é mais eficiente

| Aspecto | Geração única | Abordagem modular |
|---------|---------------|-------------------|
| Risco de omitir tópicos | Alto (tudo de uma vez) | Baixo (módulo a módulo) |
| Dependências cruzadas | Raramente aparecem | Garantidas pela regra `m{N}_t{K}` |
| Ciclo pesquisa → prática → análise | Inconsistente | Exigido por módulo |
| Custo de revisão/regeção | Alto (reescrever tudo) | Baixo (reprocessar só o módulo) |
| Tokens gastos no total | Mais (prompts maiores sem estrutura) | Menos (Fase 1 guia Fase 2) |

### Dica: regenerar apenas um módulo

Se um módulo saiu incompleto, regenere-o isoladamente:

```
Regenere APENAS as tarefas do módulo "m3 — [nome do módulo]" seguindo as mesmas
regras de ids (m3_t1, m3_t2, …) e referenciando a tarefa de análise final do módulo
anterior em dependsOn. Responda só com o array de tarefas do m3, JSON puro.
```

Depois mescle o array no JSON completo antes de importar.

---

## Prompt simples para IA gerar o JSON

Para roadmaps menores ou quando não for necessária a abordagem modular, copie e adapte:

```
Gere um roadmap de aprendizado em JSON válido, sem markdown e sem comentários.

Regras do schema:
- Raiz: "nome", "descricao", "competencias" (array) e "tarefas" (array).
- Cada competência: "id" estável (ex.: "c_routing") e "nome" (ex.: "Routing").
- Cada tarefa DEVE ter:
  - "id" estável ("t1", "t2", …)
  - "titulo"
  - "descricao" (obrigatório — explique o propósito da tarefa: o que ela desenvolve, por que é importante e o que o aluno vai aprender ou praticar)
  - "tipo": "pratica" | "pesquisa" | "analise"
  - "dificuldade": "facil" | "medio" | "dificil"
  - "prioridade": "baixa" | "media" | "alta"
  - "horasEstimadas" (número)
  - "criterioConclusao" (frase clara: como saber que terminei)
  - "competencias" (array de ids de skills que a tarefa desenvolve)
  - "tags" (array de strings curtas)
  - "atributos" (áreas da ficha: "Back-end", "Front-end", "Banco de Dados", "DevOps", "Fundamentos"…)
  - "dependsOn" (array de ids de tarefas pré-requisito; [] se nenhuma)
  - "reviewAfterDays" (número; use 7 ou 14 em tarefas tipo "analise", 0 nas outras)
  - "links" (array de { "titulo", "url", "tipo": "video"|"artigo"|"doc"|"repo"|"outro" })
  - "subtarefas" (array de { "titulo" })
- Cubra todas as competências com pelo menos uma tarefa.
- Não inclua: horasReais, historico, concluidaEm, timerAtivoDesde, criadoEm.
- Alternar tipos; subtarefas concretas; dependências coerentes.
- Responder APENAS com o JSON.

Tema: [DESCREVA O TEMA AQUI]
Nível: [iniciante | intermediário | avançado]
Duração aproximada: [ex.: 4 semanas]
Idioma dos títulos: português
```

Cole a resposta no botão **⤓ JSON** ou salve como `.json` e importe o arquivo.

---

## API: `POST /api/roadmaps/import`

```http
POST /api/roadmaps/import
Content-Type: application/json
```

**Sucesso (201):**

```json
{
  "quantidade": 1,
  "avisos": [],
  "roadmaps": [ { "id": "...", "nome": "...", "tarefas": [ ... ] } ]
}
```

### PowerShell

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/roadmaps/import" `
  -ContentType "application/json" `
  -InFile "docs\templates\roadmap.template.json"
```

---

## Erros comuns

| Sintoma | Causa | Correção |
|---------|-------|----------|
| “JSON inválido” | Vírgula sobrando / aspas simples | Validar em linter JSON |
| “precisa de um 'nome'” | `nome` vazio | Preencher |
| “precisa de um 'titulo'” | Tarefa sem título | Toda tarefa precisa de `titulo` |
| Dependência não bloqueia | `dependsOn` com id inexistente | Use os mesmos `id` das tarefas |
| “Tarefa bloqueada…” | Tentou concluir sem pré-requisito | Conclua as dependências antes |
| Tipo de link vira Outro | Valor fora do enum | Use `video`/`artigo`/`doc`/`repo`/`outro` |

---

## Hierarquia mental

```
Roadmap
 ├── competencias[]          ← skills / domínio (ex.: Routing, Eloquent)
 └── tarefas[]
      ├── descricao          ← propósito da tarefa (o que desenvolve e por que)
      ├── competencias[]     ← quais skills esta tarefa desenvolve
      ├── dependsOn[]        ← pré-requisitos (grafo / bloqueio)
      ├── criterioConclusao  ← evidência de aprendizado
      ├── tags / prioridade / dificuldade
      ├── reviewAfterDays    ← revisão espaçada
      ├── links[] (tipados)
      ├── subtarefas[]
      ├── horasReais + timer ← acompanhamento
      └── historico[]        ← linha do tempo
```

**Progresso por tarefas** ≠ **domínio por competências**. O segundo responde melhor a: “quanto eu realmente sei de Laravel?”.