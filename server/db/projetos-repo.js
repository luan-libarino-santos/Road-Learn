import { getDb, withTransaction } from "./connection.js";

const COLECAO_DB = {
  requisitosTecnicos: "tecnico",
  requisitosFuncionais: "funcional",
  checklistImplementacao: "implementacao",
  boasPraticas: "boa_pratica",
};

const COLECAO_API = {
  tecnico: "requisitosTecnicos",
  funcional: "requisitosFuncionais",
  implementacao: "checklistImplementacao",
  boa_pratica: "boasPraticas",
};

function boolInt(v) {
  return v ? 1 : 0;
}

function parseJson(texto, fallback) {
  try {
    return JSON.parse(texto);
  } catch {
    return fallback;
  }
}

function montarProjetoDeRows(row, { roadmapIds, etapas, itens }) {
  const checklists = {
    requisitosTecnicos: [],
    requisitosFuncionais: [],
    checklistImplementacao: [],
    boasPraticas: [],
  };

  const tarefasPorEtapa = new Map();
  for (const e of etapas) {
    tarefasPorEtapa.set(e.id, []);
  }

  for (const item of itens) {
    if (item.colecao === "etapa_tarefa" && item.etapa_id) {
      tarefasPorEtapa.get(item.etapa_id)?.push({
        id: item.id,
        titulo: item.titulo,
        concluido: Boolean(item.concluido),
        concluida: Boolean(item.concluido),
      });
      continue;
    }
    const chave = COLECAO_API[item.colecao];
    if (chave) {
      checklists[chave].push({
        id: item.id,
        titulo: item.titulo,
        concluido: Boolean(item.concluido),
      });
    }
  }

  const etapasMontadas = etapas.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    descricao: e.descricao,
    ordem: Number(e.ordem) || 0,
    concluida: Boolean(e.concluida),
    tarefas: tarefasPorEtapa.get(e.id) ?? [],
  }));

  const base = {
    id: row.id,
    nome: row.nome,
    objetivo: row.objetivo,
    descricao: row.descricao,
    stackObrigatoria: parseJson(row.stack_json, []),
    requisitosTecnicos: checklists.requisitosTecnicos,
    requisitosFuncionais: checklists.requisitosFuncionais,
    checklistImplementacao: checklists.checklistImplementacao,
    criteriosConclusao: parseJson(row.criterios_json, []),
    etapas: etapasMontadas,
    documentacaoInicial: parseJson(row.documentacao_json, {}),
    boasPraticas: checklists.boasPraticas,
    competenciasAlvoIds: parseJson(row.competencias_alvo_json, []),
    topicoOrigem: parseJson(row.topico_json, { titulo: "", resumo: "" }),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    concluido: Boolean(row.concluido),
    concluidoEm: row.concluido_em ?? null,
  };

  if (roadmapIds) {
    return { ...base, roadmapIds };
  }
  return { ...base, roadmapId: row.roadmap_id };
}

function carregarEtapasItens(db, projetoTipo, projetoId) {
  const etapas = db
    .prepare(
      `SELECT id, titulo, descricao, ordem, concluida FROM projeto_etapas
       WHERE projeto_tipo = ? AND projeto_id = ?
       ORDER BY ordem, rowid`
    )
    .all(projetoTipo, projetoId);

  const itens = db
    .prepare(
      `SELECT id, colecao, titulo, concluido, ordem, etapa_id FROM projeto_itens
       WHERE projeto_tipo = ? AND projeto_id = ?
       ORDER BY ordem, rowid`
    )
    .all(projetoTipo, projetoId);

  return { etapas, itens };
}

function limparFilhosProjeto(db, projetoTipo, projetoId) {
  db.prepare(
    `DELETE FROM projeto_itens WHERE projeto_tipo = ? AND projeto_id = ?`
  ).run(projetoTipo, projetoId);
  db.prepare(
    `DELETE FROM projeto_etapas WHERE projeto_tipo = ? AND projeto_id = ?`
  ).run(projetoTipo, projetoId);
}

function inserirFilhosProjeto(db, projetoTipo, projeto) {
  const insertEtapa = db.prepare(
    `INSERT INTO projeto_etapas
      (id, projeto_tipo, projeto_id, titulo, descricao, ordem, concluida)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO projeto_itens
      (id, projeto_tipo, projeto_id, colecao, titulo, concluido, ordem, etapa_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const [chaveApi, colecaoDb] of Object.entries(COLECAO_DB)) {
    (projeto[chaveApi] ?? []).forEach((item, i) => {
      insertItem.run(
        item.id,
        projetoTipo,
        projeto.id,
        colecaoDb,
        item.titulo ?? item.texto ?? "",
        boolInt(item.concluido),
        i,
        null
      );
    });
  }

  (projeto.etapas ?? []).forEach((etapa, ei) => {
    insertEtapa.run(
      etapa.id,
      projetoTipo,
      projeto.id,
      etapa.titulo ?? "",
      etapa.descricao ?? "",
      etapa.ordem ?? ei,
      boolInt(etapa.concluida)
    );
    (etapa.tarefas ?? []).forEach((t, ti) => {
      insertItem.run(
        t.id,
        projetoTipo,
        projeto.id,
        "etapa_tarefa",
        t.titulo ?? "",
        boolInt(t.concluida ?? t.concluido),
        ti,
        etapa.id
      );
    });
  });
}

export function listarProjetosFinais() {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM projetos_finais ORDER BY criado_em, rowid`).all();
  return rows.map((row) => {
    const { etapas, itens } = carregarEtapasItens(db, "final", row.id);
    return montarProjetoDeRows(row, { etapas, itens });
  });
}

