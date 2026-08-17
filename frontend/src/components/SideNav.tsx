import {
  BookOpen,
  Download,
  FolderPlus,
  Map,
  Palette,
  Pause,
  Plus,
  User,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCatalogo } from "../lib/catalogo";
import { formatDuracao, hubHref } from "../lib/format";
import { progressoTarefas } from "../lib/tarefas";

const hubItems = [
  { key: "dinheiro" as const, label: "Dinheiro" },
  { key: "treinos" as const, label: "Treinos" },
  { key: "tasks" as const, label: "Tasks" },
];

function linkClass(isActive: boolean) {
  return `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
    isActive ? "bg-accent text-ink" : "text-sand/80 hover:bg-panel"
  }`;
}

export function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const {
    roadmaps,
    sidebar,
    hub,
    timerAberto,
    projetosIntegrados,
    abrirNovo,
    abrirImport,
    setMenuAberto,
  } = useCatalogo();
  const grupos = sidebar.grupos;
  const lista = [...roadmaps].sort((a, b) => {
    const aa = sidebar.atribuicoes[a.id]?.ordemTodos ?? 0;
    const bb = sidebar.atribuicoes[b.id]?.ordemTodos ?? 0;
    return aa - bb;
  });
    const filtrada = lista;

  const segundos = timerAberto
    ? Math.max(0, Math.floor((Date.now() - new Date(timerAberto.timerAtivoDesde).getTime()) / 1000))
    : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
          <Map size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-none">Road Learn</p>
          <p className="mt-1 text-xs text-mute">Hub pessoal</p>
        </div>
        <button
          type="button"
          className="rounded-xl p-2 text-mute hover:bg-panel hover:text-sand lg:hidden"
          onClick={() => setMenuAberto(false)}
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
      </div>
      {timerAberto && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
          <Pause size={14} />
          Timer {formatDuracao(segundos)} — {timerAberto.titulo}
        </div>
      )}
      <div className="flex gap-1 px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            abrirNovo();
            onNavigate?.();
          }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-ink"
        >
          <Plus size={16} />
          Novo
        </button>
        <button
          type="button"
          onClick={() => {
            abrirImport();
            onNavigate?.();
          }}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-line px-3 py-2 text-sm text-mute"
        >
          <Download size={16} />
          JSON
        </button>
      </div>
      <nav className="flex flex-col gap-1 px-3 pb-3">
        <NavLink to="/" end className={({ isActive }) => linkClass(isActive)} onClick={onNavigate}>
          <User size={16} />
          Ficha
        </NavLink>
        <NavLink to="/aparencia" className={({ isActive }) => linkClass(isActive)} onClick={onNavigate}>
          <Palette size={16} />
          Personalização
        </NavLink>
      </nav>
      {grupos.length > 0 && (
        <div className="flex gap-1 overflow-x-auto px-3 pb-2">
          {grupos.map((g) => (
            <span
              key={g.id}
              className="shrink-0 rounded-lg border border-line px-2 py-1 text-[11px] text-mute"
            >
              {g.nome}
            </span>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 text-[11px] tracking-wide text-mute uppercase">Roadmaps</p>
        <div className="flex flex-col gap-0.5">
          {filtrada.map((r) => {
            const p = progressoTarefas(r.tarefas ?? []);
            return (
              <NavLink
                key={r.id}
                to={`/roadmaps/${r.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm ${
                    isActive ? "bg-panel text-white" : "text-sand/80 hover:bg-panel/70"
                  }`
                }
              >
                <span className="block truncate">{r.nome}</span>
                <span className="text-[11px] text-mute">
                  {p.progresso}% · {r.dominio?.dominio ?? 0}% domínio
                </span>
              </NavLink>
            );
          })}
          {filtrada.length === 0 && (
            <p className="px-3 py-2 text-xs text-mute">Nenhum roadmap ainda.</p>
          )}
        </div>
        {projetosIntegrados.length > 0 && (
          <>
            <p className="mt-4 px-3 pb-2 text-[11px] tracking-wide text-mute uppercase">
              Projetos integrados
            </p>
            {projetosIntegrados.map((p) => (
              <NavLink
                key={p.id}
                to={`/projetos-integrados/${p.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    isActive ? "bg-panel text-white" : "text-sand/80 hover:bg-panel/70"
                  }`
                }
              >
                <FolderPlus size={14} />
                <span className="truncate">{p.nome}</span>
              </NavLink>
            ))}
          </>
        )}
      </div>
      <div className="mt-auto border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="mb-2 text-[11px] tracking-wide text-mute uppercase">Hub</p>
        <div className="flex flex-wrap gap-2">
          {hubItems.map((item) => {
            const href = hubHref(hub[item.key]);
            if (!href) return null;
            return (
              <a
                key={item.key}
                href={href}
                className="rounded-lg border border-line px-2 py-1 text-xs text-mute hover:text-accent"
              >
                {item.label}
              </a>
            );
          })}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-mute">
          <BookOpen size={10} /> estudos
        </p>
      </div>
    </div>
  );
}
