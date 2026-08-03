import { IR_CONFIG } from "../config.js";
import { SearchProvider, gerarResultId } from "../types.js";
import { getApiKey, fetchJson } from "./helpers.js";

const GITHUB_LANG = {
  php: "language:PHP",
  javascript: "language:JavaScript",
  typescript: "language:TypeScript",
  python: "language:Python",
  java: "language:Java",
  csharp: "language:C#",
  powershell: "language:PowerShell",
};

export class GithubProvider extends SearchProvider {
  name = "github";
  label = "GitHub";
  description = "Repositórios e exemplos (60 req/h sem token, 5000/h com GITHUB_TOKEN)";
  requiresKey = false;
  envVar = "GITHUB_TOKEN";

  configured() {
    return true;
  }

  /** @param {string[]} queries */
  filterQueries(queries) {
    return queries.filter(
      (q) =>
        /github/i.test(q) ||
        /example/i.test(q) ||
        /repo/i.test(q) ||
        queries.indexOf(q) < 4
    );
  }

  githubHeaders() {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": IR_CONFIG.githubUserAgent,
    };
    const token = getApiKey(this.envVar);
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  /**
   * @param {string} query
   * @param {import("../types.js").SearchContext} context
   */
  async search(query, context) {
    let cleanQuery = query.replace(/\s*github\s*/gi, " ").trim();
    const langFilter = GITHUB_LANG[context.technology];
    if (langFilter && !/language:/i.test(cleanQuery)) {
      cleanQuery = `${cleanQuery} ${langFilter}`;
    }
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", cleanQuery);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", "5");

    const data = await fetchJson(url.toString(), { headers: this.githubHeaders() });

    return (data.items ?? []).map((item) => ({
      id: gerarResultId(),
      title: item.full_name ?? item.name ?? "Repositório",
      url: item.html_url,
      snippet: item.description ?? "",
      source: this.name,
      type: "repo",
      publishedAt: item.updated_at ?? item.created_at,
      language: item.language?.toLowerCase() ?? "und",
      query,
      stars: item.stargazers_count ?? 0,
      forks: item.forks_count ?? 0,
      hasReadme: Boolean(item.description),
    }));
  }
}
