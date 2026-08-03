import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { IR_CONFIG } from "../config.js";
import { matchesAlias, normalizeText, scoreDictionaryMatches } from "./match-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const topics = JSON.parse(readFileSync(join(__dirname, "../knowledge/topics.json"), "utf-8"));

const WEAK_TOPIC_SCORE = 4;

/** Sinais de contexto de arrays PHP — evita falsos positivos SQL/cache. */
const ARRAY_CONTEXT =
  /\b(arrays?|array_map|array_filter|array_reduce|array_push|array_key_exists|in_array|foreach|associativ|indexados?|multidimensional|spread operator)\b/i;

/** Tópicos a ignorar quando o texto é claramente sobre arrays. */
const TOPICS_BLOCKED_IN_ARRAY_CONTEXT = new Set(["aggregacao", "indexes", "pdo"]);

/**
 * @param {string} topicId
 * @param {string} text
 */
function shouldSkipTopicMatch(topicId, text) {
  if (TOPICS_BLOCKED_IN_ARRAY_CONTEXT.has(topicId) && ARRAY_CONTEXT.test(text)) {
    return true;
  }
  return false;
}

/**
 * @param {string} title
 * @returns {string[]}
 */
export function detectTopicsFromTitle(title) {
  if (!title?.trim()) return [];
  const found = [];
  for (const [id, topic] of Object.entries(topics)) {
    for (const alias of topic.aliases ?? []) {
      if (matchesAlias(title, alias)) {
        found.push(id);
        break;
      }
    }
  }
  return found;
}

/**
 * Mapeia keywords stemmed a tópicos — matching estrito (sem op→pdo).
 * @param {string[]} keywords
 */
export function topicsFromKeywords(keywords) {
  const found = [];
  const minLen = IR_CONFIG.topicKeywordMinLength ?? 5;

  for (const kw of keywords) {
    if (kw.length < minLen) continue;

    for (const [id, topic] of Object.entries(topics)) {
      if (found.includes(id)) continue;

      for (const alias of topic.aliases ?? []) {
        const aliasNorm = normalizeText(alias);

        if (aliasNorm.includes(" ")) {
          if (kw.length >= minLen && aliasNorm.includes(kw)) {
            found.push(id);
            break;
          }
          continue;
        }

        const isMatch =
          aliasNorm === kw ||
          (aliasNorm.length >= minLen && kw.startsWith(aliasNorm)) ||
          (kw.length >= minLen && aliasNorm.startsWith(kw) && kw.length >= aliasNorm.length * 0.7);

        if (isMatch) {
          found.push(id);
          break;
        }
      }
    }
  }
  return found;
}

/**
 * @param {string} rawText
 * @param {string[]} keywords
 * @param {string} [title]
 * @returns {{ topics: string[], labels: string[], all: Array<{ id: string, score: number }> }}
 */
export function detectTopics(rawText, keywords, title = "") {
  const enrichedText = `${rawText}\n${keywords.join(" ")}`;
  const minScore = IR_CONFIG.minTopicScore ?? 5;
  const maxTopics = IR_CONFIG.maxTopics ?? 3;

  const scores = scoreDictionaryMatches(enrichedText, topics, {
    titleBoost: 8,
    title,
  }).filter((s) => !shouldSkipTopicMatch(s.id, enrichedText));

  const titleTopics = detectTopicsFromTitle(title).filter(
    (id) => !shouldSkipTopicMatch(id, enrichedText)
  );
  const topScore = scores[0]?.score ?? 0;

  let candidateIds = scores.filter((s) => s.score >= minScore).map((s) => s.id);

  if (titleTopics.length > 0) {
    // Mantém a ordem por score; o titleBoost já prioriza assuntos do título.
    candidateIds = [...new Set([...candidateIds, ...titleTopics])];
  } else if (topScore < WEAK_TOPIC_SCORE) {
    const fromKeywords = topicsFromKeywords(keywords).filter(
      (id) => !shouldSkipTopicMatch(id, enrichedText)
    );
    if (fromKeywords.length > 0) {
      candidateIds = [...new Set([...fromKeywords, ...candidateIds])];
    }
  }

  const resolved = candidateIds.slice(0, maxTopics);
  const labels = resolved.map((id) => topics[id]?.label ?? id);

  return {
    topics: resolved,
    labels,
    all: scores,
  };
}

export function getTopicData(topicId) {
  return topics[topicId] ?? null;
}

export function getAllTopics() {
  return topics;
}
