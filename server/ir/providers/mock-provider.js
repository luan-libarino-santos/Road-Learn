import { SearchProvider, gerarResultId } from "../types.js";

export class MockProvider extends SearchProvider {
  name = "mock";
  label = "Mock (teste)";
  description = "Resultados simulados para validar pipeline e scoring";

  /**
   * @param {string} query
   * @param {import("../types.js").SearchContext} context
   */
  async search(query, context) {
    const tech = context.technology || "laravel";
    const topic = context.topics[0] || "middleware";
    const q = query.toLowerCase();

    const results = [
      {
        id: gerarResultId(),
        title: `${tech} ${topic} — Official Documentation`,
        url: `https://laravel.com/docs/12.x/${topic}`,
        snippet: `Learn how ${topic} works in ${tech}. Official documentation with examples and best practices.`,
        source: this.name,
        type: "doc",
        publishedAt: "2025-01-15T00:00:00Z",
        language: "en",
        query,
      },
      {
        id: gerarResultId(),
        title: `${tech} ${topic} Tutorial — Complete Guide 2025`,
        url: `https://example.com/${tech}-${topic}-tutorial-2025`,
        snippet: `Step-by-step tutorial covering ${topic} in modern ${tech} applications.`,
        source: this.name,
        type: "artigo",
        publishedAt: "2025-06-01T00:00:00Z",
        language: "en",
        query,
      },
      {
        id: gerarResultId(),
        title: `Tutorial de ${topic} em ${tech} (PT-BR)`,
        url: `https://exemplo.com.br/${tech}-${topic}`,
        snippet: `Guia completo em português sobre ${topic} no ${tech}.`,
        source: this.name,
        type: "artigo",
        publishedAt: "2024-03-10T00:00:00Z",
        language: "pt",
        query,
      },
      {
        id: gerarResultId(),
        title: `${tech} 5 ${topic} Example (Legacy)`,
        url: `https://github.com/example/${tech}5-${topic}`,
        snippet: `Old ${tech} 5 example repository from 2016. Not updated for modern versions.`,
        source: this.name,
        type: "repo",
        publishedAt: "2016-08-20T00:00:00Z",
        language: "en",
        query,
      },
      {
        id: gerarResultId(),
        title: `${tech} ${topic} — Official Documentation`,
        url: `https://laravel.com/docs/12.x/${topic}`,
        snippet: `Duplicate entry for dedup testing.`,
        source: this.name,
        type: "doc",
        publishedAt: "2025-01-15T00:00:00Z",
        language: "en",
        query,
      },
      {
        id: gerarResultId(),
        title: `${tech} ${topic} Tutorial — Complete Guide 2025`,
        url: `https://example.com/duplicate-title-test`,
        snippet: `Another result with very similar title for dedup testing.`,
        source: this.name,
        type: "artigo",
        publishedAt: "2024-01-01T00:00:00Z",
        language: "en",
        query,
      },
    ];

    if (q.includes("github")) {
      results.push({
        id: gerarResultId(),
        title: `awesome-${tech}-${topic}`,
        url: `https://github.com/awesome-dev/${tech}-${topic}`,
        snippet: `Curated list of ${topic} resources for ${tech}.`,
        source: this.name,
        type: "repo",
        publishedAt: "2024-11-01T00:00:00Z",
        language: "en",
        query,
      });
    }

    return results.slice(0, q.includes("github") ? 7 : 6);
  }
}
