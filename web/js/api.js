const API_BASE = "/api";

async function requisicao(metodo, caminho, corpo) {
  const opcoes = { method: metodo, headers: {} };

  if (corpo !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }

  const resposta = await fetch(`${API_BASE}${caminho}`, opcoes);

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    const mensagem =
      erro.erro ||
      (resposta.status === 404
        ? `Rota não encontrada (${caminho}). Reinicie o servidor.`
        : `Erro ${resposta.status}`);
    throw new Error(mensagem);
  }

  if (resposta.status === 204) return null;
  return resposta.json();
}

export const api = {
  listarRoadmaps: () => requisicao("GET", "/roadmaps"),
  obterRoadmap: (id) => requisicao("GET", `/roadmaps/${id}`),
  criarRoadmap: (dados) => requisicao("POST", "/roadmaps", dados),
  atualizarRoadmap: (id, dados) => requisicao("PUT", `/roadmaps/${id}`, dados),
  importarRoadmaps: (dados) => requisicao("POST", "/roadmaps/import", dados),
  gerarRoadmapIa: (dados) => requisicao("POST", "/roadmaps/gerar", dados),
  previewPromptRoadmapIa: (dados) =>
    requisicao("POST", "/roadmaps/gerar/preview", dados),
  excluirRoadmap: (id) => requisicao("DELETE", `/roadmaps/${id}`),
  adicionarCompetencia: (roadmapId, dados) =>
    requisicao("POST", `/roadmaps/${roadmapId}/competencias`, dados),
  atualizarCompetencia: (roadmapId, competenciaId, dados) =>
    requisicao("PUT", `/roadmaps/${roadmapId}/competencias/${competenciaId}`, dados),
  excluirCompetencia: (roadmapId, competenciaId) =>
    requisicao("DELETE", `/roadmaps/${roadmapId}/competencias/${competenciaId}`),
  adicionarTarefa: (roadmapId, dados) => requisicao("POST", `/roadmaps/${roadmapId}/tarefas`, dados),
  atualizarTarefa: (roadmapId, tarefaId, dados) =>
    requisicao("PUT", `/roadmaps/${roadmapId}/tarefas/${tarefaId}`, dados),
  excluirTarefa: (roadmapId, tarefaId) =>
    requisicao("DELETE", `/roadmaps/${roadmapId}/tarefas/${tarefaId}`),
  listarProvidersBusca: () => requisicao("GET", "/ir/providers"),
  buscarLinks: (dados) => requisicao("POST", "/ir/search", dados),
  registrarTempo: (roadmapId, tarefaId, horas) =>
    requisicao("POST", `/roadmaps/${roadmapId}/tarefas/${tarefaId}/tempo`, { horas }),
  iniciarTimer: (roadmapId, tarefaId) =>
    requisicao("POST", `/roadmaps/${roadmapId}/tarefas/${tarefaId}/timer/iniciar`),
  pararTimer: (roadmapId, tarefaId) =>
    requisicao("POST", `/roadmaps/${roadmapId}/tarefas/${tarefaId}/timer/parar`),
  reordenarTarefas: (roadmapId, ids) =>
    requisicao("PUT", `/roadmaps/${roadmapId}/tarefas/reordenar`, { ids }),
  moverTarefa: (roadmapId, tarefaId, direcao) =>
    requisicao("PUT", `/roadmaps/${roadmapId}/tarefas/${tarefaId}/mover`, { direcao }),
  adicionarSubtarefa: (roadmapId, tarefaId, titulo) =>
    requisicao("POST", `/roadmaps/${roadmapId}/tarefas/${tarefaId}/subtarefas`, { titulo }),
  atualizarSubtarefa: (roadmapId, tarefaId, subtarefaId, dados) =>
    requisicao("PUT", `/roadmaps/${roadmapId}/tarefas/${tarefaId}/subtarefas/${subtarefaId}`, dados),
  excluirSubtarefa: (roadmapId, tarefaId, subtarefaId) =>
    requisicao("DELETE", `/roadmaps/${roadmapId}/tarefas/${tarefaId}/subtarefas/${subtarefaId}`),
  obterSidebar: () => requisicao("GET", "/sidebar"),
  criarGrupoSidebar: (nome) => requisicao("POST", "/sidebar/grupos", { nome }),
  atualizarGrupoSidebar: (id, dados) => requisicao("PUT", `/sidebar/grupos/${id}`, dados),
  excluirGrupoSidebar: (id) => requisicao("DELETE", `/sidebar/grupos/${id}`),
  reordenarGruposSidebar: (ids) => requisicao("PUT", "/sidebar/grupos/reordenar", { ids }),
  atribuirRoadmapSidebar: (roadmapId, dados) => requisicao("PUT", `/sidebar/atribuicoes/${roadmapId}`, dados),
  reordenarRoadmapsSidebar: (grupoId, ids) =>
    requisicao("PUT", "/sidebar/reordenar", { grupoId: grupoId || null, ids }),
  obterPerfil: () => requisicao("GET", "/profile"),
  reconstruirPerfil: () => requisicao("POST", "/profile/rebuild"),
};
