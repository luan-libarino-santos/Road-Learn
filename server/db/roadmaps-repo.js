import { getDb, withTransaction } from "./connection.js";

function boolInt(v) {
  return v ? 1 : 0;
}

function fromBool(v) {
  return Boolean(v);
}

function montarTarefa(row, extras) {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    prazo: row.prazo,
    horasEstimadas: Number(row.horas_estimadas) || 0,
    horasReais: Number(row.horas_reais) || 0,
    concluida: fromBool(row.concluida),
    concluidaEm: row.concluida_em ?? null,
    tipo: row.tipo,
    ordem: Number(row.ordem) || 0,
    observacoes: row.observacoes,
    criterioConclusao: row.criterio_conclusao,
    dificuldade: row.dificuldade,
    prioridade: row.prioridade,
    reviewAfterDays: Number(row.review_after_days) || 0,
    timerAtivoDesde: row.timer_ativo_desde ?? null,
    criadaEm: row.criada_em,
    tags: extras.tags,
    atributos: extras.atributos,
    dependsOn: extras.dependsOn,
    competenciasIds: extras.competenciasIds,
    links: extras.links,
    subtarefas: extras.subtarefas,
    historico: extras.historico,
  };
}

function carregarExtrasTarefas(db, tarefaIds) {
  const tags = new Map();
  const atributos = new Map();
  const dependsOn = new Map();
  const competenciasIds = new Map();
  const links = new Map();
  const subtarefas = new Map();
  const historico = new Map();

  for (const id of tarefaIds) {
    tags.set(id, []);
    atributos.set(id, []);
    dependsOn.set(id, []);
    competenciasIds.set(id, []);
    links.set(id, []);
    subtarefas.set(id, []);
    historico.set(id, []);
  }

  if (!tarefaIds.length) {
    return { tags, atributos, dependsOn, competenciasIds, links, subtarefas, historico };
  }

  const placeholders = tarefaIds.map(() => "?").join(",");

  for (const row of db
    .prepare(`SELECT tarefa_id, tag FROM tarefa_tags WHERE tarefa_id IN (${placeholders})`)
    .all(...tarefaIds)) {
    tags.get(row.tarefa_id)?.push(row.tag);
  }

  for (const row of db
    .prepare(
      `SELECT tarefa_id, atributo FROM tarefa_atributos WHERE tarefa_id IN (${placeholders})`
    )
    .all(...tarefaIds)) {
    atributos.get(row.tarefa_id)?.push(row.atributo);
  }

  for (const row of db
    .prepare(
      `SELECT tarefa_id, depends_on_id FROM tarefa_deps WHERE tarefa_id IN (${placeholders})`
    )
    .all(...tarefaIds)) {
    dependsOn.get(row.tarefa_id)?.push(row.depends_on_id);
  }

  for (const row of db
    .prepare(
      `SELECT tarefa_id, competencia_id FROM tarefa_competencias WHERE tarefa_id IN (${placeholders})`
    )
    .all(...tarefaIds)) {
    competenciasIds.get(row.tarefa_id)?.push(row.competencia_id);
  }

  for (const row of db
    .prepare(
      `SELECT id, tarefa_id, titulo, url, tipo, ordem FROM links
       WHERE tarefa_id IN (${placeholders}) ORDER BY ordem, rowid`
    )
    .all(...tarefaIds)) {
    links.get(row.tarefa_id)?.push({
      id: row.id,
      titulo: row.titulo,
      url: row.url,
      tipo: row.tipo,
    });
  }

  for (const row of db
    .prepare(
      `SELECT id, tarefa_id, titulo, concluida, ordem FROM subtarefas
       WHERE tarefa_id IN (${placeholders}) ORDER BY ordem, rowid`
    )
    .all(...tarefaIds)) {
    subtarefas.get(row.tarefa_id)?.push({
      id: row.id,
      titulo: row.titulo,
      concluida: fromBool(row.concluida),
    });
  }

  for (const row of db
    .prepare(
      `SELECT id, tarefa_id, em, tipo, detalhe, ordem FROM historico_tarefas
       WHERE tarefa_id IN (${placeholders}) ORDER BY ordem, rowid`
    )
    .all(...tarefaIds)) {
    historico.get(row.tarefa_id)?.push({
      id: row.id,
      em: row.em,
      tipo: row.tipo,
      detalhe: row.detalhe,
    });
  }

  return { tags, atributos, dependsOn, competenciasIds, links, subtarefas, historico };
}

