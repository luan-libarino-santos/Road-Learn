import { IR_CONFIG } from "../config.js";
import { normalizeText } from "./match-utils.js";
import { tokenize } from "./text-analyzer.js";
import { getTopicData } from "./topic-detector.js";

const GENERIC_TERMS = new Set([
  "php", "html", "css", "javascript", "typescript", "python", "java", "laravel",
  "react", "vue", "docker", "git", "mysql", "redis", "kubernetes", "codeigniter",
  "tutorial", "guide", "documentation", "example", "dado", "dados", "valor",
  "funco", "funcoes", "nativ", "nativa", "nativas", "basico", "intermediario",
  "arrai", "spread",
]);

/**
 * Termos centrais da tarefa para scoring (título, keywords, aliases dos tópicos).
 * @param {string} title
 * @param {string[]} keywords
 * @param {string[]} topics
 * @returns {string[]}
 */
export function extractImportantTerms(title, keywords, topics = []) {
  const terms = new Map();
  const minLen = IR_CONFIG.importantTermMinLength ?? 4;
  const sourceNorm = normalizeText(`${title} ${keywords.join(" ")}`);

  const add = (term, weight = 1) => {
    const norm = normalizeText(term);
    if (!norm || norm.length < minLen || GENERIC_TERMS.has(norm)) return;
    terms.set(norm, (terms.get(norm) ?? 0) + weight);
  };

  for (const token of tokenize(title)) {
    add(token, 3);
  }

  for (let i = 0; i < keywords.length; i++) {
    add(keywords[i], i < 6 ? 2 : 1);
  }

  for (const topicId of topics) {
    const topic = getTopicData(topicId);
    if (!topic) continue;
    add(topicId.replace(/_/g, " "), 2);
    for (const alias of topic.aliases ?? []) {
      const aliasNorm = normalizeText(alias);
      const appearsInTask =
        sourceNorm.includes(aliasNorm) ||
        keywords.some(
          (kw) =>
            kw.length >= 5 &&
            aliasNorm.startsWith(kw) &&
            kw.length >= aliasNorm.length * 0.7
        );
      if (!alias.includes(" ") && alias.length >= minLen && appearsInTask) {
        add(alias, 1);
      }
    }
  }

  return [...terms.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, IR_CONFIG.maxImportantTerms ?? 12)
    .map(([term]) => term);
}
