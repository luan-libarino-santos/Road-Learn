import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { scoreDictionaryMatches } from "./match-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const technologies = JSON.parse(
  readFileSync(join(__dirname, "../knowledge/technologies.json"), "utf-8")
);

/**
 * @param {string} rawText
 * @param {string[]} keywords
 * @param {string} [title]
 */
export function detectTechnology(rawText, keywords, title = "") {
  const enrichedText = `${rawText}\n${keywords.join(" ")}`;
  const scores = scoreDictionaryMatches(enrichedText, technologies, {
    titleBoost: 5,
    title,
  });

  const best = scores[0] ?? { id: "", label: "", score: 0 };

  return {
    technology: best.id,
    label: best.label,
    score: best.score,
    all: scores,
    techData: best.id ? technologies[best.id] : null,
  };
}

export function getTechnologyData(techId) {
  return technologies[techId] ?? null;
}

export function getAllTechnologies() {
  return technologies;
}
