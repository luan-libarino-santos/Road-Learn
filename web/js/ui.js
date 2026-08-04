import {
  carregarDados,
  obterRoadmaps,
  obterRoadmapPorId,
  criarRoadmap,
  atualizarRoadmap,
  importarRoadmaps,
  excluirRoadmap,
  adicionarTarefa,
  atualizarTarefa,
  excluirTarefa,
  adicionarSubtarefa,
  atualizarSubtarefa,
  excluirSubtarefa,
  reordenarTarefas,
  moverTarefa,
  registrarTempo,
  iniciarTimer,
  pararTimer,
  ordenarTarefasPorOrdem,
  calcularMetricas,
  calcularDominioCompetencias,
  calcularDominioGeral,
  filtrarTarefas,
  contarPorFiltro,
  listarTags,
  tarefaEstaAtrasada,
  tarefaEstaBloqueada,
  dataRevisao,
  revisaoPendente,
  gerarId,
  TIPOS_TAREFA,
  TIPOS_LINK,
  DIFICULDADES,
  PRIORIDADES,
} from "./roadmaps.js";
import { renderizarDashboard } from "./dashboard.js";
import { renderizarGrafoDependencias } from "./grafo.js";
import { api } from "./api.js";
import { carregarPerfil, invalidarPerfil } from "./profile.js";
import {
  obterGrupos,
  obterAtribuicao,
  ordenarRoadmapsParaSidebar,
  criarGrupoSidebar,
  atualizarGrupoSidebar,
  excluirGrupoSidebar,
  reordenarGruposSidebar,
  atribuirRoadmapSidebar,
  reordenarRoadmapsSidebar,
} from "./sidebar-meta.js";

let roadmapAtivoId = null;
let vistaPainel = false;
let filtroTarefas = "todas";
let filtroTag = "";
let abaRoadmap = "tarefas";
const tarefasExpandidas = new Set();
const PROVIDERS_BUSCA_OCULTOS = new Set(["books", "reddit", "mock"]);

const SIDEBAR_STORAGE_KEY = "sa.sidebarRecolhida";
const SIDEBAR_GRUPO_KEY = "sa.sidebarGrupoAtivo";

function lerSidebarGrupoAtivo() {
  try {
    return localStorage.getItem(SIDEBAR_GRUPO_KEY) || "";
  } catch {
    return "";
  }
}

function salvarSidebarGrupoAtivo(grupoId) {
  try {
    localStorage.setItem(SIDEBAR_GRUPO_KEY, grupoId || "");
  } catch {
    /* ignore */
  }
}

let sidebarGrupoAtivo = lerSidebarGrupoAtivo();

function lerSidebarRecolhida() {
  try {
    const salvo = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (salvo !== null) return salvo === "1";
  } catch {
    /* ignore */
  }
  return typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
}

let sidebarRecolhida = lerSidebarRecolhida();

const elementos = {
  shell: () => document.getElementById("app-shell"),
  listaRoadmaps: () => document.getElementById("lista-roadmaps"),
  conteudo: () => document.getElementById("roadmap-conteudo"),
  modal: () => document.getElementById("modal"),
  modalBox: () => document.querySelector(".modal"),
  modalTitulo: () => document.getElementById("modal-titulo"),
  modalForm: () => document.getElementById("modal-form"),
  modalCancelar: () => document.getElementById("modal-cancelar"),
  modalConfirmar: () => document.querySelector('button[form="modal-form"]'),
  sidebarToggle: () => document.getElementById("sidebar-toggle"),
  sidebarSubabas: () => document.getElementById("sidebar-subabas"),
};

function aplicarEstadoSidebar() {
  const shell = elementos.shell();
  const toggle = elementos.sidebarToggle();
  if (!shell) return;
  shell.classList.toggle("sidebar-recolhida", sidebarRecolhida);
  if (toggle) {
    toggle.setAttribute("aria-expanded", sidebarRecolhida ? "false" : "true");
    toggle.title = sidebarRecolhida ? "Expandir menu" : "Recolher menu";
  }
}

function alternarSidebar() {
  sidebarRecolhida = !sidebarRecolhida;
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarRecolhida ? "1" : "0");
  } catch {
    /* ignore */
  }
  aplicarEstadoSidebar();
}

function inicialRoadmap(nome) {
  const letra = String(nome ?? "").trim().charAt(0).toUpperCase();
  return letra || "?";
}

async function executarAcao(acao) {
  try {
    await acao();
    invalidarPerfil();
    await atualizarTela();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

function mostrarErro(mensagem) {
  let el = document.getElementById("erro-global");
  if (!el) {
    el = document.createElement("div");
    el.id = "erro-global";
    el.className = "erro-global";
    document.body.appendChild(el);
  }
  el.textContent = mensagem;
  el.classList.add("visivel");
  setTimeout(() => el.classList.remove("visivel"), 4500);
}

function formatarData(dataStr) {
  if (!dataStr) return "—";
  const data = new Date(dataStr + "T00:00:00");
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatarDataHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarHoras(horas) {
  const n = Number(horas) || 0;
  if (n === 0) return "0min";
  const totalMin = Math.round(n * 60);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function prazoClasse(tarefa) {
  if (!tarefa.prazo || tarefa.concluida) return "";
  if (tarefaEstaAtrasada(tarefa)) return "prazo-atrasado";
  const hoje = new Date(new Date().toDateString());
  const prazo = new Date(tarefa.prazo + "T00:00:00");
  const diff = (prazo - hoje) / (1000 * 60 * 60 * 24);
  if (diff <= 3) return "prazo-proximo";
  return "";
}

function formatarUrl(url) {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
}

function abrirModal(titulo, campos, onSubmit, opcoes = {}) {
  const modal = elementos.modal();
  const form = elementos.modalForm();
  const modalBox = elementos.modalBox();
  elementos.modalTitulo().textContent = titulo;
  const confirmar = elementos.modalConfirmar();

  modalBox.classList.toggle("modal-largo", Boolean(opcoes.largo));
  confirmar.textContent = opcoes.submitLabel ?? "Salvar";
  confirmar.disabled = Boolean(opcoes.submitDisabled);

  form.innerHTML = campos
    .map((campo) => {
      if (campo.tipo === "html") return campo.html;
      if (campo.tipo === "select") {
        return `
    <label class="campo">
      <span>${campo.label}</span>
      <select name="${campo.name}" ${campo.required ? "required" : ""}>
        ${campo.opcoes
          .map(
            (op) =>
              `<option value="${op.value}" ${op.value === campo.valor ? "selected" : ""}>${op.label}</option>`
          )
          .join("")}
      </select>
    </label>`;
      }
      return `
    <label class="campo">
      <span>${campo.label}</span>
      ${
        campo.tipo === "textarea"
          ? `<textarea name="${campo.name}" placeholder="${campo.placeholder ?? ""}" ${campo.required ? "required" : ""} rows="${campo.rows ?? 3}">${campo.valor ?? ""}</textarea>`
          : `<input type="${campo.tipo}" name="${campo.name}" placeholder="${campo.placeholder ?? ""}" value="${campo.valor ?? ""}" ${campo.required ? "required" : ""} ${campo.min !== undefined ? `min="${campo.min}"` : ""} ${campo.step !== undefined ? `step="${campo.step}"` : ""}>`
      }
    </label>`;
    })
    .join("");

  modal.classList.add("aberto");
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const resultado = await onSubmit(new FormData(form), form);
      if (resultado?.manterAberto) return;
      fecharModal();
      atualizarTela();
    } catch (erro) {
      mostrarErro(erro.message);
    }
  };

  if (opcoes.onMount) opcoes.onMount(form);
}

function fecharModal() {
  elementos.modal().classList.remove("aberto");
  elementos.modalBox()?.classList.remove("modal-largo");
  elementos.modalForm().onsubmit = null;
  const confirmar = elementos.modalConfirmar();
  confirmar.textContent = "Salvar";
  confirmar.disabled = false;
}

function montarHtmlRoadmapBtn(roadmap, ativo) {
  const metricas = calcularMetricas(roadmap);
  const dominio = calcularDominioGeral(roadmap);
  const inicial = escaparHtml(inicialRoadmap(roadmap.nome));
  const atrib = obterAtribuicao(roadmap.id);
  const grupo = atrib.grupoId ? obterGrupos().find((g) => g.id === atrib.grupoId) : null;

  return `
    <button class="roadmap-btn ${ativo ? "ativo" : ""}" data-id="${roadmap.id}" title="${escaparHtml(roadmap.nome)} — ${metricas.concluidas}/${metricas.total} · ${dominio.dominio}% domínio">
      <span class="roadmap-btn-nome">
        <span class="roadmap-btn-inicial" aria-hidden="true">${inicial}</span>
        <span class="roadmap-btn-nome-texto">${escaparHtml(roadmap.nome)}</span>
      </span>
      <span class="roadmap-btn-meta">${metricas.concluidas}/${metricas.total} tarefas · ${dominio.dominio}% domínio${grupo && !sidebarGrupoAtivo ? ` · ${escaparHtml(grupo.nome)}` : ""}</span>
      <span class="roadmap-btn-barra"><span style="width: ${dominio.total ? dominio.dominio : metricas.progresso}%"></span></span>
    </button>`;
}

function renderizarSubabasSidebar() {
  const container = elementos.sidebarSubabas();
  if (!container) return;

  const grupos = obterGrupos();
  if (!sidebarGrupoAtivo || !grupos.some((g) => g.id === sidebarGrupoAtivo)) {
    sidebarGrupoAtivo = "";
    salvarSidebarGrupoAtivo("");
  }

  container.innerHTML = `
    <div class="sidebar-subabas-scroll">
      <button type="button" class="sidebar-subaba ${!sidebarGrupoAtivo ? "ativo" : ""}" data-acao-sidebar="grupo-todos" title="Todos os roadmaps">Todos</button>
      ${grupos
        .map(
          (grupo) => `
        <div class="sidebar-subaba-wrap">
          <button type="button" class="sidebar-subaba ${sidebarGrupoAtivo === grupo.id ? "ativo" : ""}" data-acao-sidebar="grupo-selecionar" data-grupo="${grupo.id}" title="${escaparHtml(grupo.nome)}">${escaparHtml(grupo.nome)}</button>
          <button type="button" class="sidebar-subaba-menu" data-acao-sidebar="grupo-menu" data-grupo="${grupo.id}" title="Opções do grupo">⋮</button>
        </div>`
        )
        .join("")}
      <button type="button" class="sidebar-subaba sidebar-subaba-add" data-acao-sidebar="grupo-novo" title="Novo grupo">+</button>
    </div>`;

  container.querySelectorAll("[data-acao-sidebar]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      handleSidebarAcao(el);
    });
  });
}

