import { IR_CONFIG } from "../config.js";

/**
 * Limita resultados por fonte/provider, mantendo os de maior score.
 * @param {import("../types.js").SearchResult[]} results — já ordenados por score desc
 * @param {number} [maxPerProvider]
 */
export function limitPerProvider(results, maxPerProvider) {
  const limit = maxPerProvider ?? IR_CONFIG.maxResultsPerProvider;
  const counts = new Map();
  const kept = [];

  for (const result of results) {
    const source = result.source ?? result.provider ?? "unknown";
    const current = counts.get(source) ?? 0;
    if (current >= limit) continue;
    counts.set(source, current + 1);
    kept.push(result);
  }

  return kept.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
