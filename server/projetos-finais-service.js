import * as projetosRepo from "./db/projetos-repo.js";
import {
  calcularDominioCompetencias,
  calcularDominioGeral,
  gerarId,
  obterRoadmapPorId,
} from "./roadmaps-service.js";

export const PROGRESSO_MINIMO_PROJETO_FINAL = 80;

function agoraIso() {
  return new Date().toISOString();
}

function comoArray(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor == null || valor === "") return [];
  return [valor];
}

function normalizarTexto(valor) {
  return String(valor ?? "").trim();
}

function normalizarListaStrings(valor) {
  return comoArray(valor)
    .map((item) => normalizarTexto(item))
    .filter(Boolean);
}

function normalizarItemChecklist(item, prefixo = "item") {
  if (typeof item === "string") {
    const titulo = item.trim();
    return titulo
      ? { id: gerarId(), titulo, concluido: false }
      : null;
  }
  if (!item || typeof item !== "object") return null;
  const titulo = normalizarTexto(item.titulo ?? item.title ?? item.nome);
  if (!titulo) return null;
  return {
    id: item.id || `${prefixo}_${gerarId()}`,
    titulo,
    concluido: Boolean(item.concluido ?? item.concluida),
  };
}

function normalizarChecklist(lista, prefixo) {
  return comoArray(lista)
    .map((item) => normalizarItemChecklist(item, prefixo))
    .filter(Boolean);
}

function normalizarTarefaEtapa(tarefa) {
  return normalizarItemChecklist(tarefa, "et");
}

function normalizarEtapa(etapa, index = 0) {
  if (!etapa || typeof etapa !== "object") return null;
  const titulo = normalizarTexto(etapa.titulo ?? etapa.title ?? etapa.nome);
  if (!titulo) return null;
  const tarefas = comoArray(etapa.tarefas)
    .map(normalizarTarefaEtapa)
    .filter(Boolean);
  const concluida =
    etapa.concluida != null
      ? Boolean(etapa.concluida)
      : tarefas.length > 0 && tarefas.every((t) => t.concluida);
  return {
    id: etapa.id || `e_${gerarId()}`,
    titulo,
    descricao: normalizarTexto(etapa.descricao ?? etapa.description),
    ordem: Number.isFinite(etapa.ordem) ? etapa.ordem : index,
    concluida,
    tarefas,
  };
}

function normalizarDocumentacaoInicial(doc) {
  const fonte = doc && typeof doc === "object" ? doc : {};
  const readme = normalizarTexto(fonte.readme);
  const estruturaPastas = normalizarListaStrings(fonte.estruturaPastas ?? fonte.pastas);
  const gitignore = normalizarTexto(fonte.gitignore);
  const arquivosBase = normalizarListaStrings(fonte.arquivosBase);

  return {
    readme:
      readme ||
      "# Projeto\n\n## Visão\n\n## Setup\n\n## Scripts\n\n## Estrutura\n",
    estruturaPastas: estruturaPastas.length
      ? estruturaPastas
      : ["src/", "docs/", "README.md", ".gitignore"],
    gitignore:
      gitignore ||
      "node_modules/\n.env\n.DS_Store\ndist/\nbuild/\n*.log\n",
    arquivosBase: arquivosBase.length
      ? arquivosBase
      : [".env.example", "docs/ARCHITECTURE.md"],
  };
}

function boasPraticasPadrao() {
  return [
    { id: "bp_readme", titulo: "README com visão, setup e estrutura", concluido: false },
    { id: "bp_gitignore", titulo: ".gitignore adequado à stack", concluido: false },
    { id: "bp_estrutura", titulo: "Estrutura de pastas clara e consistente", concluido: false },
    { id: "bp_env", titulo: ".env.example (sem segredos) quando houver config", concluido: false },
    { id: "bp_organizacao", titulo: "Código organizado com responsabilidades separadas", concluido: false },
    { id: "bp_erros", titulo: "Tratamento básico de erros e mensagens úteis", concluido: false },
  ].map((item) => ({ ...item }));
}

