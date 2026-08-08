import * as roadmapsRepo from "./db/roadmaps-repo.js";
import { removerRoadmapDasAtribuicoes } from "./sidebar-service.js";
import {
  aoConcluirTarefa,
  aoReabrirTarefa,
  aoConcluirSubtarefa,
  aoReabrirSubtarefa,
  limparBonusRoadmapExcluido,
} from "./profile-service.js";

export const TIPOS_TAREFA = {
  pratica: { label: "Prática", cor: "#7b2cbf", fundo: "#ede0f7" },
  pesquisa: { label: "Pesquisa", cor: "#4f6db8", fundo: "#e3eaf8" },
  analise: { label: "Análise", cor: "#c77d0a", fundo: "#fdf0dc" },
};

export const TIPOS_LINK = {
  video: { label: "Vídeo" },
  artigo: { label: "Artigo" },
  doc: { label: "Doc" },
  repo: { label: "Repo" },
  outro: { label: "Outro" },
};

export const DIFICULDADES = {
  facil: { label: "Fácil", ordem: 1 },
  medio: { label: "Médio", ordem: 2 },
  dificil: { label: "Difícil", ordem: 3 },
};

export const PRIORIDADES = {
  baixa: { label: "Baixa", ordem: 1 },
  media: { label: "Média", ordem: 2 },
  alta: { label: "Alta", ordem: 3 },
};

const TIPOS_VALIDOS = Object.keys(TIPOS_TAREFA);
const TIPOS_LINK_VALIDOS = Object.keys(TIPOS_LINK);
const DIFICULDADES_VALIDAS = Object.keys(DIFICULDADES);
const PRIORIDADES_VALIDAS = Object.keys(PRIORIDADES);

export function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function agoraIso() {
  return new Date().toISOString();
}

function comoArray(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor == null || valor === "") return [];
  return [valor];
}

function normalizarTags(tags) {
  return comoArray(tags)
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i);
}

/** Áreas de estudo da "ficha" (Back-end, Front-end…). Preserva capitalização da 1ª ocorrência. */
function normalizarAtributos(valor) {
  const vistos = new Map();
  for (const item of comoArray(valor)) {
    const bruto = String(item).trim();
    if (!bruto) continue;
    const chave = bruto.toLowerCase();
    if (!vistos.has(chave)) vistos.set(chave, bruto);
  }
  return [...vistos.values()];
}

function normalizarDependsOn(deps) {
  return comoArray(deps)
    .map((d) => String(d).trim())
    .filter(Boolean)
    .filter((d, i, arr) => arr.indexOf(d) === i);
}

function normalizarCompetencia(c, index = 0) {
  if (typeof c === "string") {
    const nome = c.trim();
    return {
      id: gerarId(),
      nome,
      descricao: "",
      ordem: index,
    };
  }
  const nome = String(c?.nome ?? c?.name ?? "").trim();
  return {
    id: c?.id || gerarId(),
    nome,
    descricao: String(c?.descricao ?? c?.description ?? "").trim(),
    ordem: Number.isFinite(c?.ordem) ? c.ordem : index,
  };
}

function normalizarCompetencias(lista) {
  return (Array.isArray(lista) ? lista : [])
    .map((c, i) => normalizarCompetencia(c, i))
    .filter((c) => c.nome)
    .map((c, i) => ({ ...c, ordem: i }));
}

function normalizarCompetenciasIds(valor, competenciasDoRoadmap = []) {
  const refs = comoArray(valor)
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (!refs.length) return [];

  const porId = new Map(competenciasDoRoadmap.map((c) => [c.id, c]));
  const porNome = new Map(
    competenciasDoRoadmap.map((c) => [c.nome.trim().toLowerCase(), c])
  );

  const ids = [];
  for (const ref of refs) {
    if (porId.has(ref)) {
      ids.push(ref);
      continue;
    }
    const porNomeHit = porNome.get(ref.toLowerCase());
    if (porNomeHit) {
      ids.push(porNomeHit.id);
      continue;
    }
    // id ainda não resolvido (ex.: import com ids estáveis) — mantém a ref
    ids.push(ref);
  }

  return ids.filter((id, i, arr) => arr.indexOf(id) === i);
}

