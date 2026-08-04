import {
  lerProjetosIntegrados,
  salvarProjetosIntegrados,
} from "./db-projetos-integrados.js";
import {
  PROGRESSO_MINIMO_PROJETO_FINAL,
  assertElegivelParaProjetoFinal,
  calcularProgressoProjeto,
  calcularProgressoTarefasRoadmap,
  normalizarProjetoFinal,
  normalizarTopicoEscolhido,
} from "./projetos-finais-service.js";
import {
  calcularDominioCompetencias,
  gerarId,
  obterRoadmapPorId,
} from "./roadmaps-service.js";

export const PROGRESSO_MINIMO_PROJETO_INTEGRADO = PROGRESSO_MINIMO_PROJETO_FINAL;
export const MAX_ROADMAPS_NO_PROMPT = 5;
export const MIN_ROADMAPS_INTEGRADO = 2;

const MAX_COMPETENCIAS_POR_ROADMAP = 8;
const MAX_TAREFAS_FASE1 = 25;
const MAX_TAREFAS_FASE2 = 20;
const MAX_TAGS_GLOBAIS = 6;

function agoraIso() {
  return new Date().toISOString();
}

function frequencias(lista) {
  const map = new Map();
  for (const item of lista) {
    const chave = String(item ?? "").trim();
    if (!chave) continue;
    map.set(chave, (map.get(chave) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([valor, contagem]) => ({ valor, contagem }));
}

export function normalizarRoadmapIds(ids) {
  const vistos = new Set();
  const resultado = [];
  for (const bruto of Array.isArray(ids) ? ids : []) {
    const id = String(bruto ?? "").trim();
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    resultado.push(id);
  }
  return resultado;
}

export function assertRoadmapIdsValidos(ids) {
  const roadmapIds = normalizarRoadmapIds(ids);
  if (roadmapIds.length < MIN_ROADMAPS_INTEGRADO) {
    const erro = new Error(
      `Selecione pelo menos ${MIN_ROADMAPS_INTEGRADO} roadmaps para um Projeto Integrado`
    );
    erro.status = 400;
    throw erro;
  }
  return roadmapIds;
}

export function normalizarProjetoIntegrado(dados, { roadmapIds, preservarId } = {}) {
  const ids = assertRoadmapIdsValidos(roadmapIds ?? dados.roadmapIds);
  const base = normalizarProjetoFinal(
    {
      ...dados,
      nome:
        dados.nome ||
        dados.titulo ||
        dados.topicoOrigem?.titulo ||
        "Projeto Integrado",
    },
    { preservarId: preservarId || dados.id }
  );

  const { roadmapId: _omitido, ...resto } = base;
  return {
    ...resto,
    id: preservarId || dados.id || `pi_${gerarId()}`,
    roadmapIds: ids,
  };
}

/**
 * Carrega roadmaps, valida elegibilidade (≥80% cada) e ordena por progresso desc.
 * Se houver mais que MAX_ROADMAPS_NO_PROMPT, mantém os de maior progresso no prompt
 * (mas persiste todos os ids selecionados).
 */
export async function carregarRoadmapsElegiveis(idsBrutos) {
  const roadmapIds = assertRoadmapIdsValidos(idsBrutos);
  const roadmaps = [];

  for (const id of roadmapIds) {
    const roadmap = await obterRoadmapPorId(id);
    if (!roadmap) {
      const erro = new Error(`Roadmap não encontrado: ${id}`);
      erro.status = 404;
      throw erro;
    }
    assertElegivelParaProjetoFinal(roadmap);
    const progresso = calcularProgressoTarefasRoadmap(roadmap).progresso;
    roadmaps.push({ roadmap, progresso });
  }

  roadmaps.sort((a, b) => b.progresso - a.progresso);

  const paraPrompt = roadmaps.slice(0, MAX_ROADMAPS_NO_PROMPT).map((r) => r.roadmap);
  const truncado = roadmaps.length > MAX_ROADMAPS_NO_PROMPT;

  return {
    roadmapIds,
    roadmaps: roadmaps.map((r) => r.roadmap),
    paraPrompt,
    truncado,
    avisoTruncamento: truncado
      ? `Foram selecionados ${roadmaps.length} roadmaps; o prompt usa os ${MAX_ROADMAPS_NO_PROMPT} com maior progresso.`
      : null,
  };
}

function topCompetencias(roadmap, limite = MAX_COMPETENCIAS_POR_ROADMAP) {
  return [...calcularDominioCompetencias(roadmap)]
    .sort((a, b) => b.dominio - a.dominio)
    .slice(0, limite)
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      dominio: c.dominio,
      roadmapId: roadmap.id,
    }));
}

