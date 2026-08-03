import { IR_CONFIG } from "../config.js";
import { SearchProvider, gerarResultId } from "../types.js";

export class RedditProvider extends SearchProvider {
  name = "reddit";
  label = "Reddit";
  description = "Discussões e recomendações da comunidade (pode bloquear IP de servidor)";
  requiresKey = false;

  configured() {
    return true;
  }

  /** @param {string[]} queries */
  filterQueries(queries) {
    return queries.filter(
      (q) => /reddit/i.test(q) || queries.indexOf(q) < 5
    );
  }

  /**
   * @param {string} query
   * @param {import("../types.js").SearchContext} _context
   */
  async search(query, _context) {
    const cleanQuery = query.replace(/\s*reddit\s*/gi, " ").trim();
    const url = new URL("https://www.reddit.com/search.json");
    url.searchParams.set("q", cleanQuery);
    url.searchParams.set("limit", "5");
    url.searchParams.set("sort", "relevance");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": IR_CONFIG.redditUserAgent,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = new Error(`Reddit API: ${res.status} ${res.statusText}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const children = data?.data?.children ?? [];

    return children
      .filter((c) => c.kind === "t3")
      .map((c) => {
        const post = c.data;
        const permalink = post.permalink
          ? `https://www.reddit.com${post.permalink}`
          : `https://reddit.com/r/${post.subreddit}/comments/${post.id}`;
        const created = post.created_utc
          ? new Date(post.created_utc * 1000).toISOString()
          : undefined;

        return {
          id: gerarResultId(),
          title: post.title ?? "Post Reddit",
          url: permalink,
          snippet: post.selftext?.slice(0, 300) ?? `r/${post.subreddit}`,
          source: this.name,
          type: "artigo",
          publishedAt: created,
          language: "en",
          query,
          subreddit: post.subreddit,
        };
      });
  }
}
