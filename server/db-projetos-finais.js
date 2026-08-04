import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "data", "projetos-finais.json");

export async function lerProjetosFinais() {
  try {
    const conteudo = await readFile(DB_PATH, "utf-8");
    const dados = JSON.parse(conteudo);
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    if (erro.code === "ENOENT") {
      await garantirPasta();
      await writeFile(DB_PATH, "[]", "utf-8");
      return [];
    }
    throw erro;
  }
}

export async function salvarProjetosFinais(projetos) {
  await garantirPasta();
  await writeFile(DB_PATH, JSON.stringify(projetos, null, 2), "utf-8");
}

async function garantirPasta() {
  await mkdir(dirname(DB_PATH), { recursive: true });
}
