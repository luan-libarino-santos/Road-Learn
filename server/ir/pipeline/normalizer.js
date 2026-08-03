import { franc } from "franc-min";
import { IR_CONFIG } from "../config.js";
import { getTechnologyData } from "./tech-detector.js";

/**
 * @param {string} url
 */
export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const param of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref", "source"]) {
      parsed.searchParams.delete(param);
    }
    let path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * @param {string} url
 * @param {string} [title]
 */
export function inferResultType(url, title = "") {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "video";
  if (lower.includes("github.com")) return "repo";
  if (lower.includes("reddit.com")) return "artigo";
  if (
    lower.includes("developer.mozilla.org") ||
    lower.includes("laravel.com/docs") ||
    lower.includes("php.net") ||
    lower.includes("web.dev") ||
    lower.includes("/docs/")
  ) {
    return "doc";
  }
  if (title.toLowerCase().includes("documentation") || title.toLowerCase().includes("docs")) {
    return "doc";
  }
  return "artigo";
}

/**
 * @param {string} text
 */
export function detectLanguage(text) {
  if (!text || text.trim().length < 10) return "und";
  const code = franc(text, { minLength: 10 });
  const map = { por: "pt", eng: "en", spa: "es", fra: "fr", deu: "de" };
  return map[code] ?? code;
}

/**
 * @param {string} url
 * @param {string} [technology]
 */
export function isOfficialDoc(url, technology) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (IR_CONFIG.officialDocDomains.some((d) => host.includes(d))) return true;
    if (technology) {
      const techData = getTechnologyData(technology);
      if (techData?.officialDocs?.some((d) => host.includes(d))) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * @param {import("../types.js").SearchResult} result
 * @param {string} [technology]
 * @returns {import("../types.js").SearchResult}
 */
export function normalizeResult(result, technology) {
  const url = normalizeUrl(result.url);
  const title = (result.title ?? "").trim();
  const snippet = (result.snippet ?? "").trim();
  const textForLang = `${title} ${snippet}`;

  return {
    ...result,
    url,
    title,
    snippet,
    type: result.type ?? inferResultType(url, title),
    language: result.language ?? detectLanguage(textForLang),
    isOfficialDoc: isOfficialDoc(url, technology),
  };
}

/**
 * @param {import("../types.js").SearchResult[]} results
 * @param {string} [technology]
 */
export function normalizeResults(results, technology) {
  return results.map((r) => normalizeResult(r, technology));
}
