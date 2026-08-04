import { api } from "./api.js";

export const PROGRESSO_MINIMO_PROJETO_FINAL = 80;

const cacheProjetos = new Map();

export function invalidarCacheProjeto(roadmapId) {
  if (roadmapId) cacheProjetos.delete(roadmapId);
  else cacheProjetos.clear();
}

export function obterProjetoEmCache(roadmapId) {
  return cacheProjetos.has(roadmapId) ? cacheProjetos.get(roadmapId) : undefined;
}

export async function carregarProjetoFinal(roadmapId, { forcar = false } = {}) {
  if (!forcar && cacheProjetos.has(roadmapId)) {
    return cacheProjetos.get(roadmapId);
  }
  const projeto = await api.obterProjetoFinal(roadmapId);
  cacheProjetos.set(roadmapId, projeto);
  return projeto;
}

export function calcularProgressoProjeto(projeto) {
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
              <input type="checkbox" data-acao="pf-toggle-item" data-projeto="${escaparHtml(projetoId)}" data-colecao="${escaparHtml(colecao)}" data-item="${escaparHtml(item.id)}" ${item.concluido ? "checked" : ""}>
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
                <input type="checkbox" data-acao="pf-toggle-item" data-projeto="${escaparHtml(projetoId)}" data-colecao="etapas" data-item="${escaparHtml(etapa.id)}" data-etapa="${escaparHtml(etapa.id)}" ${etapa.concluida ? "checked" : ""}>
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
                    <input type="checkbox" data-acao="pf-toggle-item" data-projeto="${escaparHtml(projetoId)}" data-colecao="etapas" data-item="${escaparHtml(t.id)}" data-etapa="${escaparHtml(etapa.id)}" ${t.concluida ? "checked" : ""}>
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
 * @param {object} opts
 * @param {object} opts.roadmap
 * @param {number} opts.progressoTarefas
 * @param {object|null} opts.projeto
 * @param {boolean} opts.carregando
 */
export function renderizarPainelProjetoFinal({
  roadmap,
  progressoTarefas,
  projeto,
  carregando,
}) {
  const elegivel = progressoTarefas >= PROGRESSO_MINIMO_PROJETO_FINAL;

  if (carregando) {
    return `
      <div class="aba-painel" role="tabpanel">
        <section class="painel-secao">
          <p class="painel-subtitulo">Carregando Projeto Final…</p>
        </section>
      </div>`;
  }

  if (!projeto) {
    return `
      <div class="aba-painel" role="tabpanel">
        <section class="painel-secao pf-vazio">
          <h2>Projeto Final</h2>
          <p class="painel-subtitulo">Consolide o aprendizado deste roadmap em um projeto de portfólio gerado por IA.</p>
          ${
            elegivel
              ? `<button type="button" class="btn-primario" data-acao="gerar-projeto-final" data-roadmap="${escaparHtml(roadmap.id)}">Gerar Projeto Final</button>`
              : `<p class="pf-aviso">Conclua pelo menos ${PROGRESSO_MINIMO_PROJETO_FINAL}% das tarefas para gerar (atual: ${progressoTarefas}%).</p>
                 <button type="button" class="btn-primario" disabled>Gerar Projeto Final</button>`
          }
        </section>
      </div>`;
  }

  const prog = calcularProgressoProjeto(projeto);

  return `
    <div class="aba-painel" role="tabpanel">
      <section class="painel-secao pf-cabecalho">
        <div class="pf-cabecalho-info">
          <h2>${escaparHtml(projeto.nome)}</h2>
          <p class="painel-subtitulo">${escaparHtml(projeto.objetivo || projeto.descricao || "")}</p>
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
          <button type="button" class="btn-secundario btn-sm" data-acao="gerar-projeto-final" data-roadmap="${escaparHtml(roadmap.id)}" data-regenerar="1" ${elegivel ? "" : "disabled"} title="${elegivel ? "Substitui o projeto atual" : `Precisa de ${PROGRESSO_MINIMO_PROJETO_FINAL}%`}">Regenerar</button>
          <button type="button" class="btn-secundario btn-sm" data-acao="pf-marcar-concluido" data-projeto="${escaparHtml(projeto.id)}" data-concluido="${projeto.concluido ? "0" : "1"}">${projeto.concluido ? "Reabrir" : "Marcar concluído"}</button>
          <button type="button" class="btn-perigo btn-sm" data-acao="pf-excluir" data-projeto="${escaparHtml(projeto.id)}" data-roadmap="${escaparHtml(roadmap.id)}">Excluir</button>
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
        <button type="button" class="pf-topico-card ${selecionado ? "selecionado" : ""}" role="option" aria-selected="${selecionado}" data-pf-topico="${escaparHtml(t.id)}">
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

/**
 * Modal único: Fase 1 (tópicos) → Fase 2 (gerar + preview) → salvar.
 */
export function abrirModalGerarProjetoFinal({
  roadmapId,
  regenerar,
  abrirModal,
  fecharModal,
  atualizarTela,
  mostrarErro,
  elementos,
}) {
  if (regenerar) {
    const ok = confirm(
      "Regenerar substitui o Projeto Final atual deste roadmap. Continuar?"
    );
    if (!ok) return;
  }

  let passo = 1;
  let topicos = [];
  let topicoSelecionado = null;
  let projetoGerado = null;
  let carregando = true;

  const tituloPasso = () =>
    passo === 1
      ? "Projeto Final — escolha um tópico (1/2)"
      : "Projeto Final — revisar e salvar (2/2)";

  const htmlPasso1 = () => {
    if (carregando) {
      return `<p class="campo-dica pf-loading">Gerando 3 tópicos com IA…</p>`;
    }
    if (!topicos.length) {
      return `<p class="pf-aviso">Nenhum tópico retornado. Tente novamente.</p>
        <button type="button" class="btn-secundario" id="pf-retry-topicos">Tentar de novo</button>`;
    }
    return `
      <p class="campo-dica">Escolha <strong>um</strong> tópico. A geração completa só acontece no passo seguinte.</p>
      ${renderizarCardsTopicos(topicos, topicoSelecionado?.id)}
      <div class="pf-wizard-acoes">
        <button type="button" class="btn-secundario btn-sm" id="pf-outros-topicos">Gerar outros 3 tópicos</button>
      </div>`;
  };

  const htmlPasso2 = () => {
    if (carregando) {
      return `<p class="campo-dica pf-loading">Gerando o Projeto Final completo…</p>`;
    }
    if (!projetoGerado) {
      return `<p class="pf-aviso">Falha ao gerar o projeto.</p>
        <button type="button" class="btn-secundario" id="pf-voltar-passo1">Voltar aos tópicos</button>`;
    }
    return `
      <p class="campo-dica">Revise o JSON do projeto e salve. Isso ${regenerar ? "substitui" : "cria"} o Projeto Final deste roadmap.</p>
      <label class="campo">
        <span>${escaparHtml(projetoGerado.nome || "Projeto")}</span>
        <textarea name="pf_json" id="pf-json-preview" rows="16" spellcheck="false">${escaparHtml(JSON.stringify(projetoGerado, null, 2))}</textarea>
      </label>
      <div class="pf-wizard-acoes">
        <button type="button" class="btn-secundario btn-sm" id="pf-voltar-passo1">Escolher outro tópico</button>
      </div>`;
  };

  const htmlAtual = () => `
    <div class="pf-wizard" data-passo="${passo}">
      <div class="pf-wizard-passos" aria-hidden="true">
        <span class="${passo === 1 ? "ativo" : "feito"}">1. Tópicos</span>
        <span class="${passo === 2 ? "ativo" : ""}">2. Projeto</span>
      </div>
      <div id="pf-wizard-corpo">
        ${passo === 1 ? htmlPasso1() : htmlPasso2()}
      </div>
    </div>`;

  const sincronizarBotao = () => {
    const confirmar = elementos.modalConfirmar();
    if (!confirmar) return;
    if (passo === 1) {
      confirmar.textContent = "Gerar projeto";
      confirmar.disabled = carregando || !topicoSelecionado;
    } else {
      confirmar.textContent = "Salvar Projeto Final";
      confirmar.disabled = carregando || !projetoGerado;
    }
  };

  const atualizarCorpo = () => {
    const form = elementos.modalForm();
    const corpo = form?.querySelector("#pf-wizard-corpo");
    const wrap = form?.querySelector(".pf-wizard");
    if (wrap) wrap.dataset.passo = String(passo);
    if (corpo) corpo.innerHTML = passo === 1 ? htmlPasso1() : htmlPasso2();
    const titulo = elementos.modalTitulo();
    if (titulo) titulo.textContent = tituloPasso();
    sincronizarBotao();
    ligarEventosPasso(form);
  };

  async function carregarTopicos() {
    carregando = true;
    topicoSelecionado = null;
    projetoGerado = null;
    atualizarCorpo();
    try {
      const resultado = await api.sugerirTopicosProjetoFinal(roadmapId);
      topicos = resultado.topicos ?? [];
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
      const resultado = await api.gerarProjetoFinalIa(roadmapId, topicoSelecionado);
      projetoGerado = resultado.projeto;
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

    form.querySelectorAll("[data-pf-topico]").forEach((btn) => {
      btn.addEventListener("click", () => {
        topicoSelecionado = topicos.find((t) => t.id === btn.dataset.pfTopico) || null;
        atualizarCorpo();
      });
    });

    form.querySelector("#pf-outros-topicos")?.addEventListener("click", () => {
      carregarTopicos();
    });
    form.querySelector("#pf-retry-topicos")?.addEventListener("click", () => {
      carregarTopicos();
    });
    form.querySelector("#pf-voltar-passo1")?.addEventListener("click", () => {
      passo = 1;
      projetoGerado = null;
      atualizarCorpo();
    });
  }

  abrirModal(
    tituloPasso(),
    [{ tipo: "html", html: htmlAtual() }],
    async (formData, form) => {
      if (passo === 1) {
        if (!topicoSelecionado) throw new Error("Escolha um tópico");
        await gerarProjeto();
        return { manterAberto: true };
      }

      const bruto = form.querySelector("#pf-json-preview")?.value ?? formData.get("pf_json");
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

      payload.roadmapId = roadmapId;
      const salvo = await api.salvarProjetoFinal(payload);
      cacheProjetos.set(roadmapId, salvo);
      await atualizarTela();
    },
    {
      largo: true,
      submitLabel: "Gerar projeto",
      submitDisabled: true,
      onMount: (form) => {
        ligarEventosPasso(form);
        sincronizarBotao();
        carregarTopicos();
      },
    }
  );
}
