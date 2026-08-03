import { lerSidebar, salvarSidebar } from "./db-sidebar.js";

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function erro(mensagem, status = 400) {
  const e = new Error(mensagem);
  e.status = status;
  throw e;
}

function normalizarGrupo(grupo, indice = 0) {
  return {
    id: String(grupo.id),
    nome: String(grupo.nome ?? "").trim(),
    ordem: Number.isFinite(Number(grupo.ordem)) ? Number(grupo.ordem) : indice,
  };
}

function normalizarAtribuicao(atrib = {}) {
  return {
    grupoId: atrib.grupoId ? String(atrib.grupoId) : null,
    ordem: Number.isFinite(Number(atrib.ordem)) ? Number(atrib.ordem) : 0,
    ordemTodos: Number.isFinite(Number(atrib.ordemTodos)) ? Number(atrib.ordemTodos) : 0,
  };
}

function ordenarGrupos(grupos) {
  return [...grupos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

function reindexarGrupo(atribuicoes, grupoId) {
  const ids = Object.entries(atribuicoes)
    .filter(([, a]) => a.grupoId === grupoId)
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .map(([id]) => id);

  ids.forEach((id, i) => {
    atribuicoes[id].ordem = i;
  });
}

function reindexarTodos(atribuicoes) {
  const ids = Object.entries(atribuicoes)
    .sort((a, b) => a[1].ordemTodos - b[1].ordemTodos)
    .map(([id]) => id);

  ids.forEach((id, i) => {
    atribuicoes[id].ordemTodos = i;
  });
}

export async function obterSidebar() {
  const dados = await lerSidebar();
  const grupos = ordenarGrupos(
    dados.grupos.map((g, i) => normalizarGrupo(g, i)).filter((g) => g.nome)
  );
  const atribuicoes = {};
  for (const [roadmapId, atrib] of Object.entries(dados.atribuicoes ?? {})) {
    atribuicoes[roadmapId] = normalizarAtribuicao(atrib);
    if (atribuicoes[roadmapId].grupoId && !grupos.some((g) => g.id === atribuicoes[roadmapId].grupoId)) {
      atribuicoes[roadmapId].grupoId = null;
    }
  }
  return { grupos, atribuicoes };
}

export async function criarGrupo(nome) {
  const nomeLimpo = String(nome ?? "").trim();
  if (!nomeLimpo) erro("Nome do grupo é obrigatório");

  const dados = await lerSidebar();
  const grupos = (dados.grupos ?? []).map((g, i) => normalizarGrupo(g, i));

  if (grupos.some((g) => g.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
    erro("Já existe um grupo com esse nome");
  }

  const grupo = {
    id: gerarId(),
    nome: nomeLimpo,
    ordem: grupos.length,
  };
  grupos.push(grupo);
  dados.grupos = grupos;
  await salvarSidebar(dados);
  return grupo;
}

export async function atualizarGrupo(id, { nome, ordem } = {}) {
  const dados = await lerSidebar();
  const grupos = (dados.grupos ?? []).map((g, i) => normalizarGrupo(g, i));
  const grupo = grupos.find((g) => g.id === id);
  if (!grupo) return null;

  if (nome !== undefined) {
    const nomeLimpo = String(nome).trim();
    if (!nomeLimpo) erro("Nome do grupo é obrigatório");
    if (grupos.some((g) => g.id !== id && g.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      erro("Já existe um grupo com esse nome");
    }
    grupo.nome = nomeLimpo;
  }

  if (ordem !== undefined && Number.isFinite(Number(ordem))) {
    grupo.ordem = Number(ordem);
  }

  dados.grupos = ordenarGrupos(grupos).map((g, i) => ({ ...g, ordem: i }));
  await salvarSidebar(dados);
  return dados.grupos.find((g) => g.id === id) ?? null;
}

export async function excluirGrupo(id) {
  const dados = await lerSidebar();
  const grupos = (dados.grupos ?? []).map((g, i) => normalizarGrupo(g, i));
  const indice = grupos.findIndex((g) => g.id === id);
  if (indice === -1) return false;

  grupos.splice(indice, 1);
  dados.grupos = grupos.map((g, i) => ({ ...g, ordem: i }));

  for (const atrib of Object.values(dados.atribuicoes ?? {})) {
    if (atrib.grupoId === id) atrib.grupoId = null;
  }

  await salvarSidebar(dados);
  return true;
}

export async function reordenarGrupos(ids) {
  if (!Array.isArray(ids) || !ids.length) erro("Lista de ids é obrigatória");

  const dados = await lerSidebar();
  const mapa = new Map((dados.grupos ?? []).map((g) => [g.id, normalizarGrupo(g)]));

  if (ids.some((id) => !mapa.has(id)) || ids.length !== mapa.size) {
    erro("Lista de grupos inválida");
  }

  dados.grupos = ids.map((id, i) => ({ ...mapa.get(id), ordem: i }));
  await salvarSidebar(dados);
  return dados.grupos;
}

export async function atribuirRoadmap(roadmapId, { grupoId, ordem, ordemTodos } = {}) {
  const dados = await lerSidebar();
  if (!dados.atribuicoes) dados.atribuicoes = {};

  const atual = normalizarAtribuicao(dados.atribuicoes[roadmapId]);
  const grupoAnterior = atual.grupoId;

  if (grupoId !== undefined) {
    if (grupoId === null || grupoId === "") {
      atual.grupoId = null;
    } else {
      const existe = (dados.grupos ?? []).some((g) => g.id === grupoId);
      if (!existe) erro("Grupo não encontrado");
      atual.grupoId = grupoId;
    }
  }

  if (ordem !== undefined && Number.isFinite(Number(ordem))) {
    atual.ordem = Number(ordem);
  }

  if (ordemTodos !== undefined && Number.isFinite(Number(ordemTodos))) {
    atual.ordemTodos = Number(ordemTodos);
  }

  dados.atribuicoes[roadmapId] = atual;

  if (grupoAnterior && grupoAnterior !== atual.grupoId) {
    reindexarGrupo(dados.atribuicoes, grupoAnterior);
  }
  if (atual.grupoId) {
    if (ordem === undefined) {
      const max = Object.values(dados.atribuicoes)
        .filter((a) => a.grupoId === atual.grupoId && a !== atual)
        .reduce((m, a) => Math.max(m, a.ordem), -1);
      atual.ordem = max + 1;
    }
    reindexarGrupo(dados.atribuicoes, atual.grupoId);
  }

  if (ordemTodos === undefined && !dados.atribuicoes[roadmapId].ordemTodos) {
    const maxTodos = Object.values(dados.atribuicoes).reduce((m, a) => Math.max(m, a.ordemTodos), -1);
    dados.atribuicoes[roadmapId].ordemTodos = maxTodos + 1;
  }

  await salvarSidebar(dados);
  return dados.atribuicoes[roadmapId];
}

export async function reordenarRoadmaps({ grupoId = null, ids }) {
  if (!Array.isArray(ids)) erro("Lista de ids é obrigatória");

  const dados = await lerSidebar();
  if (!dados.atribuicoes) dados.atribuicoes = {};

  const grupo = grupoId || null;

  for (let i = 0; i < ids.length; i++) {
    const roadmapId = ids[i];
    if (!dados.atribuicoes[roadmapId]) {
      dados.atribuicoes[roadmapId] = normalizarAtribuicao({});
    }
    if (grupo) {
      if (dados.atribuicoes[roadmapId].grupoId !== grupo) {
        dados.atribuicoes[roadmapId].grupoId = grupo;
      }
      dados.atribuicoes[roadmapId].ordem = i;
    } else {
      dados.atribuicoes[roadmapId].ordemTodos = i;
    }
  }

  await salvarSidebar(dados);
  return dados.atribuicoes;
}

export async function removerRoadmapDasAtribuicoes(roadmapId) {
  const dados = await lerSidebar();
  if (!dados.atribuicoes?.[roadmapId]) return;

  const grupoId = dados.atribuicoes[roadmapId].grupoId;
  delete dados.atribuicoes[roadmapId];

  if (grupoId) reindexarGrupo(dados.atribuicoes, grupoId);
  reindexarTodos(dados.atribuicoes);

  await salvarSidebar(dados);
}

export async function inicializarAtribuicoes(roadmapIds) {
  const dados = await lerSidebar();
  if (!dados.atribuicoes) dados.atribuicoes = {};

  let alterou = false;
  let maxTodos = Object.values(dados.atribuicoes).reduce((m, a) => Math.max(m, a.ordemTodos ?? 0), -1);

  for (const id of roadmapIds) {
    if (!dados.atribuicoes[id]) {
      maxTodos += 1;
      dados.atribuicoes[id] = { grupoId: null, ordem: 0, ordemTodos: maxTodos };
      alterou = true;
    }
  }

  const idsValidos = new Set(roadmapIds);
  for (const id of Object.keys(dados.atribuicoes)) {
    if (!idsValidos.has(id)) {
      delete dados.atribuicoes[id];
      alterou = true;
    }
  }

  if (alterou) {
    reindexarTodos(dados.atribuicoes);
    await salvarSidebar(dados);
  }

  return dados.atribuicoes;
}
