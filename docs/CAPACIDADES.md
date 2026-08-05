# O que o Road-Learn faz

Aplicação local para **planejar, acompanhar e organizar roadmaps de estudo**. O foco não é só “completei N tarefas”, e sim **domínio de competências**, com dependências em grafo, revisão espaçada e métricas de tempo — tudo no navegador, sem conta e sem banco externo.

---

## Em resumo

| Capacidade | O que isso significa na prática |
|------------|----------------------------------|
| **Competências (skills)** | Domínio % por skill (Routing 100%, Middleware 20%…) |
| **Ficha (atributos / XP / nível)** | Radar de áreas + XP=horas reais — progressão sem gamificação vazia |
| **Árvore de tecnologia** | Dependências como árvore desbloqueável |
| Roadmaps | Planos com nome, descrição, skills e tarefas |
| Tarefas tipadas | Prática, Pesquisa ou Análise |
| Dependências + grafo | Bloqueio até pré-requisito + visão de progressão |
| Critério de conclusão | “Como saber que terminei” |
| Dificuldade / prioridade | Por onde começar entre tarefas liberadas |
| Tags | Filtrar por tema |
| Links tipados | Vídeo, artigo, doc, repo ou outro |
| Revisão espaçada | `reviewAfterDays` agenda revisitas |
| Tempo real vs estimado | Manual ou mini-timer |
| Histórico | Linha do tempo por tarefa |
| Painel / Ficha | Atributos, XP, nível, você×você, heatmap neutro |
| Importação JSON | Planos completos (IA-friendly) |
| **Projeto Final** | Capstone por roadmap (≥80% tarefas): 3 tópicos IA → 1 escolhido → projeto com checklist, docs e boas práticas |
| **Projeto Integrado** | Capstone multi-roadmap (≥2, cada um ≥80%): ilimitados; mesma geração em 2 fases + checklist |

---

## 1. Competências — o progresso que importa

Em vez de só contar tarefas:

```
Competências
Routing ............ 100%
Controllers ........ 85%
Blade .............. 90%
Validation ......... 70%
Middleware ......... 20%
```

- Cada roadmap tem uma lista de **competências**.
- Cada tarefa **desenvolve** uma ou mais skills.
- O domínio de uma skill = peso das tarefas concluídas ÷ peso total  
  (peso = horas estimadas, mínimo 1).
- A sidebar e o header mostram **% domínio** junto com % de tarefas.
- Gerencie skills no painel **Competências** ou na criação/importação JSON.

Exemplo mental: a tarefa “Criar CRUD” pode somar Routing + Controllers + Blade + Validation.

---

## 1b. Ficha de estudo (estrutura de RPG, sem casca)

- **Atributos** = áreas reais (`Back-end`, `Front-end`…) incrementadas por horas reais.
- **Radar** mostra o perfil — estatística, não badge.
- **XP = horas reais**; nível com barra N → N+1 (fórmula simples).
- **Esta semana vs semana passada** — deltas neutros, sem culpa.
- Heatmap sem punição visual; sequência só como fato discreto.
- **Árvore de tecnologia** no roadmap (dependências).

---

## 2. Gerenciar roadmaps

- Criar com nome, descrição e competências iniciais.
- **Editar** nome/descrição depois.
- Progresso na sidebar: tarefas + domínio.
- Importar via **⤓ JSON**.
- Abrir a **◈ Ficha**.
- Excluir com confirmação.

---

## 3. Tarefas, dependências e árvore

- Tipos, prazos, horas, critério, tags, **atributos**, dificuldade, prioridade.
- `dependsOn` bloqueia até liberar pré-requisitos.
- Seção **Árvore de tecnologia** mostra caminho percorrido vs. o que falta.
- Filtros: Todas · Liberadas · Bloqueadas · Pendentes · Concluídas · Atrasadas · Revisão · tags.

---

## 4. Tempo, histórico e ficha

- Timer e registro manual de horas (estimado × real).
- Histórico por tarefa.
- Ficha: XP/nível, radar, comparação semanal, heatmap, ritmo.
---

## 5. Importar via JSON

Exemplos completos estão disponíveis em `docs/templates/`.
O prompt atualizado em `docs/GERAR_ROADMAP.md` inclui `competencias` e o vínculo com as tarefas.

---

## 5b. Projeto Final (capstone por roadmap)

Com **≥ 80% das tarefas** do roadmap concluídas, o usuário pode gerar **um** Projeto Final (substitui se regenerar):

1. **Fase 1 (mesmo modal):** a IA sugere **3 tópicos** distintos de portfólio (contexto enxuto: títulos das tarefas, competências, domínio).
2. O usuário escolhe **1** tópico.
3. **Fase 2 (mesmo modal):** a IA gera o projeto completo — objetivo, stack, requisitos, checklist, etapas, README, `.gitignore`, estrutura de pastas e boas práticas.

Dados em SQLite (`data/road-learn.db`). Prompts: `docs/INSTRUCOES_IA_TOPICOS_PROJETO_FINAL.md` e `docs/INSTRUCOES_IA_PROJETO_FINAL.md`.  
A conclusão do Projeto Final **não** altera o domínio permanente das competências (previsto para evolução futura).

---

## 5c. Projeto Integrado (capstone multi-roadmap)

Agrega **2 ou mais** roadmaps (ex.: backend + banco + front) num único projeto. Sem limite de quantidade.

1. Sidebar → **Projetos Integrados** (abaixo de Personalização) → **Novo integrado**.
2. Seleciona roadmaps elegíveis (cada um com ≥80% de tarefas).
3. Mesmo fluxo do Projeto Final: 3 tópicos IA → 1 escolhido → projeto completo → checklist.

Contexto enviado à IA é **orçado** (até 5 roadmaps no prompt, top competências/tarefas por roadmap) para não sobrecarregar o modelo.  
Dados em SQLite (`data/road-learn.db`). Prompts: `docs/INSTRUCOES_IA_TOPICOS_PROJETO_INTEGRADO.md` e `docs/INSTRUCOES_IA_PROJETO_INTEGRADO.md`.

---

## 6. Onde roda

- Porta 3000 · `npm start` / `npm run dev` (Linux)
- Dados em `data/road-learn.db` (SQLite)
- Sem login

---

## Ordem de evolução (visão)

| # | Capacidade | Status |
|---|------------|--------|
| 1 | Dependências + roadmap em grafo | Feito |
| 2 | Revisão espaçada + retenção | Feito (básico; dá para aprofundar) |
| 3 | Competências ligadas às tarefas | Feito |
| 4 | Sessões de estudo + métricas avançadas | Parcial (timer/painel; sessões first-class ainda não) |

---

## Fluxo típico

```
1. Importar roadmap com competências + dependências
2. Olhar o domínio e o grafo — não só a lista
3. Fazer tarefas liberadas; registrar tempo
4. Ver skills subirem de 20% → 80%
5. Revisar o que o filtro Revisão apontar
```
