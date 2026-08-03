import { calcularAnalyticsGlobais, TIPOS_TAREFA } from "./roadmaps.js";

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function formatarHoras(horas) {
  if (!horas) return "0h";
  if (horas === 1) return "1h";
  return `${horas}h`;
}

function formatarDelta(valor, sufixo = "") {
  if (!valor) return `0${sufixo}`;
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor}${sufixo}`;
}

function renderizarRadar(atributos) {
  const stats =
    atributos.length >= 3
      ? atributos.slice(0, 8)
      : atributos.length
        ? atributos
        : [
            { nome: "Back-end", horas: 0 },
            { nome: "Front-end", horas: 0 },
            { nome: "Banco de Dados", horas: 0 },
            { nome: "DevOps", horas: 0 },
            { nome: "Fundamentos", horas: 0 },
          ];

  while (stats.length < 3) {
    stats.push({ nome: `Área ${stats.length + 1}`, horas: 0 });
  }

  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const raio = 95;
  const n = stats.length;
  const maxH = Math.max(1, ...stats.map((s) => s.horas));

  const ponto = (i, escala) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      x: cx + Math.cos(ang) * raio * escala,
      y: cy + Math.sin(ang) * raio * escala,
    };
  };

  const niveis = [0.25, 0.5, 0.75, 1]
    .map((esc) => {
      const pts = stats.map((_, i) => {
        const p = ponto(i, esc);
        return `${p.x},${p.y}`;
      });
      return `<polygon class="radar-grade" points="${pts.join(" ")}"></polygon>`;
    })
    .join("");

  const eixos = stats
    .map((_, i) => {
      const p = ponto(i, 1);
      return `<line class="radar-eixo" x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}"></line>`;
    })
    .join("");

  const dadosPts = stats.map((s, i) => {
    const p = ponto(i, s.horas / maxH);
    return `${p.x},${p.y}`;
  });

  const labels = stats
    .map((s, i) => {
      const p = ponto(i, 1.22);
      return `<text class="radar-label" x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle">${escaparHtml(s.nome)}</text>
        <text class="radar-valor" x="${p.x}" y="${p.y + 12}" text-anchor="middle">${formatarHoras(s.horas)}</text>`;
    })
    .join("");

  return `
    <div class="ficha-radar-wrap">
      <svg class="radar-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Atributos de estudo">
        ${niveis}
        ${eixos}
        <polygon class="radar-area" points="${dadosPts.join(" ")}"></polygon>
        <polygon class="radar-linha" points="${dadosPts.join(" ")}" fill="none"></polygon>
        ${stats
          .map((s, i) => {
            const p = ponto(i, s.horas / maxH);
            return `<circle class="radar-ponto" cx="${p.x}" cy="${p.y}" r="3.5"></circle>`;
          })
          .join("")}
        ${labels}
      </svg>
      ${
        atributos.length
          ? ""
          : `<p class="painel-nota">Sem horas em atributos ainda. Marque áreas nas tarefas (ex.: Back-end) e registre tempo — o radar preenche sozinho.</p>`
      }
    </div>
  `;
}

function renderizarNivel(nivel) {
  return `
    <div class="ficha-nivel">
      <div class="ficha-nivel-topo">
        <span class="ficha-nivel-num">Nível ${nivel.nivel}</span>
        <span class="ficha-nivel-xp">${nivel.xpNoNivel} / ${nivel.xpParaProximo} XP → N${nivel.nivel + 1}</span>
      </div>
      <div class="ficha-nivel-barra">
        <span style="width:${nivel.progresso}%"></span>
      </div>
      <p class="painel-nota">XP = horas reais estudadas (total ${nivel.xp}h). Sem prêmio decorativo — só esforço acumulado.</p>
    </div>
  `;
}

