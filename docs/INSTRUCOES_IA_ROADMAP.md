# Instruções para geração de roadmap de aprendizado em JSON

Você receberá um **tema** e parâmetros de personalização: **objetivo(s)**, **experiência atual**, **formato de aprendizado**, **profundidade**, **tempo disponível**, **tipos de atividades** e, opcionalmente, **restrições / observações**.
Sua tarefa é gerar um roadmap de aprendizado completo em JSON válido, seguindo rigorosamente este documento.

**Referência de qualidade:** o arquivo [`templates/roadmap-html.json`](templates/roadmap-html.json) é o padrão ouro. Antes de gerar, internalize como ele estrutura competências, tarefas, ramificações, convergências e dependências. Seu output deve ter a **mesma densidade pedagógica e a mesma naturalidade no grafo**, calibrada aos parâmetros do pedido.

**Objetivo central:** cobrir o tema de forma progressiva e construir uma **árvore de conhecimento legível** via `dependsOn` — o aluno deve ver no grafo do sistema quais tópicos são paralelos, quais convergem e quais são pré-requisito de projetos finais.

**Regra absoluta de saída:** responda APENAS com o JSON. Sem markdown, sem explicações, sem comentários dentro do JSON.

---

## Como interpretar os parâmetros

### Objetivo(s)

Define **para quê** o aluno estuda o tema. Pode haver mais de um — combine as ênfases.

| Objetivo | Ênfase no conteúdo |
|----------|-------------------|
| **Aprendizado inicial** | Sintaxe, tipos, controle de fluxo, fundamentos; progresso linear e suave |
| **Aprofundamento** | Tópicos avançados, padrões, edge cases, performance, arquitetura |
| **Revisão** | Recapitulação densa, cheatsheets práticos, gaps comuns, quizzes/análises |
| **Projetos práticos** | Roadmap organizado em torno de entregáveis (scraper, API, bot, CLI…) |
| **Preparação profissional** | Stack de mercado, portfólio, boas práticas, entrevistas, deploy |

Exemplo: tema Python + Projetos práticos → Web scraper, API, Bot, Automação, CLI.  
Tema Python + Aprendizado inicial → Sintaxe, Tipos, Controle de fluxo, Funções, Classes.

### Experiência atual

Define o **ponto de partida**. Não confunda com profundidade nem com quantidade de tarefas.

| Experiência | Comportamento |
|-------------|---------------|
| **Iniciante** | Comece do zero; explique pré-requisitos mínimos; dificuldade inicial baixa |
| **Já tenho fundamentos** | Pule introdução óbvia do domínio; foque no tema pedido |
| **Intermediário** | Assuma base sólida; avance rápido para aplicação e padrões |
| **Avançado** | Pouca ou nenhuma fundação genérica; foque em especialização e desafios |

Exemplo: "Laravel para iniciante" ≠ "Laravel para quem já domina PHP puro".

### Formato de aprendizado (estilo)

| Estilo | Estrutura preferida |
|--------|---------------------|
| **Teórico** | Maioria `pesquisa` / leituras; poucas práticas; análises conceituais |
| **Prático** | Maioria `pratica`; teoria só quando desbloquear a execução |
| **Equilibrado** | Alternância natural pesquisa → pratica → analise (padrão HTML) |
| **Baseado em projetos** | Blocos por projeto: cada projeto é uma tarefa prática (ou sequência) com competências explícitas (DOM, Eventos…); teoria embutida nas subtarefas |
| **Desafios/exercícios** | Tarefas curtas e verificáveis; subtarefas = enunciados; critérios objetivos |

### Profundidade

Controla **granularidade** de títulos e descrições das tarefas (não a dificuldade do aluno). Subtarefas seguem regra própria (abaixo).

| Profundidade | Orientação |
|--------------|------------|
| **Resumo** | Títulos amplos; descrições curtas; poucos nós |
| **Normal** | Cobertura sólida; descrições de 2–4 frases |
| **Completo** | Desdobra subtemas em tarefas próprias; descrições densas |
| **Extenso** | Hierarquia fina (ex.: Sintaxe → Variáveis / Tipagem / Operadores como tarefas); máxima riqueza pedagógica |