function normalizarHistorico(historico) {
  return (Array.isArray(historico) ? historico : [])
    .filter((h) => h && typeof h === "object")
    .map((h) => ({
      id: h.id ?? gerarId(),
      em: h.em ?? agoraIso(),
      tipo: h.tipo ?? "editada",
      detalhe: h.detalhe ?? "",
    }));
}

function adicionarHistorico(tarefa, tipo, detalhe = "") {
  const historico = normalizarHistorico(tarefa.historico);
  historico.push({ id: gerarId(), em: agoraIso(), tipo, detalhe });
  tarefa.historico = historico;
  return tarefa;
}

function normalizarLink(l) {
  const tipoBruto = l.tipo ?? l.type ?? "outro";
  const tipo = TIPOS_LINK_VALIDOS.includes(tipoBruto) ? tipoBruto : "outro";
  return {
    id: l.id ?? gerarId(),
    titulo: l.titulo ?? l.title ?? "",
    url: l.url ?? "",
    tipo,
  };
}

function pegarCampo(obj, ...chaves) {
  for (const chave of chaves) {
    if (obj[chave] !== undefined) return obj[chave];
  }
  return undefined;
}

export function normalizarTarefa(tarefa, index = 0, competenciasDoRoadmap = []) {
  const tipoBruto = tarefa.tipo ?? "pratica";
  const tipo = TIPOS_VALIDOS.includes(tipoBruto) ? tipoBruto : "pratica";

  const dificuldadeBruta = pegarCampo(tarefa, "dificuldade", "difficulty") ?? "medio";
  const dificuldade = DIFICULDADES_VALIDAS.includes(dificuldadeBruta) ? dificuldadeBruta : "medio";

  const prioridadeBruta = pegarCampo(tarefa, "prioridade", "priority") ?? "media";
  const prioridade = PRIORIDADES_VALIDAS.includes(prioridadeBruta) ? prioridadeBruta : "media";

  const reviewRaw = pegarCampo(tarefa, "reviewAfterDays", "review_after_days");
  const reviewAfterDays = Number(reviewRaw);
  const reviewOk = Number.isFinite(reviewAfterDays) && reviewAfterDays > 0 ? reviewAfterDays : 0;

  const horasReais = Number(pegarCampo(tarefa, "horasReais", "horas_reais")) || 0;
  const concluida = Boolean(tarefa.concluida);

  const compsRefs = pegarCampo(
    tarefa,
    "competenciasIds",
    "competencias",
    "skills",
    "skillIds"
  );

  return {
    id: tarefa.id || gerarId(),
    titulo: tarefa.titulo ?? "",
    descricao: String(pegarCampo(tarefa, "descricao", "description") ?? "").trim(),
    prazo: tarefa.prazo ?? "",
    horasEstimadas: Number(tarefa.horasEstimadas) || 0,
    horasReais,
    concluida,
    concluidaEm: tarefa.concluidaEm ?? (concluida ? tarefa.criadaEm ?? null : null),
    tipo,
    ordem: Number.isFinite(tarefa.ordem) ? tarefa.ordem : index,
    observacoes: tarefa.observacoes ?? "",
    criterioConclusao:
      pegarCampo(tarefa, "criterioConclusao", "criterio_conclusao", "completionCriteria") ?? "",
    dificuldade,
    prioridade,
    tags: normalizarTags(pegarCampo(tarefa, "tags", "categorias")),
    atributos: normalizarAtributos(pegarCampo(tarefa, "atributos", "atributo", "areas", "stats")),
    dependsOn: normalizarDependsOn(pegarCampo(tarefa, "dependsOn", "depends_on")),
    competenciasIds: normalizarCompetenciasIds(compsRefs, competenciasDoRoadmap),
    reviewAfterDays: reviewOk,
    timerAtivoDesde: tarefa.timerAtivoDesde ?? null,
    links: (tarefa.links ?? []).map(normalizarLink),
    subtarefas: (tarefa.subtarefas ?? []).map((s) => ({
      id: s.id ?? gerarId(),
      titulo: s.titulo ?? "",
      concluida: Boolean(s.concluida),
    })),
    historico: normalizarHistorico(tarefa.historico),
    criadaEm: tarefa.criadaEm ?? agoraIso(),
  };
}

