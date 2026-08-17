import type { Tarefa } from "./types";

type Pos = { x: number; y: number; w: number; h: number };

export function layoutGrafo(tarefas: Tarefa[]) {
  const lista = [...tarefas];
  const porId = new Map(lista.map((t) => [t.id, t]));
  const profundidade = new Map<string, number>();

  function calc(id: string, stack = new Set<string>()): number {
    if (profundidade.has(id)) return profundidade.get(id)!;
    if (stack.has(id)) return 0;
    const t = porId.get(id);
    if (!t) return 0;
    stack.add(id);
    const deps = (t.dependsOn ?? []).filter((d) => porId.has(d));
    const p = deps.length ? 1 + Math.max(...deps.map((d) => calc(d, stack))) : 0;
    stack.delete(id);
    profundidade.set(id, p);
    return p;
  }
  lista.forEach((t) => calc(t.id));

  const camadas: Tarefa[][] = [];
  lista.forEach((t) => {
    const p = profundidade.get(t.id) ?? 0;
    if (!camadas[p]) camadas[p] = [];
    camadas[p].push(t);
  });

  const nodeW = 150;
  const nodeH = 52;
  const gapX = 28;
  const gapY = 70;
  const pad = 24;
  const pos = new Map<string, Pos>();
  let maxW = 0;
  camadas.forEach((camada) => {
    const largura = camada.length * nodeW + (camada.length - 1) * gapX;
    maxW = Math.max(maxW, largura);
  });
  camadas.forEach((camada, yi) => {
    const largura = camada.length * nodeW + (camada.length - 1) * gapX;
    const startX = pad + Math.max(0, (maxW - largura) / 2);
    camada.forEach((t, xi) => {
      pos.set(t.id, {
        x: startX + xi * (nodeW + gapX),
        y: pad + yi * (nodeH + gapY),
        w: nodeW,
        h: nodeH,
      });
    });
  });
  const width = maxW + pad * 2;
  const height = camadas.length * (nodeH + gapY) - gapY + pad * 2;
  const edges: { from: Pos; to: Pos }[] = [];
  lista.forEach((t) => {
    (t.dependsOn ?? []).forEach((depId) => {
      const a = pos.get(depId);
      const b = pos.get(t.id);
      if (a && b) edges.push({ from: a, to: b });
    });
  });
  return { pos, width, height, edges };
}
