import { IR_CONFIG } from "../config.js";
import { SearchProvider, gerarResultId } from "../types.js";
import { requireApiKey, fetchJson } from "./helpers.js";

export class BraveProvider extends SearchProvider {
  name = "brave";
  label = "Brave Search";
  description = "Busca web geral — docs, artigos, blogs (requer BRAVE_API_KEY)";
  requiresKey = true;
  envVar = "BRAVE_API_KEY";

  configured() {
    return Boolean(process.env.BRAVE_API_KEY?.trim());
  }

  /** @param {string[]} queries */
  filterQueries(queries) {
    return queries.filter(
      (q) =>
        /documentation/i.test(q) ||
        /tutorial/i.test(q) ||
        /guide/i.test(q) ||
        /best practices/i.test(q) ||
        queries.indexOf(q) < 6
    );
  }

  /**
   * @param {string} query
   * @param {import("../types.js").SearchContext} context
   */
  async search(query, context) {
    const apiKey = requireApiKey(this.envVar, this.label);

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "5");

    const langPref = context.languagePreference?.[0];
    if (langPref && IR_CONFIG.braveSearchLang[langPref]) {
      url.searchParams.set("search_lang", IR_CONFIG.braveSearchLang[langPref]);
    }

    const data = await fetchJson(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    });

    return (data.web?.results ?? []).map((item) => ({
      id: gerarResultId(),
      title: item.title ?? "Resultado web",
      url: item.url,
      snippet: item.description ?? "",
      source: this.name,
      type: "artigo",
      publishedAt: item.page_age ?? item.age,
      language: item.language ?? "und",
      query,
    }));
  }
}
