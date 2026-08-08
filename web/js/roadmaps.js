import { api } from "./api.js";
import { carregarSidebar } from "./sidebar-meta.js";

export const TIPOS_TAREFA = {
  pratica: { label: "Prática", cor: "#8fa3b8", fundo: "rgba(143, 163, 184, 0.18)" },
  pesquisa: { label: "Pesquisa", cor: "#6b9e8a", fundo: "rgba(107, 158, 138, 0.18)" },
  projeto: { label: "Projeto", cor: "#5c8a9e", fundo: "rgba(92, 138, 158, 0.18)" },
  analise: { label: "Análise", cor: "#c4a574", fundo: "rgba(196, 165, 116, 0.18)" },
};

export const TIPOS_LINK = {
  video: { label: "Vídeo", icone: "▶" },
  artigo: { label: "Artigo", icone: "📄" },
  doc: { label: "Doc", icone: "📘" },
  repo: { label: "Repo", icone: "⌘" },
  outro: { label: "Outro", icone: "🔗" },
};

export const DIFICULDADES = {
  facil: { label: "Fácil" },
  medio: { label: "Médio" },
  dificil: { label: "Difícil" },
};

export const PRIORIDADES = {
  baixa: { label: "Baixa" },
  media: { label: "Média" },
  alta: { label: "Alta" },
};

let cache = [];

export function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function carregarDados() {
  const [roadmaps] = await Promise.all([api.listarRoadmaps(), carregarSidebar()]);
  cache = roadmaps;
  return cache;
}

export function obterRoadmaps() {
  return cache;
}

export function obterRoadmapPorId(id) {
  return cache.find((r) => r.id === id) ?? null;
}

export async function criarRoadmap(nome, descricao = "") {
  const roadmap = await api.criarRoadmap({ nome, descricao });
  await carregarDados();
  return roadmap;
}

export async function atualizarRoadmap(id, dados) {
  const roadmap = await api.atualizarRoadmap(id, dados);
  await carregarDados();
  return roadmap;
}

export async function importarRoadmaps(dados) {
  const resultado = await api.importarRoadmaps(dados);
  await carregarDados();
  return resultado;
}

export async function excluirRoadmap(id) {
  await api.excluirRoadmap(id);
  await carregarDados();
}

export async function adicionarCompetencia(roadmapId, dados) {
  const competencia = await api.adicionarCompetencia(roadmapId, dados);
  await carregarDados();
  return competencia;
}

export async function atualizarCompetencia(roadmapId, competenciaId, dados) {
  const competencia = await api.atualizarCompetencia(roadmapId, competenciaId, dados);
  await carregarDados();
  return competencia;
}

export async function excluirCompetencia(roadmapId, competenciaId) {
  await api.excluirCompetencia(roadmapId, competenciaId);
  await carregarDados();
}

export async function adicionarTarefa(roadmapId, tarefa) {
  const nova = await api.adicionarTarefa(roadmapId, tarefa);
  await carregarDados();
  return nova;
}

export async function atualizarTarefa(roadmapId, tarefaId, dados) {
  const atualizada = await api.atualizarTarefa(roadmapId, tarefaId, dados);
  await carregarDados();
  return atualizada;
}

export async function excluirTarefa(roadmapId, tarefaId) {
  await api.excluirTarefa(roadmapId, tarefaId);
  await carregarDados();
}

export async function registrarTempo(roadmapId, tarefaId, horas) {
  const atualizada = await api.registrarTempo(roadmapId, tarefaId, horas);
  await carregarDados();
  return atualizada;
}

export async function iniciarTimer(roadmapId, tarefaId) {
  const atualizada = await api.iniciarTimer(roadmapId, tarefaId);
  await carregarDados();
  return atualizada;
}

export async function pararTimer(roadmapId, tarefaId) {
  const atualizada = await api.pararTimer(roadmapId, tarefaId);
  await carregarDados();
  return atualizada;
}

export async function reordenarTarefas(roadmapId, idsOrdenados) {
  await api.reordenarTarefas(roadmapId, idsOrdenados);
  await carregarDados();
}

export async function moverTarefa(roadmapId, tarefaId, direcao) {
  await api.moverTarefa(roadmapId, tarefaId, direcao);
  await carregarDados();
}

export function ordenarTarefasPorOrdem(tarefas) {
  return [...tarefas].sort((a, b) => a.ordem - b.ordem);
}

export async function adicionarSubtarefa(roadmapId, tarefaId, titulo) {
  const subtarefa = await api.adicionarSubtarefa(roadmapId, tarefaId, titulo);
  await carregarDados();
  return subtarefa;
}

