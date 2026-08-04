import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_PATH = join(__dirname, "..", "data", "profile.json");

export const ICONES_IDENTIDADE = [
  "iniciais",
  "livro",
  "codigo",
  "compasso",
  "estrela",
  "terminal",
  "mapa",
];

export const PRESETS_TEMA = ["midnight", "ocean", "forest", "ember", "slate"];

export function identidadePadrao() {
  return {
    nomeExibicao: "",
    icone: "iniciais",
    cor: "#a8b4c4",
  };
}

export function temaPadrao() {
  return {
    preset: "midnight",
    custom: {
      accent: null,
      bgApp: null,
      bgElevated: null,
      bgSurface: null,
      radius: null,
      backgroundMode: "solid",
      bgGradientTo: null,
    },
  };
}

export function perfilVazio() {
  return {
    atualizadoEm: new Date().toISOString(),
    xp: 0,
    roadmapsCompletosBonus: [],
    habilidades: [],
    logXp: [],
    historicoHabilidades: [],
    identidade: identidadePadrao(),
    tema: temaPadrao(),
  };
}

function normalizarIdentidade(dados) {
  const padrao = identidadePadrao();
  if (!dados || typeof dados !== "object") return padrao;
  const icone = ICONES_IDENTIDADE.includes(dados.icone) ? dados.icone : padrao.icone;
  const cor =
    typeof dados.cor === "string" && /^#[0-9a-fA-F]{6}$/.test(dados.cor.trim())
      ? dados.cor.trim().toLowerCase()
      : padrao.cor;
  return {
    nomeExibicao: String(dados.nomeExibicao ?? "").trim().slice(0, 48),
    icone,
    cor,
  };
}

function normalizarCustom(custom) {
  const padrao = temaPadrao().custom;
  if (!custom || typeof custom !== "object") return { ...padrao };

  const hexOuNull = (v) => {
    if (v == null || v === "") return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return /^#[0-9a-fA-F]{6}$/.test(t) ? t.toLowerCase() : null;
  };

  let radius = null;
  if (custom.radius != null && custom.radius !== "") {
    const n = Number(custom.radius);
    if (Number.isFinite(n)) radius = Math.max(0, Math.min(24, Math.round(n)));
  }

  const backgroundMode =
    custom.backgroundMode === "gradient" ? "gradient" : "solid";

  return {
    accent: hexOuNull(custom.accent),
    bgApp: hexOuNull(custom.bgApp),
    bgElevated: hexOuNull(custom.bgElevated),
    bgSurface: hexOuNull(custom.bgSurface),
    radius,
    backgroundMode,
    bgGradientTo: hexOuNull(custom.bgGradientTo),
  };
}

function normalizarTema(dados) {
  const padrao = temaPadrao();
  if (!dados || typeof dados !== "object") return padrao;
  const preset = PRESETS_TEMA.includes(dados.preset) ? dados.preset : padrao.preset;
  return {
    preset,
    custom: normalizarCustom(dados.custom),
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
      identidade: normalizarIdentidade(dados.identidade),
      tema: normalizarTema(dados.tema),
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
    identidade: normalizarIdentidade(perfil.identidade),
    tema: normalizarTema(perfil.tema),
    atualizadoEm: new Date().toISOString(),
  };
  await writeFile(PROFILE_PATH, JSON.stringify(dados, null, 2), "utf-8");
}

async function garantirPasta() {
  await mkdir(dirname(PROFILE_PATH), { recursive: true });
}
