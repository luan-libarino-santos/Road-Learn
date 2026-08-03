import { IR_CONFIG } from "../config.js";

const PT_DIACRITICS = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/;
const PT_WORDS =
  /\b(objetos|propriedades|métodos|metodos|introduzir|aprender|criar|implementar|guia|exemplo|praticas|práticas|boas|rotas|autenticacao|autenticação|validacao|validação|subconsultas|persistencia|persistência|formulario|formulário|semantica|semântica|orientacao|orientação|heranca|herança|encapsulamento|filas|indice|índice|transacao|transação|agregacao|agregação|em|de|para|com|sobre|como|usando|utilizando|poo|programacao|programação)\b/i;

function getApiKey() {
  return process.env.DEEPL_API_KEY?.trim() || null;
}

function getApiUrl(apiKey) {
  if (process.env.DEEPL_API_URL?.trim()) {
    return process.env.DEEPL_API_URL.trim().replace(/\/$/, "");
  }
  return apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

/**
 * Heurística: consulta já está em inglês ou é termo técnico internacional.
 * @param {string} query
 */
export function isLikelyEnglish(query) {
  if (!query?.trim()) return true;
  if (PT_DIACRITICS.test(query)) return false;
  if (PT_WORDS.test(query)) return false;
  return true;
}

/**
 * @param {string[]} texts
 * @param {string} apiKey
 */
async function callDeepL(texts, apiKey) {
  const url = getApiUrl(apiKey);
  const body = new URLSearchParams();
  body.set("target_lang", IR_CONFIG.deeplTargetLang);
  body.set("source_lang", IR_CONFIG.deeplSourceLang);

  for (const text of texts) {
    body.append("text", text);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepL ${res.status}: ${detail.slice(0, 120) || res.statusText}`);
  }

  const data = await res.json();
  return (data.translations ?? []).map((t) => t.text);
}

/**
 * Traduz consultas PT → EN para busca. Fallback: originais se falhar ou sem chave.
 * @param {string[]} queries
 * @param {Object} [options]
 * @param {boolean} [options.enabled]
 * @returns {Promise<{ queries: string[], translation: Object }>}
 */
export async function translateQueriesForSearch(queries, options = {}) {
  const enabled = options.enabled !== false;
  const apiKey = getApiKey();

  const meta = {
    enabled,
    applied: false,
    fallback: false,
    reason: null,
    translatedCount: 0,
    skippedCount: 0,
    pairs: [],
  };

  if (!enabled) {
    meta.reason = "desativado";
    return { queries, translation: meta };
  }

  if (!apiKey) {
    meta.fallback = true;
    meta.reason = "DEEPL_API_KEY não configurada";
    return { queries, translation: meta };
  }

  const toTranslate = [];
  const indices = [];

  for (let i = 0; i < queries.length; i++) {
    if (isLikelyEnglish(queries[i])) {
      meta.skippedCount++;
      continue;
    }
    toTranslate.push(queries[i]);
    indices.push(i);
  }

  if (toTranslate.length === 0) {
    meta.reason = "todas as consultas já parecem inglês";
    return { queries, translation: meta };
  }

  try {
    const translated = await callDeepL(toTranslate, apiKey);
    const result = [...queries];

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const original = queries[idx];
      const en = translated[i]?.trim() || original;
      result[idx] = en;
      if (en !== original) {
        meta.translatedCount++;
        meta.pairs.push({ original, translated: en });
      }
    }

    meta.applied = meta.translatedCount > 0;
    meta.reason = meta.applied ? "deepl" : "sem alteração após tradução";
    return { queries: result, translation: meta };
  } catch (err) {
    meta.fallback = true;
    meta.reason = err.message;
    return { queries, translation: meta };
  }
}

export function isDeepLConfigured() {
  return Boolean(getApiKey());
}
