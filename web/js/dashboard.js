import { calcularAnalyticsGlobais, TIPOS_TAREFA } from "./roadmaps.js";
import { aplicarStagger, marcarEntrada } from "./motion.js";

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

function formatarDeltaXp(delta) {
  const n = Number(delta) || 0;
  const sinal = n > 0 ? "+" : "";
  return `${sinal}${n}`;
}

function renderizarBadge(badge) {
  if (!badge?.forma) return "";
  return `
    <span class="ficha-badge ficha-badge-${escaparHtml(badge.forma)}" title="${escaparHtml(badge.rotulo || "")}" aria-label="Badge ${escaparHtml(badge.rotulo || "")}">
      <span class="ficha-badge-forma" aria-hidden="true"></span>
    </span>
  `;
}

function renderizarNivel(nivel, badge) {
  if (!nivel) {
    return `<div class="ficha-nivel"><p class="painel-nota">Sem XP ainda — conclua tarefas para subir de nível.</p></div>`;
  }
  return `
    <div class="ficha-nivel">
      <div class="ficha-nivel-topo">
        <div class="ficha-nivel-titulo">
          <span class="ficha-nivel-num">Nível ${nivel.nivel}</span>
          ${renderizarBadge(badge)}
        </div>
        <span class="ficha-nivel-xp">${nivel.xpNoNivel} / ${nivel.xpParaProximo} XP → N${nivel.nivel + 1}</span>
      </div>
      <div class="ficha-nivel-barra">
        <span style="width:${nivel.progresso}%"></span>
      </div>
      <p class="painel-nota">XP por tarefas, subtarefas e bônus de roadmap completo. Total: ${nivel.xp} XP.</p>
    </div>
  `;
}

function renderizarLogXp(logXp) {
  const itens = logXp ?? [];
  if (!itens.length) {
    return `<p class="painel-nota">Nenhuma origem de XP ainda.</p>`;
  }
  return `
    <ul class="lista-log-xp">
      ${itens
        .map((item) => {
          const classe = item.delta >= 0 ? "log-xp-positivo" : "log-xp-negativo";
          const data = item.em
            ? new Date(item.em).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          return `
            <li class="${classe}">
              <strong>${formatarDeltaXp(item.delta)}</strong>
              <span class="log-xp-rotulo">${escaparHtml(item.rotulo || item.origem)}</span>
              <span class="log-xp-data">${escaparHtml(data)}</span>
            </li>`;
        })
        .join("")}
    </ul>
  `;
}

function renderizarListaHabilidades(habilidades, titulo, subtitulo) {
  const lista = [...(habilidades ?? [])].sort(
    (a, b) => b.nivel - a.nivel || a.nome.localeCompare(b.nome, "pt-BR")
  );
  const topIds = new Set(lista.slice(0, 3).filter((h) => h.nivel > 0).map((h) => h.id));

  return `
    <section class="painel-secao">
      <h2>${escaparHtml(titulo)}</h2>
      <p class="painel-subtitulo">${escaparHtml(subtitulo)}</p>
      ${
        lista.length
          ? `<ul class="lista-habilidades">
              ${lista
                .map((hab) => {
                  const destaque = topIds.has(hab.id);
                  const passo = hab.passoTier || (hab.tipo === "base" ? 25 : 10);
                  const progresso = hab.noTopo
                    ? 100
                    : Math.round(((hab.progressoNoTier || 0) / passo) * 100);
                  return `
                    <li class="habilidade-item ${destaque ? "habilidade-destaque" : ""}">
                      <div class="habilidade-topo">
                        <div class="habilidade-nome-wrap">
                          ${destaque ? `<span class="habilidade-top-tag">Top 3</span>` : ""}
                          <span class="habilidade-nome">${escaparHtml(hab.nome)}</span>
                          <span class="habilidade-tier tier-${escaparHtml(String(hab.indiceTier ?? 0))}">${escaparHtml(hab.tier || "Comum")}</span>
                        </div>
                        <strong class="habilidade-nivel">Nv. ${hab.nivel}</strong>
                      </div>
                      <div class="habilidade-barra" title="${hab.progressoNoTier ?? 0}/${passo} até o próximo tier">
                        <span style="width:${progresso}%"></span>
                      </div>
                    </li>`;
                })
                .join("")}
            </ul>`
          : `<p class="painel-nota">Nenhuma habilidade registrada ainda. Conclua tarefas com atributos ou competências.</p>`
      }
    </section>
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

function renderizarTempoNaSemana(dias) {
  const max = Math.max(1, ...dias.map((d) => d.horas));
  return `
    <div class="barras-semana barras-dias-semana">
      ${dias
        .map(
          (d) => `
        <div class="barra-semana-item ${d.ehHoje ? "barra-dia-hoje" : ""}" title="${d.data}: ${d.horas}h · ${d.concluidas} tarefa(s)">
          <span class="barra-dia-valor">${formatarHoras(d.horas)}</span>
          <div class="barra-semana-coluna">
            <div class="barra-semana-preenchimento" style="height: ${(d.horas / max) * 100}%"></div>
          </div>
          <span class="barra-semana-rotulo">${escaparHtml(d.rotulo)}</span>
        </div>`
        )
        .join("")}
    </div>
  `;
}

export function renderizarDashboard(container, roadmaps, perfil = null) {
  const a = calcularAnalyticsGlobais(roadmaps);
  const totalTipo = Object.values(a.porTipo).reduce((s, n) => s + n, 0) || 1;
  const nivel = perfil?.nivel ?? null;
  const badge = perfil?.badge ?? null;

  container.innerHTML = `
    <header class="roadmap-header">
      <div class="roadmap-header-info">
        <h1>Ficha de estudo</h1>
        <p class="roadmap-descricao">Habilidades permanentes, XP e ritmo — progresso real, sem gamificação vazia.</p>
      </div>
    </header>

    <section class="ficha-topo">
      ${renderizarNivel(nivel, badge)}
      <div class="metricas metricas-painel metricas-ficha">
        <div class="metrica-card">
          <span class="metrica-valor">${nivel?.xp ?? 0}</span>
          <span class="metrica-label">XP total</span>
        </div>
        <div class="metrica-card">
          <span class="metrica-valor">${formatarHoras(a.horasHoje)}</span>
          <span class="metrica-label">Tempo no Dia</span>
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
      <h2>Tempo na semana</h2>
      <p class="painel-subtitulo">Horas registradas em cada dia desta semana.</p>
      ${renderizarTempoNaSemana(a.diasDaSemana)}
    </section>

    <section class="painel-secao">
      <h2>Últimas origens de XP</h2>
      <p class="painel-subtitulo">As 20 concessões e estornos mais recentes.</p>
      ${renderizarLogXp(perfil?.logXp)}
    </section>

    ${renderizarListaHabilidades(
      perfil?.habilidadesBase,
      "Habilidades Base",
      "Áreas de estudo (atributos das tarefas). Tier a cada 25 níveis."
    )}

    ${renderizarListaHabilidades(
      perfil?.habilidadesEspeciais,
      "Habilidades Especiais",
      "Competências desenvolvidas. Tier a cada 10 níveis."
    )}

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

  marcarEntrada(container);
  aplicarStagger(container);
}
