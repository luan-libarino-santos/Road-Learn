import { getDb, withTransaction } from "./connection.js";

export const ICONES_IDENTIDADE = [
  "iniciais",
  "livro",
  "codigo",
  "compasso",
  "estrela",
  "terminal",
  "mapa",
];

export const PRESETS_TEMA = ["midnight", "ocean", "forest", "ember", "slate"];

export function identidadePadrao() {
  return {
    nomeExibicao: "",
    icone: "iniciais",
    cor: "#a8b4c4",
  };
}

export function temaPadrao() {
  return {
    preset: "midnight",
    custom: {
      accent: null,
      bgApp: null,
      bgElevated: null,
      bgSurface: null,
      radius: null,
      backgroundMode: "solid",
      bgGradientTo: null,
    },
  };
}

export function perfilVazio() {
  return {
    atualizadoEm: new Date().toISOString(),
    xp: 0,
    roadmapsCompletosBonus: [],
    habilidades: [],
    logXp: [],
    historicoHabilidades: [],
    identidade: identidadePadrao(),
    tema: temaPadrao(),
  };
}

function normalizarIdentidade(dados) {
  const padrao = identidadePadrao();
  if (!dados || typeof dados !== "object") return padrao;
  const icone = ICONES_IDENTIDADE.includes(dados.icone) ? dados.icone : padrao.icone;
  const cor =
    typeof dados.cor === "string" && /^#[0-9a-fA-F]{6}$/.test(dados.cor.trim())
      ? dados.cor.trim().toLowerCase()
      : padrao.cor;
  return {
    nomeExibicao: String(dados.nomeExibicao ?? "").trim().slice(0, 48),
    icone,
    cor,
  };
}

function normalizarCustom(custom) {
  const padrao = temaPadrao().custom;
  if (!custom || typeof custom !== "object") return { ...padrao };

  const hexOuNull = (v) => {
    if (v == null || v === "") return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return /^#[0-9a-fA-F]{6}$/.test(t) ? t.toLowerCase() : null;
  };

  let radius = null;
  if (custom.radius != null && custom.radius !== "") {
    const n = Number(custom.radius);
    if (Number.isFinite(n)) radius = Math.max(0, Math.min(24, Math.round(n)));
  }

  const backgroundMode =
    custom.backgroundMode === "gradient" ? "gradient" : "solid";

  return {
    accent: hexOuNull(custom.accent),
    bgApp: hexOuNull(custom.bgApp),
    bgElevated: hexOuNull(custom.bgElevated),
    bgSurface: hexOuNull(custom.bgSurface),
    radius,
    backgroundMode,
    bgGradientTo: hexOuNull(custom.bgGradientTo),
  };
}

function normalizarTema(dados) {
  const padrao = temaPadrao();
  if (!dados || typeof dados !== "object") return padrao;
  const preset = PRESETS_TEMA.includes(dados.preset) ? dados.preset : padrao.preset;
  return {
    preset,
    custom: normalizarCustom(dados.custom),
  };
}

function parseJson(texto, fallback) {
  try {
    return JSON.parse(texto);
  } catch {
    return fallback;
  }
}

export function lerPerfil() {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM perfil WHERE id = 1`).get();
  if (!row) {
    const vazio = perfilVazio();
    salvarPerfil(vazio);
    return vazio;
  }

  const habilidades = db
    .prepare(`SELECT id, tipo, nome, nivel FROM perfil_habilidades ORDER BY rowid`)
    .all()
    .map((h) => ({
      id: h.id,
      tipo: h.tipo,
      nome: h.nome,
      nivel: Number(h.nivel) || 0,
    }));

  const logXp = db
    .prepare(
      `SELECT id, em, delta, origem, rotulo FROM perfil_log_xp ORDER BY ordem, rowid`
    )
    .all()
    .map((l) => ({
      id: l.id,
      em: l.em,
      delta: Number(l.delta) || 0,
      origem: l.origem,
      rotulo: l.rotulo,
    }));

  const historicoHabilidades = db
    .prepare(`SELECT em, itens_json FROM perfil_historico_habilidades ORDER BY em`)
    .all()
    .map((h) => ({
      em: h.em,
      itens: parseJson(h.itens_json, []),
    }));

  const roadmapsCompletosBonus = db
    .prepare(`SELECT roadmap_id FROM perfil_roadmaps_bonus`)
    .all()
    .map((r) => r.roadmap_id);

  return {
    atualizadoEm: row.atualizado_em,
    xp: Math.max(0, Number(row.xp) || 0),
    roadmapsCompletosBonus,
    habilidades,
    logXp,
    historicoHabilidades,
    identidade: normalizarIdentidade(parseJson(row.identidade_json, {})),
    tema: normalizarTema(parseJson(row.tema_json, {})),
  };
}

export function salvarPerfil(perfil) {
  withTransaction(() => {
    const db = getDb();
    const identidade = normalizarIdentidade(perfil.identidade);
    const tema = normalizarTema(perfil.tema);
    const atualizadoEm = new Date().toISOString();

    db.prepare(
      `UPDATE perfil
       SET xp = ?, atualizado_em = ?, identidade_json = ?, tema_json = ?
       WHERE id = 1`
    ).run(
      Math.max(0, Number(perfil.xp) || 0),
      atualizadoEm,
      JSON.stringify(identidade),
      JSON.stringify(tema)
    );

    db.prepare(`DELETE FROM perfil_habilidades`).run();
    db.prepare(`DELETE FROM perfil_log_xp`).run();
    db.prepare(`DELETE FROM perfil_historico_habilidades`).run();
    db.prepare(`DELETE FROM perfil_roadmaps_bonus`).run();

    const insertHab = db.prepare(
      `INSERT INTO perfil_habilidades (id, tipo, nome, nivel) VALUES (?, ?, ?, ?)`
    );
    for (const h of perfil.habilidades ?? []) {
      insertHab.run(h.id, h.tipo, h.nome, Number(h.nivel) || 0);
    }

    const insertLog = db.prepare(
      `INSERT INTO perfil_log_xp (id, em, delta, origem, rotulo, ordem)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    (perfil.logXp ?? []).forEach((l, i) => {
      insertLog.run(l.id, l.em, Number(l.delta) || 0, l.origem ?? "", l.rotulo ?? "", i);
    });

    const insertHist = db.prepare(
      `INSERT INTO perfil_historico_habilidades (em, itens_json) VALUES (?, ?)`
    );
    for (const h of perfil.historicoHabilidades ?? []) {
      insertHist.run(h.em, JSON.stringify(h.itens ?? []));
    }

    const insertBonus = db.prepare(
      `INSERT INTO perfil_roadmaps_bonus (roadmap_id) VALUES (?)`
    );
    for (const id of perfil.roadmapsCompletosBonus ?? []) {
      insertBonus.run(id);
    }
  });
}