function montarBlocoRoadmapCompacto(roadmap) {
  const progressoTarefas = calcularProgressoTarefasRoadmap(roadmap);
  const tarefas = (roadmap.tarefas ?? [])
    .slice(0, MAX_TAREFAS_FASE1)
    .map((t) => ({
      titulo: t.titulo,
      concluida: Boolean(t.concluida),
    }));

  return {
    id: roadmap.id,
    nome: roadmap.nome,
    progressoTarefas: progressoTarefas.progresso,
    competencias: topCompetencias(roadmap),
    tarefas,
  };
}

function montarBlocoRoadmapCompleto(roadmap) {
  const base = montarBlocoRoadmapCompacto(roadmap);
  const tarefas = (roadmap.tarefas ?? []).slice(0, MAX_TAREFAS_FASE2).map((t) => {
    const subtarefasBrutas = t.subtarefas ?? [];
    const subtarefas =
      subtarefasBrutas.length > 0 && subtarefasBrutas.length <= 3
        ? subtarefasBrutas.map((s) => ({
            titulo: s.titulo,
            concluida: Boolean(s.concluida),
          }))
        : undefined;
    return {
      titulo: t.titulo,
      tipo: t.tipo,
      dificuldade: t.dificuldade,
      concluida: Boolean(t.concluida),
      ...(subtarefas ? { subtarefas } : {}),
    };
  });

  return {
    ...base,
    tarefas,
  };
}

function agregadosGlobais(roadmaps) {
  const todasTarefas = roadmaps.flatMap((r) => r.tarefas ?? []);
  return {
    atributosFrequentes: frequencias(
      todasTarefas.flatMap((t) => t.atributos ?? [])
    ).slice(0, MAX_TAGS_GLOBAIS),
    tagsFrequentes: frequencias(todasTarefas.flatMap((t) => t.tags ?? [])).slice(
      0,
      MAX_TAGS_GLOBAIS
    ),
  };
}

export function montarContextoIntegradoCompacto(roadmaps, { avisoTruncamento } = {}) {
  return {
    ...(avisoTruncamento ? { aviso: avisoTruncamento } : {}),
    roadmaps: roadmaps.map(montarBlocoRoadmapCompacto),
    ...agregadosGlobais(roadmaps),
  };
}

export function montarContextoIntegradoCompleto(roadmaps, { avisoTruncamento } = {}) {
  return {
    ...(avisoTruncamento ? { aviso: avisoTruncamento } : {}),
    roadmaps: roadmaps.map(montarBlocoRoadmapCompleto),
    ...agregadosGlobais(roadmaps),
  };
}

