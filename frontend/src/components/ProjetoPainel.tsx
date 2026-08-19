import type { Projeto } from "../lib/types";

type Props = {
  projeto: Projeto;
  onToggle: (dados: Record<string, unknown>) => Promise<void>;
};

function Lista({
  titulo,
  itens,
  colecao,
  onToggle,
}: {
  titulo: string;
  itens: { id: string; titulo: string; concluido: boolean }[];
  colecao: string;
  onToggle: Props["onToggle"];
}) {
  if (!itens?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-panel/40 p-3">
      <p className="mb-2 text-xs tracking-wide text-mute uppercase">{titulo}</p>
      <ul className="space-y-1">
        {itens.map((i) => (
          <li key={i.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={i.concluido}
              onChange={() => void onToggle({ colecao, itemId: i.id, concluido: !i.concluido })}
            />
            <span className={i.concluido ? "text-mute line-through" : ""}>{i.titulo}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjetoPainel({ projeto, onToggle }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-xl">{projeto.nome}</h2>
        {projeto.objetivo && <p className="mt-1 text-sm text-mute">{projeto.objetivo}</p>}
        {projeto.stackObrigatoria?.length > 0 && (
          <p className="mt-2 text-xs text-accent">{projeto.stackObrigatoria.join(" · ")}</p>
        )}
      </div>
      {projeto.descricao && (
        <p className="whitespace-pre-wrap rounded-2xl border border-line bg-panel/30 p-3 text-sm text-sand/80">
          {projeto.descricao}
        </p>
      )}
      <Lista
        titulo="Requisitos técnicos"
        itens={projeto.requisitosTecnicos ?? []}
        colecao="requisitosTecnicos"
        onToggle={onToggle}
      />
      <Lista
        titulo="Requisitos funcionais"
        itens={projeto.requisitosFuncionais ?? []}
        colecao="requisitosFuncionais"
        onToggle={onToggle}
      />
      <Lista
        titulo="Implementação"
        itens={projeto.checklistImplementacao ?? []}
        colecao="checklistImplementacao"
        onToggle={onToggle}
      />
      <Lista
        titulo="Boas práticas"
        itens={projeto.boasPraticas ?? []}
        colecao="boasPraticas"
        onToggle={onToggle}
      />
      {(projeto.etapas ?? []).map((e) => (
        <div key={e.id} className="rounded-2xl border border-line bg-panel/40 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={e.concluida}
              onChange={() =>
                void onToggle({
                  colecao: "etapas",
                  itemId: e.id,
                  etapaId: e.id,
                  concluido: !e.concluida,
                })
              }
            />
            {e.titulo}
          </label>
          {e.descricao && <p className="mt-1 text-xs text-mute">{e.descricao}</p>}
          <ul className="mt-2 space-y-1">
            {(e.tarefas ?? []).map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={t.concluido}
                  onChange={() =>
                    void onToggle({
                      colecao: "etapas",
                      itemId: t.id,
                      etapaId: e.id,
                      concluido: !t.concluido,
                    })
                  }
                />
                <span className={t.concluido ? "text-mute line-through" : ""}>{t.titulo}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {projeto.documentacaoInicial?.readme && (
        <pre className="overflow-auto rounded-2xl border border-line bg-ink p-3 text-xs text-sand/80">
          {projeto.documentacaoInicial.readme}
        </pre>
      )}
    </div>
  );
}
