import { SearchProvider, gerarResultId } from "../types.js";
import { fetchJson } from "./helpers.js";

export class BooksProvider extends SearchProvider {
  name = "books";
  label = "Google Books";
  description = "Livros e referências via Google Books API (gratuito, sem chave)";
  requiresKey = false;
  envVar = "GOOGLE_BOOKS_API_KEY";

  configured() {
    return true;
  }

  /** @param {string[]} queries */
  filterQueries(queries) {
    const fromTemplates = queries.filter(
      (q) => /book/i.test(q) || /packt/i.test(q) || /livro/i.test(q)
    );
    const base = queries.slice(0, 3).map((q) => `${q.replace(/\s*book\s*/gi, " ").trim()} book`);
    return [...new Set([...fromTemplates, ...base])].slice(0, 2);
  }

  /**
   * @param {string} query
   * @param {import("../types.js").SearchContext} context
   */
  async search(query, context) {
    const tech = context.technology || "";
    const bookQuery = query.replace(/\s*(book|packt|livro)s?\s*/gi, " ").trim();
    const q = tech ? `${tech} ${bookQuery}` : bookQuery;

    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", q);
    url.searchParams.set("maxResults", "5");
    url.searchParams.set("orderBy", "relevance");
    url.searchParams.set("printType", "books");

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
    if (apiKey) url.searchParams.set("key", apiKey);

    const data = await fetchJson(url.toString());

    return (data.items ?? []).map((item) => {
      const info = item.volumeInfo ?? {};
      const authors = (info.authors ?? []).join(", ");
      const year = info.publishedDate?.slice(0, 4);

      return {
        id: gerarResultId(),
        title: info.title ?? "Livro",
        url: info.previewLink ?? info.infoLink ?? `https://books.google.com/books?id=${item.id}`,
        snippet: [authors, info.description?.slice(0, 250)].filter(Boolean).join(" — "),
        source: this.name,
        type: "outro",
        publishedAt: year ? `${year}-01-01T00:00:00Z` : undefined,
        language: info.language ?? "und",
        query,
        pageCount: info.pageCount ?? 0,
        publisher: info.publisher,
        isBook: true,
      };
    });
  }
}