export function tarefaEstaBloqueada(tarefa, todasTarefas) {
  const deps = tarefa.dependsOn ?? [];
  if (!deps.length) return { bloqueada: false, pendentes: [] };

  const porId = new Map((todasTarefas ?? []).map((t) => [t.id, t]));
  const pendentes = deps
    .map((id) => porId.get(id))
    .filter((t) => t && !t.concluida);

  return {
    bloqueada: pendentes.length > 0,
    pendentes: pendentes.map((t) => ({ id: t.id, titulo: t.titulo })),
  };
}

/**
 * Domínio por competência = peso das tarefas concluídas / peso total
 * (peso = horasEstimadas, mínimo 1).
 */
export function calcularDominioCompetencias(roadmap) {
  const competencias = roadmap?.competencias ?? [];
  const tarefas = roadmap?.tarefas ?? [];

  return competencias
    .map((comp) => {
      const relacionadas = tarefas.filter((t) => (t.competenciasIds ?? []).includes(comp.id));
      const pesoTotal = relacionadas.reduce((s, t) => s + Math.max(Number(t.horasEstimadas) || 0, 1), 0);
      const pesoFeito = relacionadas
        .filter((t) => t.concluida)
        .reduce((s, t) => s + Math.max(Number(t.horasEstimadas) || 0, 1), 0);

      const dominio = pesoTotal > 0 ? Math.round((pesoFeito / pesoTotal) * 100) : 0;

      return {
        id: comp.id,
        nome: comp.nome,
        descricao: comp.descricao,
        totalTarefas: relacionadas.length,
        tarefasConcluidas: relacionadas.filter((t) => t.concluida).length,
        dominio,
        coberta: relacionadas.length > 0,
      };
    })
    .sort((a, b) => b.totalTarefas - a.totalTarefas || b.dominio - a.dominio);
}

export function calcularDominioGeral(roadmap) {
  const lista = calcularDominioCompetencias(roadmap);
  const cobertas = lista.filter((c) => c.coberta);
  if (!cobertas.length) return { dominio: 0, total: lista.length, cobertas: 0 };
  const soma = cobertas.reduce((s, c) => s + c.dominio, 0);
  return {
    dominio: Math.round(soma / cobertas.length),
    total: lista.length,
    cobertas: cobertas.length,
  };
}

function normalizarRoadmap(roadmap) {
  const competencias = normalizarCompetencias(
    pegarCampo(roadmap, "competencias", "skills") ?? roadmap.competencias ?? []
  );

  const tarefas = (roadmap.tarefas ?? [])
    .map((t, i) => normalizarTarefa(t, i, competencias))
    .sort((a, b) => a.ordem - b.ordem);

  tarefas.forEach((t, i) => {
    t.ordem = i;
    // remove refs órfãs para competências que não existem mais
    const idsValidos = new Set(competencias.map((c) => c.id));
    t.competenciasIds = (t.competenciasIds ?? []).filter((id) => idsValidos.has(id));
  });

  return { ...roadmap, competencias, tarefas };
}

export async function listarRoadmaps() {
  return roadmapsRepo.listarRoadmaps().map(normalizarRoadmap);
}

export async function obterRoadmapPorId(id) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(id);
  return roadmap ? normalizarRoadmap(roadmap) : null;
}

export async function criarRoadmap(nome, descricao = "") {
  const roadmap = {
    id: gerarId(),
    nome: nome.trim(),
    descricao: descricao.trim(),
    criadoEm: agoraIso(),
    competencias: [],
    tarefas: [],
  };
  roadmapsRepo.inserirRoadmapCompleto(roadmap);
  return roadmap;
}

export async function atualizarRoadmap(id, dados = {}) {
  if (!roadmapsRepo.roadmapExiste(id)) return null;

  const patch = {};
  if (dados.nome !== undefined) {
    const nome = String(dados.nome).trim();
    if (!nome) {
      const erro = new Error("Nome é obrigatório");
      erro.status = 400;
      throw erro;
    }
    patch.nome = nome;
  }
  if (dados.descricao !== undefined) {
    patch.descricao = String(dados.descricao).trim();
  }
  if (dados.competencias !== undefined) {
    patch.competencias = normalizarCompetencias(dados.competencias);
  }

  return roadmapsRepo.atualizarMetadadosRoadmap(id, patch);
}

