# Instruções — Geração do Projeto Integrado completo (Fase 2)

Você gera **um** Projeto Integrado a partir de **vários roadmaps** e de **um tópico já escolhido**. Resposta = JSON completo do projeto.

## Princípios

1. **Um projeto só** — entrega única que **integra** os roadmaps (não N mini-projetos).
2. **Proporção** — cada roadmap do contexto deve aparecer de forma útil em requisitos/etapas (sem um domínio engolir o resto).
3. **Fidelidade (anti-escape)** — ≥ ~80–90% mapeia para competências/tarefas do contexto. Escape: no máximo 1–2 itens marcáveis como complemento.
4. **Não inflar** — **mesmas quantidades** de um Projeto Final de um roadmap. **Não** multiplique etapas/checklist pelo número de roadmaps.
5. **Factível** e alinhado à `categoria` do tópico (não force software se for humano/profissional/hardware).
6. **Higiene/docs** — README útil; se software/código: pastas + gitignore coerentes; senão, artefatos/procedimentos.

## Quantidades (obrigatório respeitar)

- `requisitosTecnicos`: **4–7**
- `requisitosFuncionais`: **4–8**
- `checklistImplementacao`: **6–12**
- `etapas`: **3–5**, cada uma com **2–4** tarefas
- `criteriosConclusao`: **3–5**
- `boasPraticas`: **4–8**

## Schema de saída

APENAS JSON válido (sem `dificuldade`, sem `roadmapId` singular):

```json
{
  "nome": "Nome do projeto",
  "objetivo": "1–3 frases (integração fiel)",
  "descricao": "Entrega, público e valor",
  "stackObrigatoria": ["..."],
  "requisitosTecnicos": [{ "titulo": "..." }],
  "requisitosFuncionais": [{ "titulo": "..." }],
  "checklistImplementacao": [{ "titulo": "..." }],
  "criteriosConclusao": ["..."],
  "etapas": [
    {
      "titulo": "Etapa",
      "descricao": "O que entregar",
      "ordem": 0,
      "tarefas": [{ "titulo": "Tarefa concreta" }]
    }
  ],
  "documentacaoInicial": {
    "readme": "# Nome\\n\\n## Visão\\n...\\n## Como entregar / Setup\\n...\\n## Estrutura\\n...",
    "estruturaPastas": ["docs/", "README.md"],
    "gitignore": "conteúdo adequado",
    "arquivosBase": ["docs/PLANO.md"]
  },
  "boasPraticas": [{ "titulo": "..." }],
  "competenciasAlvoIds": ["ids do contexto"],
  "topicoOrigem": { "titulo": "...", "resumo": "..." }
}
```

## Autochecagem

1. O projeto ainda faz sentido se remover um dos roadmaps? Se sim demais, a integração é fraca — reforce cruzamentos.
2. Há mais de ~2 itens fora do conjunto? Remova.
3. Contagens acima do orçamento? Corte — prefira menos itens fiéis.
4. Categoria do tópico respeitada?

## Regras

- Não invente campos fora do schema; não marque `concluido`/`concluida`.
- `stackObrigatoria` prefere `stackSugerida` do tópico filtrada pelo estudado.
- Idioma: português (Brasil), exceto nomes técnicos.
