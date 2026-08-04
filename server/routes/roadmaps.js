import { Router } from "express";
import * as service from "../roadmaps-service.js";
import { gerarRoadmapComIa, previewPromptGeracao } from "../ai/gerar-roadmap.js";
import { excluirProjetoPorRoadmapId } from "../projetos-finais-service.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    res.json(await service.listarRoadmaps());
  } catch (erro) {
    next(erro);
  }
});

router.post("/import", async (req, res, next) => {
  try {
    const resultado = await service.importarDeJson(req.body);
    res.status(201).json({
      quantidade: resultado.importados.length,
      avisos: resultado.avisos,
      roadmaps: resultado.importados,
    });
  } catch (erro) {
    if (erro.message && !erro.message.startsWith("Erro interno")) {
      return res.status(400).json({ erro: erro.message });
    }
    next(erro);
  }
});

function extrairParamsGeracao(body) {
  const {
    tema,
    objetivos,
    experiencia,
    estilo,
    profundidade,
    tempo,
    tiposAtividade,
    restricoes,
  } = body ?? {};
  return {
    tema,
    objetivos,
    experiencia,
    estilo,
    profundidade,
    tempo,
    tiposAtividade,
    restricoes,
  };
}

router.post("/gerar/preview", async (req, res, next) => {
  try {
    const resultado = previewPromptGeracao(extrairParamsGeracao(req.body));
    res.json(resultado);
  } catch (erro) {
    if (erro.status === 400) {
      return res.status(400).json({ erro: erro.message });
    }
    next(erro);
  }
});

router.post("/gerar", async (req, res, next) => {
  try {
    const resultado = await gerarRoadmapComIa(extrairParamsGeracao(req.body));
    res.json({
      roadmap: resultado.roadmap,
      modeloUsado: resultado.modeloUsado,
    });
  } catch (erro) {
    if (erro.status === 400 || erro.status === 503 || erro.status === 502) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    if (erro.message && !erro.message.startsWith("Erro interno")) {
      return res.status(502).json({ erro: erro.message });
    }
    next(erro);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const roadmap = await service.obterRoadmapPorId(req.params.id);
    if (!roadmap) return res.status(404).json({ erro: "Roadmap não encontrado" });
    res.json(roadmap);
  } catch (erro) {
    next(erro);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ erro: "Nome é obrigatório" });
    const roadmap = await service.criarRoadmap(nome, descricao);
    res.status(201).json(roadmap);
  } catch (erro) {
    next(erro);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const roadmap = await service.atualizarRoadmap(req.params.id, req.body);
    if (!roadmap) return res.status(404).json({ erro: "Roadmap não encontrado" });
    res.json(roadmap);
  } catch (erro) {
    if (erro.status === 400) return res.status(400).json({ erro: erro.message });
    next(erro);
  }
});

router.post("/:id/competencias", async (req, res, next) => {
  try {
    const competencia = await service.adicionarCompetencia(req.params.id, req.body);
    if (!competencia) return res.status(404).json({ erro: "Roadmap não encontrado" });
    res.status(201).json(competencia);
  } catch (erro) {
    if (erro.status === 400) return res.status(400).json({ erro: erro.message });
    next(erro);
  }
});

router.put("/:id/competencias/:competenciaId", async (req, res, next) => {
  try {
    const competencia = await service.atualizarCompetencia(
      req.params.id,
      req.params.competenciaId,
      req.body
    );
    if (!competencia) return res.status(404).json({ erro: "Competência não encontrada" });
    res.json(competencia);
  } catch (erro) {
    if (erro.status === 400) return res.status(400).json({ erro: erro.message });
    next(erro);
  }
});

