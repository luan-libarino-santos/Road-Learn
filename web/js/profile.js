import { api } from "./api.js";

let cache = null;

export function obterPerfilCache() {
  return cache;
}

export async function carregarPerfil({ forcar = false } = {}) {
  if (cache && !forcar) return cache;
  cache = await api.obterPerfil();
  return cache;
}

export async function reconstruirPerfil() {
  cache = await api.reconstruirPerfil();
  return cache;
}

export function invalidarPerfil() {
  cache = null;
}
