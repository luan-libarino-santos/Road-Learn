import { SearchProvider, gerarResultId } from "../types.js";
import { requireApiKey, fetchJson, parseIsoDurationMinutes } from "./helpers.js";

export class YoutubeProvider extends SearchProvider {
  name = "youtube";
  label = "YouTube";
  description = "Vídeos de estudo via YouTube Data API (requer YOUTUBE_API_KEY)";
  requiresKey = true;
  envVar = "YOUTUBE_API_KEY";

  configured() {
    return Boolean(process.env.YOUTUBE_API_KEY?.trim());
  }

  /** @param {string[]} queries */
  filterQueries(queries) {
    return queries.filter(
      (q) =>
        /youtube/i.test(q) ||
        /tutorial/i.test(q) ||
        /video/i.test(q) ||
        queries.indexOf(q) < 5
    );
  }

  /**
   * @param {string} query
   * @param {import("../types.js").SearchContext} _context
   */
  async search(query, _context) {
    const apiKey = requireApiKey(this.envVar, this.label);
    const cleanQuery = query.replace(/\s*youtube\s*/gi, " ").trim();

    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", cleanQuery);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "5");
    searchUrl.searchParams.set("order", "relevance");
    searchUrl.searchParams.set("key", apiKey);

    const searchData = await fetchJson(searchUrl.toString());
    const items = searchData.items ?? [];
    if (!items.length) return [];

    const ids = items.map((i) => i.id?.videoId).filter(Boolean).join(",");
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.searchParams.set("part", "contentDetails,statistics,snippet");
    detailsUrl.searchParams.set("id", ids);
    detailsUrl.searchParams.set("key", apiKey);

    const detailsData = await fetchJson(detailsUrl.toString());
    const detailsMap = new Map((detailsData.items ?? []).map((v) => [v.id, v]));

    return items.map((item) => {
      const videoId = item.id?.videoId;
      const details = detailsMap.get(videoId);
      const snippet = details?.snippet ?? item.snippet ?? {};
      const durationMin = parseIsoDurationMinutes(details?.contentDetails?.duration);
      const declaredLanguage = snippet.defaultAudioLanguage ?? snippet.defaultLanguage;

      return {
        id: gerarResultId(),
        title: snippet.title ?? "Vídeo YouTube",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        snippet: snippet.description?.slice(0, 300) ?? "",
        source: this.name,
        type: "video",
        publishedAt: snippet.publishedAt,
        // Sem idioma declarado, o normalizer detecta pelo título e descrição.
        language: declaredLanguage?.split("-")[0]?.toLowerCase(),
        query,
        channel: snippet.channelTitle,
        viewCount: Number(details?.statistics?.viewCount ?? 0),
        durationMinutes: durationMin,
      };
    });
  }
}
