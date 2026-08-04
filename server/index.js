import express from "express";
import cors from "cors";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { networkInterfaces } from "os";
import roadmapsRouter from "./routes/roadmaps.js";
import sidebarRouter from "./routes/sidebar.js";
import profileRouter from "./routes/profile.js";
import projetosFinaisRouter from "./routes/projetos-finais.js";
import irRouter from "./ir/routes/ir.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(__dirname, "..", "web");
const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/status", (_req, res) => {
  res.json({ ok: true, armazenamento: "json" });
});

app.use("/api/roadmaps", roadmapsRouter);
app.use("/api/sidebar", sidebarRouter);
app.use("/api/profile", profileRouter);
app.use("/api/projetos-finais", projetosFinaisRouter);
app.use("/api/ir", irRouter);

app.get("/", (_req, res) => {
  res.sendFile(join(WEB_DIR, "main.html"));
});

app.use(express.static(WEB_DIR));

app.use((erro, _req, res, _next) => {
  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor" });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  Roadmaps rodando em:`);
  console.log(`  → PC:      http://localhost:${PORT}`);
  const ip = obterIpLocal();
  if (ip) console.log(`  → Celular: http://${ip}:${PORT}`);
  console.log(`\n  Dados salvos em: data/roadmaps.json, data/projetos-finais.json\n`);
});

server.on("error", (erro) => {
  if (erro.code === "EADDRINUSE") {
    console.error(`\n  Erro: a porta ${PORT} ja esta em uso.`);
    console.error(`  Feche o outro servidor ou execute iniciar.bat novamente.\n`);
  } else {
    console.error(erro);
  }
  process.exit(1);
});

function obterIpLocal() {
  const interfaces = networkInterfaces();
  for (const nome of Object.keys(interfaces)) {
    for (const iface of interfaces[nome] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}
