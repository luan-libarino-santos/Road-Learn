import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { Modal } from "./components/Modal";
import { api } from "./lib/api";
import { CatalogoContext } from "./lib/catalogo";
import type { HubLinks, Perfil, Projeto, Roadmap, Sidebar, TimerAberto } from "./lib/types";

const FichaPage = lazy(() => import("./pages/Ficha"));
const RoadmapPage = lazy(() => import("./pages/Roadmap"));
const AparenciaPage = lazy(() => import("./pages/Aparencia"));
const ProjetoIntegradoPage = lazy(() => import("./pages/ProjetoIntegrado"));

function Fallback() {
  return <p className="text-sm text-mute">Carregando…</p>;
}

function pagina(el: ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Fallback />}>{el}</Suspense>
    </ErrorBoundary>
  );
}

const OBJETIVOS = [
  "Aprendizado inicial",
  "Aprofundamento",
  "Revisão",
  "Projetos práticos",
  "Preparação profissional",
];
const EXPERIENCIAS = ["Iniciante", "Já tenho fundamentos", "Intermediário", "Avançado"];
const ESTILOS = ["Teórico", "Prático", "Equilibrado", "Baseado em projetos", "Desafios/exercícios"];
const PROFUNDIDADES = ["Resumo", "Normal", "Completo", "Extenso"];
const TEMPOS = ["1 semana", "1 mês", "3 meses", "6 meses", "Sem prazo"];
const TIPOS_ATV = ["Conceitos", "Exercícios", "Projetos", "Pesquisas", "Leituras", "Revisões"];

