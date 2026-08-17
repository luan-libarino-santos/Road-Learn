import type { Tarefa } from "./types";

export function tarefaBloqueada(tarefa: Tarefa, todas: Tarefa[]) {
  const porId = new Map(todas.map((t) => [t.id, t]));
  const pendentes = (tarefa.dependsOn ?? [])
    .map((id) => porId.get(id))
    .filter((t): t is Tarefa => Boolean(t && !t.concluida));
  return { bloqueada: pendentes.length > 0, pendentes };
}

export function progressoTarefas(tarefas: Tarefa[]) {
  const total = tarefas.length;
  if (!total) return { total: 0, concluidas: 0, progresso: 0 };
  const concluidas = tarefas.filter((t) => t.concluida).length;
  return { total, concluidas, progresso: Math.round((concluidas / total) * 100) };
}
