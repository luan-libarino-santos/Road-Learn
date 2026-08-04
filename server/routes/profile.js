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

export default router;
