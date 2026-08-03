import { IR_CONFIG } from "../config.js";

/**
 * @param {string} envVar
 */
export function getApiKey(envVar) {
  const val = process.env[envVar];
  return val?.trim() || null;
}

/**
 * @param {string} envVar
 * @param {string} providerName
 */
export function requireApiKey(envVar, providerName) {
  const key = getApiKey(envVar);
  if (!key) {
    const err = new Error(`${providerName}: configure ${envVar} no .env`);
    err.code = "MISSING_API_KEY";
    throw err;
  }
  return key;
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 */
export async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Parse ISO 8601 duration (YouTube) → minutos
 * @param {string} iso
 */
export function parseIsoDurationMinutes(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  return h * 60 + m + Math.round(s / 60);
}

export { IR_CONFIG };
