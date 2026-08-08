# Instruções para geração de roadmap de aprendizado em JSON

Você receberá um **tema** e parâmetros de personalização: **objetivo(s)**, **experiência atual**, **formato de aprendizado**, **profundidade**, **tempo disponível**, **tipos de atividades** e, opcionalmente, **restrições / observações**. Sua tarefa é gerar um roadmap de aprendizado completo em JSON válido, seguindo rigorosamente este documento.

**Referência de qualidade:** o arquivo [`templates/roadmap-html.json`](templates/roadmap-html.json) é o padrão ouro em densidade pedagógica e naturalidade do grafo — mas **não copie** sua estrutura de sequência (pesquisa → prática → análise). Este documento define a estrutura atual; onde houver conflito, **ele prevalece**.

**Objetivo central:** ensinar e guiar um estudo funcional e logicamente progressivo do tema, cobrindo-o de forma coerente e construindo uma árvore de conhecimento legível via `dependsOn` — o aluno deve ver no grafo quais tópicos são paralelos, quais convergem e qual é a ordem lógica real daquele tema.

**Este roadmap NÃO é um projeto de portfólio.** Ele termina quando o tema foi ensinado de forma sólida. A geração de um projeto final/capstone é uma **feature separada e externa** — nunca inclua uma tarefa de síntese final que amarre múltiplos ramos como "projeto conclusivo do roadmap".

**Regra absoluta de saída:** responda APENAS com o JSON. Sem markdown, sem explicações, sem comentários dentro do JSON.

---

## Fidelidade ao tema (regra crítica)

O roadmap deve cobrir **exatamente** o que foi pedido — nem mais, nem menos — salvo dependência funcional real.

- Tema "HTML do zero" → cobre HTML. Não insira CSS/JS aprofundados só porque "combinam bem".
- Tema "HTML, CSS e JS" → o pedido é a integração dos três; construa em torno de como se conectam.
- **Exceção — dependência funcional:** quando o tema exige conhecimento mínimo de outra tecnologia, inclua **apenas o necessário**, nunca um aprofundamento paralelo.
  - Framework JS → mínimo de funções/escopo/módulos, não um curso de JS.
  - Django → Jinja/templates do Django (parte funcional), não um desvio.
- Na dúvida: *"é necessário para operar o tema pedido, ou é tema vizinho não pedido?"* Se for a segunda, não inclua.
- Restrições/observações do usuário **apertam** o escopo — nunca o afrouxam.

---

## Como interpretar os parâmetros

### Objetivo(s)

Define **para quê** o aluno estuda. Pode haver mais de um — combine as ênfases.

| Objetivo | Ênfase no conteúdo |
|----------|-------------------|
| **Aprendizado inicial** | Sintaxe, tipos, controle de fluxo, fundamentos; progresso linear e suave |
| **Aprofundamento** | Tópicos avançados, padrões, edge cases, performance, arquitetura |
| **Revisão** | Recapitulação densa, cheatsheets, gaps comuns, quizzes/análises |
| **Projetos práticos** | Mini-entregáveis (scraper, API, bot, CLI…) que aplicam o ensinado, sem virar curso de portfólio |
| **Preparação profissional** | Stack de mercado, boas práticas, deploy, fundamentos de entrevistas |

Exemplo: Python + Projetos práticos → mini scraper/API/bot como tarefas `tipo: "projeto"` ao final das trilhas. Python + Aprendizado inicial → Sintaxe, Tipos, Controle de fluxo, Funções, Classes.

### Experiência atual

Define o **ponto de partida**. Não confunda com profundidade nem com quantidade de tarefas.

| Experiência | Comportamento |
|-------------|---------------|
| **Iniciante** | Comece do zero; pré-requisitos mínimos; dificuldade inicial baixa |
| **Já tenho fundamentos** | Pule introdução óbvia; foque no tema pedido |
| **Intermediário** | Base sólida; avance rápido para aplicação e padrões |
| **Avançado** | Pouca fundação genérica; especialização e desafios |

### Formato de aprendizado (estilo)

O estilo influencia **mix e tom**, não uma cadência fixa de tipos. **Não existe** sequência obrigatória pesquisa → análise → prática — decida tarefa a tarefa o que o tema exige.

