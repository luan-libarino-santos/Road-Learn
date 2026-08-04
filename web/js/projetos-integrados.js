import { api } from "./api.js";
import { calcularMetricas, obterRoadmaps } from "./roadmaps.js";

export const PROGRESSO_MINIMO_PROJETO_INTEGRADO = 80;
export const MIN_ROADMAPS_INTEGRADO = 2;

let cacheLista = null;
const cachePorId = new Map();

export function invalidarCacheProjetosIntegrados(id) {
  cacheLista = null;
  if (id) cachePorId.delete(id);
  else cachePorId.clear();
}

export function obterListaPiEmCache() {
  return cacheLista;
}

export function obterProjetoIntegradoEmCache(id) {
  return cachePorId.has(id) ? cachePorId.get(id) : undefined;
}

export async function listarProjetosIntegrados({ forcar = false } = {}) {
  if (!forcar && cacheLista) return cacheLista;
  const lista = await api.listarProjetosIntegrados();
  cacheLista = Array.isArray(lista) ? lista : [];
  for (const p of cacheLista) cachePorId.set(p.id, p);
  return cacheLista;
}

export async function carregarProjetoIntegrado(id, { forcar = false } = {}) {
  if (!forcar && cachePorId.has(id)) return cachePorId.get(id);
  const projeto = await api.obterProjetoIntegradoPorId(id);
  cachePorId.set(id, projeto);
  cacheLista = null;
  return projeto;
}