export async function adicionarCompetencia(roadmapId, dados) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const comps = normalizarCompetencias(roadmap.competencias ?? []);
  const nome = String(dados?.nome ?? "").trim();
  if (!nome) {
    const erro = new Error("Nome da competência é obrigatório");
    erro.status = 400;
    throw erro;
  }

  const competencia = normalizarCompetencia(
    {
      id: dados.id || gerarId(),
      nome,
      descricao: dados.descricao ?? "",
    },
    comps.length
  );
  return roadmapsRepo.inserirCompetencia(roadmapId, competencia);
}

export async function atualizarCompetencia(roadmapId, competenciaId, dados) {
  if (!roadmapsRepo.roadmapExiste(roadmapId)) return null;

  const patch = {};
  if (dados.nome !== undefined) {
    const nome = String(dados.nome).trim();
    if (!nome) {
      const erro = new Error("Nome da competência é obrigatório");
      erro.status = 400;
      throw erro;
    }
    patch.nome = nome;
  }
  if (dados.descricao !== undefined) {
    patch.descricao = String(dados.descricao).trim();
  }

  return roadmapsRepo.atualizarCompetencia(roadmapId, competenciaId, patch);
}

export async function excluirCompetencia(roadmapId, competenciaId) {
  if (!roadmapsRepo.roadmapExiste(roadmapId)) return;
  roadmapsRepo.excluirCompetencia(roadmapId, competenciaId);
}

/**
 * Constrói um roadmap a partir de um payload JSON (template ou export).
 * Aceita camelCase e snake_case. IDs ausentes são gerados.
 * Competências podem ser definidas na raiz e referenciadas por id ou nome nas tarefas.
 */
export function montarRoadmapDeJson(dados) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    throw new Error("O roadmap deve ser um objeto JSON");
  }

  const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
  if (!nome) {
    throw new Error("Cada roadmap precisa de um 'nome' não vazio");
  }

  const agora = agoraIso();
  const tarefasBrutas = Array.isArray(dados.tarefas) ? dados.tarefas : [];

  let competencias = normalizarCompetencias(
    pegarCampo(dados, "competencias", "skills") ?? []
  );

  // Auto-cria competências citadas nas tarefas (por id estável ou por nome)
  const porId = new Map(competencias.map((c) => [c.id, c]));
  const porNome = new Map(competencias.map((c) => [c.nome.toLowerCase(), c]));

  for (const t of tarefasBrutas) {
    const refs = comoArray(
      pegarCampo(t ?? {}, "competenciasIds", "competencias", "skills", "skillIds")
    );
    for (const ref of refs) {
      const texto = String(ref).trim();
      if (!texto) continue;
      if (porId.has(texto) || porNome.has(texto.toLowerCase())) continue;

      const pareceId = /^[a-z][a-z0-9_-]*$/i.test(texto) && /[_-]/.test(texto);
      const competencia = normalizarCompetencia(
        pareceId
          ? {
              id: texto,
              nome: texto
                .replace(/^c[_-]/i, "")
                .split(/[_-]+/)
                .filter(Boolean)
                .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                .join(" "),
            }
          : { nome: texto },
        competencias.length
      );

      if (!competencia.nome || porNome.has(competencia.nome.toLowerCase())) continue;
      competencias.push(competencia);
      porId.set(competencia.id, competencia);
      porNome.set(competencia.nome.toLowerCase(), competencia);
    }
  }

  competencias = normalizarCompetencias(competencias);

  const tarefas = tarefasBrutas.map((t, i) => {
    if (!t || typeof t !== "object") {
      throw new Error(`Tarefa na posição ${i} é inválida`);
    }
    const titulo = typeof t.titulo === "string" ? t.titulo.trim() : "";
    if (!titulo) {
      throw new Error(`Tarefa na posição ${i} precisa de um 'titulo'`);
    }

    const id = t.id || gerarId();
    return normalizarTarefa(
      {
        ...t,
        id,
        titulo,
        criadaEm: t.criadaEm ?? agora,
        historico:
          t.historico ?? [{ id: gerarId(), em: agora, tipo: "criada", detalhe: "Importada via JSON" }],
      },
      i,
      competencias
    );
  });

  return normalizarRoadmap({
    id: dados.id || gerarId(),
    nome,
    descricao: typeof dados.descricao === "string" ? dados.descricao.trim() : "",
    criadoEm: dados.criadoEm ?? agora,
    competencias,
    tarefas,
  });
}

