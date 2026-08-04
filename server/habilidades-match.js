import natural from "natural";

const LIMIAR = 0.88;

export function normalizarNomeHabilidade(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Encontra a melhor habilidade do mesmo tipo por similaridade de texto.
 * @returns {{ habilidade: object, score: number } | null}
 */
export function encontrarHabilidadeSimilar(habilidades, tipo, nomeCandidato) {
  const normalizado = normalizarNomeHabilidade(nomeCandidato);
  if (!normalizado) return null;

  let melhor = null;
  let melhorScore = 0;

  for (const hab of habilidades ?? []) {
    if (hab.tipo !== tipo) continue;
    const alvo = normalizarNomeHabilidade(hab.nome);
    if (!alvo) continue;

    if (alvo === normalizado) {
      return { habilidade: hab, score: 1 };
    }

    const score = natural.JaroWinklerDistance(normalizado, alvo, { ignoreCase: true });
    if (score > melhorScore) {
      melhorScore = score;
      melhor = hab;
    }
  }

  if (melhor && melhorScore >= LIMIAR) {
    return { habilidade: melhor, score: melhorScore };
  }
  return null;
}