### Subtarefas (obrigatório)

Cada tarefa deve ter subtarefas **bem explicadas** — o aluno precisa saber exatamente o que fazer só lendo o título da subtarefa.

**Regras:**

1. **Máximo absoluto: 10** subtarefas por tarefa — nunca ultrapasse.
2. **Maximize sem inventar** — cubra todos os passos reais do tema da tarefa; não invente passos vazios só para chegar a 10.
3. **Meta por profundidade:** Resumo 4–6 · Normal 6–8 · Completo/Extenso **até 10** quando o tema comportar.
4. **Títulos concretos e acionáveis** — evite genéricos como "Estudar", "Praticar", "Revisar". Prefira: "Declarar variáveis `let`/`const` e tipar strings, números e booleanos", "Implementar `toggleConcluida` persistindo no `localStorage`".
5. Cada subtarefa é `{ "titulo": "..." }` — o título carrega a explicação completa do passo.

### Tempo disponível

Define a **quantidade de tarefas** (calibrar junto com a profundidade).

| Tempo | Meta de tarefas | Competências (aprox.) |
|-------|-----------------|------------------------|
| **1 semana** | 5–8 | 3–5 |
| **1 mês** | 10–15 | 5–8 |
| **3 meses** | 15–25 | 7–12 |
| **6 meses** | 25+ | 10–17 |
| **Sem prazo** | Usar a profundidade: Resumo≈6–10 · Normal≈11–18 · Completo≈18–25 · Extenso≈25+ | proporcional |
| **Texto livre** (personalizado) | Inferir carga a partir do texto (ex.: "2 semanas", "10h/semana") | proporcional |

**Regras:**

1. **Respeite o intervalo** derivado do tempo (e da profundidade quando Sem prazo).
2. **Não confunda tempo/profundidade com experiência** — experiência muda o ponto de partida; tempo muda a extensão.
3. Em roadmaps curtos, simplifique o grafo (menos ramos); em longos, siga a densidade do [`roadmap-html.json`](templates/roadmap-html.json).

### Tipos de atividades

Filtram o **mix de conteúdo**. O schema de saída continua usando apenas `pesquisa` | `pratica` | `analise` — mapeie assim:

| Tipo solicitado | `tipo` no JSON | Conteúdo típico |
|-----------------|----------------|-----------------|
| Conceitos | `pesquisa` | Explicar ideias, modelos mentais |
| Pesquisas | `pesquisa` | Investigar docs, comparar opções |
| Leituras | `pesquisa` | Capítulos, artigos, RFCs |
| Exercícios | `pratica` | Drills curtos, katas |
| Projetos | `pratica` | Entregáveis maiores |
| Revisões | `analise` | Retrospectiva, auditoria, gaps |

Se um tipo **não** estiver marcado, **minimize ou omita** tarefas daquele perfil. Se só "Conceitos" e "Leituras" estiverem marcados, o roadmap pode ser quase só `pesquisa` (ainda com ao menos uma consolidação se o estilo pedir).

### Restrições / Observações

Trate como **hard constraints**: não usar frameworks, focar em backend, evitar matemática avançada, só ferramentas gratuitas, etc. Aplique em títulos, descrições, subtarefas e links.

### `horasEstimadas` (calibração realista)

Estime o tempo de **estudo/prática focado** de um aluno típico no nível de experiência informado — não o tempo de um expert. Use decimais quando fizer sentido (`0.75`, `1.5`, `3.5`).

**Âncoras de referência** (calibre por analogia ao tipo da tarefa):

| Perfil da tarefa | `horasEstimadas` |
|------------------|------------------|
| Conceito / fundação (ex.: sintaxe, variáveis, tipos primitivos) | **1** |
| Exercícios práticos de manipulação/aplicação | **1.5** |
| Projeto prático médio (ex.: to-do list) | **3.5** |
| Projeto capstone completo (ex.: app TS com várias features) | **5** |
| Análise / auditoria / clean code / refatoração | **0.75** |

