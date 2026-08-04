import { Router } from "express";
import * as service from "../projetos-integrados-service.js";
import {
  gerarProjetoIntegradoComIa,
  sugerirTopicosProjetoIntegrado,
} from "../ai/gerar-projeto-integrado.js";

const router = Router();

function erroIa(erro, res, next) {
  if (
    erro.status === 400 ||
    erro.status === 404 ||
    erro.status === 503 ||
    erro.status === 502
  ) {
    return res.status(erro.status).json({ erro: erro.message });
  }
  return next(erro);
}

router.get("/", async (_req, res, next) => {
  try {
    const projetos = await service.listarProjetosIntegrados();
    res.json(projetos);
  } catch (erro) {
    next(erro);
  }
});

router.post("/sugerir-topicos", async (req, res, next) => {
  try {
    const roadmapIds = req.body?.roadmapIds;
    const resultado = await sugerirTopicosProjetoIntegrado(roadmapIds);
    res.json(resultado);
  } catch (erro) {
    erroIa(erro, res, next);
  }
});

router.post("/gerar", async (req, res, next) => {
  try {
    const { roadmapIds, topico } = req.body ?? {};
    const resultado = await gerarProjetoIntegradoComIa(roadmapIds, topico);
    res.json(resultado);
  } catch (erro) {
    erroIa(erro, res, next);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const projeto = await service.criarProjetoIntegrado(req.body ?? {});
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
    const projeto = await service.obterProjetoIntegradoPorId(req.params.id);
    if (!projeto) {
      return res.status(404).json({ erro: "Projeto Integrado não encontrado" });
    }
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
    const projeto = await service.toggleItemProjetoIntegrado(req.params.id, {
      colecao,
      itemId,
      concluido,
      etapaId,
    });
    if (!projeto) {
      return res.status(404).json({ erro: "Projeto Integrado não encontrado" });
    }
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
    const projeto = await service.atualizarProjetoIntegrado(
      req.params.id,
      req.body ?? {}
    );
    if (!projeto) {
      return res.status(404).json({ erro: "Projeto Integrado não encontrado" });
    }
    res.json(projeto);
  } catch (erro) {
    if (erro.status === 400 || erro.status === 404) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    next(erro);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const ok = await service.excluirProjetoIntegrado(req.params.id);
    if (!ok) {
      return res.status(404).json({ erro: "Projeto Integrado não encontrado" });
    }
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

export default router;