async function handleSidebarAcao(el) {
  const acao = el.dataset.acaoSidebar;

  if (acao === "grupo-todos") {
    sidebarGrupoAtivo = "";
    salvarSidebarGrupoAtivo("");
    atualizarTela();
    return;
  }

  if (acao === "grupo-selecionar") {
    sidebarGrupoAtivo = el.dataset.grupo;
    salvarSidebarGrupoAtivo(sidebarGrupoAtivo);
    atualizarTela();
    return;
  }

  if (acao === "grupo-novo") {
    const nome = prompt("Nome do novo grupo:", "");
    if (!nome?.trim()) return;
    await executarAcao(async () => {
      const grupo = await criarGrupoSidebar(nome.trim());
      sidebarGrupoAtivo = grupo.id;
      salvarSidebarGrupoAtivo(grupo.id);
    });
    return;
  }

  if (acao === "grupo-menu") {
    const grupoId = el.dataset.grupo;
    const grupo = obterGrupos().find((g) => g.id === grupoId);
    if (!grupo) return;
    const opcao = prompt(
      `Grupo: ${grupo.nome}\n\n1 — Renomear\n2 — Mover para esquerda\n3 — Mover para direita\n4 — Excluir\n\nDigite o número:`,
      "1"
    );
    if (!opcao) return;

    if (opcao === "1") {
      const nome = prompt("Novo nome do grupo:", grupo.nome);
      if (!nome?.trim() || nome.trim() === grupo.nome) return;
      await executarAcao(() => atualizarGrupoSidebar(grupoId, { nome: nome.trim() }));
    } else if (opcao === "2" || opcao === "3") {
      const grupos = obterGrupos();
      const ids = grupos.map((g) => g.id);
      const idx = ids.indexOf(grupoId);
      const novoIdx = opcao === "2" ? idx - 1 : idx + 1;
      if (novoIdx < 0 || novoIdx >= ids.length) return;
      [ids[idx], ids[novoIdx]] = [ids[novoIdx], ids[idx]];
      await executarAcao(() => reordenarGruposSidebar(ids));
    } else if (opcao === "4") {
      if (!confirm(`Excluir o grupo "${grupo.nome}"? Os roadmaps não serão apagados.`)) return;
      await executarAcao(async () => {
        await excluirGrupoSidebar(grupoId);
        if (sidebarGrupoAtivo === grupoId) {
          sidebarGrupoAtivo = "";
          salvarSidebarGrupoAtivo("");
        }
      });
    }
    return;
  }

  if (acao === "roadmap-cima" || acao === "roadmap-baixo") {
    const roadmapId = el.dataset.roadmap;
    const grupoId = sidebarGrupoAtivo || null;
    const roadmaps = ordenarRoadmapsParaSidebar(obterRoadmaps(), grupoId || null);
    const ids = roadmaps.map((r) => r.id);
    const idx = ids.indexOf(roadmapId);
    const novoIdx = acao === "roadmap-cima" ? idx - 1 : idx + 1;
    if (idx === -1 || novoIdx < 0 || novoIdx >= ids.length) return;
    [ids[idx], ids[novoIdx]] = [ids[novoIdx], ids[idx]];
    await executarAcao(() => reordenarRoadmapsSidebar(grupoId, ids));
  }
}

export function renderizarSidebar() {
  aplicarEstadoSidebar();
  renderizarSubabasSidebar();

  const lista = elementos.listaRoadmaps();
  const roadmaps = obterRoadmaps();
  const grupoFiltro = sidebarGrupoAtivo || null;
  const roadmapsVisiveis = ordenarRoadmapsParaSidebar(roadmaps, grupoFiltro);

  lista.innerHTML = "";

  const liPainel = document.createElement("li");
  liPainel.innerHTML = `
    <button class="roadmap-btn painel-btn ${vistaPainel ? "ativo" : ""}" data-acao-nav="painel" title="Ficha — habilidades, XP e nível">
      <span class="roadmap-btn-nome">
        <span class="roadmap-btn-inicial" aria-hidden="true">F</span>
        <span class="roadmap-btn-nome-texto">Ficha</span>
      </span>
      <span class="roadmap-btn-meta">Skills · XP · nível</span>
    </button>`;
  lista.appendChild(liPainel);
  liPainel.querySelector("button").addEventListener("click", () => {
    vistaPainel = true;
    roadmapAtivoId = null;
    atualizarTela();
  });

  if (roadmaps.length === 0) {
    const vazio = document.createElement("li");
    vazio.className = "sidebar-vazio";
    vazio.textContent = "Nenhum roadmap ainda";
    lista.appendChild(vazio);
    return;
  }

  if (roadmapsVisiveis.length === 0) {
    const vazio = document.createElement("li");
    vazio.className = "sidebar-vazio";
    vazio.textContent = sidebarGrupoAtivo
        ? "Nenhum roadmap neste grupo. Edite um roadmap e atribua-o aqui."
        : "Nenhum roadmap";
    lista.appendChild(vazio);
    return;
  }

  roadmapsVisiveis.forEach((roadmap, posicao) => {
    const li = document.createElement("li");
    li.className = "sidebar-roadmap-item";
    const ativo = !vistaPainel && roadmap.id === roadmapAtivoId;
    li.innerHTML = `
      <div class="sidebar-roadmap-ordem">
        <button type="button" class="btn-icone btn-mover-sidebar" data-acao-sidebar="roadmap-cima" data-roadmap="${roadmap.id}" title="Mover para cima" ${posicao === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="btn-icone btn-mover-sidebar" data-acao-sidebar="roadmap-baixo" data-roadmap="${roadmap.id}" title="Mover para baixo" ${posicao === roadmapsVisiveis.length - 1 ? "disabled" : ""}>↓</button>
      </div>
      ${montarHtmlRoadmapBtn(roadmap, ativo)}
    `;
    lista.appendChild(li);
  });

  lista.querySelectorAll(".roadmap-btn[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => selecionarRoadmap(btn.dataset.id));
  });

  lista.querySelectorAll("[data-acao-sidebar]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      handleSidebarAcao(el);
    });
  });
}

function renderizarEstadoVazio() {
  elementos.conteudo().innerHTML = `
    <div class="estado-vazio">
      <div class="estado-vazio-icone" aria-hidden="true">S</div>
      <h2>Espaço de roadmaps</h2>
      <p>Crie um roadmap, organize competências e tarefas, e acompanhe domínio e progresso.</p>
      <button class="btn-primario" id="criar-primeiro">Criar primeiro roadmap</button>
    </div>
  `;
  document.getElementById("criar-primeiro")?.addEventListener("click", mostrarModalNovoRoadmap);
}

function renderizarMetricas(metricas, classeExtra = "") {
  return `
    <div class="metricas ${classeExtra}">
      <div class="metrica-card">
        <span class="metrica-valor">${metricas.concluidas}</span>
        <span class="metrica-label">Concluídas</span>
      </div>
      <div class="metrica-card">
        <span class="metrica-valor">${metricas.pendentes}</span>
        <span class="metrica-label">Pendentes</span>
      </div>
      <div class="metrica-card">
        <span class="metrica-valor">${formatarHoras(metricas.horasRestantes)}</span>
        <span class="metrica-label">Tempo restante</span>
      </div>
      <div class="metrica-card">
        <span class="metrica-valor">${formatarHoras(metricas.horasReais)}</span>
        <span class="metrica-label">Horas reais</span>
      </div>
      <div class="metrica-card">
        <span class="metrica-valor">${metricas.atrasadas}</span>
        <span class="metrica-label">Atrasadas</span>
      </div>
    </div>
  `;
}

function renderizarAbasRoadmap(roadmap) {
  const nComp = (roadmap.competencias ?? []).length;
  const nTarefas = (roadmap.tarefas ?? []).length;
  const abas = [
    { id: "competencias", label: "Competências", contagem: nComp },
    { id: "arvore", label: "Árvore", contagem: nTarefas },
    { id: "tarefas", label: "Tarefas", contagem: nTarefas },
  ];

  return `
    <div class="roadmap-abas" role="tablist" aria-label="Seções do roadmap">
      ${abas
        .map(
          (aba) => `
        <button type="button" class="aba-btn ${abaRoadmap === aba.id ? "ativo" : ""}" role="tab" aria-selected="${abaRoadmap === aba.id}" data-acao="trocar-aba" data-aba="${aba.id}">
          ${aba.label}
          <span class="aba-contagem">${aba.contagem}</span>
        </button>`
        )
        .join("")}
    </div>
  `;
}

function renderizarPainelAba(roadmap, metricas, dominioGeral, contagens, tags, tarefasOrdenadas, tarefasCompletas, podeReordenar) {
  if (abaRoadmap === "competencias") {
    return `<div class="aba-painel" role="tabpanel">${renderizarPainelCompetencias(roadmap)}</div>`;
  }

  if (abaRoadmap === "arvore") {
    return `
      <div class="aba-painel" role="tabpanel">
        <section class="painel-secao grafo-secao">
          <h2>Árvore de tecnologia</h2>
          <p class="painel-subtitulo">Dependências entre tarefas — caminho percorrido versus o que ainda falta desbloquear.</p>
          ${renderizarGrafoDependencias(tarefasCompletas)}
        </section>
      </div>
    `;
  }

  return `
    <div class="aba-painel" role="tabpanel">
      <section class="secao-tarefas">
        <div class="secao-titulo">
          <h2>Tarefas</h2>
          <button class="btn-primario btn-sm" id="btn-nova-tarefa">+ Nova tarefa</button>
        </div>

        <form class="form-tarefa" id="form-nova-tarefa">
          <input type="text" name="titulo" placeholder="O que precisa fazer?" required>
          ${renderizarSeletorTipo("tipo", "pratica", { inline: true })}
          <input type="date" name="prazo" title="Prazo">
          <input type="number" name="horasEstimadas" placeholder="Horas" min="0" step="0.5" title="Horas estimadas">
          <button type="submit" class="btn-primario">Adicionar</button>
        </form>

        ${renderizarLegendaTipos()}
        ${renderizarFiltros(contagens, tags)}

        ${
          !podeReordenar && roadmap.tarefas.length > 0
            ? `<p class="aviso-ordenacao">Para reordenar tarefas, use o filtro <strong>Todas</strong> sem tag.</p>`
            : podeReordenar && tarefasOrdenadas.length > 1
              ? `<p class="dica-ordenacao">Arraste pelo ícone ⠿ ou use ↑ ↓ para definir a ordem das tarefas.</p>`
              : ""
        }

        <ul class="lista-tarefas" id="lista-tarefas-ordenavel" data-roadmap="${roadmap.id}" data-reordenavel="${podeReordenar}">
          ${
            tarefasOrdenadas.length === 0
              ? `<li class="tarefas-vazio">${filtroTarefas === "todas" && !filtroTag ? "Nenhuma tarefa ainda. Adicione a primeira acima." : "Nenhuma tarefa neste filtro."}</li>`
              : tarefasOrdenadas
                  .map((t) => {
                    const posicaoGlobal = tarefasCompletas.findIndex((tc) => tc.id === t.id);
                    return renderizarTarefa(roadmap.id, t, tarefasCompletas, {
                      podeReordenar,
                      posicao: posicaoGlobal,
                      total: tarefasCompletas.length,
                      competencias: roadmap.competencias ?? [],
                    });
                  })
                  .join("")
          }
        </ul>
      </section>
    </div>
  `;
}

