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

export const NIVEIS_VALIDOS = ["Iniciante", "Intermediário", "Avançado"];
export const PORTES_VALIDOS = ["Pequeno", "Médio", "Grande"];

let instrucoesCache = null;

function obterInstrucoes() {
  if (!instrucoesCache) {
    instrucoesCache = readFileSync(INSTRUCOES_PATH, "utf-8");
  }
  return instrucoesCache;
}

function montarPrompt({ tema, nivel, porte, detalhes }) {
  const detalhesTrim = String(detalhes ?? "").trim();
  const blocoDetalhes = detalhesTrim
    ? `\n- **Detalhes adicionais:** ${detalhesTrim}`
    : "";

  return `${obterInstrucoes()}

---

## Pedido do usuário

Gere o roadmap com estes parâmetros:

- **Tema:** ${tema}
- **Nível:** ${nivel}
- **Porte:** ${porte}${blocoDetalhes}

Responda APENAS com o JSON válido, sem markdown e sem explicações.`;
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
 * @param {{ tema: string, nivel: string, porte: string, detalhes?: string }} params
 * @returns {Promise<{ roadmap: object, modeloUsado: string }>}
 */
export async function gerarRoadmapComIa(params) {
  const tema = String(params.tema ?? "").trim();
  const nivel = String(params.nivel ?? "").trim();
  const porte = String(params.porte ?? "").trim();
  const detalhes = String(params.detalhes ?? "").trim();

  if (!tema) {
    const erro = new Error("Tema é obrigatório");
    erro.status = 400;
    throw erro;
  }
  if (!NIVEIS_VALIDOS.includes(nivel)) {
    const erro = new Error(`Nível inválido. Use: ${NIVEIS_VALIDOS.join(", ")}`);
    erro.status = 400;
    throw erro;
  }
  if (!PORTES_VALIDOS.includes(porte)) {
    const erro = new Error(`Porte inválido. Use: ${PORTES_VALIDOS.join(", ")}`);
    erro.status = 400;
    throw erro;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const erro = new Error("Configure GEMINI_API_KEY no .env");
    erro.status = 503;
    throw erro;
  }

  const prompt = montarPrompt({ tema, nivel, porte, detalhes });
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