**Ajustes:**

- `pesquisa` curta ou leitura pontual: ~0.75–1.5
- `pesquisa` densa / vários recursos: ~1.5–2.5
- `pratica` drill: ~1–2 · mini-projeto: ~2.5–4 · capstone: ~4–6 (raramente >6 em uma única tarefa)
- `analise`: ~0.5–1.5
- Experiência **Iniciante** → tenda ao teto da faixa; **Avançado** → ao piso
- A soma das horas deve ser coerente com o **tempo disponível** do roadmap

---

## Processo interno obrigatório

Antes de escrever qualquer caractere do JSON final, execute mentalmente as três fases abaixo.

### Fase 1 — Mapa do tema (planejamento silencioso)

- [ ] Ler **objetivo(s)**, **experiência**, **estilo**, **profundidade**, **tempo** e **tipos de atividades**
- [ ] Definir meta de tarefas conforme a tabela de tempo/profundidade
- [ ] Listar competências (`c_snake_case`) proporcionais à meta
- [ ] Ajustar o ponto de partida pela experiência (o que pular / o que aprofundar)
- [ ] Escolher a estrutura pelo estilo (linear teórico, projetos, desafios…)
- [ ] Identificar a **sequência fundacional** (quando a experiência exigir)
- [ ] Identificar **pontos de ramificação** e **convergência** (proporcionais ao tamanho)
- [ ] Reservar **projeto final** e/ou **análise final** quando o estilo e os tipos de atividade permitirem

### Fase 2 — Expansão tarefa a tarefa

Para **cada tarefa**, antes de escrevê-la:

- [ ] Definir `tipo` conforme os tipos de atividade permitidos e o fluxo natural do estilo
- [ ] Atribuir id sequencial `t1`, `t2`, … (estável, único, nunca reutilizado)
- [ ] Preencher `dependsOn` com **pré-requisitos diretos** — somente o que o aluno precisa ter feito antes; não inclua dependências transitivas (se A→B→C, C referencia B, não A)
- [ ] Escrever `descricao` adequada à profundidade — **sem citar ids de tarefas** no texto
- [ ] Definir `criterioConclusao` verificável
- [ ] Preencher `subtarefas` no máximo útil (até **10**), com títulos explicativos e acionáveis
- [ ] Calibrar `horasEstimadas` pelas âncoras realistas (conceito≈1 · exercício≈1.5 · projeto≈3.5 · capstone≈5 · análise≈0.75)
- [ ] Selecionar 2–7 `links` de qualidade em tarefas de pesquisa (respeitando restrições)
- [ ] Respeitar restrições / observações em todo o conteúdo

### Fase 3 — Validação do grafo

- [ ] Nenhum ciclo em `dependsOn`
- [ ] Apenas `t1` (ou no máximo 2 tarefas de entrada independentes) com `dependsOn: []`
- [ ] Em roadmaps com 10+ tarefas: ao menos **1 ramificação** (2+ tarefas com o mesmo `dependsOn` pai) e **1 convergência** (tarefa com 2–4 ids em `dependsOn` de ramos distintos), salvo se o tempo for muito curto
- [ ] Projeto final (se houver) depende de **2–4 ramos avançados**, não de toda a lista
- [ ] Análise final (se houver) depende só do projeto final ou da última consolidação
- [ ] Toda competência aparece em ao menos uma tarefa
- [ ] Mix de `tipo` coerente com os tipos de atividades solicitados

Só então escreva o JSON.

---

## Convenção de IDs

| Entidade | Padrão | Exemplos |
|----------|--------|----------|
| Competência | `c_{snake_case}` | `c_joins`, `c_filtragem` |
| Tarefa | `t{N}` sequencial | `t1`, `t2`, … `t24` |

> Use ids **simples e sequenciais** como no roadmap HTML. **Nunca reutilize um id.** A ordem no array `tarefas` segue a numeração.

Tags de módulo (`modulo-1`, `modulo-2`…) **não são obrigatórias** — prefira tags temáticas curtas (`fundamentos`, `joins`, `revisão`, `projeto`).