async function obterLista() {
  const lista = await lerProjetosIntegrados();
  return lista.map((p) => {
    try {
      return normalizarProjetoIntegrado(p);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export async function listarProjetosIntegrados() {
  return obterLista();
}

export async function obterProjetoIntegradoPorId(id) {
  const lista = await obterLista();
  return lista.find((p) => p.id === id) ?? null;
}

export async function criarProjetoIntegrado(dados) {
  const roadmapIds = assertRoadmapIdsValidos(dados.roadmapIds);
  for (const id of roadmapIds) {
    const roadmap = await obterRoadmapPorId(id);
    if (!roadmap) {
      const erro = new Error(`Roadmap não encontrado: ${id}`);
      erro.status = 404;
      throw erro;
    }
  }

  const lista = await lerProjetosIntegrados();
  const projeto = normalizarProjetoIntegrado(dados, { roadmapIds });
  lista.push(projeto);
  await salvarProjetosIntegrados(lista);
  return projeto;
}

export async function atualizarProjetoIntegrado(id, dados = {}) {
  const lista = await lerProjetosIntegrados();
  const index = lista.findIndex((p) => p.id === id);
  if (index < 0) return null;

  const atual = normalizarProjetoIntegrado(lista[index]);
  const mesclado = {
    ...atual,
    ...dados,
    id: atual.id,
    roadmapIds: dados.roadmapIds
      ? assertRoadmapIdsValidos(dados.roadmapIds)
      : atual.roadmapIds,
    criadoEm: atual.criadoEm,
  };

  if (dados.concluido === true) {
    mesclado.concluido = true;
    mesclado.concluidoEm = atual.concluidoEm || agoraIso();
  } else if (dados.concluido === false) {
    mesclado.concluido = false;
    mesclado.concluidoEm = null;
  }

  const projeto = normalizarProjetoIntegrado(mesclado, {
    roadmapIds: mesclado.roadmapIds,
    preservarId: atual.id,
  });
  lista[index] = projeto;
  await salvarProjetosIntegrados(lista);
  return projeto;
}

export async function excluirProjetoIntegrado(id) {
  const lista = await lerProjetosIntegrados();
  const nova = lista.filter((p) => p.id !== id);
  if (nova.length === lista.length) return false;
  await salvarProjetosIntegrados(nova);
  return true;
}

/**
 * Ao apagar um roadmap: remove o id de todos os PIs;
 * se sobrar < 2 roadmaps, exclui o PI.
 */
export async function removerRoadmapDosProjetosIntegrados(roadmapId) {
  const id = String(roadmapId ?? "").trim();
  if (!id) return false;

  const lista = await lerProjetosIntegrados();
  let mudou = false;
  const nova = [];

  for (const bruto of lista) {
    let projeto;
    try {
      projeto = normalizarProjetoIntegrado(bruto);
    } catch {
      continue;
    }
    if (!projeto.roadmapIds.includes(id)) {
      nova.push(projeto);
      continue;
    }
    mudou = true;
    const restantes = projeto.roadmapIds.filter((rid) => rid !== id);
    if (restantes.length >= MIN_ROADMAPS_INTEGRADO) {
      nova.push(
        normalizarProjetoIntegrado(
          { ...projeto, roadmapIds: restantes },
          { roadmapIds: restantes, preservarId: projeto.id }
        )
      );
    }
  }

  if (mudou) await salvarProjetosIntegrados(nova);
  return mudou;
}

const COLECOES_ITEM = new Set([
  "requisitosTecnicos",
  "requisitosFuncionais",
  "checklistImplementacao",
  "boasPraticas",
]);

export async function toggleItemProjetoIntegrado(
  id,
  { colecao, itemId, concluido, etapaId }
) {
  const lista = await lerProjetosIntegrados();
  const index = lista.findIndex((p) => p.id === id);
  if (index < 0) return null;

  const projeto = normalizarProjetoIntegrado(lista[index], {
    roadmapIds: lista[index].roadmapIds,
    preservarId: id,
  });

  if (colecao === "etapas") {
    const etapa = projeto.etapas.find((e) => e.id === etapaId || e.id === itemId);
    if (!etapa) {
      const erro = new Error("Etapa não encontrada");
      erro.status = 404;
      throw erro;
    }
    if (etapaId && itemId && etapaId !== itemId) {
      const tarefa = etapa.tarefas.find((t) => t.id === itemId);
      if (!tarefa) {
        const erro = new Error("Tarefa da etapa não encontrada");
        erro.status = 404;
        throw erro;
      }
      tarefa.concluida = concluido != null ? Boolean(concluido) : !tarefa.concluida;
      etapa.concluida =
        etapa.tarefas.length > 0 && etapa.tarefas.every((t) => t.concluida);
    } else {
      etapa.concluida = concluido != null ? Boolean(concluido) : !etapa.concluida;
      if (etapa.concluida) {
        etapa.tarefas.forEach((t) => {
          t.concluida = true;
        });
      }
    }
  } else if (COLECOES_ITEM.has(colecao)) {
    const item = projeto[colecao].find((i) => i.id === itemId);
    if (!item) {
      const erro = new Error("Item não encontrado");
      erro.status = 404;
      throw erro;
    }
    item.concluido = concluido != null ? Boolean(concluido) : !item.concluido;
  } else {
    const erro = new Error("Coleção inválida");
    erro.status = 400;
    throw erro;
  }

  const progresso = calcularProgressoProjeto(projeto);
  if (progresso.progresso >= 100) {
    projeto.concluido = true;
    projeto.concluidoEm = projeto.concluidoEm || agoraIso();
  }

  projeto.atualizadoEm = agoraIso();
  lista[index] = projeto;
  await salvarProjetosIntegrados(lista);
  return projeto;
}

export { calcularProgressoProjeto, normalizarTopicoEscolhido };
