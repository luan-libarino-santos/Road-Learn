import {
  lerPerfil,
  salvarPerfil,
  perfilVazio,
  identidadePadrao,
  temaPadrao,
  ICONES_IDENTIDADE,
  PRESETS_TEMA,
} from "./db/profile-repo.js";
import { encontrarHabilidadeSimilar } from "./habilidades-match.js";
import { listarRoadmaps } from "./db/roadmaps-repo.js";

function erroHttp(status, message) {
  const erro = new Error(message);
  erro.status = status;
  return erro;
}

function hexValido(v) {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

const XP_TAREFA = 10;
const XP_SUBTAREFA = 2;
const XP_ROADMAP = 100;
const LOG_MAX = 20;
const TIERS = ["Comum", "Rara", "Épica", "Lendária", "Celestial"];
const BADGE_FORMAS = ["", "circulo", "losango", "hexagono", "escudo", "estrela"];
const MULTIPLICADOR_DIFICULDADE = {
  facil: 1,
  medio: 2,
  dificil: 3,
};

function multiplicadorDificuldade(tarefa) {
  const chave = String(tarefa?.dificuldade ?? "facil").toLowerCase();
  return MULTIPLICADOR_DIFICULDADE[chave] ?? 1;
}

function xpTarefa(tarefa) {
  return XP_TAREFA * multiplicadorDificuldade(tarefa);
}

function xpSubtarefa(tarefa) {
  return XP_SUBTAREFA * multiplicadorDificuldade(tarefa);
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function agoraIso() {
  return new Date().toISOString();
}

function diaChave(iso = agoraIso()) {
  return String(iso).slice(0, 10);
}

function truncar(texto, max = 72) {
  const t = String(texto ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function calcularNivelXp(xpBruto) {
  const xp = Math.max(0, Number(xpBruto) || 0);
  let nivel = 1;
  let gasto = 0;

  while (nivel < 500) {
    const custo = 40 + (nivel - 1) * 15;
    if (xp < gasto + custo) {
      const noNivel = xp - gasto;
      return {
        nivel,
        xp,
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

export function calcularTierHabilidade(tipo, nivel) {
  const n = Math.max(0, Number(nivel) || 0);
  const passo = tipo === "base" ? 25 : 10;
  const indice = Math.min(TIERS.length - 1, Math.floor(n / passo));
  const noTopo = indice >= TIERS.length - 1;
  return {
    tier: TIERS[indice],
    passoTier: passo,
    progressoNoTier: noTopo ? passo : n % passo,
    indiceTier: indice,
    noTopo,
  };
}

export function calcularBadge(nivel) {
  const n = Math.max(1, Number(nivel) || 1);
  const indice = Math.floor(n / 20);
  if (indice <= 0) {
    return { indice: 0, forma: null, rotulo: null };
  }
  const forma = BADGE_FORMAS[Math.min(indice, BADGE_FORMAS.length - 1)];
  return {
    indice,
    forma,
    rotulo: `N${indice * 20}+`,
  };
}

function enriquecerHabilidade(hab) {
  const tierInfo = calcularTierHabilidade(hab.tipo, hab.nivel);
  return { ...hab, ...tierInfo };
}

export function enriquecerPerfil(perfil) {
  const nivelInfo = calcularNivelXp(perfil.xp);
  const habilidades = (perfil.habilidades ?? [])
    .map(enriquecerHabilidade)
    .sort((a, b) => b.nivel - a.nivel || a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    ...perfil,
    habilidades,
    habilidadesBase: habilidades.filter((h) => h.tipo === "base"),
    habilidadesEspeciais: habilidades.filter((h) => h.tipo === "especial"),
    nivel: nivelInfo,
    badge: calcularBadge(nivelInfo.nivel),
  };
}

export async function obterPerfil() {
  const perfil = await lerPerfil();
  return enriquecerPerfil(perfil);
}

function encontrarOuCriarHabilidade(perfil, tipo, nome) {
  const nomeLimpo = String(nome ?? "").trim();
  if (!nomeLimpo) return null;

  const match = encontrarHabilidadeSimilar(perfil.habilidades, tipo, nomeLimpo);
  if (match) return match.habilidade;

  const nova = {
    id: gerarId(),
    tipo,
    nome: nomeLimpo,
    nivel: 0,
  };
  perfil.habilidades.push(nova);
  return nova;
}

function ajustarHabilidade(perfil, tipo, nome, delta) {
  const hab = encontrarOuCriarHabilidade(perfil, tipo, nome);
  if (!hab) return;
  hab.nivel = Math.max(0, (hab.nivel || 0) + delta);
}

function registrarXp(perfil, delta, origem, rotulo) {
  if (!delta) return;
  perfil.xp = Math.max(0, (perfil.xp || 0) + delta);
  perfil.logXp = [
    {
      id: gerarId(),
      em: agoraIso(),
      delta,
      origem,
      rotulo: truncar(rotulo),
    },
    ...(perfil.logXp ?? []),
  ].slice(0, LOG_MAX);
}

function atualizarHistoricoHabilidades(perfil) {
  const dia = diaChave();
  const itens = (perfil.habilidades ?? []).map((h) => ({
    id: h.id,
    nivel: h.nivel,
  }));
  const lista = perfil.historicoHabilidades ?? [];
  const idx = lista.findIndex((h) => h.em === dia);
  const snap = { em: dia, itens };
  if (idx >= 0) lista[idx] = snap;
  else lista.push(snap);
  perfil.historicoHabilidades = lista.slice(-120);
}

function roadmapEstaCompleto(roadmap) {
  const tarefas = roadmap?.tarefas ?? [];
  return tarefas.length > 0 && tarefas.every((t) => t.concluida);
}

function aplicarHabilidadesTarefa(perfil, roadmap, tarefa, delta) {
  for (const attr of tarefa.atributos ?? []) {
    ajustarHabilidade(perfil, "base", attr, delta);
  }
  const comps = roadmap.competencias ?? [];
  for (const id of tarefa.competenciasIds ?? []) {
    const comp = comps.find((c) => c.id === id);
    if (comp?.nome) ajustarHabilidade(perfil, "especial", comp.nome, delta);
  }
}

function aplicarBonusRoadmap(perfil, roadmap, conceder) {
  const ids = perfil.roadmapsCompletosBonus ?? [];
  const tem = ids.includes(roadmap.id);
  if (conceder) {
    if (tem || !roadmapEstaCompleto(roadmap)) return;
    perfil.roadmapsCompletosBonus = [...ids, roadmap.id];
    registrarXp(perfil, XP_ROADMAP, "roadmap", `Roadmap completo: ${roadmap.nome}`);
  } else if (tem && !roadmapEstaCompleto(roadmap)) {
    perfil.roadmapsCompletosBonus = ids.filter((id) => id !== roadmap.id);
    registrarXp(perfil, -XP_ROADMAP, "roadmap", `Bônus revogado: ${roadmap.nome}`);
  }
}

async function mutarPerfil(fn) {
  const perfil = await lerPerfil();
  await fn(perfil);
  atualizarHistoricoHabilidades(perfil);
  await salvarPerfil(perfil);
  return enriquecerPerfil(perfil);
}

export async function aoConcluirTarefa(roadmap, tarefa) {
  return mutarPerfil((perfil) => {
    aplicarHabilidadesTarefa(perfil, roadmap, tarefa, 1);
    registrarXp(perfil, xpTarefa(tarefa), "tarefa", `Concluiu: ${tarefa.titulo}`);
    aplicarBonusRoadmap(perfil, roadmap, true);
  });
}

export async function aoReabrirTarefa(roadmap, tarefa) {
  return mutarPerfil((perfil) => {
    aplicarHabilidadesTarefa(perfil, roadmap, tarefa, -1);
    registrarXp(perfil, -xpTarefa(tarefa), "tarefa", `Reabriu: ${tarefa.titulo}`);
    aplicarBonusRoadmap(perfil, roadmap, false);
  });
}

export async function aoConcluirSubtarefa(roadmap, tarefa, subtarefa, { tarefaAcabouDeConcluir } = {}) {
  return mutarPerfil((perfil) => {
    registrarXp(
      perfil,
      xpSubtarefa(tarefa),
      "subtarefa",
      `Subtarefa: ${subtarefa.titulo || tarefa.titulo}`
    );
    if (tarefaAcabouDeConcluir) {
      aplicarHabilidadesTarefa(perfil, roadmap, tarefa, 1);
      registrarXp(perfil, xpTarefa(tarefa), "tarefa", `Concluiu: ${tarefa.titulo}`);
      aplicarBonusRoadmap(perfil, roadmap, true);
    }
  });
}

export async function aoReabrirSubtarefa(roadmap, tarefa, subtarefa, { tarefaAcabouDeReabrir } = {}) {
  return mutarPerfil((perfil) => {
    registrarXp(
      perfil,
      -xpSubtarefa(tarefa),
      "subtarefa",
      `Reabriu subtarefa: ${subtarefa.titulo || tarefa.titulo}`
    );
    if (tarefaAcabouDeReabrir) {
      aplicarHabilidadesTarefa(perfil, roadmap, tarefa, -1);
      registrarXp(perfil, -xpTarefa(tarefa), "tarefa", `Reabriu: ${tarefa.titulo}`);
      aplicarBonusRoadmap(perfil, roadmap, false);
    }
  });
}

export async function limparBonusRoadmapExcluido(roadmapId) {
  const perfil = await lerPerfil();
  const antes = perfil.roadmapsCompletosBonus ?? [];
  if (!antes.includes(roadmapId)) return enriquecerPerfil(perfil);
  perfil.roadmapsCompletosBonus = antes.filter((id) => id !== roadmapId);
  await salvarPerfil(perfil);
  return enriquecerPerfil(perfil);
}

export async function atualizarIdentidade(dados) {
  if (!dados || typeof dados !== "object") {
    throw erroHttp(400, "Dados de identidade inválidos");
  }

  const perfil = await lerPerfil();
  const atual = perfil.identidade ?? identidadePadrao();
  const proxima = { ...atual };

  if (dados.nomeExibicao !== undefined) {
    proxima.nomeExibicao = String(dados.nomeExibicao ?? "").trim().slice(0, 48);
  }
  if (dados.icone !== undefined) {
    if (!ICONES_IDENTIDADE.includes(dados.icone)) {
      throw erroHttp(400, "Ícone inválido");
    }
    proxima.icone = dados.icone;
  }
  if (dados.cor !== undefined) {
    if (!hexValido(dados.cor)) {
      throw erroHttp(400, "Cor inválida (use #RRGGBB)");
    }
    proxima.cor = dados.cor.trim().toLowerCase();
  }

  perfil.identidade = proxima;
  await salvarPerfil(perfil);
  return enriquecerPerfil(perfil);
}

export async function atualizarTema(dados) {
  if (!dados || typeof dados !== "object") {
    throw erroHttp(400, "Dados de tema inválidos");
  }

  const perfil = await lerPerfil();
  const atual = perfil.tema ?? temaPadrao();
  const proximo = {
    preset: atual.preset,
    custom: { ...temaPadrao().custom, ...(atual.custom || {}) },
  };

  if (dados.preset !== undefined) {
    if (!PRESETS_TEMA.includes(dados.preset)) {
      throw erroHttp(400, "Preset de tema inválido");
    }
    proximo.preset = dados.preset;
  }

  if (dados.custom !== undefined) {
    if (dados.custom === null) {
      proximo.custom = { ...temaPadrao().custom };
    } else if (typeof dados.custom !== "object") {
      throw erroHttp(400, "Custom de tema inválido");
    } else {
      const c = dados.custom;
      const hexOuNull = (v) => {
        if (v == null || v === "") return null;
        if (!hexValido(v)) throw erroHttp(400, "Cor inválida (use #RRGGBB)");
        return v.trim().toLowerCase();
      };

      if ("accent" in c) proximo.custom.accent = hexOuNull(c.accent);
      if ("bgApp" in c) proximo.custom.bgApp = hexOuNull(c.bgApp);
      if ("bgElevated" in c) proximo.custom.bgElevated = hexOuNull(c.bgElevated);
      if ("bgSurface" in c) proximo.custom.bgSurface = hexOuNull(c.bgSurface);
      if ("bgGradientTo" in c) proximo.custom.bgGradientTo = hexOuNull(c.bgGradientTo);

      if ("radius" in c) {
        if (c.radius == null || c.radius === "") {
          proximo.custom.radius = null;
        } else {
          const n = Number(c.radius);
          if (!Number.isFinite(n)) throw erroHttp(400, "Radius inválido");
          proximo.custom.radius = Math.max(0, Math.min(24, Math.round(n)));
        }
      }

      if ("backgroundMode" in c) {
        if (c.backgroundMode !== "solid" && c.backgroundMode !== "gradient") {
          throw erroHttp(400, "backgroundMode deve ser solid ou gradient");
        }
        proximo.custom.backgroundMode = c.backgroundMode;
      }
    }
  }

  perfil.tema = proximo;
  await salvarPerfil(perfil);
  return enriquecerPerfil(perfil);
}

export async function rebuildPerfil() {
  const anterior = await lerPerfil();
  const identidade = anterior.identidade ?? identidadePadrao();
  const tema = anterior.tema ?? temaPadrao();

  const roadmaps = listarRoadmaps();
  const perfil = perfilVazio();
  perfil.identidade = identidade;
  perfil.tema = tema;

  const eventos = [];

  for (const roadmap of roadmaps) {
    for (const tarefa of roadmap.tarefas ?? []) {
      for (const sub of tarefa.subtarefas ?? []) {
        if (sub.concluida) {
          eventos.push({
            em: tarefa.concluidaEm || tarefa.criadaEm || "",
            tipo: "subtarefa",
            roadmap,
            tarefa,
            subtarefa: sub,
          });
        }
      }
      if (tarefa.concluida) {
        eventos.push({
          em: tarefa.concluidaEm || tarefa.criadaEm || "",
          tipo: "tarefa",
          roadmap,
          tarefa,
        });
      }
    }
  }

  eventos.sort((a, b) => String(a.em).localeCompare(String(b.em)));

  for (const ev of eventos) {
    if (ev.tipo === "subtarefa") {
      registrarXp(
        perfil,
        xpSubtarefa(ev.tarefa),
        "subtarefa",
        `Subtarefa: ${ev.subtarefa.titulo || ev.tarefa.titulo}`
      );
    } else {
      aplicarHabilidadesTarefa(perfil, ev.roadmap, ev.tarefa, 1);
      registrarXp(perfil, xpTarefa(ev.tarefa), "tarefa", `Concluiu: ${ev.tarefa.titulo}`);
    }
  }

  for (const roadmap of roadmaps) {
    if (roadmapEstaCompleto(roadmap)) {
      perfil.roadmapsCompletosBonus.push(roadmap.id);
      registrarXp(perfil, XP_ROADMAP, "roadmap", `Roadmap completo: ${roadmap.nome}`);
    }
  }

  atualizarHistoricoHabilidades(perfil);
  await salvarPerfil(perfil);
  return enriquecerPerfil(perfil);
}

export async function garantirPerfilInicial() {
  const perfil = await lerPerfil();
  const vazio =
    (perfil.habilidades?.length ?? 0) === 0 &&
    (perfil.xp ?? 0) === 0 &&
    (perfil.logXp?.length ?? 0) === 0;

  if (!vazio) return enriquecerPerfil(perfil);

  const roadmaps = listarRoadmaps();
  const temConclusoes = roadmaps.some((r) =>
    (r.tarefas ?? []).some(
      (t) => t.concluida || (t.subtarefas ?? []).some((s) => s.concluida)
    )
  );

  if (!temConclusoes) return enriquecerPerfil(perfil);
  return rebuildPerfil();
}