/**
 * Garante um id livre: se `id` já estiver em `ocupados`, gera outro.
 * Sempre registra o id final em `ocupados`. Retorna { id, remapeado, antigo }.
 */
function garantirIdLivre(id, ocupados) {
  const atual = id || gerarId();
  if (!ocupados.has(atual)) {
    ocupados.add(atual);
    return { id: atual, remapeado: false, antigo: atual };
  }
  let novo = gerarId();
  while (ocupados.has(novo)) novo = gerarId();
  ocupados.add(novo);
  return { id: novo, remapeado: true, antigo: atual };
}

/**
 * Remapeia IDs de competências, tarefas, links, subtarefas e histórico que
 * colidem com o banco (PRIMARY KEY global). Atualiza dependsOn e competenciasIds.
 */
function remapearIdsColidentes(montado, ocupados, avisos) {
  const mapaCompetencias = new Map();
  const mapaTarefas = new Map();

  for (const comp of montado.competencias ?? []) {
    const { id, remapeado, antigo } = garantirIdLivre(comp.id, ocupados.competencias);
    if (remapeado) {
      mapaCompetencias.set(antigo, id);
      avisos.push(
        `Roadmap "${montado.nome}": competência id "${antigo}" já existia — gerado "${id}"`
      );
    }
    comp.id = id;
  }

  for (const tarefa of montado.tarefas ?? []) {
    const { id, remapeado, antigo } = garantirIdLivre(tarefa.id, ocupados.tarefas);
    if (remapeado) {
      mapaTarefas.set(antigo, id);
      avisos.push(
        `Roadmap "${montado.nome}": tarefa id "${antigo}" já existia — gerado "${id}"`
      );
    }
    tarefa.id = id;

    for (const link of tarefa.links ?? []) {
      const r = garantirIdLivre(link.id, ocupados.links);
      if (r.remapeado) {
        avisos.push(
          `Roadmap "${montado.nome}": link id "${r.antigo}" já existia — gerado "${r.id}"`
        );
      }
      link.id = r.id;
    }

    for (const sub of tarefa.subtarefas ?? []) {
      const r = garantirIdLivre(sub.id, ocupados.subtarefas);
      if (r.remapeado) {
        avisos.push(
          `Roadmap "${montado.nome}": subtarefa id "${r.antigo}" já existia — gerado "${r.id}"`
        );
      }
      sub.id = r.id;
    }

    for (const h of tarefa.historico ?? []) {
      const r = garantirIdLivre(h.id, ocupados.historico);
      if (r.remapeado) {
        avisos.push(
          `Roadmap "${montado.nome}": histórico id "${r.antigo}" já existia — gerado "${r.id}"`
        );
      }
      h.id = r.id;
    }
  }

  if (!mapaTarefas.size && !mapaCompetencias.size) return;

  for (const tarefa of montado.tarefas ?? []) {
    if (mapaTarefas.size && Array.isArray(tarefa.dependsOn)) {
      tarefa.dependsOn = tarefa.dependsOn.map((dep) => mapaTarefas.get(dep) ?? dep);
    }
    if (mapaCompetencias.size && Array.isArray(tarefa.competenciasIds)) {
      tarefa.competenciasIds = tarefa.competenciasIds.map(
        (cid) => mapaCompetencias.get(cid) ?? cid
      );
    }
  }
}

export async function importarDeJson(payload) {
  let lista = [];

  if (Array.isArray(payload)) {
    lista = payload;
  } else if (payload && typeof payload === "object") {
    if (Array.isArray(payload.roadmaps)) {
      lista = payload.roadmaps;
    } else if (payload.nome !== undefined || payload.tarefas !== undefined) {
      lista = [payload];
    } else {
      throw new Error(
        'JSON inválido. Envie um roadmap, um array de roadmaps, ou { "roadmaps": [...] }'
      );
    }
  } else {
    throw new Error("JSON inválido");
  }

  if (lista.length === 0) {
    throw new Error("Nenhum roadmap para importar");
  }

  const avisos = [];
  const importados = [];
  const ocupados = roadmapsRepo.listarIdsOcupadosImportacao();

  for (let i = 0; i < lista.length; i++) {
    let montado;
    try {
      montado = montarRoadmapDeJson(lista[i]);
    } catch (erro) {
      throw new Error(`Roadmap #${i + 1}: ${erro.message}`);
    }

    const roadmapId = garantirIdLivre(montado.id, ocupados.roadmaps);
    if (roadmapId.remapeado) {
      avisos.push(
        `Roadmap "${montado.nome}": id "${roadmapId.antigo}" já existia — gerado novo id "${roadmapId.id}"`
      );
    }
    montado.id = roadmapId.id;

    remapearIdsColidentes(montado, ocupados, avisos);
    roadmapsRepo.inserirRoadmapCompleto(montado);
    importados.push(montado);
  }

  return { importados, avisos };
}