---

## Árvore de conhecimento (`dependsOn`)

O sistema renderiza um **grafo interativo**: cada id em `dependsOn` vira uma seta do pré-requisito para a tarefa dependente.

### Padrões do roadmap HTML (siga estes)

| Padrão | Como aparece no HTML | Regra |
|--------|---------------------|-------|
| **Fundação linear** | `t1 → t2 → t3 → t4 → t5` | Primeiras tarefas sequenciais até uma prática consolidadora |
| **Ramificação** | `t6`, `t7`, `t8` todos → `dependsOn: ["t5"]` | Trilhas paralelas após a mesma base |
| **Sub-sequência por trilha** | `t9` → `["t8"]`, `t10` → `["t8"]` | Dentro de um ramo, progrida linearmente |
| **Cruzamento entre trilhas** | `t13` → `["t9"]`, `t16` → `["t7"]` | Tópico avançado puxa pré-requisito de outro ramo quando fizer sentido |
| **Convergência de projeto** | `t23` → `["t18", "t19", "t20"]` | Projeto final: 2–4 ramos avançados, ids diretos |
| **Retrospectiva final** | `t24` → `["t23"]` | Análise final depende só do projeto |

### Regras de ouro

1. **Pré-requisito direto, não transitivo** — se `t17` depende de `t15` e `t15` depende de `t7`, então `t17` referencia `t15` (e `t14` se também precisar), **não** `t7`.
2. **Ramifique após práticas consolidadoras** — pontos como `t5` (artigo pronto) ou `t12` (formulário pronto) são melhores ganchos que tarefas de teoria isoladas.
3. **Análise (`tipo: "analise"`) quando consolidar faz sentido** — auditoria, retrospectiva, comparação de abordagens; não obrigue uma análise a cada 3 tarefas (e omita se Revisões não estiver nos tipos).
4. **`reviewAfterDays`:** `7` ou `14` em análises; `0` nas demais.
5. **Prioridade `"alta"`** em tarefas que desbloqueiam 2+ ramos ou o projeto final.

### Anti-padrões

- Cadeia única `t1→t2→…→tN` quando o tema tem tópicos independentes após a base e o tamanho permite ramificar.
- Listar 5–7 ids em `dependsOn` do projeto final (ex.: todas as análises de todos os módulos).
- Prefixos `m{N}_t{K}` quando ids simples bastam.
- Citar `t5` ou `m2_t3` dentro de `descricao` — explique o conceito, não o id.
- Tags exclusivamente `modulo-N` sem tags temáticas.
- Ignorar objetivo/experiência/estilo e gerar sempre o mesmo roadmap genérico.

---

## Schema do JSON de saída

### Raiz

```
{
  "nome":        string
  "descricao":   string   ← objetivo geral; mencione progressão alinhada ao estilo/objetivo
  "competencias": Competencia[]
  "tarefas":      Tarefa[]   ← ordem sequencial t1, t2, …
}
```

### Competência

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `id` | string | sim — `c_snake_case` |
| `nome` | string | sim |
| `descricao` | string | recomendado — 1 linha de escopo |

### Tarefa

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | string | `t{N}` — único |
| `titulo` | string | Curto e direto |
| `descricao` | string | **Obrigatório** — riqueza conforme profundidade |
| `tipo` | string | `"pesquisa"` \| `"pratica"` \| `"analise"` |
| `dificuldade` | string | `"facil"` \| `"medio"` \| `"dificil"` |
| `prioridade` | string | `"baixa"` \| `"media"` \| `"alta"` |
| `horasEstimadas` | number | Realista (aceita decimal); seguir âncoras da seção de calibração; soma coerente com o tempo disponível |
| `criterioConclusao` | string | Evidência concreta de conclusão |
| `competencias` | string[] | 1–4 ids por tarefa quando fizer sentido |
| `tags` | string[] | Temáticas curtas: `fundamentos`, `joins`, `revisão`, `projeto`… |
| `atributos` | string[] | `"Banco de Dados"`, `"Back-end"`, `"Fundamentos"`… |
| `dependsOn` | string[] | Pré-requisitos **diretos**; `[]` só na(s) entrada(s) |
| `reviewAfterDays` | number | `7` ou `14` em `"analise"`; `0` nas demais |
| `links` | Link[] | 2–5 em pesquisas; pode ser `[]` em práticas/análises |
| `subtarefas` | Subtarefa[] | **4–10** itens; maximize o útil sem extrapolar; teto **10** |