export async function atualizarSubtarefa(roadmapId, tarefaId, subtarefaId, dados) {
  const subtarefa = await api.atualizarSubtarefa(roadmapId, tarefaId, subtarefaId, dados);
  await carregarDados();
  return subtarefa;
}

export async function excluirSubtarefa(roadmapId, tarefaId, subtarefaId) {
  await api.excluirSubtarefa(roadmapId, tarefaId, subtarefaId);
  await carregarDados();
}

export function tarefaEstaBloqueada(tarefa, todasTarefas) {
  const deps = tarefa.dependsOn ?? [];
  if (!deps.length) return { bloqueada: false, pendentes: [] };
  const porId = new Map((todasTarefas ?? []).map((t) => [t.id, t]));
  const pendentes = deps.map((id) => porId.get(id)).filter((t) => t && !t.concluida);
  return {
    bloqueada: pendentes.length > 0,
    pendentes: pendentes.map((t) => ({ id: t.id, titulo: t.titulo })),
  };
}

export function tarefaEstaAtrasada(tarefa) {
  if (!tarefa.prazo || tarefa.concluida) return false;
  const hoje = new Date(new Date().toDateString());
  const prazo = new Date(tarefa.prazo + "T00:00:00");
  return prazo < hoje;
}

export function dataRevisao(tarefa) {
  if (!tarefa.concluida || !tarefa.concluidaEm || !tarefa.reviewAfterDays) return null;
  const base = new Date(tarefa.concluidaEm);
  base.setDate(base.getDate() + Number(tarefa.reviewAfterDays));
  return base.toISOString().slice(0, 10);
}

export function revisaoPendente(tarefa) {
  const data = dataRevisao(tarefa);
  if (!data) return false;
  const hoje = new Date(new Date().toDateString());
  return new Date(data + "T00:00:00") <= hoje;
}

export function filtrarTarefas(tarefas, filtro, tag = "") {
  let lista = tarefas;
  if (tag) {
    lista = lista.filter((t) => (t.tags ?? []).includes(tag));
  }
  switch (filtro) {
    case "pendentes":
      return lista.filter((t) => !t.concluida);
    case "concluidas":
      return lista.filter((t) => t.concluida);
    case "atrasadas":
      return lista.filter((t) => tarefaEstaAtrasada(t));
    case "bloqueadas":
      return lista.filter((t) => tarefaEstaBloqueada(t, tarefas).bloqueada && !t.concluida);
    case "liberadas":
      return lista.filter((t) => !t.concluida && !tarefaEstaBloqueada(t, tarefas).bloqueada);
    case "revisao":
      return lista.filter((t) => revisaoPendente(t));
    default:
      return lista;
  }
}

export function contarPorFiltro(tarefas) {
  return {
    todas: tarefas.length,
    pendentes: tarefas.filter((t) => !t.concluida).length,
    concluidas: tarefas.filter((t) => t.concluida).length,
    atrasadas: tarefas.filter((t) => tarefaEstaAtrasada(t)).length,
    bloqueadas: tarefas.filter((t) => tarefaEstaBloqueada(t, tarefas).bloqueada && !t.concluida)
      .length,
    liberadas: tarefas.filter(
      (t) => !t.concluida && !tarefaEstaBloqueada(t, tarefas).bloqueada
    ).length,
    revisao: tarefas.filter((t) => revisaoPendente(t)).length,
  };
}

export function listarTags(tarefas) {
  const set = new Set();
  (tarefas ?? []).forEach((t) => (t.tags ?? []).forEach((tag) => set.add(tag)));
  return [...set].sort();
}

export function calcularMetricas(roadmap) {
  const tarefas = roadmap?.tarefas ?? [];
  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.concluida).length;
  const pendentes = total - concluidas;

  const horasTotais = tarefas.reduce((s, t) => s + (t.horasEstimadas || 0), 0);
  const horasRestantes = tarefas
    .filter((t) => !t.concluida)
    .reduce((s, t) => s + (t.horasEstimadas || 0), 0);
  const horasFeitas = horasTotais - horasRestantes;
  const horasReais = tarefas.reduce((s, t) => s + (t.horasReais || 0), 0);

  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  const tarefasComPrazo = tarefas
    .filter((t) => !t.concluida && t.prazo)
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo));

  const proximoPrazo = tarefasComPrazo[0]?.prazo ?? null;
  const atrasadas = tarefas.filter((t) => tarefaEstaAtrasada(t)).length;

  const subtarefasTotal = tarefas.reduce((s, t) => s + (t.subtarefas?.length ?? 0), 0);
  const subtarefasConcluidas = tarefas.reduce(
    (s, t) => s + (t.subtarefas ?? []).filter((st) => st.concluida).length,
    0
  );

  return {
    total,
    concluidas,
    pendentes,
    horasTotais,
    horasRestantes,
    horasFeitas,
    horasReais,
    progresso,
    proximoPrazo,
    atrasadas,
    subtarefasTotal,
    subtarefasConcluidas,
  };
}