function renderizarPainelCompetencias(roadmap) {
  const dominioGeral = calcularDominioGeral(roadmap);
  const lista = calcularDominioCompetencias(roadmap);

  if (!lista.length) {
    return `
      <section class="competencias-painel">
        <div class="competencias-header">
          <div>
            <h2>Competências</h2>
            <p class="painel-subtitulo">Meça domínio real, não só tarefas concluídas.</p>
          </div>
          <button type="button" class="btn-sm btn-secundario" data-acao="gerenciar-competencias" data-roadmap="${roadmap.id}">+ Competências</button>
        </div>
        <p class="detalhe-vazio">Nenhuma competência ainda. Defina skills (ex.: Routing, Eloquent) e vincule nas tarefas.</p>
      </section>
    `;
  }

  return `
    <section class="competencias-painel">
      <div class="competencias-header">
        <div>
          <h2>Competências</h2>
          <p class="painel-subtitulo">Domínio geral: <strong>${dominioGeral.dominio}%</strong> · ${dominioGeral.cobertas}/${dominioGeral.total} skills com tarefas</p>
        </div>
        <button type="button" class="btn-sm btn-secundario" data-acao="gerenciar-competencias" data-roadmap="${roadmap.id}">Gerenciar</button>
      </div>
      <div class="dominio-geral-barra">
        <div class="dominio-geral-preenchimento" style="width:${dominioGeral.dominio}%"></div>
      </div>
      <ul class="lista-competencias-dominio">
        ${lista
          .map(
            (c) => `
          <li class="${c.coberta ? "" : "sem-cobertura"}">
            <div class="comp-linha">
              <span class="comp-nome">${escaparHtml(c.nome)}</span>
              <span class="comp-pct">${c.coberta ? `${c.dominio}%` : "—"}</span>
            </div>
            <div class="comp-barra"><span style="width:${c.coberta ? c.dominio : 0}%"></span></div>
            <p class="comp-meta">${c.coberta ? `${c.tarefasConcluidas}/${c.totalTarefas} tarefas` : "sem tarefas vinculadas"}</p>
          </li>`
          )
          .join("")}
      </ul>
    </section>
  `;
}

function montarHtmlCompetenciasEditor(tarefa, roadmap) {
  const comps = roadmap.competencias ?? [];
  if (!comps.length) {
    return `<p class="campo-dica">Nenhuma competência neste roadmap. Use “Gerenciar competências” no painel acima.</p>`;
  }
  const selecionadas = new Set(tarefa.competenciasIds ?? []);
  return `
    <div class="campo">
      <span>Competências que esta tarefa desenvolve</span>
      <div class="depends-lista">
        ${comps
          .map(
            (c) => `
          <label class="depends-item">
            <input type="checkbox" name="competenciasIds" value="${c.id}" ${selecionadas.has(c.id) ? "checked" : ""}>
            ${escaparHtml(c.nome)}
          </label>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderizarSeletorTipo(nomeCampo = "tipo", valorSelecionado = "pratica", opcoes = {}) {
  const { inline = false } = opcoes;
  return `
    <div class="campo ${inline ? "campo-inline" : ""}">
      ${inline ? "" : "<span>Tipo</span>"}
      <div class="tipo-seletor ${inline ? "tipo-seletor-inline" : ""}">
        ${Object.entries(TIPOS_TAREFA)
          .map(
            ([id, info]) => `
          <label class="tipo-opcao tipo-${id} ${valorSelecionado === id ? "selecionado" : ""}" style="--tipo-cor: ${info.cor}; --tipo-fundo: ${info.fundo}">
            <input type="radio" name="${nomeCampo}" value="${id}" ${valorSelecionado === id ? "checked" : ""} required>
            <span class="tipo-opcao-indicador"></span>
            ${info.label}
          </label>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderizarBadgeTipo(tipo) {
  const info = TIPOS_TAREFA[tipo] ?? TIPOS_TAREFA.pratica;
  return `<span class="tipo-badge tipo-${tipo}" style="--tipo-cor: ${info.cor}; --tipo-fundo: ${info.fundo}">${info.label}</span>`;
}

function renderizarLegendaTipos() {
  return `
    <div class="legenda-tipos">
      ${Object.entries(TIPOS_TAREFA)
        .map(
          ([id, info]) =>
            `<span class="legenda-tipo tipo-${id}" style="--tipo-cor: ${info.cor}; --tipo-fundo: ${info.fundo}">${info.label}</span>`
        )
        .join("")}
    </div>
  `;
}

function renderizarFiltros(contagens, tags) {
  const filtros = [
    { id: "todas", label: "Todas" },
    { id: "liberadas", label: "Liberadas" },
    { id: "bloqueadas", label: "Bloqueadas" },
    { id: "pendentes", label: "Pendentes" },
    { id: "concluidas", label: "Concluídas" },
    { id: "atrasadas", label: "Atrasadas" },
    { id: "revisao", label: "Revisão" },
  ];

  return `
    <div class="filtros-tarefas">
      ${filtros
        .map(
          (f) => `
        <button type="button" class="filtro-btn ${filtroTarefas === f.id ? "ativo" : ""}" data-acao="filtrar" data-filtro="${f.id}">
          ${f.label} <span class="filtro-contagem">${contagens[f.id] ?? 0}</span>
        </button>`
        )
        .join("")}
    </div>
    ${
      tags.length
        ? `<div class="filtros-tags">
            <button type="button" class="tag-filtro ${!filtroTag ? "ativo" : ""}" data-acao="filtrar-tag" data-tag="">todas as tags</button>
            ${tags
              .map(
                (tag) =>
                  `<button type="button" class="tag-filtro ${filtroTag === tag ? "ativo" : ""}" data-acao="filtrar-tag" data-tag="${escaparHtml(tag)}">${escaparHtml(tag)}</button>`
              )
              .join("")}
          </div>`
        : ""
    }
  `;
}

function iconeLink(tipo) {
  return TIPOS_LINK[tipo]?.icone ?? TIPOS_LINK.outro.icone;
}

function renderizarLinks(links) {
  if (!links.length) return `<p class="detalhe-vazio">Nenhum link adicionado</p>`;
  return `
    <ul class="lista-links">
      ${links
        .map(
          (link) => `
        <li>
          <a href="${escaparHtml(formatarUrl(link.url))}" target="_blank" rel="noopener noreferrer">
            ${iconeLink(link.tipo)} <span class="link-tipo">${TIPOS_LINK[link.tipo]?.label ?? "Outro"}</span>
            ${escaparHtml(link.titulo || link.url)}
          </a>
        </li>`
        )
        .join("")}
    </ul>
  `;
}

function normalizarUrlComparacao(valor) {
  try {
    const url = new URL(formatarUrl(String(valor ?? "").trim()));
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return String(valor ?? "").trim().toLowerCase().replace(/\/+$/, "");
  }
}

function formatarNumeroCompacto(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "";
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(numero);
}

function metadadosResultadoBusca(resultado) {
  const metadados = [
    resultado.provider || resultado.source,
    TIPOS_LINK[resultado.type]?.label ?? resultado.type,
    Number.isFinite(resultado.score) ? `score ${resultado.score}` : "",
    resultado.language ? `idioma ${resultado.language}` : "",
    resultado.stars !== undefined ? `★ ${formatarNumeroCompacto(resultado.stars)}` : "",
    resultado.forks !== undefined ? `${formatarNumeroCompacto(resultado.forks)} forks` : "",
    resultado.channel ? `canal ${resultado.channel}` : "",
    resultado.viewCount !== undefined ? `${formatarNumeroCompacto(resultado.viewCount)} views` : "",
    resultado.durationMinutes ? `${resultado.durationMinutes} min` : "",
    resultado.votes !== undefined ? `${resultado.votes} votos` : "",
    resultado.answerCount !== undefined ? `${resultado.answerCount} respostas` : "",
    resultado.isAnswered ? "respondida" : "",
  ];
  return metadados.filter(Boolean);
}

function renderizarResultadosBusca(resultados, urlsExistentes) {
  if (!resultados.length) {
    return `<p class="busca-links-vazio">Nenhum recurso encontrado com os providers selecionados.</p>`;
  }

  const grupos = new Map();
  resultados.forEach((resultado, indice) => {
    const provider = resultado.provider || resultado.source || "outro";
    if (!grupos.has(provider)) grupos.set(provider, []);
    grupos.get(provider).push({ resultado, indice });
  });

  return [...grupos.entries()]
    .map(
      ([provider, itens]) => `
        <section class="busca-links-grupo">
          <h4>${escaparHtml(provider)} <span>${itens.length} resultado(s)</span></h4>
          <div class="busca-links-lista">
            ${itens
              .map(({ resultado, indice }) => {
                const jaAdicionado = urlsExistentes.has(normalizarUrlComparacao(resultado.url));
                const metadados = metadadosResultadoBusca(resultado);
                return `
                  <label class="busca-link-item ${jaAdicionado ? "ja-adicionado" : ""}">
                    <input type="checkbox" name="resultadoBusca" value="${indice}" ${jaAdicionado ? "disabled" : ""}>
                    <span class="busca-link-conteudo">
                      <span class="busca-link-topo">
                        <a href="${escaparHtml(formatarUrl(resultado.url))}" target="_blank" rel="noopener noreferrer" data-nao-selecionar>
                          ${escaparHtml(resultado.title || resultado.url)}
                        </a>
                        ${jaAdicionado ? `<span class="busca-link-existente">Já adicionado</span>` : ""}
                      </span>
                      <span class="busca-link-url">${escaparHtml(resultado.url)}</span>
                      ${resultado.snippet ? `<span class="busca-link-trecho">${escaparHtml(resultado.snippet)}</span>` : ""}
                      <span class="busca-link-meta">
                        ${metadados.map((item) => `<span>${escaparHtml(item)}</span>`).join("")}
                      </span>
                    </span>
                  </label>`;
              })
              .join("")}
          </div>
        </section>`
    )
    .join("");
}

function mostrarModalBuscarLinks(roadmapId, tarefaId) {
  const roadmap = obterRoadmapPorId(roadmapId);
  const tarefa = roadmap?.tarefas.find((item) => item.id === tarefaId);
  if (!roadmap || !tarefa) return;

  let resultadosBusca = [];
  const urlsExistentes = new Set((tarefa.links ?? []).map((link) => normalizarUrlComparacao(link.url)));

  abrirModal(
    "Buscar links para a tarefa",
    [
      {
        tipo: "html",
        html: `
          <div class="busca-links-modal">
            <p class="busca-links-contexto">Buscando recursos para <strong>${escaparHtml(tarefa.titulo)}</strong></p>
            <fieldset class="busca-links-providers">
              <legend>Providers</legend>
              <div id="busca-links-providers-lista">
                <p class="busca-links-vazio">Carregando providers...</p>
              </div>
            </fieldset>
            <button type="button" class="btn-secundario busca-links-botao" id="btn-executar-busca" disabled>Buscar recursos</button>
            <p class="busca-links-status" id="busca-links-status" aria-live="polite"></p>
            <div class="busca-links-resultados" id="busca-links-resultados">
              <p class="busca-links-vazio">Selecione os providers e execute a busca.</p>
            </div>
          </div>`,
      },
    ],
    async (_formData, form) => {
      const indices = [...form.querySelectorAll('input[name="resultadoBusca"]:checked')].map((el) =>
        Number(el.value)
      );
      if (!indices.length) throw new Error("Selecione ao menos um link para adicionar.");

      const urls = new Set(urlsExistentes);
      const novosLinks = [];
      for (const indice of indices) {
        const resultado = resultadosBusca[indice];
        if (!resultado?.url) continue;
        const urlNormalizada = normalizarUrlComparacao(resultado.url);
        if (urls.has(urlNormalizada)) continue;
        urls.add(urlNormalizada);
        novosLinks.push({
          id: gerarId(),
          titulo: resultado.title || resultado.url,
          url: resultado.url,
          tipo: TIPOS_LINK[resultado.type] ? resultado.type : "outro",
        });
      }

      if (!novosLinks.length) throw new Error("Os links selecionados já estão nesta tarefa.");
      await atualizarTarefa(roadmapId, tarefaId, { links: [...(tarefa.links ?? []), ...novosLinks] });
      tarefasExpandidas.add(tarefaId);
    },
    {
      largo: true,
      submitLabel: "Adicionar links",
      submitDisabled: true,
      onMount: async (form) => {
        const providersLista = form.querySelector("#busca-links-providers-lista");
        const resultadosEl = form.querySelector("#busca-links-resultados");
        const statusEl = form.querySelector("#busca-links-status");
        const buscarBtn = form.querySelector("#btn-executar-busca");
        const confirmarBtn = elementos.modalConfirmar();

        const atualizarConfirmacao = () => {
          confirmarBtn.disabled = !form.querySelector('input[name="resultadoBusca"]:checked');
        };

        resultadosEl.addEventListener("change", atualizarConfirmacao);
        resultadosEl.addEventListener("click", (evento) => {
          if (evento.target.closest("[data-nao-selecionar]")) evento.stopPropagation();
        });

        try {
          const { providers } = await api.listarProvidersBusca();
          const visiveis = (providers ?? []).filter((provider) => !PROVIDERS_BUSCA_OCULTOS.has(provider.name));
          providersLista.innerHTML = visiveis.length
            ? visiveis
                .map((provider) => {
                  const indisponivel = provider.requiresKey && !provider.configured;
                  const status = indisponivel
                    ? `Requer ${provider.envVar}`
                    : provider.requiresKey
                      ? "Configurado"
                      : "Disponível";
                  return `
                    <label class="busca-provider ${indisponivel ? "indisponivel" : ""}">
                      <input type="checkbox" name="providerBusca" value="${escaparHtml(provider.name)}"
                        ${indisponivel ? "disabled" : "checked"}>
                      <span>
                        <strong>${escaparHtml(provider.label)}</strong>
                        <small>${escaparHtml(provider.description)} · ${escaparHtml(status)}</small>
                      </span>
                    </label>`;
                })
                .join("")
            : `<p class="busca-links-vazio">Nenhum provider disponível.</p>`;
          buscarBtn.disabled = !form.querySelector('input[name="providerBusca"]:not(:disabled)');
        } catch (erro) {
          providersLista.innerHTML = `<p class="busca-links-status erro">${escaparHtml(erro.message)}</p>`;
        }

        buscarBtn.addEventListener("click", async () => {
          const providers = [...form.querySelectorAll('input[name="providerBusca"]:checked')].map(
            (el) => el.value
          );
          if (!providers.length) {
            statusEl.className = "busca-links-status erro";
            statusEl.textContent = "Selecione ao menos um provider.";
            return;
          }

          buscarBtn.disabled = true;
          confirmarBtn.disabled = true;
          statusEl.className = "busca-links-status";
          statusEl.textContent = "Buscando recursos...";
          resultadosEl.innerHTML = `<p class="busca-links-vazio">Consultando ${providers.length} provider(s)...</p>`;

          try {
            const resposta = await api.buscarLinks({
              roadmapNome: roadmap.nome,
              titulo: tarefa.titulo,
              descricao: tarefa.descricao || "",
              subtarefas: (tarefa.subtarefas ?? []).map((subtarefa) => ({ titulo: subtarefa.titulo })),
              options: {
                providers,
                languagePreference: ["pt", "en"],
                debug: false,
              },
            });
            resultadosBusca = resposta.results ?? [];
            resultadosEl.innerHTML = renderizarResultadosBusca(resultadosBusca, urlsExistentes);
            const avisos = resposta.meta?.errors ?? [];
            statusEl.className = `busca-links-status ${avisos.length ? "aviso" : ""}`;
            statusEl.textContent = avisos.length
              ? `${resultadosBusca.length} resultado(s). ${avisos.map((erro) => `${erro.provider}: ${erro.message}`).join(" · ")}`
              : `${resultadosBusca.length} resultado(s) em ${resposta.meta?.durationMs ?? 0} ms.`;
            atualizarConfirmacao();
          } catch (erro) {
            resultadosBusca = [];
            resultadosEl.innerHTML = `<p class="busca-links-vazio">Não foi possível concluir a busca.</p>`;
            statusEl.className = "busca-links-status erro";
            statusEl.textContent = erro.message;
          } finally {
            buscarBtn.disabled = false;
          }
        });
      },
    }
  );
}

function renderizarSubtarefas(roadmapId, tarefa) {
  const concluidas = tarefa.subtarefas.filter((s) => s.concluida).length;
  const total = tarefa.subtarefas.length;

  return `
    <div class="subtarefas-secao">
      ${total > 0 ? `<p class="subtarefas-progresso">${concluidas}/${total} subtarefas</p>` : ""}
      <ul class="lista-subtarefas">
        ${tarefa.subtarefas
          .map(
            (sub) => `
          <li class="subtarefa-item ${sub.concluida ? "concluida" : ""}">
            <label class="tarefa-check tarefa-check-sm">
              <input type="checkbox" ${sub.concluida ? "checked" : ""} data-acao="toggle-subtarefa" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}" data-subtarefa="${sub.id}">
              <span class="check-custom"></span>
            </label>
            <span class="subtarefa-titulo">${escaparHtml(sub.titulo)}</span>
            <button type="button" class="btn-icone btn-excluir-subtarefa" data-acao="excluir-subtarefa" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}" data-subtarefa="${sub.id}" title="Excluir subtarefa">✕</button>
          </li>`
          )
          .join("")}
      </ul>
      <form class="form-subtarefa" data-acao="adicionar-subtarefa" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}">
        <input type="text" name="titulo" placeholder="Nova subtarefa..." required>
        <button type="submit" class="btn-primario btn-sm">+</button>
      </form>
    </div>
  `;
}

