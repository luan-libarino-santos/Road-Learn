import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { MODELOS_FALLBACK } from "./gerar-roadmap.js";
import {
  assertElegivelParaProjetoFinal,
  montarContextoCompacto,
  montarContextoCompleto,
  normalizarProjetoFinal,
  normalizarTopicoEscolhido,
} from "../projetos-finais-service.js";
import { obterRoadmapPorId } from "../roadmaps-service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTRUCOES_TOPICOS_PATH = join(
  __dirname,
  "..",
  "..",
  "docs",
  "INSTRUCOES_IA_TOPICOS_PROJETO_FINAL.md"
);
const INSTRUCOES_PROJETO_PATH = join(
  __dirname,
  "..",
  "..",
  "docs",
  "INSTRUCOES_IA_PROJETO_FINAL.md"
);

let cacheTopicos = null;
let cacheProjeto = null;

function obterInstrucoesTopicos() {
  if (!cacheTopicos) cacheTopicos = readFileSync(INSTRUCOES_TOPICOS_PATH, "utf-8");
  return cacheTopicos;
}

function obterInstrucoesProjeto() {
  if (!cacheProjeto) cacheProjeto = readFileSync(INSTRUCOES_PROJETO_PATH, "utf-8");
  return cacheProjeto;
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

async function gerarJsonComIa(prompt, rotulo) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const erro = new Error("Configure GEMINI_API_KEY no .env");
    erro.status = 503;
    throw erro;
  }

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

      let dados;
      try {
        dados = JSON.parse(texto);
      } catch {
        tentativas.push({ modelo, motivo: "JSON inválido" });
        continue;
      }

      if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
        tentativas.push({ modelo, motivo: "JSON sem objeto raiz" });
        continue;
      }

      return { dados, modeloUsado: modelo };
    } catch (erro) {
      tentativas.push({
        modelo,
        motivo: erro?.message || String(erro),
      });
      if (deveTentarProximoModelo(erro)) continue;
      const falha = new Error(erro?.message || `Falha ao gerar ${rotulo} com IA`);
      falha.status = erro?.status === 400 ? 400 : 502;
      falha.tentativas = tentativas;
      throw falha;
    }
  }

  const resumo = tentativas.map((t) => `${t.modelo}: ${t.motivo}`).join(" · ");
  const erro = new Error(
    `Nenhum modelo Gemini disponível para gerar ${rotulo}.${resumo ? ` Tentativas: ${resumo}` : ""}`
  );
  erro.status = 502;
  erro.tentativas = tentativas;
  throw erro;
}

async function carregarRoadmapElegivel(roadmapId) {
  const id = String(roadmapId ?? "").trim();
  if (!id) {
    const erro = new Error("roadmapId é obrigatório");
    erro.status = 400;
    throw erro;
  }
  const roadmap = await obterRoadmapPorId(id);
  if (!roadmap) {
    const erro = new Error("Roadmap não encontrado");
    erro.status = 404;
    throw erro;
  }
  assertElegivelParaProjetoFinal(roadmap);
  return roadmap;
}

const CATEGORIAS_TOPICOS = new Set([
  "software",
  "github",
  "hardware",
  "profissional",
  "humano",
  "hibrido",
  "outro",
]);

function normalizarRespostaTopicos(dados) {
  const lista = Array.isArray(dados.topicos) ? dados.topicos : [];
  const topicos = lista
    .map((t, i) => {
      if (!t || typeof t !== "object") return null;
      const titulo = String(t.titulo ?? "").trim();
      const resumo = String(t.resumo ?? "").trim();
      if (!titulo || !resumo) return null;
      const categoriaBruta = String(t.categoria ?? "outro").trim().toLowerCase();
      const categoria = CATEGORIAS_TOPICOS.has(categoriaBruta)
        ? categoriaBruta
        : "outro";
      return {
        id: String(t.id ?? `t${i + 1}`).trim() || `t${i + 1}`,
        titulo,
        resumo,
        categoria,
        stackSugerida: Array.isArray(t.stackSugerida)
          ? t.stackSugerida.map((s) => String(s).trim()).filter(Boolean)
          : [],
        competenciasAlvoIds: Array.isArray(t.competenciasAlvoIds)
          ? t.competenciasAlvoIds.map((s) => String(s).trim()).filter(Boolean)
          : [],
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  if (topicos.length !== 3) {
    const erro = new Error("A IA não retornou exatamente 3 tópicos válidos");
    erro.status = 502;
    throw erro;
  }
  return topicos;
}

/**
 * Fase 1: sugere 3 tópicos com contexto compacto.
 */
export async function sugerirTopicosProjetoFinal(roadmapId) {
  const roadmap = await carregarRoadmapElegivel(roadmapId);
  const contexto = montarContextoCompacto(roadmap);

  const prompt = `${obterInstrucoesTopicos()}

---

## Contexto do roadmap (compacto)

\`\`\`json
${JSON.stringify(contexto)}
\`\`\`

Responda APENAS com o JSON válido dos 3 tópicos, sem markdown e sem explicações.`;

  const { dados, modeloUsado } = await gerarJsonComIa(prompt, "tópicos do Projeto Final");
  const topicos = normalizarRespostaTopicos(dados);
  return { topicos, modeloUsado };
}

/**
 * Fase 2: gera o Projeto Final completo para o tópico escolhido.
 */
export async function gerarProjetoFinalComIa(roadmapId, topicoBruto) {
  const roadmap = await carregarRoadmapElegivel(roadmapId);
  const topico = normalizarTopicoEscolhido(topicoBruto);
  const contexto = montarContextoCompleto(roadmap);

  const prompt = `${obterInstrucoesProjeto()}

---

## Contexto do roadmap

\`\`\`json
${JSON.stringify(contexto)}
\`\`\`

## Tópico escolhido

\`\`\`json
${JSON.stringify(topico)}
\`\`\`

Responda APENAS com o JSON válido do Projeto Final, sem markdown e sem explicações.`;

  const { dados, modeloUsado } = await gerarJsonComIa(prompt, "Projeto Final");

  const projeto = normalizarProjetoFinal(
    {
      ...dados,
      roadmapId: roadmap.id,
      topicoOrigem: {
        titulo: topico.titulo,
        resumo: topico.resumo,
      },
      competenciasAlvoIds:
        Array.isArray(dados.competenciasAlvoIds) && dados.competenciasAlvoIds.length
          ? dados.competenciasAlvoIds
          : topico.competenciasAlvoIds,
      stackObrigatoria:
        Array.isArray(dados.stackObrigatoria) && dados.stackObrigatoria.length
          ? dados.stackObrigatoria
          : topico.stackSugerida,
    },
    { roadmapId: roadmap.id }
  );

  return { projeto, modeloUsado };
}
