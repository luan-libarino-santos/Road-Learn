import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useCatalogo } from "../lib/catalogo";

const ICONES = ["iniciais", "livro", "codigo", "compasso", "estrela", "terminal", "mapa"];

export default function AparenciaPage() {
  const { perfil, reload } = useCatalogo();
  const [nome, setNome] = useState(perfil?.identidade.nomeExibicao ?? "");
  const [icone, setIcone] = useState(perfil?.identidade.icone ?? "iniciais");
  const [cor, setCor] = useState(perfil?.identidade.cor ?? "#8ec5e8");

  async function salvar(e: FormEvent) {
    e.preventDefault();
    await api.profile.identidade({ nomeExibicao: nome, icone, cor });
    await reload();
  }

  return (
    <div>
      <p className="text-xs tracking-wide text-mute uppercase">Você</p>
      <h1 className="page-title">Personalização</h1>
      <p className="mt-2 text-sm text-mute">Nome, avatar e cor — o tema do app é preto, cinza e azul claro.</p>
      <form onSubmit={(e) => void salvar(e)} className="mt-5 max-w-md space-y-3">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome de exibição"
          className="w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none"
        />
        <div className="flex flex-wrap gap-1">
          {ICONES.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcone(i)}
              className={`rounded-full px-3 py-1 text-xs ${icone === i ? "bg-accent text-ink" : "bg-panel text-mute"}`}
            >
              {i}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-mute">
          Cor
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
        </label>
        <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink">
          Salvar
        </button>
      </form>
    </div>
  );
}
