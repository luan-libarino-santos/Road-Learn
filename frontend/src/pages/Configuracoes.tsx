import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";

type Campo = {
  id: "geminiApiKey" | "youtubeApiKey" | "braveApiKey";
  label: string;
  descricao: string;
  link: string;
  linkLabel: string;
};

const CAMPOS: Campo[] = [
  {
    id: "geminiApiKey",
    label: "Gemini API Key",
    descricao: "Geração de roadmaps e projetos com IA",
    link: "https://aistudio.google.com/apikey",
    linkLabel: "aistudio.google.com",
  },
  {
    id: "youtubeApiKey",
    label: "YouTube API Key",
    descricao: "Busca de vídeos para tarefas (YouTube Data API v3)",
    link: "https://console.developers.google.com/",
    linkLabel: "console.developers.google.com",
  },
  {
    id: "braveApiKey",
    label: "Brave Search API Key",
    descricao: "Busca de artigos e documentação para tarefas",
    link: "https://brave.com/search/api/",
    linkLabel: "brave.com/search/api",
  },
];

type Status = { geminiApiKey: string; youtubeApiKey: string; braveApiKey: string };

export default function ConfiguracoesPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [valores, setValores] = useState<Status>({
    geminiApiKey: "",
    youtubeApiKey: "",
    braveApiKey: "",
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    void api.config.get().then((s) => setStatus(s));
  }, []);

  function set(id: keyof Status, val: string) {
    setValores((v) => ({ ...v, [id]: val }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const result = await api.config.save(valores);
      const atualizados: string[] = result.atualizados ?? [];
      if (atualizados.length === 0) {
        setFeedback({ ok: true, msg: "Nenhuma chave nova informada." });
      } else {
        setFeedback({ ok: true, msg: `Salvo: ${atualizados.join(", ")}` });
      }
      // Recarrega status mascarado
      const novo = await api.config.get();
      setStatus(novo);
      setValores({ geminiApiKey: "", youtubeApiKey: "", braveApiKey: "" });
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Falha ao salvar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-xs tracking-wide text-mute uppercase">Sistema</p>
      <h1 className="page-title">Configurações</h1>
      <p className="mt-2 text-sm text-mute">
        Chaves de API — gravadas no arquivo <code className="rounded bg-panel px-1">.env</code> do servidor.
        Deixe em branco para não alterar uma chave já configurada.
      </p>

      <form onSubmit={(e) => void salvar(e)} className="mt-6 max-w-lg space-y-5">
        {CAMPOS.map((c) => {
          const atual = status?.[c.id];
          return (
            <div key={c.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={c.id} className="text-sm font-medium text-sand">
                  {c.label}
                </label>
                {atual ? (
                  <span className="text-[11px] text-accent">configurada</span>
                ) : (
                  <span className="text-[11px] text-mute">não configurada</span>
                )}
              </div>
              <input
                id={c.id}
                type="password"
                autoComplete="off"
                value={valores[c.id]}
                onChange={(e) => set(c.id, e.target.value)}
                placeholder={atual ? `atual: ${atual}` : "Cole a chave aqui"}
                className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm font-mono outline-none placeholder:text-mute/50 focus:border-accent"
              />
              <p className="text-xs text-mute">
                {c.descricao} ·{" "}
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {c.linkLabel}
                </a>
              </p>
            </div>
          );
        })}

        {feedback && (
          <p
            className={`rounded-xl px-3 py-2 text-sm ${
              feedback.ok
                ? "bg-accent/10 text-accent"
                : "bg-rose-500/10 text-rose-300"
            }`}
          >
            {feedback.msg}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          {busy ? "Salvando…" : "Salvar chaves"}
        </button>
      </form>
    </div>
  );
}
