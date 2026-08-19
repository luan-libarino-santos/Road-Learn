import { Check, ChevronDown, ChevronUp, Clock, ExternalLink, Loader2, Pause, Play, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Modal } from "../components/Modal";
import { api } from "../lib/api";
import type { FonteSugerida } from "../lib/api";
import { useCatalogo } from "../lib/catalogo";
import { DIFICULDADES, formatHoras, PRIORIDADES, TIPOS } from "../lib/format";
import { layoutGrafo } from "../lib/grafo";
import { progressoTarefas, tarefaBloqueada } from "../lib/tarefas";
import type { Projeto, Roadmap, Tarefa, Topico } from "../lib/types";
import { ProjetoPainel } from "../components/ProjetoPainel";

const FILTROS = ["todas", "liberadas", "bloqueadas", "pendentes", "concluidas"] as const;

export default function RoadmapPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reload } = useCatalogo();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [aba, setAba] = useState<"tarefas" | "competencias" | "arvore" | "projeto">("tarefas");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("todas");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [formTarefa, setFormTarefa] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("pratica");
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [topicos, setTopicos] = useState<Topico[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [buscandoFontes, setBuscandoFontes] = useState<string | null>(null);
  const [resultadosFontes, setResultadosFontes] = useState<Record<string, FonteSugerida[]>>({});

  async function carregar() {
    if (!id) return;
    const r = await api.roadmaps.get(id);
    setRoadmap(r);
    try {
      const pf = await api.pf.get(id);
      setProjeto(pf?.id ? pf : null);
    } catch {
      setProjeto(null);
    }
  }

  useEffect(() => {
    void carregar().catch(() => setRoadmap(null));
  }, [id]);

  const tarefas = roadmap?.tarefas ?? [];
  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      const { bloqueada } = tarefaBloqueada(t, tarefas);
      if (filtro === "liberadas") return !t.concluida && !bloqueada;
      if (filtro === "bloqueadas") return bloqueada && !t.concluida;
      if (filtro === "pendentes") return !t.concluida;
      if (filtro === "concluidas") return t.concluida;
      return true;
    });
  }, [tarefas, filtro]);

  const prog = progressoTarefas(tarefas);
  const grafo = useMemo(() => layoutGrafo(tarefas), [tarefas]);

  async function criarTarefa(e: FormEvent) {
    e.preventDefault();
    if (!id || !titulo.trim()) return;
    await api.roadmaps.addTarefa(id, { titulo: titulo.trim(), tipo });
    setTitulo("");
    setFormTarefa(false);
    await carregar();
    await reload();
  }

  async function toggleTarefa(t: Tarefa) {
    if (!id) return;
    try {
      await api.roadmaps.updateTarefa(id, t.id, { concluida: !t.concluida });
      await carregar();
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível atualizar");
    }
  }

  async function buscarFontesTarefa(t: Tarefa) {
    if (!id) return;
    setBuscandoFontes(t.id);
    try {
      const { fontes } = await api.buscarFontes(t.titulo);
      setResultadosFontes((prev) => ({ ...prev, [t.id]: fontes }));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Falha ao buscar fontes.");
    } finally {
      setBuscandoFontes(null);
    }
  }

  async function adicionarLink(t: Tarefa, fonte: FonteSugerida) {
    if (!id) return;
    const novosLinks = [
      ...(t.links ?? []),
      { titulo: fonte.titulo, url: fonte.url, tipo: fonte.tipo },
    ];
    await api.roadmaps.updateTarefa(id, t.id, { links: novosLinks });
    await carregar();
    // Remove a sugestão adicionada
    setResultadosFontes((prev) => ({
      ...prev,
      [t.id]: (prev[t.id] ?? []).filter((f) => f.url !== fonte.url),
    }));
  }

  if (!roadmap) {
    return <p className="text-sm text-mute">Carregando roadmap…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-mute uppercase">Roadmap</p>
          <h1 className="page-title">{roadmap.nome}</h1>
          {roadmap.descricao && <p className="mt-2 text-sm text-mute">{roadmap.descricao}</p>}
          <p className="mt-2 text-sm text-mute">
            {prog.progresso}% tarefas · {roadmap.dominio?.dominio ?? 0}% domínio
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm("Excluir este roadmap?")) return;
            await api.roadmaps.remove(roadmap.id);
            await reload();
            navigate("/");
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-line px-2 py-2 text-sm text-rose-300 sm:px-3"
          aria-label="Excluir roadmap"
        >
          <Trash2 size={16} />
          <span className="hidden sm:inline">Excluir</span>
        </button>
      </div>
      <div className="-mx-3 mb-4 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {(["tarefas", "competencias", "arvore", "projeto"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${aba === a ? "bg-accent text-ink" : "bg-panel text-mute"}`}
          >
            {a === "arvore" ? "Árvore" : a[0].toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>

      {aba === "tarefas" && (
        <>
          <div className="-mx-3 mb-3 flex items-center gap-1 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {FILTROS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`shrink-0 rounded-lg px-2 py-1 text-xs ${filtro === f ? "bg-accent text-ink" : "border border-line text-mute"}`}
              >
                {f}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFormTarefa(true)}
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-xl bg-accent px-2 py-1.5 text-sm font-medium text-ink sm:px-3"
              aria-label="Nova tarefa"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Tarefa</span>
            </button>
          </div>
          <div className="space-y-2">
            {filtradas.map((t) => {
              const { bloqueada } = tarefaBloqueada(t, tarefas);
              const aberta = expandida === t.id;
              return (
                <div key={t.id} className="rounded-2xl border border-line bg-panel/50 p-3">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleTarefa(t)}
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${
                        t.concluida ? "border-accent bg-accent text-ink" : "border-line"
                      }`}
                    >
                      {t.concluida && <Check size={12} />}
                    </button>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setExpandida(aberta ? null : t.id)}
                    >
                      <p className={`text-sm ${t.concluida ? "text-mute line-through" : ""}`}>
                        {t.titulo}
                      </p>
                      <p className="text-[11px] text-mute">
                        {TIPOS[t.tipo] ?? t.tipo} · {DIFICULDADES[t.dificuldade]} ·{" "}
                        {PRIORIDADES[t.prioridade]}
                        {bloqueada ? " · bloqueada" : ""}
                      </p>
                    </button>
                    <span className="text-[11px] text-mute">{formatHoras(t.horasReais)}</span>
                  </div>
                  {aberta && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                      {t.descricao && <p className="text-sand/80">{t.descricao}</p>}
                      {t.criterioConclusao && (
                        <p className="text-xs text-mute">Critério: {t.criterioConclusao}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void (t.timerAtivoDesde
                              ? api.roadmaps.timerParar(roadmap.id, t.id)
                              : api.roadmaps.timerIniciar(roadmap.id, t.id)
                            ).then(() => carregar()).then(() => reload())
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-mute"
                        >
                          {t.timerAtivoDesde ? <Pause size={12} /> : <Play size={12} />}
                          Timer
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const m = prompt("Minutos a registrar", "30");
                            if (!m) return;
                            await api.roadmaps.tempo(roadmap.id, t.id, Number(m) / 60);
                            await carregar();
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-mute"
                        >
                          <Clock size={12} /> Tempo
                        </button>
                        <button
                          type="button"
                          onClick={() => void api.roadmaps.mover(roadmap.id, t.id, -1).then(carregar)}
                          className="rounded-lg border border-line p-1 text-mute"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void api.roadmaps.mover(roadmap.id, t.id, 1).then(carregar)}
                          className="rounded-lg border border-line p-1 text-mute"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm("Excluir tarefa?")) return;
                            await api.roadmaps.removeTarefa(roadmap.id, t.id);
                            await carregar();
                            await reload();
                          }}
                          className="rounded-lg border border-line p-1 text-rose-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Links existentes */}
                      {t.links.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-medium tracking-wide text-mute uppercase">Fontes</p>
                          {t.links.map((l) => (
                            <a
                              key={l.id}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-xs text-sand/80 hover:text-accent"
                            >
                              <ExternalLink size={11} className="shrink-0" />
                              <span className="truncate">{l.titulo || l.url}</span>
                              <span className="ml-auto shrink-0 rounded bg-panel px-1 text-[10px] text-mute">
                                {l.tipo}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Botão buscar fontes */}
                      <div>
                        <button
                          type="button"
                          disabled={buscandoFontes === t.id}
                          onClick={() => void buscarFontesTarefa(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-xs text-mute hover:text-accent disabled:opacity-50"
                        >
                          {buscandoFontes === t.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Search size={12} />
                          )}
                          {buscandoFontes === t.id ? "Buscando…" : "Buscar Fontes"}
                        </button>
                      </div>

                      {/* Resultados da busca */}
                      {resultadosFontes[t.id] !== undefined && (
                        <div className="space-y-1">
                          {resultadosFontes[t.id].length === 0 ? (
                            <p className="text-xs text-mute">
                              Nenhum resultado.{" "}
                              <Link to="/configuracoes" className="text-accent hover:underline">
                                Verifique as chaves de API.
                              </Link>
                            </p>
                          ) : (
                            <>
                              <p className="text-[11px] font-medium tracking-wide text-mute uppercase">
                                Sugestões
                              </p>
                              {resultadosFontes[t.id].map((f) => (
                                <div
                                  key={f.url}
                                  className="flex items-center gap-2 rounded-lg border border-line bg-ink px-2 py-1.5 text-xs"
                                >
                                  <span className="shrink-0 rounded bg-panel px-1 text-[10px] text-mute">
                                    {f.tipo}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-sand/80">
                                    {f.titulo}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => void adicionarLink(t, f)}
                                    className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-ink"
                                  >
                                    + Adicionar
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}

                      <ul className="space-y-1">
                        {t.subtarefas.map((s) => (
                          <li key={s.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={s.concluida}
                              onChange={() =>
                                void api.roadmaps
                                  .updateSub(roadmap.id, t.id, s.id, { concluida: !s.concluida })
                                  .then(carregar)
                                  .then(reload)
                              }
                            />
                            <span className={s.concluida ? "text-mute line-through" : ""}>
                              {s.titulo}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const n = String(fd.get("sub") || "").trim();
                          if (!n) return;
                          await api.roadmaps.addSub(roadmap.id, t.id, n);
                          e.currentTarget.reset();
                          await carregar();
                        }}
                        className="flex gap-1"
                      >
                        <input
                          name="sub"
                          placeholder="Nova subtarefa"
                          className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-2 py-1 text-xs"
                        />
                        <button type="submit" className="rounded-lg bg-panel px-2 text-accent">
                          +
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
            {filtradas.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-mute">
                Nenhuma tarefa neste filtro.
              </p>
            )}
          </div>
        </>
      )}

      {aba === "competencias" && (
        <div className="space-y-2">
          {(roadmap.competenciasDominio ?? roadmap.competencias).map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-panel/40 p-3">
              <div className="flex justify-between text-sm">
                <span>{c.nome}</span>
                <span className="text-accent">{c.dominio ?? 0}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink">
                <div className="h-full bg-accent" style={{ width: `${c.dominio ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === "arvore" && (
        <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:-mx-6 sm:px-6">
          <div className="min-w-max rounded-2xl border border-line bg-panel/30 p-3">
          <svg width={grafo.width} height={grafo.height}>
            {grafo.edges.map((e, i) => (
              <line
                key={i}
                x1={e.from.x + e.from.w / 2}
                y1={e.from.y + e.from.h}
                x2={e.to.x + e.to.w / 2}
                y2={e.to.y}
                stroke="#2a2e36"
                strokeWidth={1.5}
              />
            ))}
            {[...grafo.pos.entries()].map(([tid, p]) => {
              const t = tarefas.find((x) => x.id === tid);
              if (!t) return null;
              return (
                <g key={tid}>
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    rx={10}
                    fill={t.concluida ? "rgba(142,197,232,0.2)" : "#1a1c20"}
                    stroke={t.concluida ? "#8ec5e8" : "#2a2e36"}
                  />
                  <text
                    x={p.x + p.w / 2}
                    y={p.y + 30}
                    textAnchor="middle"
                    fill="#e8eaef"
                    fontSize={11}
                  >
                    {t.titulo.slice(0, 22)}
                  </text>
                </g>
              );
            })}
          </svg>
          </div>
        </div>
      )}

      {aba === "projeto" && (
        <div>
          {prog.progresso < 80 && (
            <p className="mb-3 text-sm text-mute">
              Conclua 80% das tarefas para gerar o Projeto Final (atual: {prog.progresso}%).
            </p>
          )}
          {projeto ? (
            <ProjetoPainel
              projeto={projeto}
              onToggle={async (dados) => {
                const p = await api.pf.toggle(projeto.id, dados);
                setProjeto(p);
              }}
            />
          ) : (
            <button
              type="button"
              disabled={prog.progresso < 80 || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await api.pf.sugerir(roadmap.id);
                  setTopicos(r.topicos);
                } catch (err) {
                  window.alert(err instanceof Error ? err.message : "Falha");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
            >
              {busy ? "Sugerindo…" : "Sugerir tópicos"}
            </button>
          )}
        </div>
      )}

      {formTarefa && (
        <Modal titulo="Nova tarefa" onClose={() => setFormTarefa(false)}>
          <form onSubmit={(e) => void criarTarefa(e)} className="space-y-3">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título"
              className="w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-xl border border-line bg-ink px-3 py-2"
            >
              {Object.entries(TIPOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFormTarefa(false)} className="text-sm text-mute">
                Cancelar
              </button>
              <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink">
                Adicionar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {topicos && (
        <Modal titulo="Escolha um tópico" onClose={() => setTopicos(null)} wide>
          <div className="space-y-2">
            {topicos.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await api.pf.gerar(roadmap.id, t);
                    const salvo = await api.pf.save({ ...r.projeto, roadmapId: roadmap.id });
                    setProjeto(salvo);
                    setTopicos(null);
                    setAba("projeto");
                  } catch (err) {
                    window.alert(err instanceof Error ? err.message : "Falha");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="w-full rounded-2xl border border-line bg-panel/40 p-3 text-left"
              >
                <p className="font-medium">{t.titulo}</p>
                <p className="mt-1 text-sm text-mute">{t.resumo}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
