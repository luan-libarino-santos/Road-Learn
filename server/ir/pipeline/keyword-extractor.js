import natural from "natural";
import { IR_CONFIG } from "../config.js";
import { tokenize } from "./text-analyzer.js";

const stemmer = natural.PorterStemmer;

/** Regras simples de stemming para termos comuns em PT */
const PT_STEM_RULES = [
  [/mento$/, ""],
  [/ções$/, "cao"],
  [/ção$/, "cao"],
  [/ando$/, ""],
  [/endo$/, ""],
  [/idade$/, ""],
  [/idades$/, ""],
  [/ar$/, ""],
  [/er$/, ""],
  [/ir$/, ""],
];

function stemPt(word) {
  let result = word;
  for (const [pattern, replacement] of PT_STEM_RULES) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      break;
    }
  }
  return result;
}

function stem(word) {
  if (/^[a-z]+$/.test(word) && word.length > 4) {
    return stemPt(stemmer.stem(word));
  }
  return word;
}

/**
 * @param {string[]} tokens
 * @returns {{ tokens: string[], keywords: string[] }}
 */
export function extractKeywords(tokens) {
  const filtered = tokens.filter((t) => !IR_CONFIG.stopwords.has(t) && t.length > 2);
  const stemmed = filtered.map(stem);

  const freq = new Map();
  for (const t of stemmed) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 15)
    .map(([word]) => word);

  return { tokens: filtered, keywords };
}

/**
 * @param {string} rawText
 */
export function extractKeywordsFromText(rawText) {
  return extractKeywords(tokenize(rawText));
}