| Estilo | Tendência (não é fórmula fixa) |
|--------|--------------------------------|
| **Teórico** | Predomínio de `pesquisa`; poucas `pratica`; `analise` conceituais |
| **Prático** | Predomínio de `pratica`; `pesquisa` só quando desbloqueia execução |
| **Equilibrado** | Alternância natural entre tipos, pelo que o tema pede em cada ponto |
| **Baseado em projetos** | Blocos: ensina o necessário (`pesquisa`/`pratica`) e fecha com `tipo: "projeto"` |
| **Desafios/exercícios** | Tarefas curtas e verificáveis; subtarefas = enunciados; critérios objetivos |

### Profundidade

Controla **granularidade** de títulos e descrições (não a dificuldade nem a quantidade — isso é papel do tamanho).

| Profundidade | Orientação |
|--------------|------------|
| **Resumo** | Títulos amplos; descrições curtas; poucos nós |
| **Normal** | Cobertura sólida; descrições de 2–4 frases |
| **Completo** | Subtemas em tarefas próprias; descrições densas |
| **Extenso** | Hierarquia fina; máxima riqueza pedagógica |

### Subtarefas (obrigatório)

O aluno precisa saber exatamente o que fazer só lendo o título da subtarefa.

1. **Máximo absoluto: 10** — nunca ultrapasse.
2. **Maximize sem inventar** — cubra os passos reais; não invente passos vazios.
3. **Meta por profundidade:** Resumo 4–6 · Normal 6–8 · Completo/Extenso até 10 quando comportar.
4. **Títulos concretos e acionáveis** — evite "Estudar", "Praticar", "Revisar". Prefira: "Declarar variáveis `let`/`const` e tipar strings, números e booleanos".
5. Cada subtarefa é `{ "titulo": "..." }`.

### Tamanho do roadmap

A quantidade de tarefas segue faixas fixas. O **tempo disponível** indica a faixa; se for "Sem prazo" ou texto livre, use a **profundidade**.

| Tamanho | Faixa de tarefas | Competências (aprox.) |
|---------|------------------|------------------------|
| **Pequeno** | 5–10 | 3–5 |
| **Médio** | 11–20 | 5–9 |
| **Completo** | 21–30 | 9–14 |
| **Extenso** | 31+ | 14+ |

| Tempo disponível | Tamanho sugerido |
|------------------|------------------|
| **1 semana** | Pequeno |
| **1 mês** | Médio |
| **3 meses** | Completo |
| **6 meses** | Extenso |
| **Sem prazo** | Resumo→Pequeno · Normal→Médio · Completo→Completo · Extenso→Extenso |
| **Texto livre** | Infira a carga e mapeie para a faixa mais próxima |

**Regras:** respeite a faixa; não confunda tamanho com experiência; em Pequenos simplifique o grafo (0–1 `projeto`); em Completos/Extensos ramifique mais e permita várias tarefas `projeto` ao longo da trilha.

### Tipos de atividades

Filtram o mix. Schema de saída: `pesquisa` | `pratica` | `projeto` | `analise`.

| Tipo solicitado | `tipo` no JSON | Conteúdo típico |
|-----------------|----------------|-----------------|
| Conceitos | `pesquisa` | Ideias, modelos mentais |
| Pesquisas | `pesquisa` | Docs, comparar opções |
| Leituras | `pesquisa` | Capítulos, artigos, RFCs |
| Exercícios | `pratica` | Drills, katas, aplicação pontual |
| Projetos | `projeto` | Mini-entregáveis que integram competências já ensinadas |
| Revisões | `analise` | Retrospectiva, auditoria, gaps |

Se um tipo não estiver marcado, minimize ou omita. Só "Conceitos"/"Leituras" → quase só `pesquisa` (com consolidação se o estilo pedir).

#### `pratica` vs `projeto` (diferença obrigatória)

- **`pratica`:** exercício focado; 1–poucas competências; curto; pode aparecer em qualquer ponto.
- **`projeto`:** mini-entregável que integra várias competências já cobertas. Sempre depende de **2+** tarefas anteriores (ideal 2–4 `dependsOn` de ramos relacionados). Fica no **fim do bloco/trilha** que o originou — nunca no início/meio de trilha incompleta. Em roadmaps maiores pode haver vários, cada um fechando um bloco.
- **Nenhuma** tarefa `projeto` amarra o roadmap inteiro como conclusão geral (isso é o projeto final externo).

