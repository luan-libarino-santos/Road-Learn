import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjetoPainel } from "../components/ProjetoPainel";
import { api } from "../lib/api";
import { useCatalogo } from "../lib/catalogo";
import type { Projeto } from "../lib/types";

export default function ProjetoIntegradoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reload } = useCatalogo();
  const [projeto, setProjeto] = useState<Projeto | null>(null);

  useEffect(() => {
    if (!id) return;
    void api.pi.get(id).then(setProjeto).catch(() => setProjeto(null));
  }, [id]);

  if (!projeto) return <p className="text-sm text-mute">Carregando projeto…</p>;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-mute uppercase">Projeto integrado</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm("Excluir este projeto integrado?")) return;
            await api.pi.remove(projeto.id);
            await reload();
            navigate("/");
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line px-2 py-2 text-sm text-rose-300 sm:px-3"
          aria-label="Excluir projeto integrado"
        >
          <Trash2 size={16} />
          <span className="hidden sm:inline">Excluir</span>
        </button>
      </div>
      <ProjetoPainel
        projeto={projeto}
        onToggle={async (dados) => {
          const p = await api.pi.toggle(projeto.id, dados);
          setProjeto(p);
        }}
      />
    </div>
  );
}