router.delete("/:id/competencias/:competenciaId", async (req, res, next) => {
  try {
    await service.excluirCompetencia(req.params.id, req.params.competenciaId);
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await service.excluirRoadmap(req.params.id);
    await excluirProjetoPorRoadmapId(req.params.id);
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

router.post("/:id/tarefas", async (req, res, next) => {
  try {
    const tarefa = await service.adicionarTarefa(req.params.id, req.body);
    if (!tarefa) return res.status(404).json({ erro: "Roadmap não encontrado" });
    res.status(201).json(tarefa);
  } catch (erro) {
    next(erro);
  }
});

router.put("/:id/tarefas/reordenar", async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ erro: "Lista de ids inválida" });
    const roadmap = await service.reordenarTarefas(req.params.id, ids);
    if (!roadmap) return res.status(400).json({ erro: "Não foi possível reordenar" });
    res.json(roadmap);
  } catch (erro) {
    next(erro);
  }
});

router.put("/:roadmapId/tarefas/:tarefaId", async (req, res, next) => {
  try {
    const tarefa = await service.atualizarTarefa(
      req.params.roadmapId,
      req.params.tarefaId,
      req.body
    );
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });
    res.json(tarefa);
  } catch (erro) {
    if (erro.status === 400) return res.status(400).json({ erro: erro.message });
    next(erro);
  }
});

router.post("/:roadmapId/tarefas/:tarefaId/tempo", async (req, res, next) => {
  try {
    const tarefa = await service.registrarTempo(
      req.params.roadmapId,
      req.params.tarefaId,
      req.body.horas
    );
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });
    res.json(tarefa);
  } catch (erro) {
    if (erro.status === 400) return res.status(400).json({ erro: erro.message });
    next(erro);
  }
});

router.post("/:roadmapId/tarefas/:tarefaId/timer/iniciar", async (req, res, next) => {
  try {
    const tarefa = await service.iniciarTimer(req.params.roadmapId, req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });
    res.json(tarefa);
  } catch (erro) {
    next(erro);
  }
});

router.post("/:roadmapId/tarefas/:tarefaId/timer/parar", async (req, res, next) => {
  try {
    const tarefa = await service.pararTimer(req.params.roadmapId, req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });
    res.json(tarefa);
  } catch (erro) {
    next(erro);
  }
});

router.delete("/:roadmapId/tarefas/:tarefaId", async (req, res, next) => {
  try {
    await service.excluirTarefa(req.params.roadmapId, req.params.tarefaId);
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

router.put("/:roadmapId/tarefas/:tarefaId/mover", async (req, res, next) => {
  try {
    const direcao = Number(req.body.direcao);
    if (direcao !== 1 && direcao !== -1) {
      return res.status(400).json({ erro: "Direção inválida" });
    }
    const roadmap = await service.moverTarefa(
      req.params.roadmapId,
      req.params.tarefaId,
      direcao
    );
    if (!roadmap) return res.status(404).json({ erro: "Não foi possível mover" });
    res.json(roadmap);
  } catch (erro) {
    next(erro);
  }
});

router.post("/:roadmapId/tarefas/:tarefaId/subtarefas", async (req, res, next) => {
  try {
    const subtarefa = await service.adicionarSubtarefa(
      req.params.roadmapId,
      req.params.tarefaId,
      req.body.titulo
    );
    if (!subtarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });
    res.status(201).json(subtarefa);
  } catch (erro) {
    next(erro);
  }
});

router.put("/:roadmapId/tarefas/:tarefaId/subtarefas/:subtarefaId", async (req, res, next) => {
  try {
    const subtarefa = await service.atualizarSubtarefa(
      req.params.roadmapId,
      req.params.tarefaId,
      req.params.subtarefaId,
      req.body
    );
    if (!subtarefa) return res.status(404).json({ erro: "Subtarefa não encontrada" });
    res.json(subtarefa);
  } catch (erro) {
    next(erro);
  }
});

router.delete("/:roadmapId/tarefas/:tarefaId/subtarefas/:subtarefaId", async (req, res, next) => {
  try {
    await service.excluirSubtarefa(
      req.params.roadmapId,
      req.params.tarefaId,
      req.params.subtarefaId
    );
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

export default router;
