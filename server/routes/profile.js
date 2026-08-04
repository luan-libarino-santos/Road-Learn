import { Router } from "express";
import * as service from "../profile-service.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const perfil = await service.garantirPerfilInicial();
    res.json(perfil);
  } catch (erro) {
    next(erro);
  }
});

router.post("/rebuild", async (_req, res, next) => {
  try {
    const perfil = await service.rebuildPerfil();
    res.json(perfil);
  } catch (erro) {
    next(erro);
  }
});

router.patch("/identidade", async (req, res, next) => {
  try {
    const perfil = await service.atualizarIdentidade(req.body);
    res.json(perfil);
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  }
});

router.patch("/tema", async (req, res, next) => {
  try {
    const perfil = await service.atualizarTema(req.body);
    res.json(perfil);
  } catch (erro) {
    if (erro.status) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  }
});

export default router;
