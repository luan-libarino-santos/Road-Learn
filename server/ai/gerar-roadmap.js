import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTRUCOES_PATH = join(__dirname, "..", "..", "docs", "INSTRUCOES_IA_ROADMAP.md");

export const MODELOS_FALLBACK = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

export const OBJETIVOS_VALIDOS = [
  "Aprendizado inicial",
  "Aprofundamento",
  "Revisão",
  "Projetos práticos",
  "Preparação profissional",
];
export const EXPERIENCIAS_VALIDAS = [
  "Iniciante",
  "Já tenho fundamentos",
  "Intermediário",
  "Avançado",
];
export const ESTILOS_VALIDOS = [
  "Teórico",
  "Prático",
  "Equilibrado",
  "Baseado em projetos",
  "Desafios/exercícios",
];
export const PROFUNDIDADES_VALIDAS = ["Resumo", "Normal", "Completo", "Extenso"];
export const TEMPOS_PREDEFINIDOS = [
  "1 semana",
  "1 mês",
  "3 meses",
  "6 meses",
  "Sem prazo",
];
export const TIPOS_ATIVIDADE_VALIDOS = [
  "Conceitos",
  "Exercícios",
  "Projetos",
  "Pesquisas",
  "Leituras",
  "Revisões",
];

let instrucoesCache = null;

function obterInstrucoes() {
  if (!instrucoesCache) {
    instrucoesCache = readFileSync(INSTRUCOES_PATH, "utf-8");
  }
  return instrucoesCache;
}

function normalizarLista(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (valor == null || valor === "") return [];
  return [String(valor).trim()].filter(Boolean);
}

function validarListaEnum(lista, permitidos, rotulo) {
  if (!lista.length) {
    const erro = new Error(`${rotulo} é obrigatório — selecione ao menos uma opção`);
    erro.status = 400;
    throw erro;
  }
  const invalidos = lista.filter((item) => !permitidos.includes(item));
  if (invalidos.length) {
    const erro = new Error(
      `${rotulo} inválido (${invalidos.join(", ")}). Use: ${permitidos.join(", ")}`
    );
    erro.status = 400;
    throw erro;
  }
}

function montarPrompt({
  tema,
  objetivos,
  experiencia,
  estilo,
  profundidade,
  tempo,
  tiposAtividade,
  restricoes,
}) {
  const restricoesTrim = String(restricoes ?? "").trim();
  const blocoRestricoes = restricoesTrim
    ? `\n- **Restrições / Observações:** ${restricoesTrim}`
    : "";

  return `${obterInstrucoes()}

---

## Pedido do usuário

Gere o roadmap com estes parâmetros:

- **Tema:** ${tema}
- **Objetivo(s):** ${objetivos.join("; ")}
- **Experiência atual:** ${experiencia}
- **Formato de aprendizado:** ${estilo}
- **Profundidade:** ${profundidade}
- **Tempo disponível:** ${tempo}
- **Tipos de atividades:** ${tiposAtividade.join("; ")}${blocoRestricoes}

Responda APENAS com o JSON válido, sem markdown e sem explicações.`;
}

/**
 * Valida e normaliza os parâmetros do formulário de geração.
 * @returns {{
 *   tema: string,
 *   objetivos: string[],
 *   experiencia: string,
 *   estilo: string,
 *   profundidade: string,
 *   tempo: string,
 *   tiposAtividade: string[],
 *   restricoes: string,
 * }}
 */
export function normalizarParamsGeracao(params) {
  const tema = String(params.tema ?? "").trim();
  const objetivos = normalizarLista(params.objetivos);
  const experiencia = String(params.experiencia ?? "").trim();
  const estilo = String(params.estilo ?? "").trim();
  const profundidade = String(params.profundidade ?? "").trim();
  const tempo = String(params.tempo ?? "").trim();
  const tiposAtividade = normalizarLista(params.tiposAtividade);
  const restricoes = String(params.restricoes ?? "").trim();

  if (!tema) {
    const erro = new Error("Tema é obrigatório");
    erro.status = 400;
    throw erro;
  }

  validarListaEnum(objetivos, OBJETIVOS_VALIDOS, "Objetivo");
  validarListaEnum(tiposAtividade, TIPOS_ATIVIDADE_VALIDOS, "Tipos de atividades");

  if (!EXPERIENCIAS_VALIDAS.includes(experiencia)) {
    const erro = new Error(
      `Experiência inválida. Use: ${EXPERIENCIAS_VALIDAS.join(", ")}`
    );
    erro.status = 400;
    throw erro;
  }
  if (!ESTILOS_VALIDOS.includes(estilo)) {
    const erro = new Error(`Estilo inválido. Use: ${ESTILOS_VALIDOS.join(", ")}`);
    erro.status = 400;
    throw erro;
  }
  if (!PROFUNDIDADES_VALIDAS.includes(profundidade)) {
    const erro = new Error(
      `Profundidade inválida. Use: ${PROFUNDIDADES_VALIDAS.join(", ")}`
    );
    erro.status = 400;
    throw erro;
  }
  if (!tempo) {
    const erro = new Error("Tempo disponível é obrigatório");
    erro.status = 400;
    throw erro;
  }

  return {
    tema,
    objetivos,
    experiencia,
    estilo,
    profundidade,
    tempo,
    tiposAtividade,
    restricoes,
  };
}

