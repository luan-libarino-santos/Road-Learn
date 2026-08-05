import { getDb, withTransaction } from "./connection.js";

export function lerSidebar() {
  const db = getDb();
  const grupos = db
    .prepare(`SELECT id, nome, ordem FROM sidebar_grupos ORDER BY ordem, rowid`)
    .all()
    .map((g) => ({
      id: g.id,
      nome: g.nome,
      ordem: Number(g.ordem) || 0,
    }));

  const atribuicoes = {};
  for (const row of db
    .prepare(
      `SELECT roadmap_id, grupo_id, ordem, ordem_todos FROM sidebar_atribuicoes`
    )
    .all()) {
    atribuicoes[row.roadmap_id] = {
      grupoId: row.grupo_id ?? null,
      ordem: Number(row.ordem) || 0,
      ordemTodos: Number(row.ordem_todos) || 0,
    };
  }

  return { grupos, atribuicoes };
}

export function salvarSidebar(dados) {
  withTransaction(() => {
    const db = getDb();
    db.prepare(`DELETE FROM sidebar_atribuicoes`).run();
    db.prepare(`DELETE FROM sidebar_grupos`).run();

    const insertGrupo = db.prepare(
      `INSERT INTO sidebar_grupos (id, nome, ordem) VALUES (?, ?, ?)`
    );
    (dados.grupos ?? []).forEach((g, i) => {
      insertGrupo.run(g.id, g.nome, Number.isFinite(g.ordem) ? g.ordem : i);
    });

    const insertAtrib = db.prepare(
      `INSERT INTO sidebar_atribuicoes (roadmap_id, grupo_id, ordem, ordem_todos)
       VALUES (?, ?, ?, ?)`
    );
    for (const [roadmapId, atrib] of Object.entries(dados.atribuicoes ?? {})) {
      insertAtrib.run(
        roadmapId,
        atrib.grupoId || null,
        Number(atrib.ordem) || 0,
        Number(atrib.ordemTodos) || 0
      );
    }
  });
}