function montarRoadmap(db, roadmapRow) {
  const competencias = db
    .prepare(
      `SELECT id, nome, descricao, ordem FROM competencias
       WHERE roadmap_id = ? ORDER BY ordem, rowid`
    )
    .all(roadmapRow.id)
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      ordem: Number(c.ordem) || 0,
    }));

  const tarefaRows = db
    .prepare(`SELECT * FROM tarefas WHERE roadmap_id = ? ORDER BY ordem, rowid`)
    .all(roadmapRow.id);

  const ids = tarefaRows.map((t) => t.id);
  const extras = carregarExtrasTarefas(db, ids);

  const tarefas = tarefaRows.map((row) =>
    montarTarefa(row, {
      tags: extras.tags.get(row.id) ?? [],
      atributos: extras.atributos.get(row.id) ?? [],
      dependsOn: extras.dependsOn.get(row.id) ?? [],
      competenciasIds: extras.competenciasIds.get(row.id) ?? [],
      links: extras.links.get(row.id) ?? [],
      subtarefas: extras.subtarefas.get(row.id) ?? [],
      historico: extras.historico.get(row.id) ?? [],
    })
  );

  return {
    id: roadmapRow.id,
    nome: roadmapRow.nome,
    descricao: roadmapRow.descricao,
    criadoEm: roadmapRow.criado_em,
    competencias,
    tarefas,
  };
}

export function listarRoadmaps() {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM roadmaps ORDER BY criado_em, rowid`).all();
  return rows.map((row) => montarRoadmap(db, row));
}

export function obterRoadmapPorId(id) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM roadmaps WHERE id = ?`).get(id);
  if (!row) return null;
  return montarRoadmap(db, row);
}

export function listarIdsRoadmaps() {
  return getDb()
    .prepare(`SELECT id FROM roadmaps`)
    .all()
    .map((r) => r.id);
}

/** IDs já usados no banco — usados no import para evitar colisão de PRIMARY KEY. */
export function listarIdsOcupadosImportacao() {
  const db = getDb();
  const ids = (sql) => new Set(db.prepare(sql).all().map((r) => r.id));
  return {
    roadmaps: ids(`SELECT id FROM roadmaps`),
    competencias: ids(`SELECT id FROM competencias`),
    tarefas: ids(`SELECT id FROM tarefas`),
    links: ids(`SELECT id FROM links`),
    subtarefas: ids(`SELECT id FROM subtarefas`),
    historico: ids(`SELECT id FROM historico_tarefas`),
  };
}

export function roadmapExiste(id) {
  return Boolean(getDb().prepare(`SELECT 1 FROM roadmaps WHERE id = ?`).get(id));
}