function renderizarComparacao(comp) {
  const dh = comp.deltaHoras;
  const dc = comp.deltaConcluidas;
  return `
    <div class="comparacao-semana">
      <div class="comp-semana-card">
        <span class="comp-semana-rotulo">Esta semana</span>
        <strong>${formatarHoras(comp.atual.horas)}</strong>
        <span>${comp.atual.concluidas} tarefas</span>
      </div>
      <div class="comp-semana-vs">vs</div>
      <div class="comp-semana-card">
        <span class="comp-semana-rotulo">Semana passada</span>
        <strong>${formatarHoras(comp.anterior.horas)}</strong>
        <span>${comp.anterior.concluidas} tarefas</span>
      </div>
      <div class="comp-semana-delta">
        <span class="delta-neutro">${formatarDelta(dh, "h")}</span>
        <span class="delta-neutro">${formatarDelta(dc, " tarefas")}</span>
      </div>
    </div>
  `;
}

function renderizarHeatmap(dias) {
  return `
    <div class="heatmap" title="Atividade dos últimos 84 dias">
      ${dias
        .map((d) => {
          const title = `${d.data}: ${d.concluidas} concluída(s), ${d.horas}h`;
          return `<span class="heatmap-dia nivel-${d.nivel}" title="${title}"></span>`;
        })
        .join("")}
    </div>
    <div class="heatmap-legenda">
      <span>Menos</span>
      <span class="heatmap-dia nivel-0"></span>
      <span class="heatmap-dia nivel-1"></span>
      <span class="heatmap-dia nivel-2"></span>
      <span class="heatmap-dia nivel-3"></span>
      <span class="heatmap-dia nivel-4"></span>
      <span>Mais</span>
    </div>
  `;
}

