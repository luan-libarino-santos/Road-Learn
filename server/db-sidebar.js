import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIDEBAR_PATH = join(__dirname, "..", "data", "sidebar.json");

const PADRAO = { grupos: [], atribuicoes: {} };

export async function lerSidebar() {
  try {
    const conteudo = await readFile(SIDEBAR_PATH, "utf-8");
    const dados = JSON.parse(conteudo);
    return {
      grupos: Array.isArray(dados.grupos) ? dados.grupos : [],
      atribuicoes: dados.atribuicoes && typeof dados.atribuicoes === "object" ? dados.atribuicoes : {},
    };
  } catch (erro) {
    if (erro.code === "ENOENT") {
      await garantirPasta();
      await writeFile(SIDEBAR_PATH, JSON.stringify(PADRAO, null, 2), "utf-8");
      return { ...PADRAO };
    }
    throw erro;
  }
}

export async function salvarSidebar(dados) {
  await garantirPasta();
  await writeFile(SIDEBAR_PATH, JSON.stringify(dados, null, 2), "utf-8");
}

async function garantirPasta() {
  await mkdir(dirname(SIDEBAR_PATH), { recursive: true });
}