export default function App() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [sidebar, setSidebar] = useState<Sidebar>({ grupos: [], atribuicoes: {} });
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [hub, setHub] = useState<HubLinks>({ dinheiro: "", treinos: "", tasks: "" });
  const [projetosIntegrados, setProjetosIntegrados] = useState<Projeto[]>([]);
  const [timerAberto, setTimerAberto] = useState<TimerAberto>(null);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const [modal, setModal] = useState<"novo" | "import" | null>(null);
  const [abaImport, setAbaImport] = useState<"json" | "ia">("json");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [jsonTxt, setJsonTxt] = useState("");
  const [tema, setTema] = useState("");
  const [objetivos, setObjetivos] = useState<string[]>(["Aprendizado inicial"]);
  const [experiencia, setExperiencia] = useState("Iniciante");
  const [estilo, setEstilo] = useState("Equilibrado");
  const [profundidade, setProfundidade] = useState("Normal");
  const [tempo, setTempo] = useState("1 mês");
  const [tiposAtv, setTiposAtv] = useState<string[]>(["Conceitos", "Exercícios"]);
  const [restricoes, setRestricoes] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [rms, sb, pf, saude, pis, tm] = await Promise.all([
      api.roadmaps.list(),
      api.sidebar.get(),
      api.profile.get(),
      api.saude(),
      api.pi.list(),
      api.timer(),
    ]);
    setRoadmaps(rms);
    setSidebar(sb);
    setPerfil(pf);
    setHub(saude.hub);
    setProjetosIntegrados(pis);
    setTimerAberto(tm.aberta);
  }, []);

  useEffect(() => {
    void api.csrf().catch(() => undefined);
    reload()
      .then(() => setPronto(true))
      .catch((err: unknown) => {
        setErro(err instanceof Error ? err.message : "Não foi possível falar com a API.");
        setPronto(true);
      });
  }, [reload]);

  useEffect(() => {
    if (!timerAberto) return;
    const id = window.setInterval(() => setTimerAberto((a) => (a ? { ...a } : a)), 1000);
    return () => window.clearInterval(id);
  }, [timerAberto?.tarefaId]);

  const value = useMemo(
    () => ({
      roadmaps,
      sidebar,
      perfil,
      hub,
      projetosIntegrados,
      timerAberto,
      reload,
      menuAberto,
      setMenuAberto,
      abrirNovo: () => setModal("novo"),
      abrirImport: () => setModal("import"),
    }),
    [roadmaps, sidebar, perfil, hub, projetosIntegrados, timerAberto, reload, menuAberto],
  );

  async function criarNovo(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    await api.roadmaps.create({ nome: nome.trim(), descricao });
    setNome("");
    setDescricao("");
    setModal(null);
    await reload();
  }

  async function importarJson() {
    setBusy(true);
    try {
      const payload = JSON.parse(jsonTxt);
      await api.roadmaps.importar(payload);
      setJsonTxt("");
      setModal(null);
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "JSON inválido");
    } finally {
      setBusy(false);
    }
  }

  function toggle(list: string[], item: string, set: (v: string[]) => void) {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function gerarIa() {
    setBusy(true);
    try {
      const { roadmap } = await api.roadmaps.gerar({
        tema,
        objetivos,
        experiencia,
        estilo,
        profundidade,
        tempo,
        tiposAtividade: tiposAtv,
        restricoes,
      });
      await api.roadmaps.importar(roadmap);
      setModal(null);
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Falha ao gerar");
    } finally {
      setBusy(false);
    }
  }

  if (!pronto) {
    return <div className="p-8 text-sm text-mute">Carregando Road Learn…</div>;
  }

  return (
    <CatalogoContext.Provider value={value}>
      {erro && (
        <div className="bg-rose-500/20 px-4 py-2 text-center text-sm text-rose-200">{erro}</div>
      )}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={pagina(<FichaPage />)} />
          <Route path="/roadmaps/:id" element={pagina(<RoadmapPage />)} />
          <Route path="/aparencia" element={pagina(<AparenciaPage />)} />
          <Route path="/projetos-integrados/:id" element={pagina(<ProjetoIntegradoPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {modal === "novo" && (
        <Modal titulo="Novo roadmap" onClose={() => setModal(null)}>
          <form onSubmit={(e) => void criarNovo(e)} className="space-y-3">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              className="w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none"
            />
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição"
              className="w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="text-sm text-mute">
                Cancelar
              </button>
              <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink">
                Criar
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "import" && (
        <Modal titulo="Importar / gerar" onClose={() => setModal(null)} wide>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setAbaImport("json")}
              className={`rounded-full px-3 py-1 text-xs ${abaImport === "json" ? "bg-accent text-ink" : "bg-panel text-mute"}`}
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => setAbaImport("ia")}
              className={`rounded-full px-3 py-1 text-xs ${abaImport === "ia" ? "bg-accent text-ink" : "bg-panel text-mute"}`}
            >
              Gerar com IA
            </button>
          </div>
          {abaImport === "json" ? (
            <div className="space-y-3">
              <textarea
                value={jsonTxt}
                onChange={(e) => setJsonTxt(e.target.value)}
                placeholder="Cole o JSON do roadmap"
                className="w-full rounded-xl border border-line bg-ink px-3 py-2 font-mono text-xs outline-none"
                rows={12}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModal(null)} className="text-sm text-mute">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void importarJson()}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink"
                >
                  Importar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Tema (ex.: HTML do zero)"
                className="w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none"
              />
              <div className="flex flex-wrap gap-1">
                {OBJETIVOS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggle(objetivos, o, setObjetivos)}
                    className={`rounded-full px-2 py-1 text-xs ${objetivos.includes(o) ? "bg-accent text-ink" : "bg-panel text-mute"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={experiencia}
                  onChange={(e) => setExperiencia(e.target.value)}
                  className="rounded-xl border border-line bg-ink px-3 py-2"
                >
                  {EXPERIENCIAS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <select
                  value={estilo}
                  onChange={(e) => setEstilo(e.target.value)}
                  className="rounded-xl border border-line bg-ink px-3 py-2"
                >
                  {ESTILOS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <select
                  value={profundidade}
                  onChange={(e) => setProfundidade(e.target.value)}
                  className="rounded-xl border border-line bg-ink px-3 py-2"
                >
                  {PROFUNDIDADES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <select
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  className="rounded-xl border border-line bg-ink px-3 py-2"
                >
                  {TEMPOS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-1">
                {TIPOS_ATV.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggle(tiposAtv, o, setTiposAtv)}
                    className={`rounded-full px-2 py-1 text-xs ${tiposAtv.includes(o) ? "bg-accent text-ink" : "bg-panel text-mute"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <textarea
                value={restricoes}
                onChange={(e) => setRestricoes(e.target.value)}
                placeholder="Restrições / observações"
                className="w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModal(null)} className="text-sm text-mute">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy || !tema.trim()}
                  onClick={() => void gerarIa()}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
                >
                  {busy ? "Gerando…" : "Gerar"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </CatalogoContext.Provider>
  );
}
