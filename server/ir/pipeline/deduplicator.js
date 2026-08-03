import { IR_CONFIG } from "../config.js";
import { normalizeUrl } from "./normalizer.js";

function tokenSet(text) {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccardSimilarity(a, b) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * @param {import("../types.js").SearchResult[]} results
 * @returns {import("../types.js").SearchResult[]}
 */
export function deduplicateResults(results) {
  const byUrl = new Map();
  const kept = [];

  for (const result of results) {
    const key = normalizeUrl(result.url);
    const existing = byUrl.get(key);
    if (!existing || (result.score ?? 0) > (existing.score ?? 0)) {
      byUrl.set(key, result);
    }
  }

  const urlDeduped = [...byUrl.values()];

  for (const result of urlDeduped) {
    let isDuplicate = false;
    for (const other of kept) {
      const sim = jaccardSimilarity(result.title, other.title);
      if (sim >= IR_CONFIG.titleSimilarityThreshold) {
        isDuplicate = true;
        if ((result.score ?? 0) > (other.score ?? 0)) {
          const idx = kept.indexOf(other);
          kept[idx] = {
            ...result,
            score: (result.score ?? 0) + IR_CONFIG.scoring.duplicate,
            scoreBreakdown: [
              ...(result.scoreBreakdown ?? []),
              { rule: "Duplicata (título similar)", points: IR_CONFIG.scoring.duplicate },
            ],
          };
        } else {
          other.score = (other.score ?? 0) + IR_CONFIG.scoring.duplicate;
          other.scoreBreakdown = [
            ...(other.scoreBreakdown ?? []),
            { rule: "Duplicata (título similar)", points: IR_CONFIG.scoring.duplicate },
          ];
        }
        break;
      }
    }
    if (!isDuplicate) kept.push(result);
  }

  return kept.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
