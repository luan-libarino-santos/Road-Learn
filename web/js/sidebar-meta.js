import { api } from "./api.js";

let cache = { grupos: [], atribuicoes: {} };

export async function carregarSidebar() {
  cache = await api.obterSidebar();
  return cache;
}

export function obterSidebarMeta() {
  return cache;
}

export function obterGrupos() {
  return [...cache.grupos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function obterAtribuicao(roadmapId) {
  return cache.atribuicoes[roadmapId] ?? { grupoId: null, ordem: 0, ordemTodos: 0 };
}

export function ordenarRoadmapsParaSidebar(roadmaps, grupoAtivo = null) {
  const lista = [...roadmaps];

  if (grupoAtivo) {
    return lista
      .filter((r) => obterAtribuicao(r.id).grupoId === grupoAtivo)
      .sort((a, b) => obterAtribuicao(a.id).ordem - obterAtribuicao(b.id).ordem);
  }

  return lista.sort((a, b) => obterAtribuicao(a.id).ordemTodos - obterAtribuicao(b.id).ordemTodos);
}

export async function criarGrupoSidebar(nome) {
  const grupo = await api.criarGrupoSidebar(nome);
  await carregarSidebar();
  return grupo;
}

export async function atualizarGrupoSidebar(id, dados) {
  await api.atualizarGrupoSidebar(id, dados);
  await carregarSidebar();
}

export async function excluirGrupoSidebar(id) {
  await api.excluirGrupoSidebar(id);
  await carregarSidebar();
}

export async function reordenarGruposSidebar(ids) {
  await api.reordenarGruposSidebar(ids);
  await carregarSidebar();
}

export async function atribuirRoadmapSidebar(roadmapId, dados) {
  await api.atribuirRoadmapSidebar(roadmapId, dados);
  await carregarSidebar();
}

export async function reordenarRoadmapsSidebar(grupoId, ids) {
  await api.reordenarRoadmapsSidebar(grupoId, ids);
  await carregarSidebar();
}
