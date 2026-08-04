import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_PATH = join(__dirname, "..", "data", "profile.json");

export function perfilVazio() {
  return {
    atualizadoEm: new Date().toISOString(),
    xp: 0,
    roadmapsCompletosBonus: [],
    habilidades: [],
    logXp: [],
    historicoHabilidades: [],
  };
}

export async function lerPerfil() {
  try {
    const conteudo = await readFile(PROFILE_PATH, "utf-8");
    if (!conteudo.trim()) {
      const vazio = perfilVazio();
      await salvarPerfil(vazio);
      return vazio;
    }
    const dados = JSON.parse(conteudo);
    return {
      ...perfilVazio(),
      ...dados,
      roadmapsCompletosBonus: Array.isArray(dados.roadmapsCompletosBonus)
        ? dados.roadmapsCompletosBonus
        : [],
      habilidades: Array.isArray(dados.habilidades) ? dados.habilidades : [],
      logXp: Array.isArray(dados.logXp) ? dados.logXp : [],
      historicoHabilidades: Array.isArray(dados.historicoHabilidades)
        ? dados.historicoHabilidades
        : [],
      xp: Math.max(0, Number(dados.xp) || 0),
    };
  } catch (erro) {
    if (erro.code === "ENOENT" || erro instanceof SyntaxError) {
      await garantirPasta();
      const vazio = perfilVazio();
      await writeFile(PROFILE_PATH, JSON.stringify(vazio, null, 2), "utf-8");
      return vazio;
    }
    throw erro;
  }
}

export async function salvarPerfil(perfil) {
  await garantirPasta();
  const dados = {
    ...perfil,
    atualizadoEm: new Date().toISOString(),
  };
  await writeFile(PROFILE_PATH, JSON.stringify(dados, null, 2), "utf-8");
}

async function garantirPasta() {
  await mkdir(dirname(PROFILE_PATH), { recursive: true });
}
