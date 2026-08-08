import { TIPOS_TAREFA, tarefaEstaBloqueada } from "./roadmaps.js";

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

/**
 * Layout simples em camadas topológicas (dependências → grafo).
 */
export function renderizarGrafoDependencias(tarefas) {
  const lista = [...(tarefas ?? [])];
  if (!lista.length) {
    return `<p class="detalhe-vazio">Sem tarefas para montar o grafo.</p>`;
  }

  const porId = new Map(lista.map((t) => [t.id, t]));
  const profundidade = new Map();

  function calcProf(id, stack = new Set()) {
    if (profundidade.has(id)) return profundidade.get(id);
    if (stack.has(id)) return 0;
    const t = porId.get(id);
    if (!t) return 0;
    stack.add(id);
    const deps = (t.dependsOn ?? []).filter((d) => porId.has(d));
    const p = deps.length ? 1 + Math.max(...deps.map((d) => calcProf(d, stack))) : 0;
    stack.delete(id);
    profundidade.set(id, p);
    return p;
  }

  lista.forEach((t) => calcProf(t.id));

  const camadas = [];
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

  const pos = new Map();
  let maxW = 0;
  camadas.forEach((camada, yi) => {
    const largura = camada.length * nodeW + (camada.length - 1) * gapX;
    maxW = Math.max(maxW, largura);
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

  camadas.forEach((camada) => {
    const largura = camada.length * nodeW + (camada.length - 1) * gapX;
    const startX = pad + Math.max(0, (maxW - largura) / 2);
    camada.forEach((t, xi) => {
      const p = pos.get(t.id);
      p.x = startX + xi * (nodeW + gapX);
    });
  });

  const width = maxW + pad * 2;
  const height = camadas.length * (nodeH + gapY) - gapY + pad * 2;

  const edges = [];
  lista.forEach((t) => {
    (t.dependsOn ?? []).forEach((depId) => {
      if (!pos.has(depId) || !pos.has(t.id)) return;
      const a = pos.get(depId);
      const b = pos.get(t.id);
      edges.push({
        x1: a.x + a.w / 2,
        y1: a.y + a.h,
        x2: b.x + b.w / 2,
        y2: b.y,
      });
    });
  });

  return `
    <div class="grafo-wrap">
      <svg class="grafo-svg" viewBox="0 0 ${width} ${Math.max(height, 80)}" role="img" aria-label="Grafo de dependências">
        <defs>
          <marker id="seta-grafo" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--grafo-arrow)"></path>
          </marker>
        </defs>
        ${edges
          .map(
            (e) =>
              `<path class="grafo-edge" d="M${e.x1} ${e.y1} C${e.x1} ${(e.y1 + e.y2) / 2}, ${e.x2} ${(e.y1 + e.y2) / 2}, ${e.x2} ${e.y2}" marker-end="url(#seta-grafo)"></path>`
          )
          .join("")}
        ${lista
          .map((t) => {
            const p = pos.get(t.id);
            const tipo = TIPOS_TAREFA[t.tipo] ?? TIPOS_TAREFA.pratica;
            const { bloqueada } = tarefaEstaBloqueada(t, lista);
            const classe = [
              "grafo-node",
              "arvore-node",
              t.tipo === "projeto" ? "grafo-node-projeto" : "",
              t.concluida ? "concluida" : "",
              bloqueada && !t.concluida ? "bloqueada" : "",
              !bloqueada && !t.concluida ? "liberada" : "",
            ]
              .filter(Boolean)
              .join(" ");

            let fill = "var(--grafo-fill)";
            let stroke = tipo.cor;
            let strokeWidth = t.tipo === "projeto" ? 2.25 : bloqueada && !t.concluida ? 1 : 1.5;
            if (t.concluida) {
              fill = "var(--grafo-done-fill)";
              stroke = "var(--grafo-done)";
            } else if (bloqueada) {
              fill = "var(--grafo-fill-blocked)";
              stroke = "var(--grafo-stroke-blocked)";
            }

            return `
              <g class="${classe}" transform="translate(${p.x}, ${p.y})" data-tarefa-id="${t.id}">
                <rect width="${p.w}" height="${p.h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"></rect>
                <text x="10" y="22" class="grafo-titulo">${escaparHtml(t.titulo.slice(0, 22))}${t.titulo.length > 22 ? "…" : ""}</text>
                <text x="10" y="40" class="grafo-meta">${t.concluida ? "desbloqueada · feita" : bloqueada ? "bloqueada" : "disponível"} · ${tipo.label}</text>
              </g>`;
          })
          .join("")}
      </svg>
    </div>
  `;
}