export function calcularDominioCompetencias(roadmap) {
  const competencias = roadmap?.competencias ?? [];
  const tarefas = roadmap?.tarefas ?? [];

  return competencias
    .map((comp) => {
      const relacionadas = tarefas.filter((t) => (t.competenciasIds ?? []).includes(comp.id));
      const pesoTotal = relacionadas.reduce(
        (s, t) => s + Math.max(Number(t.horasEstimadas) || 0, 1),
        0
      );
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

function diaChave(isoOuDate) {
  if (!isoOuDate) return null;
  const d = typeof isoOuDate === "string" ? new Date(isoOuDate) : isoOuDate;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Curva legada (horas → nível). O nível da Ficha agora vem do perfil (XP por tarefas).
 * Mantida para compatibilidade se algum cálculo local ainda referenciar.
 */
export function calcularNivelXp(xpBruto) {
  const xp = Math.max(0, Number(xpBruto) || 0);
  let nivel = 1;
  let gasto = 0;

  while (nivel < 200) {
    const custo = 5 + (nivel - 1) * 3;
    if (xp < gasto + custo) {
      const noNivel = Math.round((xp - gasto) * 100) / 100;
      return {
        nivel,
        xp: Math.round(xp * 100) / 100,
        xpNoNivel: noNivel,
        xpParaProximo: custo,
        progresso: Math.min(100, Math.round((noNivel / custo) * 100)),
      };
    }
    gasto += custo;
    nivel += 1;
  }

  return { nivel, xp, xpNoNivel: 0, xpParaProximo: 1, progresso: 100 };
}

function somarHorasNoIntervalo(atividadePorDia, inicio, fim) {
  let horas = 0;
  let concluidas = 0;
  for (const [chave, info] of atividadePorDia.entries()) {
    const d = new Date(chave + "T00:00:00");
    if (d >= inicio && d <= fim) {
      horas += info.horas;
      concluidas += info.concluidas;
    }
  }
  return { horas: Math.round(horas * 10) / 10, concluidas };
}

export function calcularAnalyticsGlobais(roadmaps) {
  const todas = [];
  (roadmaps ?? []).forEach((r) => {
    (r.tarefas ?? []).forEach((t) => todas.push({ ...t, roadmapNome: r.nome, roadmapId: r.id }));
  });

  const concluidas = todas.filter((t) => t.concluida);
  const porTipo = { pratica: 0, pesquisa: 0, projeto: 0, analise: 0 };
  todas.forEach((t) => {
    if (porTipo[t.tipo] !== undefined) porTipo[t.tipo] += 1;
  });

  const horasEstimadas = todas.reduce((s, t) => s + (t.horasEstimadas || 0), 0);
  const horasReais = todas.reduce((s, t) => s + (t.horasReais || 0), 0);

  const atributosMap = new Map();
  todas.forEach((t) => {
    const attrs = t.atributos ?? [];
    if (!attrs.length || !(t.horasReais > 0)) return;
    attrs.forEach((nome) => {
      const chave = nome.toLowerCase();
      if (!atributosMap.has(chave)) atributosMap.set(chave, { nome, horas: 0, tarefas: 0 });
      const a = atributosMap.get(chave);
      a.horas += t.horasReais;
      a.tarefas += 1;
    });
  });
  const atributos = [...atributosMap.values()]
    .map((a) => ({ ...a, horas: Math.round(a.horas * 10) / 10 }))
    .sort((a, b) => b.horas - a.horas);

  const atividadePorDia = new Map();
  const marcar = (chave, campo, valor = 1) => {
    if (!chave) return;
    if (!atividadePorDia.has(chave)) {
      atividadePorDia.set(chave, { concluidas: 0, horas: 0, eventos: 0 });
    }
    atividadePorDia.get(chave)[campo] += valor;
  };

  concluidas.forEach((t) => marcar(diaChave(t.concluidaEm), "concluidas"));
  todas.forEach((t) => {
    (t.historico ?? []).forEach((h) => {
      if (h.tipo === "tempo" || h.tipo === "timer_fim" || h.tipo === "concluida") {
        marcar(diaChave(h.em), "eventos");
      }
      if (h.tipo === "tempo" || h.tipo === "timer_fim") {
        const match = String(h.detalhe).match(/([\d.]+)h/);
        if (match) marcar(diaChave(h.em), "horas", Number(match[1]));
      }
    });
  });

  const hoje = diaChave(new Date());
  const diasAtivos = new Set(
    [...atividadePorDia.entries()]
      .filter(([, v]) => v.concluidas > 0 || v.eventos > 0 || v.horas > 0)
      .map(([k]) => k)
  );

  let diasEmSequencia = 0;
  let cursor = new Date();
  if (!diasAtivos.has(hoje)) cursor.setDate(cursor.getDate() - 1);
  while (diasAtivos.has(diaChave(cursor))) {
    diasEmSequencia += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const heatmap = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 83; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const chave = diaChave(d);
    const info = atividadePorDia.get(chave) ?? { concluidas: 0, horas: 0, eventos: 0 };
    const score = info.concluidas + (info.horas > 0 ? 1 : 0) + (info.eventos > 0 ? 1 : 0);
    heatmap.push({
      data: chave,
      ...info,
      nivel: score === 0 ? 0 : Math.min(4, score),
    });
  }

  const semanas = [];
  for (let i = 7; i >= 0; i--) {
    const fim = new Date(base);
    fim.setDate(base.getDate() - i * 7);
    const inicio = new Date(fim);
    inicio.setDate(fim.getDate() - 6);
    let concluidasSemana = 0;
    let horasSemana = 0;
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const info = atividadePorDia.get(diaChave(d));
      if (info) {
        concluidasSemana += info.concluidas;
        horasSemana += info.horas;
      }
    }
    semanas.push({
      rotulo: inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      concluidas: concluidasSemana,
      horas: Math.round(horasSemana * 10) / 10,
    });
  }

  let acum = 0;
  const progressoTempo = heatmap.map((d) => {
    acum += d.concluidas;
    return { data: d.data, acumulado: acum, horas: d.horas };
  });

  const inicioSemana = new Date(base);
  inicioSemana.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  inicioSemana.setHours(0, 0, 0, 0);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);
  fimSemana.setHours(23, 59, 59, 999);

  const inicioSemanaPassada = new Date(inicioSemana);
  inicioSemanaPassada.setDate(inicioSemana.getDate() - 7);
  const fimSemanaPassada = new Date(inicioSemana);
  fimSemanaPassada.setDate(inicioSemana.getDate() - 1);
  fimSemanaPassada.setHours(23, 59, 59, 999);

  const semanaAtual = somarHorasNoIntervalo(atividadePorDia, inicioSemana, fimSemana);
  const semanaPassada = somarHorasNoIntervalo(atividadePorDia, inicioSemanaPassada, fimSemanaPassada);

  const infoHoje = atividadePorDia.get(hoje) ?? { concluidas: 0, horas: 0, eventos: 0 };
  const horasHoje = Math.round(infoHoje.horas * 10) / 10;

  const rotulosDias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const diasDaSemana = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    const chave = diaChave(d);
    const info = atividadePorDia.get(chave) ?? { concluidas: 0, horas: 0, eventos: 0 };
    diasDaSemana.push({
      data: chave,
      rotulo: rotulosDias[i],
      horas: Math.round(info.horas * 10) / 10,
      concluidas: info.concluidas,
      ehHoje: chave === hoje,
    });
  }

  const inicioMes = new Date(base.getFullYear(), base.getMonth(), 1);
  let horasMesAtual = 0;
  let concluidasMesAtual = 0;
  for (const [chave, info] of atividadePorDia.entries()) {
    const d = new Date(chave + "T00:00:00");
    if (d >= inicioMes) {
      horasMesAtual += info.horas;
      concluidasMesAtual += info.concluidas;
    }
  }

  const horasReaisArred = Math.round(horasReais * 100) / 100;

  return {
    totalRoadmaps: roadmaps?.length ?? 0,
    totalTarefas: todas.length,
    totalConcluidas: concluidas.length,
    porTipo,
    horasEstimadas,
    horasReais: horasReaisArred,
    atributos,
    diasEmSequencia,
    streak: diasEmSequencia,
    heatmap,
    semanas,
    diasDaSemana,
    progressoTempo,
    comparacaoSemanal: {
      atual: semanaAtual,
      anterior: semanaPassada,
      deltaHoras: Math.round((semanaAtual.horas - semanaPassada.horas) * 10) / 10,
      deltaConcluidas: semanaAtual.concluidas - semanaPassada.concluidas,
    },
    horasHoje,
    horasSemanaAtual: semanaAtual.horas,
    horasMesAtual: Math.round(horasMesAtual * 10) / 10,
    concluidasSemanaAtual: semanaAtual.concluidas,
    concluidasMesAtual,
  };
}