export function obterProjetoFinalPorId(id) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM projetos_finais WHERE id = ?`).get(id);
  if (!row) return null;
  const { etapas, itens } = carregarEtapasItens(db, "final", row.id);
  return montarProjetoDeRows(row, { etapas, itens });
}

export function obterProjetoFinalPorRoadmapId(roadmapId) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM projetos_finais WHERE roadmap_id = ?`)
    .get(roadmapId);
  if (!row) return null;
  const { etapas, itens } = carregarEtapasItens(db, "final", row.id);
  return montarProjetoDeRows(row, { etapas, itens });
}

export function upsertProjetoFinal(projeto) {
  withTransaction(() => {
    const db = getDb();
    const existente = db
      .prepare(`SELECT id FROM projetos_finais WHERE roadmap_id = ?`)
      .get(projeto.roadmapId);

    if (existente && existente.id !== projeto.id) {
      limparFilhosProjeto(db, "final", existente.id);
      db.prepare(`DELETE FROM projetos_finais WHERE id = ?`).run(existente.id);
    }

    const jaTem = db.prepare(`SELECT id FROM projetos_finais WHERE id = ?`).get(projeto.id);
    if (jaTem) {
      limparFilhosProjeto(db, "final", projeto.id);
      db.prepare(
        `UPDATE projetos_finais SET
          roadmap_id = ?, nome = ?, objetivo = ?, descricao = ?,
          stack_json = ?, criterios_json = ?, competencias_alvo_json = ?,
          documentacao_json = ?, topico_json = ?, atualizado_em = ?,
          concluido = ?, concluido_em = ?
         WHERE id = ?`
      ).run(
        projeto.roadmapId,
        projeto.nome,
        projeto.objetivo ?? "",
        projeto.descricao ?? "",
        JSON.stringify(projeto.stackObrigatoria ?? []),
        JSON.stringify(projeto.criteriosConclusao ?? []),
        JSON.stringify(projeto.competenciasAlvoIds ?? []),
        JSON.stringify(projeto.documentacaoInicial ?? {}),
        JSON.stringify(projeto.topicoOrigem ?? {}),
        projeto.atualizadoEm,
        boolInt(projeto.concluido),
        projeto.concluidoEm ?? null,
        projeto.id
      );
    } else {
      db.prepare(
        `INSERT INTO projetos_finais (
          id, roadmap_id, nome, objetivo, descricao, stack_json, criterios_json,
          competencias_alvo_json, documentacao_json, topico_json,
          criado_em, atualizado_em, concluido, concluido_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        projeto.id,
        projeto.roadmapId,
        projeto.nome,
        projeto.objetivo ?? "",
        projeto.descricao ?? "",
        JSON.stringify(projeto.stackObrigatoria ?? []),
        JSON.stringify(projeto.criteriosConclusao ?? []),
        JSON.stringify(projeto.competenciasAlvoIds ?? []),
        JSON.stringify(projeto.documentacaoInicial ?? {}),
        JSON.stringify(projeto.topicoOrigem ?? {}),
        projeto.criadoEm,
        projeto.atualizadoEm,
        boolInt(projeto.concluido),
        projeto.concluidoEm ?? null
      );
    }

    inserirFilhosProjeto(db, "final", projeto);
  });
  return obterProjetoFinalPorId(projeto.id);
}

export function excluirProjetoFinal(id) {
  return withTransaction(() => {
    const db = getDb();
    limparFilhosProjeto(db, "final", id);
    const result = db.prepare(`DELETE FROM projetos_finais WHERE id = ?`).run(id);
    return result.changes > 0;
  });
}

export function excluirProjetoFinalPorRoadmapId(roadmapId) {
  const db = getDb();
  const row = db
    .prepare(`SELECT id FROM projetos_finais WHERE roadmap_id = ?`)
    .get(roadmapId);
  if (!row) return false;
  return excluirProjetoFinal(row.id);
}

export function listarProjetosIntegrados() {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM projetos_integrados ORDER BY criado_em, rowid`)
    .all();
  return rows.map((row) => {
    const roadmapIds = db
      .prepare(
        `SELECT roadmap_id FROM projeto_integrado_roadmaps
         WHERE projeto_id = ? ORDER BY ordem, rowid`
      )
      .all(row.id)
      .map((r) => r.roadmap_id);
    const { etapas, itens } = carregarEtapasItens(db, "integrado", row.id);
    return montarProjetoDeRows(row, { roadmapIds, etapas, itens });
  });
}

export function obterProjetoIntegradoPorId(id) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM projetos_integrados WHERE id = ?`).get(id);
  if (!row) return null;
  const roadmapIds = db
    .prepare(
      `SELECT roadmap_id FROM projeto_integrado_roadmaps
       WHERE projeto_id = ? ORDER BY ordem, rowid`
    )
    .all(row.id)
    .map((r) => r.roadmap_id);
  const { etapas, itens } = carregarEtapasItens(db, "integrado", row.id);
  return montarProjetoDeRows(row, { roadmapIds, etapas, itens });
}

export function upsertProjetoIntegrado(projeto) {
  withTransaction(() => {
    const db = getDb();
    const jaTem = db
      .prepare(`SELECT id FROM projetos_integrados WHERE id = ?`)
      .get(projeto.id);

    if (jaTem) {
      limparFilhosProjeto(db, "integrado", projeto.id);
      db.prepare(`DELETE FROM projeto_integrado_roadmaps WHERE projeto_id = ?`).run(
        projeto.id
      );
      db.prepare(
        `UPDATE projetos_integrados SET
          nome = ?, objetivo = ?, descricao = ?,
          stack_json = ?, criterios_json = ?, competencias_alvo_json = ?,
          documentacao_json = ?, topico_json = ?, atualizado_em = ?,
          concluido = ?, concluido_em = ?
         WHERE id = ?`
      ).run(
        projeto.nome,
        projeto.objetivo ?? "",
        projeto.descricao ?? "",
        JSON.stringify(projeto.stackObrigatoria ?? []),
        JSON.stringify(projeto.criteriosConclusao ?? []),
        JSON.stringify(projeto.competenciasAlvoIds ?? []),
        JSON.stringify(projeto.documentacaoInicial ?? {}),
        JSON.stringify(projeto.topicoOrigem ?? {}),
        projeto.atualizadoEm,
        boolInt(projeto.concluido),
        projeto.concluidoEm ?? null,
        projeto.id
      );
    } else {
      db.prepare(
        `INSERT INTO projetos_integrados (
          id, nome, objetivo, descricao, stack_json, criterios_json,
          competencias_alvo_json, documentacao_json, topico_json,
          criado_em, atualizado_em, concluido, concluido_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        projeto.id,
        projeto.nome,
        projeto.objetivo ?? "",
        projeto.descricao ?? "",
        JSON.stringify(projeto.stackObrigatoria ?? []),
        JSON.stringify(projeto.criteriosConclusao ?? []),
        JSON.stringify(projeto.competenciasAlvoIds ?? []),
        JSON.stringify(projeto.documentacaoInicial ?? {}),
        JSON.stringify(projeto.topicoOrigem ?? {}),
        projeto.criadoEm,
        projeto.atualizadoEm,
        boolInt(projeto.concluido),
        projeto.concluidoEm ?? null
      );
    }

    const insertRm = db.prepare(
      `INSERT INTO projeto_integrado_roadmaps (projeto_id, roadmap_id, ordem)
       VALUES (?, ?, ?)`
    );
    (projeto.roadmapIds ?? []).forEach((rid, i) => {
      insertRm.run(projeto.id, rid, i);
    });

    inserirFilhosProjeto(db, "integrado", projeto);
  });
  return obterProjetoIntegradoPorId(projeto.id);
}

export function excluirProjetoIntegrado(id) {
  withTransaction(() => {
    const db = getDb();
    limparFilhosProjeto(db, "integrado", id);
    db.prepare(`DELETE FROM projeto_integrado_roadmaps WHERE projeto_id = ?`).run(id);
    db.prepare(`DELETE FROM projetos_integrados WHERE id = ?`).run(id);
  });
  return true;
}

export function salvarListaProjetosIntegrados(projetos) {
  withTransaction(() => {
    const db = getDb();
    const idsManter = new Set(projetos.map((p) => p.id));
    const existentes = db.prepare(`SELECT id FROM projetos_integrados`).all();
    for (const row of existentes) {
      if (!idsManter.has(row.id)) {
        limparFilhosProjeto(db, "integrado", row.id);
        db.prepare(`DELETE FROM projeto_integrado_roadmaps WHERE projeto_id = ?`).run(
          row.id
        );
        db.prepare(`DELETE FROM projetos_integrados WHERE id = ?`).run(row.id);
      }
    }
  });

  for (const projeto of projetos) {
    upsertProjetoIntegrado(projeto);
  }
}