function renderizarGraficoLinha(pontos) {
  if (!pontos.length) return `<p class="detalhe-vazio">Sem dados ainda</p>`;

  const w = 560;
  const h = 160;
  const pad = 28;
  const maxY = Math.max(1, ...pontos.map((p) => p.acumulado));
  const stepX = pontos.length > 1 ? (w - pad * 2) / (pontos.length - 1) : 0;

  const coords = pontos.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (p.acumulado / maxY) * (h - pad * 2);
    return { x, y, ...p };
  });

  const linha = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${linha} L${coords[coords.length - 1].x.toFixed(1)},${h - pad} L${coords[0].x.toFixed(1)},${h - pad} Z`;

  return `
    <svg class="grafico-linha" viewBox="0 0 ${w} ${h}" role="img" aria-label="Progresso acumulado">
      <path class="grafico-area" d="${area}"></path>
      <path class="grafico-path" d="${linha}" fill="none"></path>
      <text class="grafico-eixo" x="${pad}" y="${h - 8}">início</text>
      <text class="grafico-eixo" x="${w - pad}" y="${h - 8}" text-anchor="end">hoje</text>
      <text class="grafico-eixo" x="${pad}" y="16">${maxY} tarefas</text>
    </svg>
  `;
}

function renderizarBarrasSemana(semanas) {
  const max = Math.max(1, ...semanas.map((s) => s.horas || s.concluidas));
  return `
    <div class="barras-semana">
      ${semanas
        .map(
          (s) => `
        <div class="barra-semana-item" title="${s.concluidas} tarefas · ${s.horas}h">
          <div class="barra-semana-coluna">
            <div class="barra-semana-preenchimento" style="height: ${((s.horas || s.concluidas) / max) * 100}%"></div>
          </div>
          <span class="barra-semana-rotulo">${escaparHtml(s.rotulo)}</span>
        </div>`
        )
        .join("")}
    </div>
  `;
}

export function renderizarDashboard(container, roadmaps) {
  const a = calcularAnalyticsGlobais(roadmaps);
  const totalTipo = Object.values(a.porTipo).reduce((s, n) => s + n, 0) || 1;

  container.innerHTML = `
    <header class="roadmap-header">
      <div class="roadmap-header-info">
        <h1>Ficha de estudo</h1>
        <p class="roadmap-descricao">Progressão agregada: atributos, XP e ritmo — estatística pura, sem emblemas.</p>
      </div>
    </header>

    <section class="ficha-topo">
      ${renderizarNivel(a.nivel)}
      <div class="metricas metricas-painel metricas-ficha">
        <div class="metrica-card">
          <span class="metrica-valor">${formatarHoras(a.xp)}</span>
          <span class="metrica-label">XP total</span>
        </div>
        <div class="metrica-card">
          <span class="metrica-valor">${formatarHoras(a.horasSemanaAtual)}</span>
          <span class="metrica-label">Horas na semana</span>
        </div>
        <div class="metrica-card">
          <span class="metrica-valor">${a.concluidasSemanaAtual}</span>
          <span class="metrica-label">Concluídas na semana</span>
        </div>
        <div class="metrica-card">
          <span class="metrica-valor">${a.totalConcluidas}/${a.totalTarefas}</span>
          <span class="metrica-label">Tarefas no total</span>
        </div>
      </div>
    </section>

    <section class="painel-secao">
      <h2>Atributos</h2>
      <p class="painel-subtitulo">Horas reais por área de estudo — o radar reflete esforço acumulado.</p>
      ${renderizarRadar(a.atributos)}
      ${
        a.atributos.length
          ? `<ul class="lista-atributos-ficha">
              ${a.atributos
                .map(
                  (at) => `
                <li>
                  <span>${escaparHtml(at.nome)}</span>
                  <strong>${formatarHoras(at.horas)}</strong>
                </li>`
                )
                .join("")}
            </ul>`
          : ""
      }
    </section>

    <section class="painel-secao">
      <h2>Você × você</h2>
      <p class="painel-subtitulo">Comparação com a semana anterior.</p>
      ${renderizarComparacao(a.comparacaoSemanal)}
    </section>

    <section class="painel-secao">
      <h2>Atividade</h2>
      <p class="painel-subtitulo">Intensidade dos últimos 84 dias.</p>
      ${renderizarHeatmap(a.heatmap)}
      ${a.diasEmSequencia > 0 ? `<p class="painel-nota">Dias ativos em sequência: ${a.diasEmSequencia}</p>` : ""}
    </section>

    <section class="painel-secao">
      <h2>Progresso acumulado</h2>
      <p class="painel-subtitulo">Tarefas concluídas ao longo do tempo.</p>
      ${renderizarGraficoLinha(a.progressoTempo)}
    </section>

    <section class="painel-secao">
      <h2>Ritmo semanal</h2>
      <p class="painel-subtitulo">Horas registradas por semana.</p>
      ${renderizarBarrasSemana(a.semanas)}
    </section>

    <section class="painel-secao">
      <h2>Distribuição por tipo</h2>
      <p class="painel-subtitulo">Proporção de prática, pesquisa e análise.</p>
      <div class="distribuicao-tipos">
        ${Object.entries(TIPOS_TAREFA)
          .map(([id, info]) => {
            const n = a.porTipo[id] || 0;
            const pct = Math.round((n / totalTipo) * 100);
            return `
              <div class="dist-tipo" style="--tipo-cor: ${info.cor}; --tipo-fundo: ${info.fundo}">
                <div class="dist-tipo-topo">
                  <span>${info.label}</span>
                  <strong>${n} (${pct}%)</strong>
                </div>
                <div class="dist-barra"><span style="width:${pct}%"></span></div>
              </div>`;
          })
          .join("")}
      </div>
      <p class="painel-nota">Estimado: <strong>${formatarHoras(a.horasEstimadas)}</strong> · Real: <strong>${formatarHoras(a.horasReais)}</strong>
        ${
          a.horasEstimadas > 0
            ? ` · Calibração: <strong>${Math.round((a.horasReais / a.horasEstimadas) * 100)}%</strong>`
            : ""
        }
      </p>
    </section>
  `;
}
