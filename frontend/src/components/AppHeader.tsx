import { Download, Map, Menu, Pause, Plus } from "lucide-react";
import { useCatalogo } from "../lib/catalogo";
import { formatDuracao } from "../lib/format";

export function AppHeader() {
  const { menuAberto, setMenuAberto, abrirNovo, abrirImport, timerAberto } = useCatalogo();
  const segundos = timerAberto
    ? Math.max(0, Math.floor((Date.now() - new Date(timerAberto.timerAtivoDesde).getTime()) / 1000))
    : 0;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-ink/80 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <button
        type="button"
        className="shrink-0 rounded-xl p-1.5 text-sand hover:bg-panel"
        aria-label="Abrir menu"
        aria-expanded={menuAberto}
        aria-controls="menu-principal"
        onClick={() => setMenuAberto(true)}
      >
        <Menu size={20} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-ink">
          <Map size={16} />
        </span>
        <span className="font-display truncate text-base">Road Learn</span>
      </div>
      {timerAberto && (
        <span className="hidden items-center gap-1 rounded-lg border border-accent/40 px-2 py-1 text-[11px] text-accent sm:inline-flex">
          <Pause size={12} />
          {formatDuracao(segundos)}
        </span>
      )}
      <button
        type="button"
        onClick={abrirNovo}
        className="shrink-0 rounded-xl bg-accent p-2 text-ink"
        aria-label="Novo roadmap"
      >
        <Plus size={18} />
      </button>
      <button
        type="button"
        onClick={abrirImport}
        className="shrink-0 rounded-xl border border-line p-2 text-mute"
        aria-label="Importar JSON"
      >
        <Download size={18} />
      </button>
    </header>
  );
}
