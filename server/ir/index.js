import { IR_CONFIG } from "./config.js";
import { analyzeText } from "./pipeline/text-analyzer.js";
import { extractKeywordsFromText } from "./pipeline/keyword-extractor.js";
import { detectTechnology } from "./pipeline/tech-detector.js";
import { detectTopics } from "./pipeline/topic-detector.js";
import { detectVersions } from "./pipeline/version-detector.js";
import { generateQueries } from "./pipeline/query-generator.js";
import { normalizeResults } from "./pipeline/normalizer.js";
import { scoreResults, filterByMinScore } from "./pipeline/scorer.js";
import { deduplicateResults } from "./pipeline/deduplicator.js";
import { limitPerProvider } from "./pipeline/result-limiter.js";
import { translateQueriesForSearch } from "./pipeline/query-translator.js";
import { extractImportantTerms } from "./pipeline/important-terms.js";
import { getProviders } from "./providers/registry.js";

/**
 * Executa promises com limite de concorrência.
 * @template T
 * @param {Array<() => Promise<T>>} tasks
 * @param {number} limit
 */
async function runWithConcurrency(tasks, limit) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * @param {import("./types.js").SearchTaskInput} input
 */
export async function searchTask(input) {
  const start = Date.now();
  const options = input.options ?? {};
  const providers = getProviders(options.providers);
  const languagePreference = options.languagePreference ?? IR_CONFIG.languagePreferenceDefault;
  const maxResults = options.maxResults ?? IR_CONFIG.maxResultsDefault;
  const debug = options.debug !== false;
  const titulo = input.titulo?.trim() ?? "";
  const roadmapNome = input.roadmapNome?.trim() ?? "";

  const { rawText } = analyzeText(input);
  const technologyDetectionText = [roadmapNome, rawText].filter(Boolean).join("\n");
  const { tokens, keywords } = extractKeywordsFromText(rawText);
  const techResult = detectTechnology(technologyDetectionText, keywords, titulo);
  const topicResult = detectTopics(rawText, keywords, titulo);
  const versions = detectVersions(technologyDetectionText);
  const importantTerms = extractImportantTerms(titulo, keywords, topicResult.topics);

  const queriesOriginal = generateQueries({
    technology: techResult.technology,
    topics: topicResult.topics,
    keywords,
    versions,
    title: titulo,
  });

  const translateEnabled = options.translateQueries !== false;
  const { queries, translation } = await translateQueriesForSearch(queriesOriginal, {
    enabled: translateEnabled,
  });

  const context = {
    technology: techResult.technology,
    topics: topicResult.topics,
    versions,
    keywords,
    importantTerms,
    title: titulo,
    languagePreference,
  };

  const errors = [];
  const rawResults = [];

  for (const provider of providers) {
    if (provider.requiresKey && !provider.configured()) {
      errors.push({
        provider: provider.name,
        query: "*",
        message: `Configure ${provider.envVar} no .env`,
      });
    }
  }

  for (const provider of providers) {
    if (provider.requiresKey && !provider.configured()) continue;

    const providerQueries = provider.filterQueries(queries);
    const queryLimit = IR_CONFIG.providerQueryLimits[provider.name]
      ?? IR_CONFIG.providerQueryLimits.default
      ?? 3;
    const limitedQueries = providerQueries.slice(0, queryLimit);
    const concurrency = IR_CONFIG.providerConcurrency[provider.name] ?? IR_CONFIG.concurrency;

    const providerTasks = limitedQueries.map((query) => async () => {
      try {
        const results = await provider.search(query, context);
        return results.map((r) => ({ ...r, query, provider: provider.name }));
      } catch (err) {
        return [{ _error: true, provider: provider.name, query, message: err.message }];
      }
    });

    const batchResults = await runWithConcurrency(providerTasks, concurrency);

    for (const batch of batchResults.flat()) {
      if (batch._error) {
        errors.push({ provider: batch.provider, query: batch.query, message: batch.message });
      } else {
        rawResults.push(batch);
      }
    }
  }

  const normalized = normalizeResults(rawResults, techResult.technology);
  const scored = scoreResults(normalized, context);
  const filtered = filterByMinScore(scored, IR_CONFIG.minScoreThreshold);
  const deduped = deduplicateResults(filtered);
  const perProvider = limitPerProvider(deduped, IR_CONFIG.maxResultsPerProvider);
  const results = perProvider.slice(0, maxResults);

  const response = {
    results,
    meta: {
      totalRaw: rawResults.length,
      totalAfterScore: scored.length,
      totalAfterMinScore: filtered.length,
      totalAfterDedup: deduped.length,
      totalAfterProviderLimit: perProvider.length,
      totalReturned: results.length,
      maxPerProvider: IR_CONFIG.maxResultsPerProvider,
      minScoreThreshold: IR_CONFIG.minScoreThreshold,
      durationMs: Date.now() - start,
      providersUsed: providers.map((p) => p.name),
      translation,
      errors: errors.length ? errors : undefined,
    },
  };

  if (debug) {
    response.debug = {
      keywords,
      tokens,
      roadmapNome,
      technology: techResult.technology,
      technologyLabel: techResult.label,
      topics: topicResult.topics,
      topicLabels: topicResult.labels,
      versions,
      queries,
      queriesOriginal,
      translation,
      importantTerms,
      techScores: techResult.all,
      topicScores: topicResult.all,
    };
  }

  return response;
}

export { listProviders } from "./providers/registry.js";