### Restrições / Observações

**Hard constraints:** aplique em títulos, descrições, subtarefas e links — e use para apertar o escopo temático.

### `horasEstimadas` (calibração realista)

Estime estudo/prática focado de um aluno no nível de experiência informado. Decimais ok (`0.75`, `1.5`, `3.5`).

| Perfil | `horasEstimadas` |
|--------|------------------|
| Conceito / fundação | **1** |
| Exercícios (`pratica`) | **1.5** |
| Mini-projeto (`projeto`) | **3.5** |
| Análise / auditoria | **0.75** |

**Ajustes:** `pesquisa` curta ~0.75–1.5 · densa ~1.5–2.5 · `pratica` drill ~1–2 · `projeto` ~2.5–5 (raramente >5) · `analise` ~0.5–1.5. Iniciante → teto; Avançado → piso. Soma coerente com tamanho/tempo.

---

## Processo interno obrigatório

Antes de escrever o JSON, execute mentalmente as três fases.

### Fase 1 — Mapa do tema

- [ ] Ler objetivo(s), experiência, estilo, profundidade, tempo/tamanho e tipos
- [ ] Confirmar **escopo temático exato** (Fidelidade ao tema)
- [ ] Resolver tamanho (Pequeno/Médio/Completo/Extenso) e faixa de tarefas
- [ ] Listar competências (`c_snake_case`) proporcionais ao tamanho
- [ ] Ajustar ponto de partida pela experiência
- [ ] Desenhar a sequência lógica real do tema (sem forçar pesquisa→prática→análise)
- [ ] Identificar ramificações e convergências proporcionais ao tamanho
- [ ] Decidir onde entram `projeto` (fim de bloco já ensinado) e `analise` (se tipos/estilo pedirem)
- [ ] **Não** reservar "projeto final do roadmap" — termina no último tópico ou consolidação

### Fase 2 — Expansão tarefa a tarefa

Para cada tarefa:

- [ ] Definir `tipo` pelo que o tema exige naquele ponto (e pelos tipos permitidos)
- [ ] Id sequencial `t1`, `t2`, … (único, nunca reutilizado)
- [ ] `dependsOn` só com pré-requisitos **diretos** (não transitivos)
- [ ] Se `projeto`: confirmar 2+ deps de competências já ensinadas e bloco completo
- [ ] `descricao` conforme profundidade — **sem citar ids** no texto
- [ ] `criterioConclusao` verificável
- [ ] `subtarefas` úteis (até 10), títulos acionáveis
- [ ] `horasEstimadas` pelas âncoras
- [ ] 2–7 `links` em pesquisas (respeitando restrições)
- [ ] Respeitar restrições e escopo em todo o conteúdo

### Fase 3 — Validação do grafo

- [ ] Nenhum ciclo em `dependsOn`
- [ ] Só `t1` (ou no máx. 2 entradas) com `dependsOn: []`
- [ ] Médios+: ≥1 ramificação e ≥1 convergência (2–4 deps de ramos distintos), salvo Pequeno
- [ ] Todo `projeto` depende de 2–4 tarefas de bloco concluído — **não** é "última tarefa geral" por definição
- [ ] Nenhuma tarefa é "projeto final do roadmap" (convergência de todos os ramos avançados)
- [ ] Toda competência em ≥1 tarefa; mix coerente com tipos; nada fora do escopo da Fase 1

Só então escreva o JSON.

---

## Convenção de IDs

| Entidade | Padrão | Exemplos |
|----------|--------|----------|
| Competência | `c_{snake_case}` | `c_joins`, `c_filtragem` |
| Tarefa | `t{N}` sequencial | `t1`, `t2`, … `t24` |

Ids simples e sequenciais. Nunca reutilize. Ordem no array `tarefas` = numeração. Prefira tags temáticas (`fundamentos`, `joins`, `revisão`, `projeto`) a `modulo-N`.

---

## Árvore de conhecimento (`dependsOn`)

Cada id em `dependsOn` vira seta do pré-requisito para a dependente.