export function normalizarProjetoFinal(dados, { roadmapId, preservarId } = {}) {
  const requisitosTecnicos = normalizarChecklist(
    dados.requisitosTecnicos,
    "rt"
  );
  const requisitosFuncionais = normalizarChecklist(
    dados.requisitosFuncionais,
    "rf"
  );
  const checklistImplementacao = normalizarChecklist(
    dados.checklistImplementacao,
    "ci"
  );
  let boasPraticas = normalizarChecklist(dados.boasPraticas, "bp");
  if (!boasPraticas.length) boasPraticas = boasPraticasPadrao();

  const etapas = comoArray(dados.etapas)
    .map((e, i) => normalizarEtapa(e, i))
    .filter(Boolean)
    .map((e, i) => ({ ...e, ordem: i }));

  const topicoOrigem =
    dados.topicoOrigem && typeof dados.topicoOrigem === "object"
      ? {
          titulo: normalizarTexto(dados.topicoOrigem.titulo),
          resumo: normalizarTexto(dados.topicoOrigem.resumo),
        }
      : { titulo: "", resumo: "" };

  const nome =
    normalizarTexto(dados.nome ?? dados.titulo) ||
    topicoOrigem.titulo ||
    "Projeto Final";

  const concluido = Boolean(dados.concluido);
  const agora = agoraIso();

  return {
    id: preservarId || dados.id || `pf_${gerarId()}`,
    roadmapId: roadmapId || dados.roadmapId,
    nome,
    objetivo: normalizarTexto(dados.objetivo),
    descricao: normalizarTexto(dados.descricao),
    stackObrigatoria: normalizarListaStrings(dados.stackObrigatoria ?? dados.stack),
    requisitosTecnicos,
    requisitosFuncionais,
    checklistImplementacao,
    criteriosConclusao: normalizarListaStrings(dados.criteriosConclusao),
    etapas,
    documentacaoInicial: normalizarDocumentacaoInicial(dados.documentacaoInicial),
    boasPraticas,
    competenciasAlvoIds: normalizarListaStrings(
      dados.competenciasAlvoIds ?? dados.competenciasAlvo
    ),
    topicoOrigem,
    criadoEm: dados.criadoEm || agora,
    atualizadoEm: agora,
    concluido,
    concluidoEm: concluido ? dados.concluidoEm || agora : null,
  };
}

export function calcularProgressoProjeto(projeto) {
  const itens = [
    ...(projeto.requisitosTecnicos ?? []),
    ...(projeto.requisitosFuncionais ?? []),
    ...(projeto.checklistImplementacao ?? []),
    ...(projeto.boasPraticas ?? []),
  ];
  for (const etapa of projeto.etapas ?? []) {
    itens.push({ concluido: etapa.concluida });
    for (const t of etapa.tarefas ?? []) itens.push(t);
  }
  const total = itens.length;
  if (!total) return { total: 0, concluidos: 0, progresso: 0 };
  const concluidos = itens.filter((i) => i.concluido || i.concluida).length;
  return {
    total,
    concluidos,
    progresso: Math.round((concluidos / total) * 100),
  };
}

export function calcularProgressoTarefasRoadmap(roadmap) {
  const tarefas = roadmap?.tarefas ?? [];
  const total = tarefas.length;
  if (!total) return { total: 0, concluidas: 0, progresso: 0 };
  const concluidas = tarefas.filter((t) => t.concluida).length;
  return {
    total,
    concluidas,
    progresso: Math.round((concluidas / total) * 100),
  };
}

export function assertElegivelParaProjetoFinal(roadmap) {
  const { progresso, concluidas, total } = calcularProgressoTarefasRoadmap(roadmap);
  if (progresso < PROGRESSO_MINIMO_PROJETO_FINAL) {
    const erro = new Error(
      `Conclua pelo menos ${PROGRESSO_MINIMO_PROJETO_FINAL}% das tarefas do roadmap para gerar o Projeto Final (atual: ${progresso}% — ${concluidas}/${total}).`
    );
    erro.status = 400;
    throw erro;
  }
  return { progresso, concluidas, total };
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

export function montarContextoCompacto(roadmap) {
  const progressoTarefas = calcularProgressoTarefasRoadmap(roadmap);
  const dominioGeral = calcularDominioGeral(roadmap);
  let competencias = calcularDominioCompetencias(roadmap).map((c) => ({
    id: c.id,
    nome: c.nome,
    dominio: c.dominio,
  }));
  if (competencias.length > 15) {
    competencias = [...competencias]
      .sort((a, b) => b.dominio - a.dominio)
      .slice(0, 15);
  }

  const tarefas = roadmap.tarefas ?? [];
  const atributos = frequencias(tarefas.flatMap((t) => t.atributos ?? [])).slice(0, 8);
  const tags = frequencias(tarefas.flatMap((t) => t.tags ?? [])).slice(0, 8);

  return {
    nome: roadmap.nome,
    descricao: roadmap.descricao || "",
    progressoTarefas: progressoTarefas.progresso,
    dominioGeral: dominioGeral.dominio,
    competencias,
    atributosFrequentes: atributos,
    tagsFrequentes: tags,
    tarefas: tarefas.map((t) => ({
      titulo: t.titulo,
      concluida: Boolean(t.concluida),
    })),
  };
}

export function montarContextoCompleto(roadmap) {
  const base = montarContextoCompacto(roadmap);
  return {
    ...base,
    competencias: calcularDominioCompetencias(roadmap).map((c) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao || "",
      dominio: c.dominio,
    })),
    tarefas: (roadmap.tarefas ?? []).map((t) => ({
      titulo: t.titulo,
      tipo: t.tipo,
      dificuldade: t.dificuldade,
      concluida: Boolean(t.concluida),
      atributos: t.atributos ?? [],
      tags: t.tags ?? [],
      competenciasIds: t.competenciasIds ?? [],
      subtarefas: (t.subtarefas ?? []).map((s) => ({
        titulo: s.titulo,
        concluida: Boolean(s.concluida),
      })),
    })),
  };
}