export async function excluirRoadmap(id) {
  roadmapsRepo.excluirRoadmap(id);
  await removerRoadmapDasAtribuicoes(id);
  await limparBonusRoadmapExcluido(id);
}

export async function adicionarTarefa(roadmapId, tarefa) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const agora = agoraIso();
  const comps = normalizarCompetencias(roadmap.competencias ?? []);
  const novaTarefa = normalizarTarefa(
    {
      id: gerarId(),
      titulo: tarefa.titulo.trim(),
      descricao: tarefa.descricao?.trim() ?? "",
      prazo: tarefa.prazo || "",
      horasEstimadas: Number(tarefa.horasEstimadas) || 0,
      tipo: tarefa.tipo || "pratica",
      ordem: roadmap.tarefas.length,
      concluida: false,
      observacoes: tarefa.observacoes?.trim() ?? "",
      criterioConclusao: tarefa.criterioConclusao?.trim() ?? "",
      dificuldade: tarefa.dificuldade,
      prioridade: tarefa.prioridade,
      tags: tarefa.tags,
      atributos: tarefa.atributos ?? tarefa.atributo ?? tarefa.areas,
      dependsOn: tarefa.dependsOn,
      competenciasIds: tarefa.competenciasIds ?? tarefa.competencias,
      reviewAfterDays: tarefa.reviewAfterDays,
      links: [],
      subtarefas: [],
      criadaEm: agora,
      historico: [{ id: gerarId(), em: agora, tipo: "criada", detalhe: "" }],
    },
    roadmap.tarefas.length,
    comps
  );

  roadmapsRepo.inserirTarefa(roadmapId, novaTarefa);
  return novaTarefa;
}

