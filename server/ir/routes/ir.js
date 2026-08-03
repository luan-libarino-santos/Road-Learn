import { Router } from "express";
import { searchTask, listProviders } from "../index.js";

const router = Router();

router.get("/providers", (_req, res) => {
  res.json({ providers: listProviders() });
});

router.post("/search", async (req, res) => {
  try {
    const { roadmapNome, titulo, descricao, subtarefas, options } = req.body ?? {};

    if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
      return res.status(400).json({ erro: "Campo 'titulo' é obrigatório" });
    }

    const resultado = await searchTask({
      roadmapNome: typeof roadmapNome === "string" ? roadmapNome.trim() : "",
      titulo: titulo.trim(),
      descricao: descricao?.trim() ?? "",
      subtarefas: subtarefas ?? [],
      options: options ?? {},
    });

    res.json(resultado);
  } catch (err) {
    console.error("[IR] Erro na busca:", err);
    res.status(500).json({ erro: err.message ?? "Erro interno no motor IR" });
  }
});

export default router;