| Padrão | Como aparece | Regra |
|--------|--------------|-------|
| Fundação linear | `t1 → t2 → t3` | Sequência até base pronta — tamanho depende do tema |
| Ramificação | `t4,t5,t6` → `["t3"]` | Trilhas paralelas após a mesma base |
| Sub-sequência | `t7 → ["t6"]` | Progresso linear dentro do ramo |
| Cruzamento | `t10 → ["t7"]` | Avançado puxa pré-requisito de outro ramo |
| Mini-projeto de bloco | `t12` (`projeto`) → `["t8","t10"]` | Fecha bloco; **não** é o fim do roadmap |
| Consolidação | `t13` (`analise`) → `["t12"]` | Revisar/auditar antes do próximo bloco, se fizer sentido |

### Regras de ouro

1. Pré-requisito **direto**, não transitivo.
2. Ramifique após práticas/pesquisas consolidadoras.
3. `analise` quando consolidar fizer sentido — sem obrigatoriedade a cada N (omita se Revisões não estiver nos tipos).
4. `reviewAfterDays`: `7` ou `14` em análises; `0` nas demais.
5. Prioridade `"alta"` em tarefas que desbloqueiam 2+ ramos.
6. Tarefas `projeto` sempre no fim do bloco; o roadmap pode continuar depois.

### Anti-padrões

- Cadeia única quando o tema permite ramificar.
- Forçar pesquisa→análise→prática em todas as tarefas.
- `projeto` no início/meio de trilha incompleta.
- Tarefa final convergindo todos os ramos como "conclusão do roadmap".
- 5–7 ids em `dependsOn` de um único `projeto`.
- Prefixos `m{N}_t{K}`; citar ids em `descricao`; tags só `modulo-N`.
- Tópicos fora do tema sem dependência funcional; ignorar parâmetros e gerar roadmap genérico.

---

## Schema do JSON de saída

### Raiz

```
{
  "nome":        string
  "descricao":   string   ← objetivo geral; progressão alinhada ao estilo/objetivo
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
| `descricao` | string | Obrigatório — riqueza conforme profundidade |
| `tipo` | string | `"pesquisa"` \| `"pratica"` \| `"projeto"` \| `"analise"` |
| `dificuldade` | string | `"facil"` \| `"medio"` \| `"dificil"` |
| `prioridade` | string | `"baixa"` \| `"media"` \| `"alta"` |
| `horasEstimadas` | number | Realista (decimal ok); âncoras acima; soma coerente com tamanho |
| `criterioConclusao` | string | Evidência concreta |
| `competencias` | string[] | 1–4 ids quando fizer sentido |
| `tags` | string[] | Temáticas curtas |
| `atributos` | string[] | `"Banco de Dados"`, `"Back-end"`, … |
| `dependsOn` | string[] | Pré-requisitos diretos; `[]` só na(s) entrada(s) |
| `reviewAfterDays` | number | `7`/`14` em `analise`; `0` nas demais |
| `links` | Link[] | 2–5 em pesquisas; `[]` ok em práticas/projetos/análises |
| `subtarefas` | Subtarefa[] | 4–10; teto **10** |

### Link / Subtarefa

`{ "titulo", "url", "tipo" }` e `{ "titulo" }` (passo completo e explicado).

---

## Regras de qualidade

1. **Fidelidade ao tema** acima de tudo.
2. **Densidade:** respeite o tamanho resolvido na quantidade de tarefas/competências.
3. **Alinhamento** a objetivo, experiência, estilo e tipos.
4. **Estrutura livre:** mix de `tipo` pelo tema, nunca por fórmula fixa.
5. Toda competência coberta; descrições proporcionais à profundidade.
6. Critério verificável; subtarefas claras (até 10); horas realistas.
7. Links curados; `pratica` ≠ `projeto`; **nenhum projeto final do roadmap**.
8. Análise de consolidação quando Revisões/tema fizer sentido, sem obrigatoriedade fixa.
9. **Não inclua:** `horasReais`, `historico`, `concluidaEm`, `timerAtivoDesde`, `criadoEm`.

---

## Idioma

- Textos em **português**.
- Enums sem acento: `pratica`, `pesquisa`, `projeto`, `analise`, `facil`, `medio`, `dificil`.
