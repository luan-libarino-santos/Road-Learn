import { Router } from "express";
import * as service from "../sidebar-service.js";
import { listarRoadmaps } from "../roadmaps-service.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const roadmaps = await listarRoadmaps();
    await service.inicializarAtribuicoes(roadmaps.map((r) => r.id));
    res.json(await service.obterSidebar());
  } catch (erro) {
    next(erro);
  }
});

router.post("/grupos", async (req, res, next) => {
  try {
    const grupo = await service.criarGrupo(req.body?.nome);
    res.status(201).json(grupo);
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  }
});

router.put("/grupos/reordenar", async (req, res, next) => {
  try {
    const grupos = await service.reordenarGrupos(req.body?.ids);
    res.json(grupos);
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  }
});

router.put("/grupos/:id", async (req, res, next) => {
  try {
    const grupo = await service.atualizarGrupo(req.params.id, req.body);
    if (!grupo) return res.status(404).json({ erro: "Grupo não encontrado" });
    res.json(grupo);
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  }
});

router.delete("/grupos/:id", async (req, res, next) => {
  try {
    const ok = await service.excluirGrupo(req.params.id);
    if (!ok) return res.status(404).json({ erro: "Grupo não encontrado" });
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

router.put("/atribuicoes/:roadmapId", async (req, res, next) => {
  try {
    const atribuicao = await service.atribuirRoadmap(req.params.roadmapId, req.body);
    res.json(atribuicao);
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  }
});

router.put("/reordenar", async (req, res, next) => {
  try {
    const atribuicoes = await service.reordenarRoadmaps(req.body);
    res.json(atribuicoes);
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  }
});

export default router;