export function normalizarTopicoEscolhido(topico) {
  if (!topico || typeof topico !== "object") {
    const erro = new Error("Tópico escolhido é obrigatório");
    erro.status = 400;
    throw erro;
  }
  const titulo = normalizarTexto(topico.titulo);
  const resumo = normalizarTexto(topico.resumo);
  if (!titulo || !resumo) {
    const erro = new Error("Tópico precisa de titulo e resumo");
    erro.status = 400;
    throw erro;
  }
  return {
    id: normalizarTexto(topico.id) || undefined,
    titulo,
    resumo,
    categoria: normalizarTexto(topico.categoria).toLowerCase() || undefined,
    stackSugerida: normalizarListaStrings(topico.stackSugerida ?? topico.stack),
    competenciasAlvoIds: normalizarListaStrings(
      topico.competenciasAlvoIds ?? topico.competenciasAlvo
    ),
  };
}

async function obterLista() {
  return projetosRepo.listarProjetosFinais().map((p) => normalizarProjetoFinal(p));
}

export async function obterProjetoPorRoadmapId(roadmapId) {
  const projeto = projetosRepo.obterProjetoFinalPorRoadmapId(roadmapId);
  return projeto ? normalizarProjetoFinal(projeto) : null;
}

export async function obterProjetoPorId(id) {
  const projeto = projetosRepo.obterProjetoFinalPorId(id);
  return projeto ? normalizarProjetoFinal(projeto) : null;
}

export async function upsertProjetoFinal(roadmapId, dados) {
  const roadmap = await obterRoadmapPorId(roadmapId);
  if (!roadmap) {
    const erro = new Error("Roadmap não encontrado");
    erro.status = 404;
    throw erro;
  }

  const existente = projetosRepo.obterProjetoFinalPorRoadmapId(roadmapId);
  const projeto = normalizarProjetoFinal(
    { ...dados, roadmapId },
    {
      roadmapId,
      preservarId: existente?.id,
    }
  );
  if (existente) {
    projeto.criadoEm = existente.criadoEm || projeto.criadoEm;
  }

  return projetosRepo.upsertProjetoFinal(projeto);
}

export async function atualizarProjetoFinal(id, dados = {}) {
  const atualBruto = projetosRepo.obterProjetoFinalPorId(id);
  if (!atualBruto) return null;

  const atual = normalizarProjetoFinal(atualBruto);
  const mesclado = {
    ...atual,
    ...dados,
    id: atual.id,
    roadmapId: atual.roadmapId,
    criadoEm: atual.criadoEm,
  };

  if (dados.concluido === true) {
    mesclado.concluido = true;
    mesclado.concluidoEm = atual.concluidoEm || agoraIso();
  } else if (dados.concluido === false) {
    mesclado.concluido = false;
    mesclado.concluidoEm = null;
  }

  const projeto = normalizarProjetoFinal(mesclado, {
    roadmapId: atual.roadmapId,
    preservarId: atual.id,
  });
  return projetosRepo.upsertProjetoFinal(projeto);
}

export async function excluirProjetoFinal(id) {
  return projetosRepo.excluirProjetoFinal(id);
}

export async function excluirProjetoPorRoadmapId(roadmapId) {
  return projetosRepo.excluirProjetoFinalPorRoadmapId(roadmapId);
}

const COLECOES_ITEM = new Set([
  "requisitosTecnicos",
  "requisitosFuncionais",
  "checklistImplementacao",
  "boasPraticas",
]);

export async function toggleItemProjeto(id, { colecao, itemId, concluido, etapaId }) {
  const bruto = projetosRepo.obterProjetoFinalPorId(id);
  if (!bruto) return null;

  const projeto = normalizarProjetoFinal(bruto, {
    roadmapId: bruto.roadmapId,
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
  return projetosRepo.upsertProjetoFinal(projeto);
}
