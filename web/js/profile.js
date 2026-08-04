import { api } from "./api.js";
import { aplicarTema } from "./tema.js";

let cache = null;

export function obterPerfilCache() {
  return cache;
}

export async function carregarPerfil({ forcar = false } = {}) {
  if (cache && !forcar) return cache;
  cache = await api.obterPerfil();
  if (cache?.tema) aplicarTema(cache.tema);
  return cache;
}

export async function reconstruirPerfil() {
  cache = await api.reconstruirPerfil();
  if (cache?.tema) aplicarTema(cache.tema);
  return cache;
}

export async function salvarIdentidade(dados) {
  cache = await api.atualizarIdentidade(dados);
  return cache;
}

export async function salvarTema(dados) {
  cache = await api.atualizarTema(dados);
  if (cache?.tema) aplicarTema(cache.tema);
  return cache;
}

export function invalidarPerfil() {
  cache = null;
}
