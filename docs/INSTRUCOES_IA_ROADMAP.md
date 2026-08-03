# Instruções para geração de roadmap de aprendizado em JSON

Você receberá um **tema**, **nível**, **duração** e **porte** (e possivelmente detalhes adicionais).
Sua tarefa é gerar um roadmap de aprendizado completo em JSON válido, seguindo rigorosamente este documento.

**Referência de qualidade:** o arquivo [`templates/roadmap-html.json`](templates/roadmap-html.json) é o padrão ouro. Antes de gerar, internalize como ele estrutura competências, tarefas, ramificações, convergências e dependências. Seu output deve ter a **mesma densidade pedagógica e a mesma naturalidade no grafo**.

**Objetivo central:** cobrir o tema de forma progressiva e construir uma **árvore de conhecimento legível** via `dependsOn` — o aluno deve ver no grafo do sistema quais tópicos são paralelos, quais convergem e quais são pré-requisito de projetos finais.

**Regra absoluta de saída:** responda APENAS com o JSON. Sem markdown, sem explicações, sem comentários dentro do JSON.

---

## Porte do roadmap

O **porte** define quantas tarefas o roadmap deve ter. Calibre competências, ramificações e profundidade pedagógica conforme o porte informado no prompt:

| Porte | Tarefas | Orientação |
|-------|---------|------------|
| **Pequeno** | 5–10 | Introdução rápida ou tópico focado; fundação linear com no máximo 1 ramificação curta |
| **Médio** | 11–20 | Cobertura sólida do tema com ramificações e ao menos 1 convergência |
| **Grande** | 21+ | Tema amplo (básico ao avançado): múltiplas trilhas, convergências, projeto final e análise retrospectiva |

**Regras:**

1. **Respeite o intervalo** — se o porte for **Pequeno**, entregue entre 5 e 10 tarefas; não extrapole.
2. **Não confunda porte com dificuldade** — porte mede extensão (quantidade de tarefas), não o nível do aluno.
3. **Estrutura proporcional** — em porte **Pequeno**, simplifique o grafo (menos ramos, menos competências); em porte **Grande**, siga a densidade do [`roadmap-html.json`](templates/roadmap-html.json) (20 ou mais tarefas).

---

## Processo interno obrigatório

Antes de escrever qualquer caractere do JSON final, execute mentalmente as três fases abaixo.

### Fase 1 — Mapa do tema (planejamento silencioso)

- [ ] Confirmar o **porte** solicitado e definir a meta de tarefas (Pequeno: 5–10 | Médio: 11–20 | Grande: 21+)
- [ ] Listar competências (`c_snake_case`) proporcionais ao porte — de 3–6 (Pequeno) a 8–17 (Grande)
- [ ] Identificar a **sequência fundacional** (2–4 tarefas lineares iniciais que todo aluno precisa)
- [ ] Identificar **pontos de ramificação**: após qual(is) tarefa(s) de prática consolidada o tema se divide em trilhas paralelas?
- [ ] Identificar **pontos de convergência**: projetos, práticas integradoras ou análises que exigem 2–4 ramos distintos
- [ ] Mapear dependências cruzadas entre trilhas (ex.: performance depende de imagens **e** de semântica)
- [ ] Reservar **projeto final** + **análise final retrospectiva** para o encerramento

### Fase 2 — Expansão tarefa a tarefa

Para **cada tarefa**, antes de escrevê-la:

- [ ] Definir tipo (`pesquisa` → `pratica` → `analise` conforme o fluxo natural — **não force** um ciclo rígido por bloco artificial)
- [ ] Atribuir id sequencial `t1`, `t2`, … (estável, único, nunca reutilizado)
- [ ] Preencher `dependsOn` com **pré-requisitos diretos** — somente o que o aluno precisa ter feito antes; não inclua dependências transitivas (se A→B→C, C referencia B, não A)
- [ ] Escrever `descricao` rica: o que desenvolve, por que importa, o que será produzido — **sem citar ids de tarefas** no texto
- [ ] Definir `criterioConclusao` verificável e `subtarefas` acionáveis (3–10 passos)
- [ ] Selecionar 2–7 `links` de qualidade em tarefas de pesquisa

### Fase 3 — Validação do grafo