export function calcularProgressoProjetoIntegrado(projeto) {
  if (!projeto) return { total: 0, concluidos: 0, progresso: 0 };
  const itens = [
    ...(projeto.requisitosTecnicos ?? []),
    ...(projeto.requisitosFuncionais ?? []),
    ...(projeto.checklistImplementacao ?? []),
    ...(projeto.boasPraticas ?? []),
  ];
  for (const etapa of projeto.etapas ?? []) {
    itens.push({ concluido: etapa.concluida });
    for (const t of etapa.tarefas ?? []) itens.push({ concluido: t.concluida });
  }
  const total = itens.length;
  if (!total) return { total: 0, concluidos: 0, progresso: 0 };
  const concluidos = itens.filter((i) => i.concluido).length;
  return {
    total,
    concluidos,
    progresso: Math.round((concluidos / total) * 100),
  };
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nomesRoadmaps(roadmapIds) {
  const todos = obterRoadmaps();
  return (roadmapIds ?? [])
    .map((id) => todos.find((r) => r.id === id)?.nome || id)
    .filter(Boolean);
}

function renderizarChecklist(titulo, colecao, itens, projetoId) {
  const lista = itens ?? [];
  if (!lista.length) return "";
  return `
    <section class="pf-secao">
      <h3>${escaparHtml(titulo)}</h3>
      <ul class="pf-checklist">
        ${lista
          .map(
            (item) => `
          <li>
            <label class="pf-check-item">
              <input type="checkbox" data-acao="pi-toggle-item" data-projeto="${escaparHtml(projetoId)}" data-colecao="${escaparHtml(colecao)}" data-item="${escaparHtml(item.id)}" ${item.concluido ? "checked" : ""}>
              <span>${escaparHtml(item.titulo)}</span>
            </label>
          </li>`
          )
          .join("")}
      </ul>
    </section>`;
}

function renderizarEtapas(etapas, projetoId) {
  if (!etapas?.length) return "";
  return `
    <section class="pf-secao">
      <h3>Etapas de desenvolvimento</h3>
      <div class="pf-etapas">
        ${etapas
          .map(
            (etapa) => `
          <details class="pf-etapa" ${etapa.concluida ? "" : "open"}>
            <summary>
              <label class="pf-check-item" onclick="event.stopPropagation()">
                <input type="checkbox" data-acao="pi-toggle-item" data-projeto="${escaparHtml(projetoId)}" data-colecao="etapas" data-item="${escaparHtml(etapa.id)}" data-etapa="${escaparHtml(etapa.id)}" ${etapa.concluida ? "checked" : ""}>
                <span>${escaparHtml(etapa.titulo)}</span>
              </label>
            </summary>
            ${etapa.descricao ? `<p class="pf-etapa-desc">${escaparHtml(etapa.descricao)}</p>` : ""}
            <ul class="pf-checklist">
              ${(etapa.tarefas ?? [])
                .map(
                  (t) => `
                <li>
                  <label class="pf-check-item">
                    <input type="checkbox" data-acao="pi-toggle-item" data-projeto="${escaparHtml(projetoId)}" data-colecao="etapas" data-item="${escaparHtml(t.id)}" data-etapa="${escaparHtml(etapa.id)}" ${t.concluida ? "checked" : ""}>
                    <span>${escaparHtml(t.titulo)}</span>
                  </label>
                </li>`
                )
                .join("")}
            </ul>
          </details>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderizarDocumentacao(doc) {
  if (!doc) return "";
  return `
    <section class="pf-secao">
      <h3>Documentação / repositório</h3>
      <div class="pf-doc-grid">
        <div class="pf-doc-bloco">
          <h4>README</h4>
          <pre class="pf-pre">${escaparHtml(doc.readme || "")}</pre>
        </div>
        <div class="pf-doc-bloco">
          <h4>.gitignore</h4>
          <pre class="pf-pre">${escaparHtml(doc.gitignore || "")}</pre>
        </div>
        <div class="pf-doc-bloco">
          <h4>Estrutura de pastas</h4>
          <ul class="pf-lista-simples">
            ${(doc.estruturaPastas ?? []).map((p) => `<li><code>${escaparHtml(p)}</code></li>`).join("")}
          </ul>
        </div>
        <div class="pf-doc-bloco">
          <h4>Arquivos base</h4>
          <ul class="pf-lista-simples">
            ${(doc.arquivosBase ?? []).map((p) => `<li><code>${escaparHtml(p)}</code></li>`).join("")}
          </ul>
        </div>
      </div>
    </section>`;
}

/**
 * Painel completo do Projeto Integrado (vista dedicada).
 */
export function renderizarPainelProjetoIntegrado({ projeto, carregando }) {
  if (carregando) {
    return `
      <div class="pi-vista">
        <section class="painel-secao">
          <p class="painel-subtitulo">Carregando Projeto Integrado…</p>
        </section>
      </div>`;
  }

  if (!projeto) {
    return `
      <div class="pi-vista">
        <section class="painel-secao pf-vazio">
          <h2>Projeto Integrado</h2>
          <p class="painel-subtitulo">Projeto não encontrado.</p>
        </section>
      </div>`;
  }

  const prog = calcularProgressoProjetoIntegrado(projeto);
  const nomes = nomesRoadmaps(projeto.roadmapIds);

  return `
    <div class="pi-vista">
      <section class="painel-secao pf-cabecalho">
        <div class="pf-cabecalho-info">
          <p class="pi-eyebrow">Projeto Integrado</p>
          <h2>${escaparHtml(projeto.nome)}</h2>
          <p class="painel-subtitulo">${escaparHtml(projeto.objetivo || projeto.descricao || "")}</p>
          ${
            nomes.length
              ? `<p class="pi-roadmaps-meta"><strong>Roadmaps:</strong> ${nomes.map((n) => escaparHtml(n)).join(" · ")}</p>`
              : ""
          }
          <div class="progresso-container">
            <div class="progresso-info">
              <span>${prog.progresso}% do projeto · ${prog.concluidos}/${prog.total} itens</span>
              ${projeto.concluido ? `<span class="pf-badge">Concluído</span>` : ""}
            </div>
            <div class="progresso-barra">
              <div class="progresso-preenchimento" style="width: ${prog.progresso}%"></div>
            </div>
          </div>
          ${
            projeto.stackObrigatoria?.length
              ? `<p class="pf-stack"><strong>Stack:</strong> ${projeto.stackObrigatoria.map((s) => escaparHtml(s)).join(" · ")}</p>`
              : ""
          }
        </div>
        <div class="pf-cabecalho-acoes">
          <button type="button" class="btn-secundario btn-sm" data-acao="gerar-projeto-integrado" data-projeto="${escaparHtml(projeto.id)}" data-regenerar="1">Regenerar</button>
          <button type="button" class="btn-secundario btn-sm" data-acao="pi-marcar-concluido" data-projeto="${escaparHtml(projeto.id)}" data-concluido="${projeto.concluido ? "0" : "1"}">${projeto.concluido ? "Reabrir" : "Marcar concluído"}</button>
          <button type="button" class="btn-perigo btn-sm" data-acao="pi-excluir" data-projeto="${escaparHtml(projeto.id)}">Excluir</button>
        </div>
      </section>

      ${projeto.descricao ? `<section class="pf-secao"><h3>Descrição</h3><p>${escaparHtml(projeto.descricao)}</p></section>` : ""}

      ${renderizarChecklist("Requisitos técnicos", "requisitosTecnicos", projeto.requisitosTecnicos, projeto.id)}
      ${renderizarChecklist("Requisitos funcionais", "requisitosFuncionais", projeto.requisitosFuncionais, projeto.id)}
      ${renderizarChecklist("Checklist de implementação", "checklistImplementacao", projeto.checklistImplementacao, projeto.id)}
      ${renderizarEtapas(projeto.etapas, projeto.id)}
      ${renderizarChecklist("Boas práticas", "boasPraticas", projeto.boasPraticas, projeto.id)}

      ${
        projeto.criteriosConclusao?.length
          ? `<section class="pf-secao"><h3>Critérios de conclusão</h3><ul class="pf-lista-simples">${projeto.criteriosConclusao.map((c) => `<li>${escaparHtml(c)}</li>`).join("")}</ul></section>`
          : ""
      }

      ${renderizarDocumentacao(projeto.documentacaoInicial)}
    </div>`;
}

function renderizarCardsTopicos(topicos, selecionadoId) {
  return `
    <div class="pf-topicos" role="listbox" aria-label="Tópicos sugeridos">
      ${topicos
        .map((t) => {
          const selecionado = t.id === selecionadoId;
          return `
        <button type="button" class="pf-topico-card ${selecionado ? "selecionado" : ""}" role="option" aria-selected="${selecionado}" data-pi-topico="${escaparHtml(t.id)}">
          <strong>${escaparHtml(t.titulo)}</strong>
          ${t.categoria ? `<span class="pf-topico-cat">${escaparHtml(t.categoria)}</span>` : ""}
          <span>${escaparHtml(t.resumo)}</span>
          ${
            t.stackSugerida?.length
              ? `<em>${t.stackSugerida.map((s) => escaparHtml(s)).join(" · ")}</em>`
              : ""
          }
        </button>`;
        })
        .join("")}
    </div>`;
}

function roadmapsElegiveis() {
  return obterRoadmaps()
    .map((r) => ({
      roadmap: r,
      progresso: calcularMetricas(r).progresso,
    }))
    .filter((x) => x.progresso >= PROGRESSO_MINIMO_PROJETO_INTEGRADO);
}

function htmlSelecaoRoadmaps(selecionados) {
  const elegiveis = roadmapsElegiveis();
  if (!elegiveis.length) {
    return `<p class="pf-aviso">Nenhum roadmap com ≥${PROGRESSO_MINIMO_PROJETO_INTEGRADO}% de tarefas. Conclua mais tarefas antes de criar um Projeto Integrado.</p>`;
  }
  return `
    <p class="campo-dica">Selecione <strong>pelo menos ${MIN_ROADMAPS_INTEGRADO}</strong> roadmaps elegíveis (≥${PROGRESSO_MINIMO_PROJETO_INTEGRADO}%).</p>
    <ul class="pi-roadmap-select">
      ${elegiveis
        .map(({ roadmap, progresso }) => {
          const checked = selecionados.has(roadmap.id);
          return `
        <li>
          <label class="pi-roadmap-opcao">
            <input type="checkbox" data-pi-roadmap="${escaparHtml(roadmap.id)}" ${checked ? "checked" : ""}>
            <span class="pi-roadmap-opcao-texto">
              <strong>${escaparHtml(roadmap.nome)}</strong>
              <em>${progresso}% tarefas</em>
            </span>
          </label>
        </li>`;
        })
        .join("")}
    </ul>
    <p class="campo-dica pi-selecao-contador">${selecionados.size} selecionado(s)</p>`;
}

/**
 * Wizard: passo 0 roadmaps → 1 tópicos → 2 gerar/salvar.
 * Se `projetoExistente` + regenerar, pré-seleciona roadmapIds e substitui via criar+excluir ou atualizar.
 */
export function abrirModalGerarProjetoIntegrado({
  regenerar = false,
  projetoExistente = null,
  onSalvo,
  abrirModal,
  fecharModal,
  atualizarTela,
  mostrarErro,
  elementos,
}) {
  if (regenerar && projetoExistente) {
    const ok = confirm(
      "Regenerar substitui o Projeto Integrado atual. Continuar?"
    );
    if (!ok) return;
  }

  let passo = regenerar && projetoExistente ? 1 : 0;
  const selecionados = new Set(
    regenerar && projetoExistente?.roadmapIds
      ? projetoExistente.roadmapIds
      : []
  );
  let topicos = [];
  let topicoSelecionado = null;
  let projetoGerado = null;
  let carregando = passo === 1;
  let avisoIa = null;

  const tituloPasso = () => {
    if (passo === 0) return "Projeto Integrado — roadmaps (1/3)";
    if (passo === 1) return "Projeto Integrado — escolha um tópico (2/3)";
    return "Projeto Integrado — revisar e salvar (3/3)";
  };

  const htmlPasso0 = () => htmlSelecaoRoadmaps(selecionados);

  const htmlPasso1 = () => {
    if (carregando) {
      return `<p class="campo-dica pf-loading">Gerando 3 tópicos com IA…</p>`;
    }
    if (!topicos.length) {
      return `<p class="pf-aviso">Nenhum tópico retornado. Tente novamente.</p>
        <button type="button" class="btn-secundario" id="pi-retry-topicos">Tentar de novo</button>`;
    }
    return `
      ${avisoIa ? `<p class="campo-dica">${escaparHtml(avisoIa)}</p>` : ""}
      <p class="campo-dica">Escolha <strong>um</strong> tópico. A geração completa só acontece no passo seguinte.</p>
      ${renderizarCardsTopicos(topicos, topicoSelecionado?.id)}
      <div class="pf-wizard-acoes">
        <button type="button" class="btn-secundario btn-sm" id="pi-outros-topicos">Gerar outros 3 tópicos</button>
        ${!regenerar || !projetoExistente ? `<button type="button" class="btn-secundario btn-sm" id="pi-voltar-passo0">Voltar aos roadmaps</button>` : ""}
      </div>`;
  };

  const htmlPasso2 = () => {
    if (carregando) {
      return `<p class="campo-dica pf-loading">Gerando o Projeto Integrado completo…</p>`;
    }
    if (!projetoGerado) {
      return `<p class="pf-aviso">Falha ao gerar o projeto.</p>
        <button type="button" class="btn-secundario" id="pi-voltar-passo1">Voltar aos tópicos</button>`;
    }
    return `
      ${avisoIa ? `<p class="campo-dica">${escaparHtml(avisoIa)}</p>` : ""}
      <p class="campo-dica">Revise o JSON do projeto e salve.</p>
      <label class="campo">
        <span>${escaparHtml(projetoGerado.nome || "Projeto")}</span>
        <textarea name="pi_json" id="pi-json-preview" rows="16" spellcheck="false">${escaparHtml(JSON.stringify(projetoGerado, null, 2))}</textarea>
      </label>
      <div class="pf-wizard-acoes">
        <button type="button" class="btn-secundario btn-sm" id="pi-voltar-passo1">Escolher outro tópico</button>
      </div>`;
  };

  const htmlCorpo = () => {
    if (passo === 0) return htmlPasso0();
    if (passo === 1) return htmlPasso1();
    return htmlPasso2();
  };

  const htmlAtual = () => `
    <div class="pf-wizard pi-wizard" data-passo="${passo}">
      <div class="pf-wizard-passos" aria-hidden="true">
        <span class="${passo === 0 ? "ativo" : passo > 0 ? "feito" : ""}">1. Roadmaps</span>
        <span class="${passo === 1 ? "ativo" : passo > 1 ? "feito" : ""}">2. Tópicos</span>
        <span class="${passo === 2 ? "ativo" : ""}">3. Projeto</span>
      </div>
      <div id="pi-wizard-corpo">
        ${htmlCorpo()}
      </div>
    </div>`;

  const sincronizarBotao = () => {
    const confirmar = elementos.modalConfirmar();
    if (!confirmar) return;
    if (passo === 0) {
      confirmar.textContent = "Sugerir tópicos";
      confirmar.disabled = selecionados.size < MIN_ROADMAPS_INTEGRADO;
    } else if (passo === 1) {
      confirmar.textContent = "Gerar projeto";
      confirmar.disabled = carregando || !topicoSelecionado;
    } else {
      confirmar.textContent = regenerar ? "Salvar (substituir)" : "Salvar Projeto Integrado";
      confirmar.disabled = carregando || !projetoGerado;
    }
  };

  const atualizarCorpo = () => {
    const form = elementos.modalForm();
    const corpo = form?.querySelector("#pi-wizard-corpo");
    const wrap = form?.querySelector(".pi-wizard");
    if (wrap) wrap.dataset.passo = String(passo);
    if (corpo) corpo.innerHTML = htmlCorpo();
    const titulo = elementos.modalTitulo();
    if (titulo) titulo.textContent = tituloPasso();
    sincronizarBotao();
    ligarEventosPasso(form);
  };

  async function carregarTopicos() {
    carregando = true;
    topicoSelecionado = null;
    projetoGerado = null;
    avisoIa = null;
    atualizarCorpo();
    try {
      const resultado = await api.sugerirTopicosProjetoIntegrado([...selecionados]);
      topicos = resultado.topicos ?? [];
      avisoIa = resultado.aviso || null;
    } catch (erro) {
      topicos = [];
      mostrarErro(erro.message);
    } finally {
      carregando = false;
      atualizarCorpo();
    }
  }

  async function gerarProjeto() {
    if (!topicoSelecionado) return;
    passo = 2;
    carregando = true;
    projetoGerado = null;
    atualizarCorpo();
    try {
      const resultado = await api.gerarProjetoIntegradoIa(
        [...selecionados],
        topicoSelecionado
      );
      projetoGerado = resultado.projeto;
      avisoIa = resultado.aviso || avisoIa;
    } catch (erro) {
      projetoGerado = null;
      mostrarErro(erro.message);
    } finally {
      carregando = false;
      atualizarCorpo();
    }
  }

  function ligarEventosPasso(form) {
    if (!form) return;

    form.querySelectorAll("[data-pi-roadmap]").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.dataset.piRoadmap;
        if (input.checked) selecionados.add(id);
        else selecionados.delete(id);
        atualizarCorpo();
      });
    });

    form.querySelectorAll("[data-pi-topico]").forEach((btn) => {
      btn.addEventListener("click", () => {
        topicoSelecionado =
          topicos.find((t) => t.id === btn.dataset.piTopico) || null;
        atualizarCorpo();
      });
    });

    form.querySelector("#pi-outros-topicos")?.addEventListener("click", () => {
      carregarTopicos();
    });
    form.querySelector("#pi-retry-topicos")?.addEventListener("click", () => {
      carregarTopicos();
    });
    form.querySelector("#pi-voltar-passo0")?.addEventListener("click", () => {
      passo = 0;
      topicos = [];
      topicoSelecionado = null;
      projetoGerado = null;
      atualizarCorpo();
    });
    form.querySelector("#pi-voltar-passo1")?.addEventListener("click", () => {
      passo = 1;
      projetoGerado = null;
      atualizarCorpo();
    });
  }

  abrirModal(
    tituloPasso(),
    [{ tipo: "html", html: htmlAtual() }],
    async (formData, form) => {
      if (passo === 0) {
        if (selecionados.size < MIN_ROADMAPS_INTEGRADO) {
          throw new Error(
            `Selecione pelo menos ${MIN_ROADMAPS_INTEGRADO} roadmaps`
          );
        }
        passo = 1;
        await carregarTopicos();
        return { manterAberto: true };
      }

      if (passo === 1) {
        if (!topicoSelecionado) throw new Error("Escolha um tópico");
        await gerarProjeto();
        return { manterAberto: true };
      }

      const bruto =
        form.querySelector("#pi-json-preview")?.value ?? formData.get("pi_json");
      let payload;
      try {
        payload = JSON.parse(String(bruto));
      } catch {
        throw new Error("JSON do projeto inválido");
      }

      const confirmar = elementos.modalConfirmar();
      if (confirmar) {
        confirmar.disabled = true;
        confirmar.textContent = "Salvando…";
      }

      payload.roadmapIds = [...selecionados];

      let salvo;
      if (regenerar && projetoExistente?.id) {
        payload.roadmapIds = [...selecionados];
        delete payload.id;
        delete payload.criadoEm;
        salvo = await api.atualizarProjetoIntegrado(projetoExistente.id, payload);
      } else {
        delete payload.id;
        salvo = await api.salvarProjetoIntegrado(payload);
      }

      invalidarCacheProjetosIntegrados();
      cachePorId.set(salvo.id, salvo);
      if (typeof onSalvo === "function") await onSalvo(salvo);
      else await atualizarTela();
    },
    {
      largo: true,
      submitLabel: passo === 0 ? "Sugerir tópicos" : "Gerar projeto",
      submitDisabled: passo === 0 ? selecionados.size < MIN_ROADMAPS_INTEGRADO : true,
      onMount: (form) => {
        ligarEventosPasso(form);
        sincronizarBotao();
        if (passo === 1) carregarTopicos();
      },
    }
  );
}
