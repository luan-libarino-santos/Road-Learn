const EXEMPLO = {
  roadmapNome: "Laravel",
  titulo: "Middlewares no Laravel",
  descricao:
    "Aprender como funciona o ciclo de requisição, middleware, autenticação e pipeline no Laravel 12.",
  subtarefas: [
    "Criar middleware",
    "Registrar middleware",
    "Aplicar middleware em rotas",
  ],
};

const $ = (sel) => document.querySelector(sel);
let roadmapNomeSelecionado = "";

function escapar(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function parseSubtarefas(texto) {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((titulo) => ({ titulo }));
}

async function carregarProviders() {
  const res = await fetch("/api/ir/providers");
  const data = await res.json();
  const container = $("#providers-checkboxes");

  const defaultChecked = new Set(["github", "stackoverflow", "books"]);

  container.innerHTML = data.providers
    .map((p) => {
      const status = p.requiresKey
        ? p.configured
          ? "✓ configurado"
          : `⚠ requer ${p.envVar}`
        : "gratuito";
      const disabled = p.requiresKey && !p.configured;
      const checked = defaultChecked.has(p.name) && !disabled;

      return `
    <label class="${disabled ? "ir-provider-disabled" : ""}">
      <input type="checkbox" name="provider" value="${escapar(p.name)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span>${escapar(p.label)}</span>
      <small style="color:var(--text-dim)"> — ${escapar(p.description)} · ${status}</small>
    </label>`;
    })
    .join("");
}

async function carregarRoadmaps() {
  const select = $("#select-roadmap");
  try {
    const res = await fetch("/api/roadmaps");
    const roadmaps = await res.json();

    for (const roadmap of roadmaps) {
      const pesquisas = (roadmap.tarefas ?? []).filter((t) => t.tipo === "pesquisa");
      for (const tarefa of pesquisas) {
        const opt = document.createElement("option");
        opt.value = JSON.stringify({
          roadmapNome: roadmap.nome ?? "",
          titulo: tarefa.titulo,
          descricao: tarefa.descricao ?? "",
          subtarefas: (tarefa.subtarefas ?? []).map((s) =>
            typeof s === "string" ? s : s.titulo
          ),
        });
        opt.textContent = `${roadmap.nome} → ${tarefa.titulo}`;
        select.appendChild(opt);
      }
    }
  } catch {
    /* roadmaps opcionais */
  }
}

function preencherForm(dados) {
  roadmapNomeSelecionado = dados.roadmapNome ?? "";
  $("#input-titulo").value = dados.titulo ?? "";
  $("#input-descricao").value = dados.descricao ?? "";
  $("#input-subtarefas").value = (dados.subtarefas ?? []).join("\n");
}

function renderDebug(debug) {
  const el = $("#debug-content");
  if (!debug) {
    el.innerHTML = `<p class="ir-vazio">Execute uma busca para ver o pipeline.</p>`;
    return;
  }

  el.innerHTML = `
    <div class="ir-debug-block">
      <strong>Contexto do roadmap</strong>
      <span>${escapar(debug.roadmapNome || "—")}</span>
    </div>
    <div class="ir-debug-block">
      <strong>Tecnologia</strong>
      <span class="ir-tag">${escapar(debug.technologyLabel || debug.technology || "—")}</span>
    </div>
    <div class="ir-debug-block">
      <strong>Assuntos</strong>
      <div class="ir-debug-tags">
        ${(debug.topicLabels ?? debug.topics ?? []).map((t) => `<span class="ir-tag">${escapar(t)}</span>`).join("") || "—"}
      </div>
    </div>
    <div class="ir-debug-block">
      <strong>Versões detectadas</strong>
      ${Object.keys(debug.versions ?? {}).length
        ? `<ul>${Object.entries(debug.versions).map(([k, v]) => `<li>${escapar(k)} ${escapar(v)}</li>`).join("")}</ul>`
        : "<span>—</span>"}
    </div>
    <div class="ir-debug-block">
      <strong>Keywords (${debug.keywords?.length ?? 0})</strong>
      <div class="ir-debug-tags">
        ${(debug.keywords ?? []).map((k) => `<span class="ir-tag">${escapar(k)}</span>`).join("")}
      </div>
    </div>
    <div class="ir-debug-block">
      <strong>Termos importantes (${debug.importantTerms?.length ?? 0})</strong>
      <div class="ir-debug-tags">
        ${(debug.importantTerms ?? []).map((t) => `<span class="ir-tag">${escapar(t)}</span>`).join("") || "—"}
      </div>
    </div>
    <div class="ir-debug-block">
      <strong>Tradução DeepL</strong>
      ${renderTranslationDebug(debug.translation)}
    </div>
    <div class="ir-debug-block">
      <strong>Consultas usadas na busca (${debug.queries?.length ?? 0})</strong>
      <ul>${(debug.queries ?? []).map((q) => `<li>${escapar(q)}</li>`).join("")}</ul>
    </div>
    ${debug.queriesOriginal?.length && debug.translation?.applied
      ? `<div class="ir-debug-block">
      <strong>Consultas originais (PT)</strong>
      <ul>${debug.queriesOriginal.map((q) => `<li>${escapar(q)}</li>`).join("")}</ul>
    </div>`
      : ""}
  `;
}

function renderTranslationDebug(translation) {
  if (!translation) return "<span>—</span>";
  if (translation.fallback) {
    return `<span class="ir-tag" style="color:var(--warn)">Fallback: ${escapar(translation.reason)}</span>`;
  }
  if (!translation.applied) {
    return `<span>${escapar(translation.reason ?? "não aplicada")}</span>`;
  }
  const pairs = (translation.pairs ?? [])
    .map((p) => `<li><span style="color:var(--text-dim)">${escapar(p.original)}</span> → ${escapar(p.translated)}</li>`)
    .join("");
  return `<span>${translation.translatedCount} traduzida(s), ${translation.skippedCount} já em inglês</span>${pairs ? `<ul>${pairs}</ul>` : ""}`;
}

function renderResults(data) {
  const container = $("#results-container");
  const count = $("#results-count");
  const meta = $("#meta-info");
  const errors = $("#errors-info");

  count.textContent = String(data.results?.length ?? 0);

  if (data.meta) {
    meta.hidden = false;
    meta.textContent = `${data.meta.totalRaw} brutos → score ≥${data.meta.minScoreThreshold ?? "?"} → ${data.meta.totalAfterProviderLimit ?? data.meta.totalAfterDedup} (máx ${data.meta.maxPerProvider ?? 5}/provider) → ${data.meta.totalReturned} exibidos · ${data.meta.durationMs}ms`;
  }

  const avisos = [];
  if (data.meta?.translation?.fallback && data.meta.translation.reason) {
    avisos.push(`Tradução (fallback): ${data.meta.translation.reason}`);
  }
  if (data.meta?.errors?.length) {
    avisos.push(...data.meta.errors.map((e) => `${e.provider}: ${e.message}`));
  }
  if (avisos.length) {
    errors.hidden = false;
    errors.innerHTML = `<strong>Avisos:</strong> ${avisos.map((a) => escapar(a)).join(" · ")}`;
  } else {
    errors.hidden = true;
    errors.innerHTML = "";
  }

  if (!data.results?.length) {
    container.innerHTML = `<p class="ir-vazio">Nenhum resultado encontrado.</p>`;
    return;
  }

  container.innerHTML = `
    <table class="ir-results-table">
      <thead>
        <tr>
          <th>Score</th>
          <th>Título</th>
          <th>Tipo</th>
          <th>Fonte</th>
          <th>Idioma</th>
        </tr>
      </thead>
      <tbody>
        ${data.results
          .map(
            (r) => `
          <tr>
            <td>
              <span class="ir-score ${(r.score ?? 0) < 0 ? "negativo" : ""}">${r.score ?? 0}</span>
              <div class="ir-breakdown">
                ${(r.scoreBreakdown ?? [])
                  .map(
                    (b) =>
                      `<span class="${b.points >= 0 ? "pos" : "neg"}">${b.points >= 0 ? "+" : ""}${b.points} ${escapar(b.rule)}</span>`
                  )
                  .join("")}
              </div>
            </td>
            <td>
              <a class="ir-result-link" href="${escapar(r.url)}" target="_blank" rel="noopener noreferrer">${escapar(r.title)}</a>
              ${r.snippet ? `<div class="ir-breakdown">${escapar(r.snippet.slice(0, 120))}${r.snippet.length > 120 ? "…" : ""}</div>` : ""}
            </td>
            <td><span class="ir-type-badge">${escapar(r.type)}</span></td>
            <td>${escapar(r.source)}</td>
            <td>${escapar(r.language ?? "—")}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function executarBusca() {
  const status = $("#status-msg");
  const btn = $("#btn-buscar");

  const titulo = $("#input-titulo").value.trim();
  if (!titulo) {
    status.hidden = false;
    status.className = "ir-status erro";
    status.textContent = "Informe o título da tarefa.";
    return;
  }

  const providers = [...document.querySelectorAll('input[name="provider"]:checked')].map(
    (el) => el.value
  );

  if (!providers.length) {
    status.hidden = false;
    status.className = "ir-status erro";
    status.textContent = "Selecione ao menos um provider.";
    return;
  }

  btn.disabled = true;
  status.hidden = false;
  status.className = "ir-status";
  status.textContent = "Buscando…";

  try {
    const res = await fetch("/api/ir/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roadmapNome: roadmapNomeSelecionado,
        titulo,
        descricao: $("#input-descricao").value.trim(),
        subtarefas: parseSubtarefas($("#input-subtarefas").value),
        options: {
          providers,
          debug: true,
          languagePreference: ["pt", "en"],
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro ?? "Erro na busca");

    renderDebug(data.debug);
    renderResults(data);
    status.textContent = `Concluído em ${data.meta?.durationMs ?? "?"}ms`;
  } catch (err) {
    status.className = "ir-status erro";
    status.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
}

function init() {
  carregarProviders();
  carregarRoadmaps();

  $("#btn-exemplo").addEventListener("click", () => preencherForm(EXEMPLO));

  $("#select-roadmap").addEventListener("change", (e) => {
    if (!e.target.value) {
      roadmapNomeSelecionado = "";
      return;
    }
    try {
      preencherForm(JSON.parse(e.target.value));
    } catch {
      /* ignore */
    }
  });

  $("#btn-buscar").addEventListener("click", executarBusca);

  $("#btn-toggle-debug").addEventListener("click", () => {
    const content = $("#debug-content");
    const btn = $("#btn-toggle-debug");
    content.classList.toggle("collapsed");
    btn.textContent = content.classList.contains("collapsed") ? "Expandir" : "Recolher";
  });
}

init();