- [ ] Nenhum ciclo em `dependsOn`
- [ ] Apenas `t1` (ou no máximo 2 tarefas de entrada independentes) com `dependsOn: []`
- [ ] Existe ao menos **1 ramificação** (2+ tarefas com o mesmo `dependsOn` pai)
- [ ] Existe ao menos **1 convergência** (tarefa com 2–4 ids em `dependsOn` de ramos distintos)
- [ ] Projeto final depende de **2–4 ramos avançados concluídos**, não de toda a lista de análises
- [ ] Análise final retrospectiva depende só do projeto final (como `t24` → `["t23"]` no HTML)
- [ ] Toda competência aparece em ao menos uma tarefa

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
| **Cruzamento entre trilhas** | `t13` → `["t9"]`, `t16` → `["t7"]` | Tópico avançado puxa pré-requisito de outro ramo quando faz sentido |
| **Convergência de projeto** | `t23` → `["t18", "t19", "t20"]` | Projeto final: 2–4 ramos avançados, ids diretos |
| **Retrospectiva final** | `t24` → `["t23"]` | Análise final depende só do projeto |

### Regras de ouro

1. **Pré-requisito direto, não transitivo** — se `t17` depende de `t15` e `t15` depende de `t7`, então `t17` referencia `t15` (e `t14` se também precisar), **não** `t7`.
2. **Ramifique após práticas consolidadoras** — pontos como `t5` (artigo pronto) ou `t12` (formulário pronto) são melhores ganchos que tarefas de teoria isoladas.
3. **Análise (`tipo: "analise"`) quando consolidar faz sentido** — auditoria, retrospectiva, comparação de abordagens; não obrigue uma análise a cada 3 tarefas.
4. **`reviewAfterDays`:** `7` ou `14` em análises; `0` nas demais.
5. **Prioridade `"alta"`** em tarefas que desbloqueiam 2+ ramos ou o projeto final.

### Anti-padrões

- Cadeia única `t1→t2→…→tN` quando o tema tem tópicos independentes após a base.
- Listar 5–7 ids em `dependsOn` do projeto final (ex.: todas as análises de todos os módulos).
- Prefixos `m{N}_t{K}` quando ids simples bastam.
- Citar `t5` ou `m2_t3` dentro de `descricao` — explique o conceito, não o id.
- Tags exclusivamente `modulo-N` sem tags temáticas.

---

## Schema do JSON de saída

### Raiz

```
{
  "nome":        string
  "descricao":   string   ← objetivo geral; mencione progressão teoria/prática/revisão
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
| `descricao` | string | **Obrigatório** — 2–4 frases: o que desenvolve, por que importa, o que o aluno produz/aprende |
| `tipo` | string | `"pesquisa"` \| `"pratica"` \| `"analise"` |
| `dificuldade` | string | `"facil"` \| `"medio"` \| `"dificil"` |
| `prioridade` | string | `"baixa"` \| `"media"` \| `"alta"` |
| `horasEstimadas` | number | Realista (aceita decimal) |
| `criterioConclusao` | string | Evidência concreta de conclusão |
| `competencias` | string[] | 1–4 ids por tarefa quando fizer sentido |
| `tags` | string[] | Temáticas curtas: `fundamentos`, `joins`, `revisão`, `projeto`… |
| `atributos` | string[] | `"Banco de Dados"`, `"Back-end"`, `"Fundamentos"`… |
| `dependsOn` | string[] | Pré-requisitos **diretos**; `[]` só na(s) entrada(s) |
| `reviewAfterDays` | number | `7` ou `14` em `"analise"`; `0` nas demais |
| `links` | Link[] | 2–5 em pesquisas; pode ser `[]` em práticas/análises |
| `subtarefas` | Subtarefa[] | 3–6 passos concretos |

### Link / Subtarefa

Igual ao schema anterior: `{ "titulo", "url", "tipo" }` e `{ "titulo" }`.

---

## Regras de qualidade (espelhando o HTML)

1. **Densidade:** respeite o **porte** — Pequeno (5–10), Médio (11–20), Grande (21+ tarefas). Temas amplos em porte Grande costumam ter 20–30 tarefas.
2. **Toda competência** coberta por ao menos uma tarefa.
3. **Descrições ricas** — cada uma deve justificar por que a tarefa existe no plano.
4. **Critério verificável** — prefira "criar X que faz Y" a "entender X".
5. **Subtarefas acionáveis** — passos que o aluno marca ao executar.
6. **Links curados** — documentação oficial + tutorial + vídeo quando existir.
7. **Múltiplas competências** em tarefas integradoras (projeto final, auditorias).
8. **Projeto final** (`tipo: "pratica"`, `dificuldade: "dificil"`, 4–8h) consolidando o tema.
9. **Análise final retrospectiva** após o projeto — avaliação de competências, gaps e plano de revisão.
10. **Não inclua:** `horasReais`, `historico`, `concluidaEm`, `timerAtivoDesde`, `criadoEm`.

---

## Estrutura esperada (referência visual — padrão HTML)

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

---

## Idioma

- Textos em **português**.
- Enums sem acento: `pratica`, `pesquisa`, `analise`, `facil`, `medio`, `dificil`.