export async function atualizarTarefa(roadmapId, tarefaId, dados) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const index = roadmap.tarefas.findIndex((t) => t.id === tarefaId);
  if (index === -1) return null;

  const comps = normalizarCompetencias(roadmap.competencias ?? []);
  const atual = normalizarTarefa(roadmap.tarefas[index], index, comps);

  if (dados.concluida === true && !atual.concluida) {
    const { bloqueada, pendentes } = tarefaEstaBloqueada(atual, roadmap.tarefas);
    if (bloqueada) {
      const nomes = pendentes.map((p) => p.titulo).join(", ");
      const erro = new Error(`Tarefa bloqueada. Conclua antes: ${nomes}`);
      erro.status = 400;
      throw erro;
    }
  }

  const atualizada = normalizarTarefa({ ...atual, ...dados }, index, comps);

  if (dados.horasEstimadas !== undefined) {
    atualizada.horasEstimadas = Number(dados.horasEstimadas) || 0;
  }
  if (dados.horasReais !== undefined) {
    atualizada.horasReais = Number(dados.horasReais) || 0;
  }
  if (dados.tipo !== undefined && TIPOS_VALIDOS.includes(dados.tipo)) {
    atualizada.tipo = dados.tipo;
  }
  if (dados.dificuldade !== undefined && DIFICULDADES_VALIDAS.includes(dados.dificuldade)) {
    atualizada.dificuldade = dados.dificuldade;
  }
  if (dados.prioridade !== undefined && PRIORIDADES_VALIDAS.includes(dados.prioridade)) {
    atualizada.prioridade = dados.prioridade;
  }
  if (dados.tags !== undefined) {
    atualizada.tags = normalizarTags(dados.tags);
  }
  if (dados.atributos !== undefined || dados.atributo !== undefined || dados.areas !== undefined) {
    atualizada.atributos = normalizarAtributos(
      dados.atributos ?? dados.atributo ?? dados.areas
    );
  }
  if (dados.dependsOn !== undefined) {
    atualizada.dependsOn = normalizarDependsOn(dados.dependsOn);
  }
  if (dados.competenciasIds !== undefined || dados.competencias !== undefined) {
    atualizada.competenciasIds = normalizarCompetenciasIds(
      dados.competenciasIds ?? dados.competencias,
      comps
    );
  }
  if (dados.reviewAfterDays !== undefined) {
    const n = Number(dados.reviewAfterDays);
    atualizada.reviewAfterDays = Number.isFinite(n) && n > 0 ? n : 0;
  }
  if (dados.criterioConclusao !== undefined) {
    atualizada.criterioConclusao = String(dados.criterioConclusao);
  }
  if (dados.links !== undefined) {
    atualizada.links = (dados.links ?? []).map(normalizarLink);
  }

  const mudouConclusao =
    dados.concluida !== undefined && Boolean(dados.concluida) !== atual.concluida;

  if (mudouConclusao) {
    if (dados.concluida) {
      atualizada.concluidaEm = agoraIso();
      adicionarHistorico(atualizada, "concluida", "");
    } else {
      atualizada.concluidaEm = null;
      adicionarHistorico(atualizada, "reaberta", "");
    }
  } else if (
    dados.titulo !== undefined ||
    dados.descricao !== undefined ||
    dados.observacoes !== undefined ||
    dados.criterioConclusao !== undefined ||
    dados.tipo !== undefined ||
    dados.prazo !== undefined ||
    dados.links !== undefined ||
    dados.subtarefas !== undefined ||
    dados.tags !== undefined ||
    dados.atributos !== undefined ||
    dados.dependsOn !== undefined ||
    dados.competenciasIds !== undefined ||
    dados.competencias !== undefined
  ) {
    adicionarHistorico(atualizada, "editada", "");
  }

  if (dados.horasReais !== undefined && Number(dados.horasReais) !== atual.horasReais) {
    const delta = Number(dados.horasReais) - atual.horasReais;
    if (delta !== 0) {
      adicionarHistorico(
        atualizada,
        "tempo",
        delta > 0 ? `+${delta}h registradas` : `${delta}h ajustadas`
      );
    }
  }

  roadmapsRepo.salvarTarefa(roadmapId, atualizada);

  if (mudouConclusao) {
    if (atualizada.concluida) {
      await aoConcluirTarefa(roadmap, atualizada);
    } else {
      await aoReabrirTarefa(roadmap, atualizada);
    }
  }

  return atualizada;
}

export async function registrarTempo(roadmapId, tarefaId, horas) {
  const delta = Number(horas);
  if (!Number.isFinite(delta) || delta === 0) {
    const erro = new Error("Informe um valor de horas diferente de zero");
    erro.status = 400;
    throw erro;
  }

  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const index = roadmap.tarefas.findIndex((t) => t.id === tarefaId);
  if (index === -1) return null;

  const atual = normalizarTarefa(roadmap.tarefas[index], index);
  atual.horasReais = Math.max(0, (atual.horasReais || 0) + delta);
  adicionarHistorico(atual, "tempo", delta > 0 ? `+${delta}h registradas` : `${delta}h ajustadas`);
  roadmapsRepo.salvarTarefa(roadmapId, atual);
  return atual;
}

export async function iniciarTimer(roadmapId, tarefaId) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const index = roadmap.tarefas.findIndex((t) => t.id === tarefaId);
  if (index === -1) return null;

  const atual = normalizarTarefa(roadmap.tarefas[index], index);
  if (atual.timerAtivoDesde) return atual;

  atual.timerAtivoDesde = agoraIso();
  adicionarHistorico(atual, "timer_inicio", "");
  roadmapsRepo.salvarTarefa(roadmapId, atual);
  return atual;
}

export async function pararTimer(roadmapId, tarefaId) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const index = roadmap.tarefas.findIndex((t) => t.id === tarefaId);
  if (index === -1) return null;

  const atual = normalizarTarefa(roadmap.tarefas[index], index);
  if (!atual.timerAtivoDesde) return atual;

  const inicio = new Date(atual.timerAtivoDesde).getTime();
  const decorridoMs = Math.max(0, Date.now() - inicio);
  const horas = Math.round((decorridoMs / (1000 * 60 * 60)) * 100) / 100;

  atual.horasReais = Math.round(((atual.horasReais || 0) + horas) * 100) / 100;
  atual.timerAtivoDesde = null;
  adicionarHistorico(atual, "timer_fim", horas > 0 ? `+${horas}h pelo timer` : "Timer parado");
  roadmapsRepo.salvarTarefa(roadmapId, atual);
  return atual;
}