function renderizarHistorico(historico) {
  const itens = [...(historico ?? [])].reverse().slice(0, 8);
  if (!itens.length) return `<p class="detalhe-vazio">Sem histórico ainda</p>`;
  const labels = {
    criada: "Criada",
    concluida: "Concluída",
    reaberta: "Reaberta",
    editada: "Editada",
    tempo: "Tempo",
    timer_inicio: "Timer iniciado",
    timer_fim: "Timer parado",
  };
  return `
    <ul class="lista-historico">
      ${itens
        .map(
          (h) => `
        <li>
          <span class="hist-tipo">${labels[h.tipo] ?? h.tipo}</span>
          <span class="hist-quando">${formatarDataHora(h.em)}</span>
          ${h.detalhe ? `<span class="hist-detalhe">${escaparHtml(h.detalhe)}</span>` : ""}
        </li>`
        )
        .join("")}
    </ul>
  `;
}

function renderizarControlesTempo(roadmapId, tarefa) {
  const timerAtivo = Boolean(tarefa.timerAtivoDesde);
  return `
    <div class="tempo-controles">
      <p class="tempo-resumo">
        Estimado: <strong>${formatarHoras(tarefa.horasEstimadas)}</strong>
        · Real: <strong>${formatarHoras(tarefa.horasReais)}</strong>
        ${
          tarefa.horasEstimadas > 0
            ? ` · (${Math.round(((tarefa.horasReais || 0) / tarefa.horasEstimadas) * 100)}%)`
            : ""
        }
        ${timerAtivo ? ` · <span class="timer-ativo">⏱ timer rodando</span>` : ""}
      </p>
      <div class="tempo-acoes">
        ${
          timerAtivo
            ? `<button type="button" class="btn-sm btn-primario" data-acao="parar-timer" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}">Parar timer</button>`
            : `<button type="button" class="btn-sm btn-secundario" data-acao="iniciar-timer" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}">Iniciar timer</button>`
        }
        <button type="button" class="btn-sm btn-secundario" data-acao="registrar-tempo" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}">+ Registrar tempo</button>
      </div>
    </div>
  `;
}

function renderizarTarefa(roadmapId, tarefa, todas, opcoes = {}) {
  const { podeReordenar = false, posicao = 0, total = 1, competencias = [] } = opcoes;
  const classePrazo = prazoClasse(tarefa);
  const expandida = tarefasExpandidas.has(tarefa.id);
  const { bloqueada, pendentes } = tarefaEstaBloqueada(tarefa, todas);
  const temDetalhes =
    tarefa.descricao ||
    tarefa.observacoes ||
    tarefa.criterioConclusao ||
    tarefa.links.length > 0 ||
    tarefa.subtarefas.length > 0 ||
    (tarefa.competenciasIds ?? []).length > 0 ||
    (tarefa.historico ?? []).length > 0;
  const tipoInfo = TIPOS_TAREFA[tarefa.tipo] ?? TIPOS_TAREFA.pratica;
  const revisao = dataRevisao(tarefa);

  const badges = [];
  if (bloqueada && !tarefa.concluida) badges.push("🔒 bloqueada");
  if (tarefa.prioridade === "alta") badges.push("⬆ alta");
  if (tarefa.dificuldade) badges.push(DIFICULDADES[tarefa.dificuldade]?.label ?? tarefa.dificuldade);
  if (tarefa.links.length) badges.push(`🔗 ${tarefa.links.length}`);
  if (tarefa.subtarefas.length) {
    const done = tarefa.subtarefas.filter((s) => s.concluida).length;
    badges.push(`📋 ${done}/${tarefa.subtarefas.length}`);
  }
  if (tarefa.criterioConclusao) badges.push("✓ critério");
  if (revisaoPendente(tarefa)) badges.push("🔁 revisar");
  if (tarefa.timerAtivoDesde) badges.push("⏱");

  const compsNomes = competencias
    .filter((c) => (tarefa.competenciasIds ?? []).includes(c.id))
    .map((c) => c.nome);

  return `
    <li class="tarefa-item tipo-${tarefa.tipo} ${tarefa.concluida ? "concluida" : ""} ${bloqueada && !tarefa.concluida ? "bloqueada" : ""} ${expandida ? "expandida" : ""} ${podeReordenar ? "reordenavel" : ""}" data-tarefa-id="${tarefa.id}" style="--tipo-cor: ${tipoInfo.cor}; --tipo-fundo: ${tipoInfo.fundo}">
      <div class="tarefa-linha-principal">
        ${
          podeReordenar
            ? `<button type="button" class="tarefa-arrastar" data-acao="arrastar" title="Arrastar para reordenar" draggable="true">⠿</button>`
            : `<span class="tarefa-ordem-num">${posicao + 1}</span>`
        }
        <label class="tarefa-check">
          <input type="checkbox" ${tarefa.concluida ? "checked" : ""} ${bloqueada && !tarefa.concluida ? "disabled" : ""} data-acao="toggle" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}">
          <span class="check-custom"></span>
        </label>
        <div class="tarefa-info tarefa-info-clicavel" data-acao="expandir" data-tarefa="${tarefa.id}" title="Clique para ver detalhes">
          <div class="tarefa-titulo-linha">
            <span class="tarefa-titulo">${escaparHtml(tarefa.titulo)}</span>
            ${renderizarBadgeTipo(tarefa.tipo)}
          </div>
          <div class="tarefa-detalhes">
            <span class="tarefa-prazo ${classePrazo}">📅 ${formatarData(tarefa.prazo)}</span>
            <span class="tarefa-horas">⏱ ${formatarHoras(tarefa.horasEstimadas)}${tarefa.horasReais ? ` / ${formatarHoras(tarefa.horasReais)} real` : ""}</span>
            ${badges.map((b) => `<span class="tarefa-badge">${b}</span>`).join("")}
            ${compsNomes.map((n) => `<span class="tarefa-skill">${escaparHtml(n)}</span>`).join("")}
          </div>
          ${
            (tarefa.tags ?? []).length
              ? `<div class="tarefa-tags-linha">${(tarefa.tags ?? []).map((tag) => `<span class="tarefa-tag">${escaparHtml(tag)}</span>`).join("")}</div>`
              : ""
          }
          ${
            bloqueada && !tarefa.concluida
              ? `<p class="tarefa-bloqueio">Depende de: ${pendentes.map((p) => escaparHtml(p.titulo)).join(", ")}</p>`
              : ""
          }
        </div>
        <div class="tarefa-acoes">
          ${
            podeReordenar
              ? `
          <button type="button" class="btn-icone btn-mover" data-acao="mover-cima" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}" title="Mover para cima" ${posicao === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="btn-icone btn-mover" data-acao="mover-baixo" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}" title="Mover para baixo" ${posicao === total - 1 ? "disabled" : ""}>↓</button>`
              : ""
          }
          <button type="button" class="btn-icone btn-expandir" data-acao="expandir" data-tarefa="${tarefa.id}" title="${expandida ? "Recolher" : "Expandir"}">${expandida ? "▲" : "▼"}</button>
          <button type="button" class="btn-icone btn-buscar-links" data-acao="buscar-links" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}" title="Buscar links para a tarefa">⌕</button>
          <button type="button" class="btn-icone btn-editar" data-acao="editar-tarefa" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}" title="Editar tarefa">✎</button>
          <button type="button" class="btn-icone btn-excluir-tarefa" data-acao="excluir-tarefa" data-roadmap="${roadmapId}" data-tarefa="${tarefa.id}" title="Excluir tarefa">✕</button>
        </div>
      </div>
      ${
        expandida
          ? `
      <div class="tarefa-expandida">
        ${
          tarefa.descricao
            ? `<div class="tarefa-secao-detalhe tarefa-descricao-bloco">
                <h4>Descrição</h4>
                <p class="tarefa-observacoes">${escaparHtml(tarefa.descricao)}</p>
              </div>`
            : ""
        }
        <div class="tarefa-secao-detalhe">
          <h4>Competências</h4>
          ${
            compsNomes.length
              ? `<p class="tarefa-observacoes">${compsNomes.map((n) => `+ ${escaparHtml(n)}`).join("<br>")}</p>`
              : `<p class="detalhe-vazio">Nenhuma competência vinculada</p>`
          }
        </div>
        <div class="tarefa-secao-detalhe">
          <h4>Critério de conclusão</h4>
          ${tarefa.criterioConclusao ? `<p class="tarefa-observacoes">${escaparHtml(tarefa.criterioConclusao)}</p>` : `<p class="detalhe-vazio">Não definido</p>`}
        </div>
        <div class="tarefa-secao-detalhe">
          <h4>Observações</h4>
          ${tarefa.observacoes ? `<p class="tarefa-observacoes">${escaparHtml(tarefa.observacoes)}</p>` : `<p class="detalhe-vazio">Sem observações</p>`}
        </div>
        <div class="tarefa-secao-detalhe">
          <h4>Tempo de estudo</h4>
          ${renderizarControlesTempo(roadmapId, tarefa)}
        </div>
        ${
          tarefa.reviewAfterDays
            ? `<div class="tarefa-secao-detalhe">
                <h4>Revisão espaçada</h4>
                <p class="tarefa-observacoes">Revisar após ${tarefa.reviewAfterDays} dia(s)${revisao ? ` · próxima: <strong>${formatarData(revisao)}</strong>` : ""}</p>
              </div>`
            : ""
        }
        <div class="tarefa-secao-detalhe">
          <h4>Links</h4>
          ${renderizarLinks(tarefa.links)}
        </div>
        <div class="tarefa-secao-detalhe">
          <h4>Subtarefas</h4>
          ${renderizarSubtarefas(roadmapId, tarefa)}
        </div>
        <div class="tarefa-secao-detalhe">
          <h4>Histórico</h4>
          ${renderizarHistorico(tarefa.historico)}
        </div>
      </div>`
          : temDetalhes
            ? `<p class="tarefa-preview-detalhes">Clique na tarefa para ver critério, tempo, links, subtarefas e histórico</p>`
            : ""
      }
    </li>
  `;
}

function montarHtmlLinksEditor(links) {
  const itens = links.length ? links : [{ id: gerarId(), titulo: "", url: "", tipo: "outro" }];
  return `
    <div class="editor-secao" id="editor-links">
      <div class="editor-secao-titulo">
        <span>Links</span>
        <button type="button" class="btn-sm btn-secundario" id="btn-add-link">+ Link</button>
      </div>
      <div id="links-container">
        ${itens
          .map(
            (link) => `
          <div class="editor-linha editor-linha-link" data-link-id="${link.id}">
            <select name="link_tipo_${link.id}">
              ${Object.entries(TIPOS_LINK)
                .map(
                  ([id, info]) =>
                    `<option value="${id}" ${link.tipo === id ? "selected" : ""}>${info.label}</option>`
                )
                .join("")}
            </select>
            <input type="text" name="link_titulo_${link.id}" placeholder="Título" value="${escaparHtml(link.titulo)}">
            <input type="url" name="link_url_${link.id}" placeholder="https://..." value="${escaparHtml(link.url)}">
            <button type="button" class="btn-icone btn-remover-linha" data-remover="link">✕</button>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function montarHtmlSubtarefasEditor(subtarefas) {
  const itens = subtarefas.length ? subtarefas : [];
  return `
    <div class="editor-secao" id="editor-subtarefas">
      <div class="editor-secao-titulo">
        <span>Subtarefas</span>
        <button type="button" class="btn-sm btn-secundario" id="btn-add-subtarefa">+ Subtarefa</button>
      </div>
      <div id="subtarefas-container">
        ${itens
          .map(
            (sub) => `
          <div class="editor-linha" data-sub-id="${sub.id}">
            <input type="text" name="sub_titulo_${sub.id}" placeholder="Título da subtarefa" value="${escaparHtml(sub.titulo)}" required>
            <input type="hidden" name="sub_id_${sub.id}" value="${sub.id}">
            <input type="hidden" name="sub_concluida_${sub.id}" value="${sub.concluida ? "1" : "0"}">
            <button type="button" class="btn-icone btn-remover-linha" data-remover="subtarefa">✕</button>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function montarHtmlDependsOn(tarefa, todas) {
  const outras = todas.filter((t) => t.id !== tarefa.id);
  if (!outras.length) {
    return `<p class="campo-dica">Adicione mais tarefas para definir dependências.</p>`;
  }
  const deps = new Set(tarefa.dependsOn ?? []);
  return `
    <div class="campo">
      <span>Depende de (bloquear até concluir)</span>
      <div class="depends-lista">
        ${outras
          .map(
            (t) => `
          <label class="depends-item">
            <input type="checkbox" name="dependsOn" value="${t.id}" ${deps.has(t.id) ? "checked" : ""}>
            ${escaparHtml(t.titulo)}
          </label>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function configurarEditorModal(form) {
  const linksContainer = form.querySelector("#links-container");
  const subsContainer = form.querySelector("#subtarefas-container");

  form.querySelector("#btn-add-link")?.addEventListener("click", () => {
    const id = gerarId();
    const div = document.createElement("div");
    div.className = "editor-linha editor-linha-link";
    div.dataset.linkId = id;
    div.innerHTML = `
      <select name="link_tipo_${id}">
        ${Object.entries(TIPOS_LINK)
          .map(([vid, info]) => `<option value="${vid}">${info.label}</option>`)
          .join("")}
      </select>
      <input type="text" name="link_titulo_${id}" placeholder="Título">
      <input type="url" name="link_url_${id}" placeholder="https://...">
      <button type="button" class="btn-icone btn-remover-linha" data-remover="link">✕</button>
    `;
    linksContainer.appendChild(div);
    vincularRemoverLinha(div);
  });

  form.querySelector("#btn-add-subtarefa")?.addEventListener("click", () => {
    const id = gerarId();
    const div = document.createElement("div");
    div.className = "editor-linha";
    div.dataset.subId = id;
    div.innerHTML = `
      <input type="text" name="sub_titulo_${id}" placeholder="Título da subtarefa" required>
      <input type="hidden" name="sub_id_${id}" value="${id}">
      <input type="hidden" name="sub_concluida_${id}" value="0">
      <button type="button" class="btn-icone btn-remover-linha" data-remover="subtarefa">✕</button>
    `;
    subsContainer.appendChild(div);
    vincularRemoverLinha(div);
  });

  form.querySelectorAll(".editor-linha").forEach(vincularRemoverLinha);

  function vincularRemoverLinha(linha) {
    linha.querySelector("[data-remover]")?.addEventListener("click", () => linha.remove());
  }
}

function extrairLinksDoForm(form) {
  const links = [];
  form.querySelectorAll("#links-container .editor-linha").forEach((linha) => {
    const id = linha.dataset.linkId;
    const titulo = form.querySelector(`[name="link_titulo_${id}"]`)?.value.trim() ?? "";
    const url = form.querySelector(`[name="link_url_${id}"]`)?.value.trim() ?? "";
    const tipo = form.querySelector(`[name="link_tipo_${id}"]`)?.value ?? "outro";
    if (titulo || url) links.push({ id, titulo, url, tipo });
  });
  return links;
}

function extrairSubtarefasDoForm(form) {
  const subtarefas = [];
  form.querySelectorAll("#subtarefas-container .editor-linha").forEach((linha) => {
    const id = linha.dataset.subId;
    const titulo = form.querySelector(`[name="sub_titulo_${id}"]`)?.value.trim() ?? "";
    const concluida = form.querySelector(`[name="sub_concluida_${id}"]`)?.value === "1";
    if (titulo) subtarefas.push({ id, titulo, concluida });
  });
  return subtarefas;
}

function mostrarModalEditarTarefa(roadmapId, tarefaId) {
  const roadmap = obterRoadmapPorId(roadmapId);
  const tarefa = roadmap?.tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) return;

  tarefasExpandidas.add(tarefaId);

  abrirModal(
    "Editar Tarefa",
    [
      { label: "Título", name: "titulo", tipo: "text", valor: tarefa.titulo, required: true },
      { label: "Descrição da Tarefa", name: "descricao", tipo: "textarea", valor: tarefa.descricao || "", placeholder: "Explique o propósito desta tarefa — o que ela desenvolve e por que é importante.", rows: 2 },
      { tipo: "html", html: renderizarSeletorTipo("tipo", tarefa.tipo) },
      {
        label: "Dificuldade",
        name: "dificuldade",
        tipo: "select",
        valor: tarefa.dificuldade || "medio",
        opcoes: Object.entries(DIFICULDADES).map(([value, info]) => ({ value, label: info.label })),
      },
      {
        label: "Prioridade",
        name: "prioridade",
        tipo: "select",
        valor: tarefa.prioridade || "media",
        opcoes: Object.entries(PRIORIDADES).map(([value, info]) => ({ value, label: info.label })),
      },
      { label: "Prazo", name: "prazo", tipo: "date", valor: tarefa.prazo },
      { label: "Horas estimadas", name: "horasEstimadas", tipo: "number", valor: tarefa.horasEstimadas, min: 0, step: 0.5 },
      { label: "Tags (separadas por vírgula)", name: "tags", tipo: "text", valor: (tarefa.tags ?? []).join(", "), placeholder: "fundamentos, revisão..." },
      { label: "Habilidades Base (áreas)", name: "atributos", tipo: "text", valor: (tarefa.atributos ?? []).join(", "), placeholder: "Back-end, Banco de Dados, Front-end..." },
      { label: "Revisão após N dias (0 = off)", name: "reviewAfterDays", tipo: "number", valor: tarefa.reviewAfterDays || 0, min: 0, step: 1 },
      { label: "Critério de conclusão", name: "criterioConclusao", tipo: "textarea", valor: tarefa.criterioConclusao || "", placeholder: "Como saber que terminei isso de verdade?", rows: 2 },
      { label: "Observações", name: "observacoes", tipo: "textarea", valor: tarefa.observacoes, placeholder: "Notas, lembretes, contexto...", rows: 3 },
      { tipo: "html", html: montarHtmlCompetenciasEditor(tarefa, roadmap) },
      { tipo: "html", html: montarHtmlDependsOn(tarefa, roadmap.tarefas) },
      { tipo: "html", html: montarHtmlLinksEditor(tarefa.links) },
      { tipo: "html", html: montarHtmlSubtarefasEditor(tarefa.subtarefas) },
    ],
    async (formData, form) => {
      const dados = Object.fromEntries(formData);
      const links = extrairLinksDoForm(form);
      const subtarefas = extrairSubtarefasDoForm(form);
      const dependsOn = [...form.querySelectorAll('input[name="dependsOn"]:checked')].map((el) => el.value);
      const competenciasIds = [...form.querySelectorAll('input[name="competenciasIds"]:checked')].map(
        (el) => el.value
      );
      const tags = String(dados.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const atributos = String(dados.atributos || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const todasSubtarefasConcluidas = subtarefas.length > 0 && subtarefas.every((s) => s.concluida);

      await atualizarTarefa(roadmapId, tarefaId, {
        titulo: dados.titulo,
        descricao: dados.descricao,
        tipo: dados.tipo,
        dificuldade: dados.dificuldade,
        prioridade: dados.prioridade,
        prazo: dados.prazo,
        horasEstimadas: dados.horasEstimadas,
        tags,
        atributos,
        reviewAfterDays: dados.reviewAfterDays,
        criterioConclusao: dados.criterioConclusao,
        observacoes: dados.observacoes,
        dependsOn,
        competenciasIds,
        links,
        subtarefas,
        concluida: todasSubtarefasConcluidas ? true : tarefa.concluida,
      });
    },
    {
      largo: true,
      onMount: (form) => {
        configurarEditorModal(form);
        configurarSeletorTipoInline(form);
      },
    }
  );
}

export function renderizarRoadmap(roadmapId) {
  const roadmap = obterRoadmapPorId(roadmapId);
  if (!roadmap) {
    renderizarEstadoVazio();
    return;
  }

  const metricas = calcularMetricas(roadmap);
  const dominioGeral = calcularDominioGeral(roadmap);
  const contagens = contarPorFiltro(roadmap.tarefas);
  const tags = listarTags(roadmap.tarefas);

  const podeReordenar = filtroTarefas === "todas" && !filtroTag;
  const tarefasOrdenadas = ordenarTarefasPorOrdem(
    filtrarTarefas(roadmap.tarefas, filtroTarefas, filtroTag)
  );
  const tarefasCompletas = ordenarTarefasPorOrdem(roadmap.tarefas);

  elementos.conteudo().innerHTML = `
    <header class="roadmap-header">
      <div class="roadmap-header-info">
        <h1>${escaparHtml(roadmap.nome)}</h1>
        ${roadmap.descricao ? `<p class="roadmap-descricao">${escaparHtml(roadmap.descricao)}</p>` : ""}
      </div>
      <div class="roadmap-header-acoes">
        <button class="btn-secundario btn-sm" data-acao="editar-roadmap" data-id="${roadmap.id}">Editar</button>
        <button class="btn-perigo btn-sm" data-acao="excluir-roadmap" data-id="${roadmap.id}">Excluir</button>
      </div>
    </header>

    <div class="roadmap-resumo">
      <div class="progresso-container">
        <div class="progresso-info">
          <span>${metricas.progresso}% tarefas · ${dominioGeral.dominio}% domínio</span>
          <span>${metricas.concluidas} de ${metricas.total} · est. ${formatarHoras(metricas.horasFeitas)}/${formatarHoras(metricas.horasTotais)} · real ${formatarHoras(metricas.horasReais)}</span>
        </div>
        <div class="progresso-barra">
          <div class="progresso-preenchimento" style="width: ${metricas.progresso}%"></div>
        </div>
        <div class="progresso-barra progresso-dominio">
          <div class="progresso-preenchimento dominio" style="width: ${dominioGeral.dominio}%"></div>
        </div>
        ${metricas.proximoPrazo ? `<p class="proximo-prazo">Próximo prazo: <strong>${formatarData(metricas.proximoPrazo)}</strong></p>` : ""}
        ${metricas.subtarefasTotal > 0 ? `<p class="proximo-prazo">Subtarefas: <strong>${metricas.subtarefasConcluidas}/${metricas.subtarefasTotal}</strong> concluídas</p>` : ""}
      </div>
      ${renderizarMetricas(metricas, "metricas-resumo")}
    </div>

    ${renderizarAbasRoadmap(roadmap)}
    ${renderizarPainelAba(roadmap, metricas, dominioGeral, contagens, tags, tarefasOrdenadas, tarefasCompletas, podeReordenar)}
  `;

  elementos.conteudo().querySelectorAll("[data-acao]").forEach((el) => {
    if (el.type === "checkbox") {
      el.addEventListener("change", (e) => handleAcao(e));
    } else {
      el.addEventListener("click", (e) => handleAcao(e));
    }
  });

  if (abaRoadmap !== "tarefas") return;

  document.getElementById("btn-nova-tarefa")?.addEventListener("click", () => {
    document.getElementById("form-nova-tarefa")?.querySelector('[name="titulo"]')?.focus();
  });

  document.getElementById("form-nova-tarefa")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const dados = Object.fromEntries(new FormData(form));
    if (!dados.titulo.trim()) return;

    executarAcao(async () => {
      await adicionarTarefa(roadmapId, dados);
      form.reset();
      form.querySelectorAll(".tipo-opcao").forEach((op) => op.classList.remove("selecionado"));
      form.querySelector('.tipo-opcao input[value="pratica"]')?.closest(".tipo-opcao")?.classList.add("selecionado");
    });
  });

  configurarSeletorTipoInline(document.getElementById("form-nova-tarefa"));

  if (podeReordenar) {
    configurarDragDropTarefas(document.getElementById("lista-tarefas-ordenavel"), roadmapId);
  }

  elementos.conteudo().querySelectorAll(".form-subtarefa").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const titulo = new FormData(form).get("titulo");
      if (!titulo?.trim()) return;
      tarefasExpandidas.add(form.dataset.tarefa);
      executarAcao(() => adicionarSubtarefa(form.dataset.roadmap, form.dataset.tarefa, titulo));
    });
  });
}

async function handleAcao(e) {
  const el = e.currentTarget;
  const acao = el.dataset.acao;

  if (acao === "trocar-aba") {
    abaRoadmap = el.dataset.aba || "tarefas";
    atualizarTela();
    return;
  }

  if (acao === "filtrar") {
    filtroTarefas = el.dataset.filtro;
    atualizarTela();
    return;
  }

  if (acao === "filtrar-tag") {
    filtroTag = el.dataset.tag || "";
    atualizarTela();
    return;
  }

  if (acao === "expandir") {
    const id = el.dataset.tarefa;
    if (tarefasExpandidas.has(id)) tarefasExpandidas.delete(id);
    else tarefasExpandidas.add(id);
    atualizarTela();
    return;
  }

  if (acao === "mover-cima") {
    await executarAcao(() => moverTarefa(el.dataset.roadmap, el.dataset.tarefa, -1));
    return;
  }

  if (acao === "mover-baixo") {
    await executarAcao(() => moverTarefa(el.dataset.roadmap, el.dataset.tarefa, 1));
    return;
  }

  if (acao === "editar-tarefa") {
    mostrarModalEditarTarefa(el.dataset.roadmap, el.dataset.tarefa);
    return;
  }

  if (acao === "buscar-links") {
    mostrarModalBuscarLinks(el.dataset.roadmap, el.dataset.tarefa);
    return;
  }

  if (acao === "editar-roadmap") {
    mostrarModalEditarRoadmap(el.dataset.id);
    return;
  }

  if (acao === "gerenciar-competencias") {
    mostrarModalCompetencias(el.dataset.roadmap);
    return;
  }

  if (acao === "iniciar-timer") {
    tarefasExpandidas.add(el.dataset.tarefa);
    await executarAcao(() => iniciarTimer(el.dataset.roadmap, el.dataset.tarefa));
    return;
  }

  if (acao === "parar-timer") {
    tarefasExpandidas.add(el.dataset.tarefa);
    await executarAcao(() => pararTimer(el.dataset.roadmap, el.dataset.tarefa));
    return;
  }

  if (acao === "registrar-tempo") {
    const valor = prompt("Quantos minutos registrar? (ex: 15, 30, 90)", "30");
    if (valor == null) return;
    const minutos = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(minutos) || minutos === 0) {
      mostrarErro("Informe um número válido de minutos diferente de zero");
      return;
    }
    tarefasExpandidas.add(el.dataset.tarefa);
    await executarAcao(() => registrarTempo(el.dataset.roadmap, el.dataset.tarefa, minutos / 60));
    return;
  }

  if (acao === "toggle") {
    await executarAcao(() =>
      atualizarTarefa(el.dataset.roadmap, el.dataset.tarefa, { concluida: el.checked })
    );
    return;
  }

  if (acao === "toggle-subtarefa") {
    tarefasExpandidas.add(el.dataset.tarefa);
    await executarAcao(() =>
      atualizarSubtarefa(el.dataset.roadmap, el.dataset.tarefa, el.dataset.subtarefa, {
        concluida: el.checked,
      })
    );
    return;
  }

  if (acao === "excluir-subtarefa") {
    tarefasExpandidas.add(el.dataset.tarefa);
    await executarAcao(() =>
      excluirSubtarefa(el.dataset.roadmap, el.dataset.tarefa, el.dataset.subtarefa)
    );
    return;
  }

  if (acao === "excluir-tarefa") {
    if (confirm("Excluir esta tarefa?")) {
      tarefasExpandidas.delete(el.dataset.tarefa);
      await executarAcao(() => excluirTarefa(el.dataset.roadmap, el.dataset.tarefa));
    }
    return;
  }

  if (acao === "excluir-roadmap") {
    if (confirm(`Excluir o roadmap "${obterRoadmapPorId(el.dataset.id)?.nome}"? Esta ação não pode ser desfeita.`)) {
      await executarAcao(async () => {
        await excluirRoadmap(el.dataset.id);
        roadmapAtivoId = null;
        filtroTarefas = "todas";
        filtroTag = "";
        abaRoadmap = "tarefas";
        tarefasExpandidas.clear();
      });
    }
  }
}

export function selecionarRoadmap(id) {
  roadmapAtivoId = id;
  vistaPainel = false;
  filtroTarefas = "todas";
  filtroTag = "";
  abaRoadmap = "tarefas";
  atualizarTela();
}

export function mostrarModalNovoRoadmap() {
  abrirModal(
    "Novo Roadmap",
    [
      { label: "Nome", name: "nome", tipo: "text", placeholder: "Ex: Aprender Laravel", required: true },
      { label: "Descrição (opcional)", name: "descricao", tipo: "textarea", placeholder: "Objetivo deste roadmap..." },
      {
        label: "Competências (uma por linha, opcional)",
        name: "competencias",
        tipo: "textarea",
        placeholder: "Routing\nControllers\nBlade\nEloquent",
        rows: 5,
      },
    ],
    async (formData) => {
      const dados = Object.fromEntries(formData);
      const roadmap = await criarRoadmap(dados.nome, dados.descricao);
      const comps = String(dados.competencias || "")
        .split(/\n|,/)
        .map((n) => n.trim())
        .filter(Boolean)
        .map((nome) => ({ nome }));
      if (comps.length) {
        await atualizarRoadmap(roadmap.id, { competencias: comps });
      }
      vistaPainel = false;
      roadmapAtivoId = roadmap.id;
      filtroTarefas = "todas";
      filtroTag = "";
      abaRoadmap = "tarefas";
    }
  );
}

function mostrarModalEditarRoadmap(roadmapId) {
  const roadmap = obterRoadmapPorId(roadmapId);
  if (!roadmap) return;
  const grupos = obterGrupos();
  const atrib = obterAtribuicao(roadmapId);

  abrirModal(
    "Editar Roadmap",
    [
      { label: "Nome", name: "nome", tipo: "text", valor: roadmap.nome, required: true },
      { label: "Descrição", name: "descricao", tipo: "textarea", valor: roadmap.descricao || "", rows: 3 },
      {
        label: "Grupo",
        name: "grupoId",
        tipo: "select",
        valor: atrib.grupoId || "",
        opcoes: [
          { value: "", label: "Nenhum (só em Todos)" },
          ...grupos.map((g) => ({ value: g.id, label: g.nome })),
        ],
      },
    ],
    async (formData) => {
      const dados = Object.fromEntries(formData);
      await atualizarRoadmap(roadmapId, { nome: dados.nome, descricao: dados.descricao });
      const grupoId = dados.grupoId || null;
      if (grupoId !== (atrib.grupoId || null)) {
        await atribuirRoadmapSidebar(roadmapId, { grupoId });
      }
    }
  );
}

function mostrarModalCompetencias(roadmapId) {
  const roadmap = obterRoadmapPorId(roadmapId);
  if (!roadmap) return;
  const comps = roadmap.competencias ?? [];

  abrirModal(
    "Competências do roadmap",
    [
      {
        tipo: "html",
        html: `
          <p class="campo-dica">Skills que o roadmap desenvolve. Vincule-as nas tarefas para medir domínio.</p>
          <div id="comps-editor" class="comps-editor">
            ${
              comps.length
                ? comps
                    .map(
                      (c) => `
              <div class="editor-linha" data-comp-id="${c.id}">
                <input type="text" name="comp_nome_${c.id}" value="${escaparHtml(c.nome)}" placeholder="Nome" required>
                <input type="text" name="comp_desc_${c.id}" value="${escaparHtml(c.descricao || "")}" placeholder="Descrição (opcional)">
                <button type="button" class="btn-icone btn-remover-linha" data-remover-comp="${c.id}" title="Excluir">✕</button>
              </div>`
                    )
                    .join("")
                : `<p class="detalhe-vazio" id="comps-vazio">Nenhuma ainda</p>`
            }
          </div>
          <button type="button" class="btn-sm btn-secundario" id="btn-add-comp">+ Competência</button>
        `,
      },
    ],
    async (_formData, form) => {
      const linhas = [...form.querySelectorAll("#comps-editor .editor-linha")];
      const competencias = linhas
        .map((linha) => {
          const id = linha.dataset.compId;
          const nome = form.querySelector(`[name="comp_nome_${id}"]`)?.value.trim() ?? "";
          const descricao = form.querySelector(`[name="comp_desc_${id}"]`)?.value.trim() ?? "";
          return nome ? { id, nome, descricao } : null;
        })
        .filter(Boolean);
      await atualizarRoadmap(roadmapId, { competencias });
    },
    {
      largo: true,
      onMount: (form) => {
        const container = form.querySelector("#comps-editor");
        form.querySelector("#btn-add-comp")?.addEventListener("click", () => {
          form.querySelector("#comps-vazio")?.remove();
          const id = gerarId();
          const div = document.createElement("div");
          div.className = "editor-linha";
          div.dataset.compId = id;
          div.innerHTML = `
            <input type="text" name="comp_nome_${id}" placeholder="Nome" required>
            <input type="text" name="comp_desc_${id}" placeholder="Descrição (opcional)">
            <button type="button" class="btn-icone btn-remover-linha" data-remover-comp="${id}" title="Excluir">✕</button>
          `;
          container.appendChild(div);
          div.querySelector("[data-remover-comp]")?.addEventListener("click", () => div.remove());
        });
        form.querySelectorAll("[data-remover-comp]").forEach((btn) => {
          btn.addEventListener("click", () => btn.closest(".editor-linha")?.remove());
        });
      },
    }
  );
}

const TEMPLATE_IMPORT_EXEMPLO = `{
  "nome": "Laravel",
  "descricao": "Fundamentos do framework",
  "competencias": [
    { "id": "c_routing", "nome": "Routing" },
    { "id": "c_controllers", "nome": "Controllers" },
    { "id": "c_blade", "nome": "Blade" }
  ],
  "tarefas": [
    {
      "id": "t1",
      "titulo": "Rotas e controllers",
      "tipo": "pesquisa",
      "atributos": ["Back-end"],
      "competencias": ["c_routing", "c_controllers"],
      "criterioConclusao": "3 rotas REST com controllers",
      "horasEstimadas": 2
    },
    {
      "id": "t2",
      "titulo": "Criar CRUD",
      "tipo": "pratica",
      "dependsOn": ["t1"],
      "atributos": ["Back-end", "Front-end"],
      "competencias": ["c_routing", "c_controllers", "c_blade"],
      "criterioConclusao": "CRUD com Blade funcionando",
      "horasEstimadas": 5
    }
  ]
}`;

const IA_OBJETIVOS = [
  "Aprendizado inicial",
  "Aprofundamento",
  "Revisão",
  "Projetos práticos",
  "Preparação profissional",
];
const IA_EXPERIENCIAS = ["Iniciante", "Já tenho fundamentos", "Intermediário", "Avançado"];
const IA_ESTILOS = ["Teórico", "Prático", "Equilibrado", "Baseado em projetos", "Desafios/exercícios"];
const IA_PROFUNDIDADES = ["Resumo", "Normal", "Completo", "Extenso"];
const IA_TEMPOS = ["1 semana", "1 mês", "3 meses", "6 meses", "Sem prazo", "Personalizado"];
const IA_TIPOS_ATIVIDADE = ["Conceitos", "Exercícios", "Projetos", "Pesquisas", "Leituras", "Revisões"];

function renderizarOpcoesIa({ nome, label, tipo, opcoes, valor, valores = [] }) {
  const selecionados = new Set(valores);
  return `
    <fieldset class="campo ia-campo">
      <legend>${label}</legend>
      <div class="ia-opcoes" role="group" aria-label="${label}">
        ${opcoes
          .map((op) => {
            const marcado =
              tipo === "checkbox" ? selecionados.has(op) : valor === op;
            return `
          <label class="ia-opcao">
            <input type="${tipo}" name="${nome}" value="${op}" ${marcado ? "checked" : ""}>
            <span>${op}</span>
          </label>`;
          })
          .join("")}
      </div>
    </fieldset>`;
}

/** @returns {object} payload para /roadmaps/gerar e /gerar/preview */
function coletarParamsGeracaoIa(formData) {
  const tema = String(formData.get("ia_tema") ?? "").trim();
  if (!tema) throw new Error("Informe o tema do roadmap");

  const objetivos = formData.getAll("ia_objetivo").map(String);
  if (!objetivos.length) throw new Error("Selecione ao menos um objetivo");

  const tiposAtividade = formData.getAll("ia_tipo_atividade").map(String);
  if (!tiposAtividade.length) throw new Error("Selecione ao menos um tipo de atividade");

  const tempoSelecionado = String(formData.get("ia_tempo") ?? "Sem prazo");
  let tempo = tempoSelecionado;
  if (tempoSelecionado === "Personalizado") {
    tempo = String(formData.get("ia_tempo_custom") ?? "").trim();
    if (!tempo) throw new Error("Informe o tempo personalizado");
  }

  return {
    tema,
    objetivos,
    experiencia: String(formData.get("ia_experiencia") ?? "Intermediário"),
    estilo: String(formData.get("ia_estilo") ?? "Equilibrado"),
    profundidade: String(formData.get("ia_profundidade") ?? "Normal"),
    tempo,
    tiposAtividade,
    restricoes: String(formData.get("ia_restricoes") ?? "").trim(),
  };
}

export function mostrarModalImportarJson() {
  let abaImport = "colar";

  abrirModal(
    "Importar via JSON",
    [
      {
        tipo: "html",
        html: `
      <div class="modal-abas roadmap-abas" role="tablist" aria-label="Modo de importação">
        <button type="button" class="aba-btn ativo" role="tab" aria-selected="true" data-aba-import="colar">Colar / arquivo</button>
        <button type="button" class="aba-btn" role="tab" aria-selected="false" data-aba-import="ia">Gerar com IA</button>
      </div>
      <div class="modal-aba-painel" data-painel-import="colar" role="tabpanel">
        <p class="campo-dica">Cole o JSON ou carregue um arquivo. Guia: <code>docs/GERAR_ROADMAP.md</code>. Inclua <code>competencias</code> na raiz e referencie nas tarefas (por id ou nome).</p>
        <label class="campo campo-arquivo"><span>Arquivo .json (opcional)</span><input type="file" id="import-arquivo" accept=".json,application/json"></label>
        <label class="campo">
          <span>JSON do roadmap</span>
          <textarea name="json" id="import-json" placeholder="Cole o JSON do roadmap aqui…" rows="14" required></textarea>
        </label>
        <p class="campo-dica" id="import-ia-info" hidden></p>
      </div>
      <div class="modal-aba-painel" data-painel-import="ia" role="tabpanel" hidden>
        <p class="campo-dica">A IA gera o JSON com base no tema e nos parâmetros abaixo. Depois você revisa na aba Colar / arquivo e importa.</p>
        <label class="campo">
          <span>Tema</span>
          <input type="text" name="ia_tema" id="ia-tema" placeholder="Ex.: PHP, Laravel, Redes…" autocomplete="off">
        </label>
        ${renderizarOpcoesIa({
          nome: "ia_objetivo",
          label: "Objetivo",
          tipo: "checkbox",
          opcoes: IA_OBJETIVOS,
          valores: ["Aprendizado inicial"],
        })}
        ${renderizarOpcoesIa({
          nome: "ia_experiencia",
          label: "Experiência atual",
          tipo: "radio",
          opcoes: IA_EXPERIENCIAS,
          valor: "Intermediário",
        })}
        ${renderizarOpcoesIa({
          nome: "ia_estilo",
          label: "Formato de aprendizado",
          tipo: "radio",
          opcoes: IA_ESTILOS,
          valor: "Equilibrado",
        })}
        ${renderizarOpcoesIa({
          nome: "ia_profundidade",
          label: "Profundidade",
          tipo: "radio",
          opcoes: IA_PROFUNDIDADES,
          valor: "Normal",
        })}
        ${renderizarOpcoesIa({
          nome: "ia_tempo",
          label: "Tempo disponível",
          tipo: "radio",
          opcoes: IA_TEMPOS,
          valor: "Sem prazo",
        })}
        <label class="campo" id="ia-tempo-custom-campo" hidden>
          <span>Tempo personalizado</span>
          <input type="text" name="ia_tempo_custom" id="ia-tempo-custom" placeholder="Ex.: 2 semanas, 10h por semana…" autocomplete="off">
        </label>
        ${renderizarOpcoesIa({
          nome: "ia_tipo_atividade",
          label: "Tipos de atividades",
          tipo: "checkbox",
          opcoes: IA_TIPOS_ATIVIDADE,
          valores: IA_TIPOS_ATIVIDADE,
        })}
        <label class="campo">
          <span>Restrições / Observações (opcional)</span>
          <textarea name="ia_restricoes" id="ia-restricoes" placeholder="Ex.: Não utilizar frameworks; focar em backend; usar apenas ferramentas gratuitas…" rows="3"></textarea>
        </label>
        <div class="ia-preview-acoes">
          <button type="button" class="btn-secundario btn-sm" id="ia-preview-prompt">Ver preview do prompt</button>
        </div>
        <div class="campo ia-preview-painel" id="ia-preview-painel" hidden>
          <span>Prompt que será enviado à IA</span>
          <textarea id="ia-preview-texto" readonly rows="12" spellcheck="false"></textarea>
        </div>
      </div>`,
      },
    ],
    async (formData, form) => {
      if (abaImport === "ia") {
        const payload = coletarParamsGeracaoIa(formData);

        const confirmar = elementos.modalConfirmar();
        const labelOriginal = confirmar?.textContent ?? "Gerar JSON";
        if (confirmar) {
          confirmar.disabled = true;
          confirmar.textContent = "Gerando…";
        }

        try {
          const resultado = await api.gerarRoadmapIa(payload);

          const textarea = form.querySelector("#import-json");
          if (textarea) {
            textarea.value = JSON.stringify(resultado.roadmap, null, 2);
          }

          const info = form.querySelector("#import-ia-info");
          if (info) {
            info.hidden = false;
            info.textContent = `Gerado com ${resultado.modeloUsado}. Revise o JSON e clique em Importar.`;
          }

          form.querySelector('[data-aba-import="colar"]')?.click();
          return { manterAberto: true };
        } finally {
          if (confirmar && abaImport === "ia") {
            confirmar.disabled = false;
            confirmar.textContent = labelOriginal;
          }
        }
      }

      const texto = String(formData.get("json") ?? "").trim();
      if (!texto) throw new Error("Cole ou carregue um JSON");

      let payload;
      try {
        payload = JSON.parse(texto);
      } catch {
        throw new Error("JSON inválido — confira vírgulas, aspas e chaves");
      }

      const resultado = await importarRoadmaps(payload);
      const primeiro = resultado.roadmaps?.[0];
      vistaPainel = false;
      if (primeiro) {
        roadmapAtivoId = primeiro.id;
        filtroTarefas = "todas";
        filtroTag = "";
        abaRoadmap = "tarefas";
      }
      if (resultado.avisos?.length) {
        mostrarErro(resultado.avisos.join(" · "));
      }
    },
    {
      largo: true,
      submitLabel: "Importar",
      onMount: (form) => {
        const confirmar = elementos.modalConfirmar();
        const textarea = form.querySelector("#import-json");
        const inputTema = form.querySelector("#ia-tema");
        const inputArquivo = form.querySelector("#import-arquivo");
        const tempoCustomCampo = form.querySelector("#ia-tempo-custom-campo");
        const tempoCustomInput = form.querySelector("#ia-tempo-custom");

        if (textarea) {
          textarea.placeholder = TEMPLATE_IMPORT_EXEMPLO;
        }

        const sincronizarTempoCustom = () => {
          const personalizado =
            form.querySelector('input[name="ia_tempo"]:checked')?.value === "Personalizado";
          if (tempoCustomCampo) tempoCustomCampo.hidden = !personalizado;
          if (tempoCustomInput) tempoCustomInput.required = personalizado && abaImport === "ia";
        };

        form.querySelectorAll('input[name="ia_tempo"]').forEach((input) => {
          input.addEventListener("change", sincronizarTempoCustom);
        });
        sincronizarTempoCustom();

        const btnPreview = form.querySelector("#ia-preview-prompt");
        const painelPreview = form.querySelector("#ia-preview-painel");
        const textoPreview = form.querySelector("#ia-preview-texto");
        btnPreview?.addEventListener("click", async () => {
          const labelOriginal = btnPreview.textContent;
          try {
            btnPreview.disabled = true;
            btnPreview.textContent = "Carregando…";
            const params = coletarParamsGeracaoIa(new FormData(form));
            const resultado = await api.previewPromptRoadmapIa(params);
            if (textoPreview) textoPreview.value = resultado.prompt ?? "";
            if (painelPreview) {
              painelPreview.hidden = false;
              textoPreview?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
          } catch (erro) {
            mostrarErro(erro.message);
          } finally {
            btnPreview.disabled = false;
            btnPreview.textContent = labelOriginal;
          }
        });

        const ativarAba = (id) => {
          abaImport = id;
          form.querySelectorAll("[data-aba-import]").forEach((btn) => {
            const ativo = btn.dataset.abaImport === id;
            btn.classList.toggle("ativo", ativo);
            btn.setAttribute("aria-selected", ativo ? "true" : "false");
          });
          form.querySelectorAll("[data-painel-import]").forEach((painel) => {
            painel.hidden = painel.dataset.painelImport !== id;
          });
          if (textarea) textarea.required = id === "colar";
          if (inputTema) inputTema.required = id === "ia";
          sincronizarTempoCustom();
          if (confirmar) {
            confirmar.textContent = id === "ia" ? "Gerar JSON" : "Importar";
            confirmar.disabled = false;
          }
        };

        form.querySelectorAll("[data-aba-import]").forEach((btn) => {
          btn.addEventListener("click", () => ativarAba(btn.dataset.abaImport || "colar"));
        });

        inputArquivo?.addEventListener("change", async () => {
          const arquivo = inputArquivo.files?.[0];
          if (!arquivo || !textarea) return;
          try {
            textarea.value = await arquivo.text();
          } catch {
            mostrarErro("Não foi possível ler o arquivo");
          }
        });

        ativarAba("colar");
      },
    }
  );
}

async function atualizarTela() {
  renderizarSidebar();
  if (vistaPainel) {
    try {
      const perfil = await carregarPerfil({ forcar: true });
      renderizarDashboard(elementos.conteudo(), obterRoadmaps(), perfil);
    } catch (erro) {
      renderizarDashboard(elementos.conteudo(), obterRoadmaps(), null);
      mostrarErro(erro.message);
    }
    return;
  }
  if (roadmapAtivoId && obterRoadmapPorId(roadmapAtivoId)) {
    renderizarRoadmap(roadmapAtivoId);
  } else {
    roadmapAtivoId = null;
    renderizarEstadoVazio();
  }
}

export async function inicializarUI() {
  aplicarEstadoSidebar();
  const toggle = elementos.sidebarToggle();
  if (toggle) toggle.onclick = () => alternarSidebar();

  elementos.conteudo().innerHTML = `
    <div class="carregando">
      <div class="carregando-icone" aria-hidden="true">S</div>
      <p>Conectando ao servidor...</p>
    </div>
  `;

  document.getElementById("novo").addEventListener("click", mostrarModalNovoRoadmap);
  document.getElementById("importar-json").addEventListener("click", mostrarModalImportarJson);
  elementos.modalCancelar().addEventListener("click", fecharModal);
  elementos.modal().addEventListener("click", (e) => {
    if (e.target === elementos.modal()) fecharModal();
  });

  try {
    await carregarDados();
    const roadmaps = obterRoadmaps();
    if (roadmaps.length > 0) roadmapAtivoId = roadmaps[0].id;
    atualizarTela();
  } catch (erro) {
    elementos.conteudo().innerHTML = `
      <div class="erro-carregamento">
        <h2>Não foi possível conectar ao servidor</h2>
        <p>${escaparHtml(erro.message)}</p>
        <p class="erro-dica">Execute <code>npm start</code> na pasta do projeto e acesse <code>http://localhost:3000</code></p>
        <button class="btn-primario" id="btn-recarregar">Tentar novamente</button>
      </div>
    `;
    document.getElementById("btn-recarregar")?.addEventListener("click", () => inicializarUI());
  }
}

function configurarSeletorTipoInline(container) {
  if (!container) return;
  container.querySelectorAll(".tipo-opcao input").forEach((input) => {
    input.addEventListener("change", () => {
      container.querySelectorAll(".tipo-opcao").forEach((op) => op.classList.remove("selecionado"));
      input.closest(".tipo-opcao")?.classList.add("selecionado");
    });
  });
}

function configurarDragDropTarefas(lista, roadmapId) {
  if (!lista) return;

  let arrastandoId = null;

  lista.querySelectorAll(".tarefa-item").forEach((item) => {
    const handle = item.querySelector(".tarefa-arrastar");
    if (!handle) return;

    handle.addEventListener("dragstart", (e) => {
      arrastandoId = item.dataset.tarefaId;
      item.classList.add("arrastando");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", arrastandoId);
    });

    handle.addEventListener("dragend", () => {
      item.classList.remove("arrastando");
      lista.querySelectorAll(".tarefa-item").forEach((el) => el.classList.remove("sobre"));
      arrastandoId = null;
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!arrastandoId || item.dataset.tarefaId === arrastandoId) return;
      item.classList.add("sobre");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("sobre");
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.classList.remove("sobre");
      const origemId = e.dataTransfer.getData("text/plain") || arrastandoId;
      const destinoId = item.dataset.tarefaId;
      if (!origemId || origemId === destinoId) return;

      const roadmap = obterRoadmapPorId(roadmapId);
      if (!roadmap) return;

      const ids = ordenarTarefasPorOrdem(roadmap.tarefas).map((t) => t.id);
      const from = ids.indexOf(origemId);
      const to = ids.indexOf(destinoId);
      if (from === -1 || to === -1) return;

      ids.splice(from, 1);
      ids.splice(to, 0, origemId);
      executarAcao(() => reordenarTarefas(roadmapId, ids));
    });
  });
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}