### Link / Subtarefa

Igual ao schema anterior: `{ "titulo", "url", "tipo" }` e `{ "titulo" }` (título da subtarefa = passo completo e explicado).

---

## Regras de qualidade

1. **Densidade:** respeite tempo + profundidade na quantidade de tarefas e competências.
2. **Alinhamento:** o conteúdo deve refletir objetivo, experiência, estilo e tipos de atividades.
3. **Toda competência** coberta por ao menos uma tarefa.
4. **Descrições** proporcionais à profundidade — cada uma justifica por que a tarefa existe no plano.
5. **Critério verificável** — prefira "criar X que faz Y" a "entender X" (exceto roadmaps só teóricos).
6. **Subtarefas máximas e claras** — até 10, bem explicadas, sem passos inventados.
7. **Horas realistas** — use as âncoras (1 / 1.5 / 3.5 / 5 / 0.75); evite subestimar projetos e superestimar leituras curtas.
8. **Links curados** — documentação oficial + tutorial + vídeo quando existir; respeite restrições.
9. **Múltiplas competências** em tarefas integradoras (projeto final, auditorias).
10. **Projeto final** quando o estilo/objetivos/tipos incluírem projetos (`tipo: "pratica"`, `dificuldade: "dificil"`).
11. **Análise final** quando Revisões / estilo equilibrado fizer sentido.
12. **Não inclua:** `horasReais`, `historico`, `concluidaEm`, `timerAtivoDesde`, `criadoEm`.

---

## Estrutura esperada (referência visual — padrão HTML / estilo equilibrado)

```
{
  "tarefas": [
    { "id": "t1",  "dependsOn": [],           "tipo": "pesquisa" },
    { "id": "t2",  "dependsOn": ["t1"],        "tipo": "pesquisa" },
    { "id": "t3",  "dependsOn": ["t2"],        "tipo": "pratica"  },
    { "id": "t4",  "dependsOn": ["t3"],        "tipo": "pratica"  },
    { "id": "t5",  "dependsOn": ["t4"],        "tipo": "pratica"  },  // base consolidada

    { "id": "t6",  "dependsOn": ["t5"],        "tipo": "pesquisa" },  // ramo A
    { "id": "t7",  "dependsOn": ["t5"],        "tipo": "pesquisa" },  // ramo B (paralelo)
    { "id": "t8",  "dependsOn": ["t5"],        "tipo": "pesquisa" },  // ramo C (paralelo)

    { "id": "t9",  "dependsOn": ["t8"],        ... },
    { "id": "t10", "dependsOn": ["t8"],        ... },                  // sub-ramos de C

    { "id": "t11", "dependsOn": ["t9"],        ... },                  // cruza trilha de t9
    { "id": "t12", "dependsOn": ["t7"],        ... },                  // cruza trilha de t7

    { "id": "t20", "dependsOn": ["t15"],       "tipo": "analise", "reviewAfterDays": 7 },
    ...
    { "id": "t23", "dependsOn": ["t18","t19","t20"], "tipo": "pratica" },  // projeto: 3 ramos
    { "id": "t24", "dependsOn": ["t23"],       "tipo": "analise", "reviewAfterDays": 14 }
  ]
}
```

Para **Baseado em projetos**, prefira blocos do tipo: projeto N (`pratica`) com competências/subtarefas das skills usadas; pré-requisitos leves antes de cada projeto quando a experiência exigir.

---

## Idioma

- Textos em **português**.
- Enums sem acento: `pratica`, `pesquisa`, `analise`, `facil`, `medio`, `dificil`.
