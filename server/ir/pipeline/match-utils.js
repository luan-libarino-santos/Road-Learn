/**
 * Utilitários de matching por palavra inteira (evita readonly→read, modelar→model).
 */

export function normalizeText(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Conta ocorrências de um termo no texto (palavra inteira ou literal com _).
 * @param {string} textNorm texto já normalizado
 * @param {string} term
 */
export function countTermOccurrences(textNorm, term) {
  const t = normalizeText(term);
  if (!t || t.length < 2) return 0;

  const pattern = t.includes("_") || t.includes("-")
    ? new RegExp(escapeRegex(t), "gi")
    : new RegExp(`\\b${escapeRegex(t)}\\b`, "gi");

  return (textNorm.match(pattern) ?? []).length;
}

/**
 * Verifica se um alias aparece no texto como token ou frase completa.
 * @param {string} text
 * @param {string} alias
 * @param {Set<string>} [tokens]
 */
export function matchesAlias(text, alias, tokens = new Set()) {
  const aliasNorm = normalizeText(alias);
  if (!aliasNorm || aliasNorm.length < 2) return false;

  if (tokens.has(aliasNorm)) return true;

  const normalized = normalizeText(text);

  if (aliasNorm.includes(" ")) {
    return normalized.includes(aliasNorm);
  }

  if (aliasNorm.length <= 2) {
    return tokens.has(aliasNorm);
  }

  const pattern = new RegExp(`\\b${escapeRegex(aliasNorm)}\\b`, "i");
  return pattern.test(normalized);
}

/**
 * @param {string} text
 * @param {Record<string, { aliases: string[], label?: string }>} dictionary
 * @param {Object} [options]
 * @param {number} [options.titleBoost]
 * @param {string} [options.title]
 */
export function scoreDictionaryMatches(text, dictionary, options = {}) {
  const { titleBoost = 0, title = "" } = options;
  const tokens = new Set(
    normalizeText(text)
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
  const scores = [];

  for (const [id, entry] of Object.entries(dictionary)) {
    let score = 0;
    for (const alias of entry.aliases ?? []) {
      const aliasNorm = normalizeText(alias);
      if (matchesAlias(text, alias, tokens)) {
        score += aliasNorm === id ? 3 : 1;
      }
      if (titleBoost > 0 && title && matchesAlias(title, alias, new Set())) {
        score += titleBoost;
      }
    }
    if (score > 0) {
      scores.push({ id, score, label: entry.label ?? id });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}
