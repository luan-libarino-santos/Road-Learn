import { Router } from "express";
import * as service from "../projetos-finais-service.js";
import {
  gerarProjetoFinalComIa,
  sugerirTopicosProjetoFinal,
} from "../ai/gerar-projeto-final.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const roadmapId = String(req.query.roadmapId ?? "").trim();
    if (!roadmapId) {
      return res.status(400).json({ erro: "roadmapId é obrigatório" });
    }
    const projeto = await service.obterProjetoPorRoadmapId(roadmapId);
    res.json(projeto);
  } catch (erro) {
    next(erro);
  }
});

router.post("/sugerir-topicos", async (req, res, next) => {
  try {
    const roadmapId = req.body?.roadmapId;
    const resultado = await sugerirTopicosProjetoFinal(roadmapId);
    res.json(resultado);
  } catch (erro) {
    if (erro.status === 400 || erro.status === 404 || erro.status === 503 || erro.status === 502) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    next(erro);
  }
});

router.post("/gerar", async (req, res, next) => {
  try {
    const { roadmapId, topico } = req.body ?? {};
    const resultado = await gerarProjetoFinalComIa(roadmapId, topico);
    res.json(resultado);
  } catch (erro) {
    if (erro.status === 400 || erro.status === 404 || erro.status === 503 || erro.status === 502) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    next(erro);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const roadmapId = String(req.body?.roadmapId ?? "").trim();
    if (!roadmapId) {
      return res.status(400).json({ erro: "roadmapId é obrigatório" });
    }
    const projeto = await service.upsertProjetoFinal(roadmapId, req.body ?? {});
    res.status(201).json(projeto);
  } catch (erro) {
    if (erro.status === 400 || erro.status === 404) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    next(erro);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const projeto = await service.obterProjetoPorId(req.params.id);
    if (!projeto) return res.status(404).json({ erro: "Projeto Final não encontrado" });
    res.json(projeto);
  } catch (erro) {
    next(erro);
  }
});

router.put("/:id/itens", async (req, res, next) => {
  try {
    const { colecao, itemId, concluido, etapaId } = req.body ?? {};
    if (!colecao || !itemId) {
      return res.status(400).json({ erro: "colecao e itemId são obrigatórios" });
    }
    const projeto = await service.toggleItemProjeto(req.params.id, {
      colecao,
      itemId,
      concluido,
      etapaId,
    });
    if (!projeto) return res.status(404).json({ erro: "Projeto Final não encontrado" });
    res.json(projeto);
  } catch (erro) {
    if (erro.status === 400 || erro.status === 404) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    next(erro);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const projeto = await service.atualizarProjetoFinal(req.params.id, req.body ?? {});
    if (!projeto) return res.status(404).json({ erro: "Projeto Final não encontrado" });
    res.json(projeto);
  } catch (erro) {
    next(erro);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const ok = await service.excluirProjetoFinal(req.params.id);
    if (!ok) return res.status(404).json({ erro: "Projeto Final não encontrado" });
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

export default router;
