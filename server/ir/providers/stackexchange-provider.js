import { SearchProvider, gerarResultId } from "../types.js";
import { fetchJson } from "./helpers.js";

const STACK_TAGS = {
  php: "php",
  laravel: "laravel",
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  docker: "docker",
  mysql: "mysql",
  html: "html",
  css: "css",
  java: "java",
  csharp: "c#",
  powershell: "powershell",
};

export class StackExchangeProvider extends SearchProvider {
  name = "stackoverflow";
  label = "Stack Overflow";
  description = "Perguntas técnicas com votos e respostas aceitas (gratuito)";
  requiresKey = false;
  envVar = "STACKEXCHANGE_KEY";

  configured() {
    return true;
  }

  /** @param {string[]} queries */
  filterQueries(queries) {
    return queries.filter(
      (q) =>
        /stackoverflow/i.test(q) ||
        queries.indexOf(q) < 4
    );
  }

  /**
   * @param {string} query
   * @param {import("../types.js").SearchContext} context
   */
  async search(query, context) {
    const cleanQuery = query.replace(/\s*stackoverflow\s*/gi, " ").trim();
    const site = "stackoverflow";
    const url = new URL("https://api.stackexchange.com/2.3/search/advanced");
    url.searchParams.set("order", "desc");
    url.searchParams.set("sort", "votes");
    url.searchParams.set("q", cleanQuery);
    url.searchParams.set("site", site);
    url.searchParams.set("pagesize", "5");
    url.searchParams.set("filter", "withbody");

    const tag = STACK_TAGS[context.technology];
    if (tag) url.searchParams.set("tagged", tag);

    const apiKey = process.env.STACKEXCHANGE_KEY?.trim();
    if (apiKey) url.searchParams.set("key", apiKey);

    const data = await fetchJson(url.toString());

    return (data.items ?? []).map((item) => ({
      id: gerarResultId(),
      title: item.title ?? "Pergunta Stack Overflow",
      url: item.link,
      snippet: item.body?.replace(/<[^>]+>/g, " ").slice(0, 300) ?? "",
      source: this.name,
      type: "artigo",
      publishedAt: item.creation_date
        ? new Date(item.creation_date * 1000).toISOString()
        : undefined,
      language: "en",
      query,
      votes: item.score ?? 0,
      answerCount: item.answer_count ?? 0,
      isAnswered: Boolean(item.is_answered),
      tags: item.tags ?? [],
    }));
  }
}