function inserirTarefaRows(db, roadmapId, tarefa) {
  db.prepare(
    `INSERT INTO tarefas (
      id, roadmap_id, titulo, descricao, prazo, horas_estimadas, horas_reais,
      concluida, concluida_em, tipo, ordem, observacoes, criterio_conclusao,
      dificuldade, prioridade, review_after_days, timer_ativo_desde, criada_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    tarefa.id,
    roadmapId,
    tarefa.titulo ?? "",
    tarefa.descricao ?? "",
    tarefa.prazo ?? "",
    Number(tarefa.horasEstimadas) || 0,
    Number(tarefa.horasReais) || 0,
    boolInt(tarefa.concluida),
    tarefa.concluidaEm ?? null,
    tarefa.tipo ?? "pratica",
    Number.isFinite(tarefa.ordem) ? tarefa.ordem : 0,
    tarefa.observacoes ?? "",
    tarefa.criterioConclusao ?? "",
    tarefa.dificuldade ?? "medio",
    tarefa.prioridade ?? "media",
    Number(tarefa.reviewAfterDays) || 0,
    tarefa.timerAtivoDesde ?? null,
    tarefa.criadaEm
  );

  const insertDep = db.prepare(
    `INSERT INTO tarefa_deps (tarefa_id, depends_on_id) VALUES (?, ?)`
  );
  for (const dep of tarefa.dependsOn ?? []) {
    insertDep.run(tarefa.id, dep);
  }

  const insertComp = db.prepare(
    `INSERT INTO tarefa_competencias (tarefa_id, competencia_id) VALUES (?, ?)`
  );
  for (const cid of tarefa.competenciasIds ?? []) {
    insertComp.run(tarefa.id, cid);
  }

  const insertTag = db.prepare(`INSERT INTO tarefa_tags (tarefa_id, tag) VALUES (?, ?)`);
  for (const tag of tarefa.tags ?? []) {
    insertTag.run(tarefa.id, tag);
  }

  const insertAttr = db.prepare(
    `INSERT INTO tarefa_atributos (tarefa_id, atributo) VALUES (?, ?)`
  );
  for (const attr of tarefa.atributos ?? []) {
    insertAttr.run(tarefa.id, attr);
  }

  const insertLink = db.prepare(
    `INSERT INTO links (id, tarefa_id, titulo, url, tipo, ordem) VALUES (?, ?, ?, ?, ?, ?)`
  );
  (tarefa.links ?? []).forEach((l, i) => {
    insertLink.run(l.id, tarefa.id, l.titulo ?? "", l.url ?? "", l.tipo ?? "outro", i);
  });

  const insertSub = db.prepare(
    `INSERT INTO subtarefas (id, tarefa_id, titulo, concluida, ordem) VALUES (?, ?, ?, ?, ?)`
  );
  (tarefa.subtarefas ?? []).forEach((s, i) => {
    insertSub.run(s.id, tarefa.id, s.titulo ?? "", boolInt(s.concluida), i);
  });

  const insertHist = db.prepare(
    `INSERT INTO historico_tarefas (id, tarefa_id, em, tipo, detalhe, ordem)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  (tarefa.historico ?? []).forEach((h, i) => {
    insertHist.run(h.id, tarefa.id, h.em, h.tipo ?? "editada", h.detalhe ?? "", i);
  });
}

function limparFilhosTarefa(db, tarefaId) {
  db.prepare(`DELETE FROM tarefa_deps WHERE tarefa_id = ?`).run(tarefaId);
  db.prepare(`DELETE FROM tarefa_competencias WHERE tarefa_id = ?`).run(tarefaId);
  db.prepare(`DELETE FROM tarefa_tags WHERE tarefa_id = ?`).run(tarefaId);
  db.prepare(`DELETE FROM tarefa_atributos WHERE tarefa_id = ?`).run(tarefaId);
  db.prepare(`DELETE FROM links WHERE tarefa_id = ?`).run(tarefaId);
  db.prepare(`DELETE FROM subtarefas WHERE tarefa_id = ?`).run(tarefaId);
  db.prepare(`DELETE FROM historico_tarefas WHERE tarefa_id = ?`).run(tarefaId);
}

export function inserirRoadmapCompleto(roadmap) {
  withTransaction(() => {
    const db = getDb();
    db.prepare(
      `INSERT INTO roadmaps (id, nome, descricao, criado_em) VALUES (?, ?, ?, ?)`
    ).run(roadmap.id, roadmap.nome, roadmap.descricao ?? "", roadmap.criadoEm);

    const insertComp = db.prepare(
      `INSERT INTO competencias (id, roadmap_id, nome, descricao, ordem)
       VALUES (?, ?, ?, ?, ?)`
    );
    (roadmap.competencias ?? []).forEach((c, i) => {
      insertComp.run(c.id, roadmap.id, c.nome, c.descricao ?? "", c.ordem ?? i);
    });

    for (const tarefa of roadmap.tarefas ?? []) {
      inserirTarefaRows(db, roadmap.id, tarefa);
    }
  });
  return obterRoadmapPorId(roadmap.id);
}

export function atualizarMetadadosRoadmap(id, { nome, descricao, competencias } = {}) {
  return withTransaction(() => {
    const db = getDb();
    const atual = db.prepare(`SELECT * FROM roadmaps WHERE id = ?`).get(id);
    if (!atual) return null;

    if (nome !== undefined) {
      db.prepare(`UPDATE roadmaps SET nome = ? WHERE id = ?`).run(nome, id);
    }
    if (descricao !== undefined) {
      db.prepare(`UPDATE roadmaps SET descricao = ? WHERE id = ?`).run(descricao, id);
    }

    if (competencias !== undefined) {
      db.prepare(`DELETE FROM competencias WHERE roadmap_id = ?`).run(id);
      const insertComp = db.prepare(
        `INSERT INTO competencias (id, roadmap_id, nome, descricao, ordem)
         VALUES (?, ?, ?, ?, ?)`
      );
      competencias.forEach((c, i) => {
        insertComp.run(c.id, id, c.nome, c.descricao ?? "", c.ordem ?? i);
      });

      const idsValidos = new Set(competencias.map((c) => c.id));
      const refs = db
        .prepare(
          `SELECT tc.tarefa_id, tc.competencia_id
           FROM tarefa_competencias tc
           JOIN tarefas t ON t.id = tc.tarefa_id
           WHERE t.roadmap_id = ?`
        )
        .all(id);
      const del = db.prepare(
        `DELETE FROM tarefa_competencias WHERE tarefa_id = ? AND competencia_id = ?`
      );
      for (const ref of refs) {
        if (!idsValidos.has(ref.competencia_id)) {
          del.run(ref.tarefa_id, ref.competencia_id);
        }
      }
    }

    return obterRoadmapPorId(id);
  });
}

export function excluirRoadmap(id) {
  const result = getDb().prepare(`DELETE FROM roadmaps WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function inserirCompetencia(roadmapId, competencia) {
  const db = getDb();
  if (!db.prepare(`SELECT 1 FROM roadmaps WHERE id = ?`).get(roadmapId)) return null;
  db.prepare(
    `INSERT INTO competencias (id, roadmap_id, nome, descricao, ordem)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    competencia.id,
    roadmapId,
    competencia.nome,
    competencia.descricao ?? "",
    competencia.ordem ?? 0
  );
  return competencia;
}

export function atualizarCompetencia(roadmapId, competenciaId, dados) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM competencias WHERE id = ? AND roadmap_id = ?`)
    .get(competenciaId, roadmapId);
  if (!row) return null;

  const nome = dados.nome !== undefined ? dados.nome : row.nome;
  const descricao = dados.descricao !== undefined ? dados.descricao : row.descricao;
  db.prepare(
    `UPDATE competencias SET nome = ?, descricao = ? WHERE id = ? AND roadmap_id = ?`
  ).run(nome, descricao, competenciaId, roadmapId);

  return {
    id: competenciaId,
    nome,
    descricao,
    ordem: Number(row.ordem) || 0,
  };
}

export function excluirCompetencia(roadmapId, competenciaId) {
  withTransaction(() => {
    const db = getDb();
    db.prepare(
      `DELETE FROM tarefa_competencias
       WHERE competencia_id = ?
         AND tarefa_id IN (SELECT id FROM tarefas WHERE roadmap_id = ?)`
    ).run(competenciaId, roadmapId);
    db.prepare(`DELETE FROM competencias WHERE id = ? AND roadmap_id = ?`).run(
      competenciaId,
      roadmapId
    );
  });
}

export function inserirTarefa(roadmapId, tarefa) {
  const db = getDb();
  if (!db.prepare(`SELECT 1 FROM roadmaps WHERE id = ?`).get(roadmapId)) return null;
  withTransaction(() => {
    inserirTarefaRows(getDb(), roadmapId, tarefa);
  });
  return tarefa;
}

export function salvarTarefa(roadmapId, tarefa) {
  return withTransaction(() => {
    const db = getDb();
    const existe = db
      .prepare(`SELECT 1 FROM tarefas WHERE id = ? AND roadmap_id = ?`)
      .get(tarefa.id, roadmapId);
    if (!existe) return null;

    limparFilhosTarefa(db, tarefa.id);
    db.prepare(`DELETE FROM tarefas WHERE id = ?`).run(tarefa.id);
    inserirTarefaRows(db, roadmapId, tarefa);
    return tarefa;
  });
}

export function excluirTarefa(roadmapId, tarefaId) {
  withTransaction(() => {
    const db = getDb();
    db.prepare(
      `DELETE FROM tarefa_deps
       WHERE depends_on_id = ?
         AND tarefa_id IN (SELECT id FROM tarefas WHERE roadmap_id = ?)`
    ).run(tarefaId, roadmapId);
    db.prepare(`DELETE FROM tarefas WHERE id = ? AND roadmap_id = ?`).run(
      tarefaId,
      roadmapId
    );

    const restantes = db
      .prepare(`SELECT id FROM tarefas WHERE roadmap_id = ? ORDER BY ordem, rowid`)
      .all(roadmapId);
    const upd = db.prepare(`UPDATE tarefas SET ordem = ? WHERE id = ?`);
    restantes.forEach((t, i) => upd.run(i, t.id));
  });
}

export function reordenarTarefas(roadmapId, idsOrdenados) {
  return withTransaction(() => {
    const db = getDb();
    const atuais = db
      .prepare(`SELECT id FROM tarefas WHERE roadmap_id = ?`)
      .all(roadmapId)
      .map((r) => r.id);
    if (atuais.length !== idsOrdenados.length) return null;
    const setAtual = new Set(atuais);
    if (idsOrdenados.some((id) => !setAtual.has(id))) return null;

    const upd = db.prepare(`UPDATE tarefas SET ordem = ? WHERE id = ? AND roadmap_id = ?`);
    idsOrdenados.forEach((id, i) => upd.run(i, id, roadmapId));
    return obterRoadmapPorId(roadmapId);
  });
}

export function obterTarefa(roadmapId, tarefaId) {
  const roadmap = obterRoadmapPorId(roadmapId);
  if (!roadmap) return null;
  const tarefa = roadmap.tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) return null;
  return { roadmap, tarefa };
}
