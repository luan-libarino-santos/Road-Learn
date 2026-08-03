/**
 * @typedef {Object} SearchResult
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} snippet
 * @property {string} source
 * @property {string} type
 * @property {string} [publishedAt]
 * @property {string} [language]
 * @property {number} [score]
 * @property {Array<{ rule: string, points: number }>} [scoreBreakdown]
 * @property {string} [query]
 * @property {number} [durationMinutes]
 * @property {number} [viewCount]
 */

/**
 * @typedef {Object} SearchContext
 * @property {string} technology
 * @property {string[]} topics
 * @property {Record<string, string>} versions
 * @property {string[]} keywords
 * @property {string[]} languagePreference
 */

/**
 * @typedef {Object} PipelineDebug
 * @property {string[]} keywords
 * @property {string} technology
 * @property {string[]} topics
 * @property {Record<string, string>} versions
 * @property {string[]} queries
 * @property {string[]} tokens
 */

/**
 * @typedef {Object} SearchTaskInput
 * @property {string} [roadmapNome]
 * @property {string} titulo
 * @property {string} [descricao]
 * @property {Array<{ titulo: string } | string>} [subtarefas]
 * @property {Object} [options]
 * @property {string[]} [options.providers]
 * @property {string[]} [options.languagePreference]
 * @property {number} [options.maxResults]
 * @property {boolean} [options.debug]
 */

export class SearchProvider {
  name = "unknown";
  label = "Unknown";
  description = "";
  requiresKey = false;
  envVar = null;

  configured() {
    return true;
  }

  /**
   * @param {string} query
   * @param {SearchContext} context
   * @returns {Promise<SearchResult[]>}
   */
  async search(_query, _context) {
    throw new Error("SearchProvider.search() não implementado");
  }

  /** @returns {string[]} */
  filterQueries(queries) {
    return queries;
  }
}

export function gerarResultId() {
  return `ir_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