export async function excluirTarefa(roadmapId, tarefaId) {
  if (!roadmapsRepo.roadmapExiste(roadmapId)) return;
  roadmapsRepo.excluirTarefa(roadmapId, tarefaId);
}

export async function reordenarTarefas(roadmapId, idsOrdenados) {
  const roadmap = roadmapsRepo.reordenarTarefas(roadmapId, idsOrdenados);
  return roadmap ? normalizarRoadmap(roadmap) : null;
}

export async function moverTarefa(roadmapId, tarefaId, direcao) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const tarefas = [...roadmap.tarefas].sort((a, b) => a.ordem - b.ordem);
  const index = tarefas.findIndex((t) => t.id === tarefaId);
  const novoIndex = index + direcao;

  if (index === -1 || novoIndex < 0 || novoIndex >= tarefas.length) return null;

  [tarefas[index], tarefas[novoIndex]] = [tarefas[novoIndex], tarefas[index]];
  const ids = tarefas.map((t) => t.id);
  const atualizado = roadmapsRepo.reordenarTarefas(roadmapId, ids);
  return atualizado ? normalizarRoadmap(atualizado) : null;
}

export async function adicionarSubtarefa(roadmapId, tarefaId, titulo) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const tarefa = roadmap.tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) return null;

  const subtarefa = { id: gerarId(), titulo: titulo.trim(), concluida: false };
  tarefa.subtarefas = tarefa.subtarefas ?? [];
  tarefa.subtarefas.push(subtarefa);
  roadmapsRepo.salvarTarefa(roadmapId, normalizarTarefa(tarefa));
  return subtarefa;
}

export async function atualizarSubtarefa(roadmapId, tarefaId, subtarefaId, dados) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;

  const tarefa = roadmap.tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) return null;

  const index = (tarefa.subtarefas ?? []).findIndex((s) => s.id === subtarefaId);
  if (index === -1) return null;

  const subAntes = tarefa.subtarefas[index];
  const tarefaEstavaConcluida = Boolean(tarefa.concluida);
  const subEstavaConcluida = Boolean(subAntes.concluida);

  tarefa.subtarefas[index] = { ...subAntes, ...dados };
  const subtarefa = tarefa.subtarefas[index];

  if (dados.concluida !== undefined) {
    const todasConcluidas =
      tarefa.subtarefas.length > 0 && tarefa.subtarefas.every((s) => s.concluida);
    if (todasConcluidas) {
      const normalizada = normalizarTarefa(tarefa);
      const { bloqueada } = tarefaEstaBloqueada(normalizada, roadmap.tarefas);
      if (!bloqueada) {
        tarefa.concluida = true;
        tarefa.concluidaEm = agoraIso();
        adicionarHistorico(tarefa, "concluida", "Todas as subtarefas concluídas");
      }
    } else if (!dados.concluida && tarefa.concluida) {
      tarefa.concluida = false;
      tarefa.concluidaEm = null;
      adicionarHistorico(tarefa, "reaberta", "Subtarefa reaberta");
    }
  }

  roadmapsRepo.salvarTarefa(roadmapId, normalizarTarefa(tarefa));

  const mudouSub =
    dados.concluida !== undefined && Boolean(dados.concluida) !== subEstavaConcluida;
  if (mudouSub) {
    if (dados.concluida) {
      await aoConcluirSubtarefa(roadmap, tarefa, subtarefa, {
        tarefaAcabouDeConcluir: !tarefaEstavaConcluida && Boolean(tarefa.concluida),
      });
    } else {
      await aoReabrirSubtarefa(roadmap, tarefa, subtarefa, {
        tarefaAcabouDeReabrir: tarefaEstavaConcluida && !tarefa.concluida,
      });
    }
  }

  return subtarefa;
}

export async function excluirSubtarefa(roadmapId, tarefaId, subtarefaId) {
  const roadmap = roadmapsRepo.obterRoadmapPorId(roadmapId);
  if (!roadmap) return;

  const tarefa = roadmap.tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) return;

  tarefa.subtarefas = (tarefa.subtarefas ?? []).filter((s) => s.id !== subtarefaId);
  roadmapsRepo.salvarTarefa(roadmapId, normalizarTarefa(tarefa));
}
