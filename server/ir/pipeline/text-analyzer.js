/**
 * Concatena titulo, descricao e subtarefas em texto bruto.
 * @param {import("../types.js").SearchTaskInput} input
 */
export function analyzeText(input) {
  const partes = [input.titulo ?? "", input.descricao ?? ""];

  for (const sub of input.subtarefas ?? []) {
    if (typeof sub === "string") {
      partes.push(sub);
    } else if (sub?.titulo) {
      partes.push(sub.titulo);
    }
  }

  const rawText = partes.filter(Boolean).join("\n");
  return { rawText, partes: partes.filter(Boolean) };
}

/**
 * Tokeniza texto: lowercase, remove pontuação, split por espaços.
 * @param {string} text
 */
export function tokenize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}
