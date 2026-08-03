import { IR_CONFIG } from "../config.js";
import { extractVersionsFromResult, hasVersionMismatch } from "./version-detector.js";
import { getTechnologyData, getAllTechnologies } from "./tech-detector.js";
import { getTopicData } from "./topic-detector.js";
import { matchesAlias, normalizeText, countTermOccurrences } from "./match-utils.js";

const GITHUB_EXPECTED_LANG = {
  php: ["php"],
  javascript: ["javascript", "typescript"],
  typescript: ["typescript", "javascript"],
  python: ["python"],
  java: ["java"],
  csharp: ["c#", "csharp"],
  powershell: ["powershell"],
  html: ["html"],
  css: ["css"],
};

const CONFLICT_MIN_ALIAS_LEN = 5;

function matchesTechnologyAlias(text, textNorm, alias) {
  if (alias.length < CONFLICT_MIN_ALIAS_LEN) {
    if (alias.toLowerCase() === "java") return matchesAlias(text, alias);
    return /[#.+-]/.test(alias) && textNorm.includes(normalizeText(alias));
  }
  return matchesAlias(text, alias);
}

function getYearFromDate(dateStr) {
  if (!dateStr) return null;
  const year = new Date(dateStr).getFullYear();
  return Number.isNaN(year) ? null : year;
}

function getYearFromText(text) {
  const match = text.match(/\b(19|20)\d{2}\b/g);
  if (!match) return null;
  return Math.max(...match.map(Number));
}

function isSpamSnippet(text) {
  return /skip to content|sign in sign up|all gists|back to github/i.test(text);
}

function scoreRelevance(result, context) {
  const breakdown = [];
  let score = 0;
  const { scoring } = IR_CONFIG;
  const text = `${result.title} ${result.snippet} ${result.url} ${result.language ?? ""}`;
  const textNorm = normalizeText(text);

  const techData = getTechnologyData(context.technology);
  const hasOwnTech = Boolean(
    techData &&
      [context.technology, ...(techData.aliases ?? [])].some(
        (alias) =>
          (alias.length >= 3 && matchesAlias(text, alias)) ||
          (/[#.+-]/.test(alias) && textNorm.includes(normalizeText(alias)))
      )
  );

  if (hasOwnTech) {
    score += scoring.relevanceTech;
    breakdown.push({ rule: "Tecnologia correspondente", points: scoring.relevanceTech });
  }

  for (const topicId of context.topics ?? []) {
    const topic = getTopicData(topicId);
    if (!topic) continue;
    for (const alias of topic.aliases ?? []) {
      if (matchesAlias(text, alias) || textNorm.includes(normalizeText(alias))) {
        score += scoring.relevanceTopic;
        breakdown.push({ rule: `Assunto: ${topic.label}`, points: scoring.relevanceTopic });
        break;
      }
    }
  }

  let keywordHits = 0;
  for (const kw of context.keywords ?? []) {
    if (kw.length >= 4 && textNorm.includes(kw)) keywordHits++;
  }
  if (keywordHits > 0) {
    const pts = Math.min(keywordHits * scoring.relevanceKeyword, scoring.relevanceKeywordMax);
    score += pts;
    breakdown.push({ rule: `${keywordHits} keyword(s) no resultado`, points: pts });
  }

  const importantTerms = context.importantTerms ?? [];
  let importantTermsMatched = 0;
  if (importantTerms.length > 0) {
    let termPoints = 0;
    let termsMatched = 0;
    let totalOccurrences = 0;

    for (const term of importantTerms) {
      const count = countTermOccurrences(textNorm, term);
      if (count === 0) continue;

      termsMatched++;
      importantTermsMatched++;
      totalOccurrences += count;
      const repeatBonus = Math.min(
        (count - 1) * scoring.importantTermRepeat,
        scoring.importantTermRepeatMax - scoring.importantTermHit
      );
      termPoints += scoring.importantTermHit + Math.max(0, repeatBonus);
    }

    if (termPoints > 0) {
      const capped = Math.min(termPoints, scoring.importantTermRepeatMax * 2);
      score += capped;
      breakdown.push({
        rule: `${termsMatched} termo(s) importante(s) (${totalOccurrences}× no texto)`,
        points: capped,
      });
    } else {
      score += scoring.missingImportantTerms;
      breakdown.push({
        rule: "Nenhum termo importante da tarefa",
        points: scoring.missingImportantTerms,
      });
    }
  }

  if (context.technology) {
    let conflictingTechnology = null;
    for (const [id, tech] of Object.entries(getAllTechnologies())) {
      if (id === context.technology) continue;
      const hasConflict = (tech.aliases ?? []).some(
        (alias) => matchesTechnologyAlias(text, textNorm, alias)
      );
      if (hasConflict && !hasOwnTech) {
        conflictingTechnology = tech;
        break;
      }
    }

    if (conflictingTechnology) {
      score += scoring.wrongTechnology;
      breakdown.push({
        rule: `Tecnologia não relacionada (${conflictingTechnology.label})`,
        points: scoring.wrongTechnology,
      });
    } else if (!hasOwnTech) {
      score += scoring.missingTechnology;
      breakdown.push({
        rule: `Tecnologia esperada não encontrada (${techData?.label ?? context.technology})`,
        points: scoring.missingTechnology,
      });
    }
  }

  if (result.source === "github" && result.language && context.technology) {
    const expected = GITHUB_EXPECTED_LANG[context.technology];
    const lang = result.language.toLowerCase();
    if (expected && lang !== "und" && !expected.includes(lang)) {
      score += scoring.wrongGithubLanguage;
      breakdown.push({
        rule: `Repo em ${lang}, esperado ${context.technology}`,
        points: scoring.wrongGithubLanguage,
      });
    }
  }

  if (isSpamSnippet(text)) {
    score += scoring.spamSnippet;
    breakdown.push({ rule: "Snippet irrelevante/spam", points: scoring.spamSnippet });
  }

  if (keywordHits === 0 && importantTermsMatched === 0 && !hasOwnTech) {
    const hasTopic = (context.topics ?? []).some((id) => {
      const topic = getTopicData(id);
      return topic?.aliases.some((a) => textNorm.includes(normalizeText(a)));
    });
    if (!hasTopic) {
      score += scoring.lowRelevance;
      breakdown.push({ rule: "Baixa relevância ao tema", points: scoring.lowRelevance });
    }
  }

  return { score, breakdown };
}

/**
 * @param {import("../types.js").SearchResult & { isOfficialDoc?: boolean }} result
 * @param {Object} context
 */
export function scoreResult(result, context) {
  const breakdown = [];
  let score = 0;
  const { scoring } = IR_CONFIG;
  const text = `${result.title} ${result.snippet}`;
  const year = getYearFromDate(result.publishedAt) ?? getYearFromText(text);

  const relevance = scoreRelevance(result, context);
  score += relevance.score;
  breakdown.push(...relevance.breakdown);

  if (result.isOfficialDoc) {
    score += scoring.officialDoc;
    breakdown.push({ rule: "Documentação oficial", points: scoring.officialDoc });
  }

  if (result.source === "github" || result.type === "repo") {
    const repoYear = getYearFromDate(result.publishedAt);
    const cutoff = new Date().getFullYear() - IR_CONFIG.recentGithubYears;
    if (repoYear && repoYear >= cutoff) {
      score += scoring.githubRecent;
      breakdown.push({ rule: "GitHub atualizado", points: scoring.githubRecent });
    }

    const stars = result.stars ?? 0;
    if (stars >= IR_CONFIG.githubStarsHigh) {
      score += scoring.githubStarsHigh;
      breakdown.push({ rule: `GitHub ${stars} estrelas`, points: scoring.githubStarsHigh });
    } else if (stars >= IR_CONFIG.githubStarsMid) {
      score += scoring.githubStarsMid;
      breakdown.push({ rule: `GitHub ${stars} estrelas`, points: scoring.githubStarsMid });
    } else if (stars >= IR_CONFIG.githubStarsLow) {
      score += scoring.githubStarsLow;
      breakdown.push({ rule: `GitHub ${stars} estrelas`, points: scoring.githubStarsLow });
    }
  }

  if (result.source === "stackoverflow") {
    const votes = result.votes ?? 0;
    if (votes >= IR_CONFIG.stackoverflowVotesHigh) {
      score += scoring.stackoverflowVotesHigh;
      breakdown.push({ rule: `${votes} votos no SO`, points: scoring.stackoverflowVotesHigh });
    } else if (votes >= IR_CONFIG.stackoverflowVotesMid) {
      score += scoring.stackoverflowVotesMid;
      breakdown.push({ rule: `${votes} votos no SO`, points: scoring.stackoverflowVotesMid });
    }
    if (result.isAnswered) {
      score += scoring.stackoverflowAnswered;
      breakdown.push({ rule: "Resposta aceita/disponível", points: scoring.stackoverflowAnswered });
    }
  }

  if (result.source === "books" || result.isBook) {
    const pages = result.pageCount ?? 0;
    if (pages >= IR_CONFIG.bookMinPages) {
      score += scoring.bookSubstantial;
      breakdown.push({ rule: `Livro (${pages} págs)`, points: scoring.bookSubstantial });
    }
  }

  if (result.type === "artigo" || result.type === "doc") {
    const cutoff = new Date().getFullYear() - IR_CONFIG.recentContentYears;
    if (year && year >= cutoff) {
      score += scoring.tutorialRecent;
      breakdown.push({ rule: "Conteúdo recente", points: scoring.tutorialRecent });
    } else if (!year) {
      score += scoring.article;
      breakdown.push({ rule: "Artigo", points: scoring.article });
    }
  }

  if (result.type === "video" || result.source === "youtube") {
    const duration = result.durationMinutes ?? 0;
    const cutoff = new Date().getFullYear() - IR_CONFIG.recentContentYears;

    if (year && year >= cutoff) {
      score += scoring.videoRecent;
      breakdown.push({ rule: "Vídeo recente", points: scoring.videoRecent });
    }

    if (duration >= IR_CONFIG.videoMinMinutes) {
      score += scoring.longVideo;
      breakdown.push({ rule: `Vídeo longo (${duration} min)`, points: scoring.longVideo });
    } else if (duration > 0 && duration <= IR_CONFIG.videoMaxShortMinutes) {
      score += scoring.shortVideo;
      breakdown.push({ rule: `Vídeo curto (${duration} min)`, points: scoring.shortVideo });
    } else {
      score += scoring.standardVideo;
      breakdown.push({
        rule: duration > 0 ? `Vídeo (${duration} min)` : "Vídeo",
        points: scoring.standardVideo,
      });
    }

    const views = result.viewCount ?? 0;
    if (views >= IR_CONFIG.videoViewsHigh) {
      score += scoring.videoViewsHigh;
      breakdown.push({ rule: `Vídeo popular (${views} visualizações)`, points: scoring.videoViewsHigh });
    } else if (views >= IR_CONFIG.videoViewsMid) {
      score += scoring.videoViewsMid;
      breakdown.push({ rule: `Vídeo com ${views} visualizações`, points: scoring.videoViewsMid });
    }
  }

  const lang = result.language;
  const prefs = context.languagePreference ?? IR_CONFIG.languagePreferenceDefault;
  if (lang && lang === prefs[0]) {
    score += scoring.languagePrimary;
    breakdown.push({ rule: `Idioma preferido (${prefs[0]})`, points: scoring.languagePrimary });
  } else if (lang && lang === prefs[1]) {
    score += scoring.languageSecondary;
    breakdown.push({ rule: `Idioma secundário (${prefs[1]})`, points: scoring.languageSecondary });
  }

  if (year && year <= IR_CONFIG.outdatedYearThreshold) {
    score += scoring.outdatedYear;
    breakdown.push({ rule: `Conteúdo antigo (${year})`, points: scoring.outdatedYear });
  }

  const resultVersions = extractVersionsFromResult(text);
  if (hasVersionMismatch(context.versions ?? {}, resultVersions)) {
    score += scoring.versionMismatch;
    breakdown.push({ rule: "Versão desatualizada", points: scoring.versionMismatch });
  }

  return { ...result, score, scoreBreakdown: breakdown };
}

/**
 * @param {import("../types.js").SearchResult[]} results
 * @param {Object} context
 */
export function scoreResults(results, context) {
  return results
    .map((r) => scoreResult(r, context))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/**
 * @param {import("../types.js").SearchResult[]} results
 * @param {number} [minScore]
 */
export function filterByMinScore(results, minScore) {
  const filtered = results.filter((r) => (r.score ?? 0) >= minScore);
  return filtered.length > 0 ? filtered : results.slice(0, 5);
}
