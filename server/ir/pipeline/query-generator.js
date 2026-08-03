import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { IR_CONFIG } from "../config.js";
import { getTechnologyData } from "./tech-detector.js";
import { getTopicData } from "./topic-detector.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const queryTemplates = JSON.parse(
  readFileSync(join(__dirname, "../knowledge/query-templates.json"), "utf-8")
);

function titleCase(str) {
  return str
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function applyTemplate(template, tech, topic, techLabel, topicLabel) {
  return template
    .replace(/\{tech\}/g, tech)
    .replace(/\{topic\}/g, topic)
    .replace(/\{techTitle\}/g, techLabel)
    .replace(/\{topicTitle\}/g, topicLabel)
    .trim();
}

/**
 * @param {string} technology
 * @param {string[]} topics
 * @param {number} [maxPerTopic]
 */
function collectCuratedQueries(technology, topics, maxPerTopic = 3) {
  const list = [];
  const curated = queryTemplates[technology];
  if (!curated) return list;

  for (const topicId of topics) {
    const entry = curated[topicId];
    if (!entry) continue;
    list.push(...(entry.generalQueries ?? []).slice(0, maxPerTopic));
    list.push(...(entry.stackoverflowQueries ?? []).slice(0, 1));
    list.push(...(entry.youtubeQueries ?? []).slice(0, 1));
  }
  return list;
}

/**
 * @param {Object} params
 * @param {string} params.technology
 * @param {string[]} params.topics
 * @param {string[]} params.keywords
 * @param {Record<string, string>} params.versions
 * @param {string} [params.title]
 * @returns {string[]}
 */
export function generateQueries({ technology, topics, keywords, versions, title = "" }) {
  const ordered = [];
  const seen = new Set();

  const add = (query) => {
    const q = query?.trim();
    if (!q || q.length <= 3) return;
    const key = q.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(q);
  };

  const techData = getTechnologyData(technology);
  const techLabel = techData?.label ?? titleCase(technology);
  const tech = technology || techLabel.toLowerCase();
  const topicsToUse = topics.slice(0, IR_CONFIG.maxTopics ?? 3);
  if (topicsToUse.length === 0 && keywords[0]) topicsToUse.push(keywords[0]);

  // 1. Título raw da tarefa sempre ocupa a primeira posição.
  // A tradução PT → EN acontece depois, preservando a ordem das consultas.
  if (title.trim()) {
    add(title.trim());
    add(`${techLabel} ${title.trim()}`);
    add(`${title.trim()} ${techLabel} tutorial`);
    add(`${title.trim()} documentation`);
  }

  // 2. Consultas curadas dos tópicos detectados (limitadas)
  for (const q of collectCuratedQueries(technology, topicsToUse)) add(q);

  // 3. Combinações tech + topic
  const versionSuffix = versions[technology] ? ` ${versions[technology]}` : "";
  for (const topicId of topicsToUse.slice(0, 2)) {
    const topicData = getTopicData(topicId);
    const topicLabel = topicData?.label ?? titleCase(topicId);
    const topic = topicId || topicLabel.toLowerCase();
    add(`${techLabel} ${topicLabel}${versionSuffix}`);
    add(`${techLabel} ${topicLabel} tutorial`);
    add(applyTemplate("{techTitle} {topicTitle} Documentation", tech, topic, techLabel, topicLabel));
  }

  // 4. Keywords stemmed somente como fallback, após consultas semânticas.
  if (ordered.length < IR_CONFIG.maxQueries) {
    for (const kw of keywords.slice(0, 5)) {
      if (kw.length >= 4) {
        add(`${techLabel} ${titleCase(kw)}`);
        if (kw.includes("_")) {
          add(`${techLabel} ${kw.replace(/_/g, " ")} example`);
        }
      }
      if (ordered.length >= IR_CONFIG.maxQueries) break;
    }
  }

  // 5. Templates genéricos (último recurso)
  if (ordered.length < IR_CONFIG.maxQueries) {
    for (const topicId of topicsToUse.slice(0, 1)) {
      const topicData = getTopicData(topicId);
      const topicLabel = topicData?.label ?? titleCase(topicId);
      const topic = topicId || topicLabel.toLowerCase();
      for (const template of IR_CONFIG.queryTemplates.slice(0, 3)) {
        add(applyTemplate(template, tech, topic, techLabel, topicLabel));
        if (ordered.length >= IR_CONFIG.maxQueries) break;
      }
    }
  }

  return ordered.slice(0, IR_CONFIG.maxQueries);
}

export function getCuratedOfficialDocs(technology, topics) {
  const docs = [];
  const curated = queryTemplates[technology];
  if (!curated) return docs;
  for (const topicId of topics) {
    const entry = curated[topicId];
    if (entry?.officialDocs) docs.push(...entry.officialDocs);
  }
  return docs;
}

export { queryTemplates };