/**
 * Monta o prompt completo sem chamar a IA (para preview).
 * @returns {{ prompt: string }}
 */
export function previewPromptGeracao(params) {
  const normalizados = normalizarParamsGeracao(params);
  return { prompt: montarPrompt(normalizados) };
}

function mensagemErro(erro) {
  if (!erro) return "";
  const partes = [erro.message, erro.status, erro.code, erro.statusText];
  if (erro.error?.message) partes.push(erro.error.message);
  if (erro.error?.status) partes.push(erro.error.status);
  try {
    partes.push(JSON.stringify(erro));
  } catch {
    /* ignore */
  }
  return partes.filter(Boolean).join(" ");
}

function deveTentarProximoModelo(erro) {
  const texto = mensagemErro(erro).toLowerCase();
  const status = erro?.status ?? erro?.code ?? erro?.error?.code;

  if (status === 429 || status === 404 || status === 503) return true;
  if (typeof status === "string") {
    const s = status.toUpperCase();
    if (
      s.includes("RESOURCE_EXHAUSTED") ||
      s.includes("UNAVAILABLE") ||
      s.includes("NOT_FOUND") ||
      s.includes("TOO_MANY_REQUESTS")
    ) {
      return true;
    }
  }

  return (
    texto.includes("resource_exhausted") ||
    texto.includes("quota") ||
    texto.includes("rate limit") ||
    texto.includes("rate_limit") ||
    texto.includes("billing") ||
    texto.includes("exhausted") ||
    texto.includes("unavailable") ||
    texto.includes("not found") ||
    texto.includes("not_found") ||
    texto.includes("model_not_found") ||
    texto.includes("is not found") ||
    texto.includes("does not exist") ||
    texto.includes("429") ||
    texto.includes("503") ||
    texto.includes("404")
  );
}

/**
 * @param {{
 *   tema: string,
 *   objetivos: string[],
 *   experiencia: string,
 *   estilo: string,
 *   profundidade: string,
 *   tempo: string,
 *   tiposAtividade: string[],
 *   restricoes?: string,
 * }} params
 * @returns {Promise<{ roadmap: object, modeloUsado: string }>}
 */
export async function gerarRoadmapComIa(params) {
  const normalizados = normalizarParamsGeracao(params);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const erro = new Error("Configure GEMINI_API_KEY no .env");
    erro.status = 503;
    throw erro;
  }

  const prompt = montarPrompt(normalizados);
  const ai = new GoogleGenAI({ apiKey });

  const tentativas = [];

  for (const modelo of MODELOS_FALLBACK) {
    try {
      const response = await ai.models.generateContent({
        model: modelo,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const texto = response.text;
      if (!texto?.trim()) {
        tentativas.push({ modelo, motivo: "resposta vazia" });
        continue;
      }

      let roadmap;
      try {
        roadmap = JSON.parse(texto);
      } catch {
        tentativas.push({ modelo, motivo: "JSON inválido" });
        continue;
      }

      if (!roadmap || typeof roadmap !== "object" || Array.isArray(roadmap)) {
        tentativas.push({ modelo, motivo: "JSON sem objeto raiz" });
        continue;
      }

      return { roadmap, modeloUsado: modelo };
    } catch (erro) {
      tentativas.push({
        modelo,
        motivo: erro?.message || String(erro),
      });
      if (deveTentarProximoModelo(erro)) continue;
      const falha = new Error(erro?.message || "Falha ao gerar roadmap com IA");
      falha.status = erro?.status === 400 ? 400 : 502;
      falha.tentativas = tentativas;
      throw falha;
    }
  }

  const resumo = tentativas.map((t) => `${t.modelo}: ${t.motivo}`).join(" · ");
  const erro = new Error(
    `Nenhum modelo Gemini disponível para gerar o roadmap.${resumo ? ` Tentativas: ${resumo}` : ""}`
  );
  erro.status = 502;
  erro.tentativas = tentativas;
  throw erro;
}
