import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { api } from "../lib/api";
import { useCatalogo } from "../lib/catalogo";
import { formatHoras } from "../lib/format";
import type { Analytics } from "../lib/types";

const HEAT = ["#1a1a1e", "#1e3a4a", "#2a5a72", "#4a8aaa", "#8ec5e8"];

export default function FichaPage() {
  const { perfil, reload } = useCatalogo();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    void api.analytics().then(setAnalytics).catch(() => undefined);
  }, [perfil]);

  const radar = (perfil?.habilidadesBase ?? []).slice(0, 8).map((h) => ({
    nome: h.nome,
    nivel: h.nivel,
  }));

  return (
    <div>
      <p className="text-xs tracking-wide text-mute uppercase">Progresso</p>
      <h1 className="page-title">Ficha de estudo</h1>
      {perfil && (
        <div className="mt-5 rounded-2xl border border-line bg-panel/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl">Nível {perfil.nivel.nivel}</p>
              <p className="text-sm text-mute">
                {perfil.nivel.xpNoNivel} / {perfil.nivel.xpParaProximo} XP → N{perfil.nivel.nivel + 1}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void api.profile.rebuild().then(() => reload())}
              className="shrink-0 rounded-xl border border-line px-2 py-2 text-xs text-mute sm:px-3"
            >
              Recalcular
            </button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink">
            <div
              className="h-full bg-accent"
              style={{ width: `${perfil.nivel.progresso}%` }}
            />
          </div>
        </div>
      )}
      {analytics && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Roadmaps", analytics.totalRoadmaps],
            ["Tarefas", `${analytics.totalConcluidas}/${analytics.totalTarefas}`],
            ["Horas reais", formatHoras(analytics.horasReais)],
            ["Sequência", `${analytics.streak}d`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-line bg-panel/40 p-3">
              <p className="text-[11px] text-mute uppercase">{k}</p>
              <p className="mt-1 text-lg">{v}</p>
            </div>
          ))}
        </div>
      )}
      {radar.length > 0 && (
        <div className="mt-5 rounded-2xl border border-line bg-panel/40 p-3">
          <p className="mb-2 text-xs tracking-wide text-mute uppercase">Radar de atributos</p>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer>
              <RadarChart data={radar}>
                <PolarGrid stroke="#2a2e36" />
                <PolarAngleAxis dataKey="nome" tick={{ fill: "#9aa3b5", fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar dataKey="nivel" stroke="#8ec5e8" fill="#8ec5e8" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {analytics && (
        <div className="mt-5 rounded-2xl border border-line bg-panel/40 p-3">
          <p className="mb-2 text-xs tracking-wide text-mute uppercase">Heatmap</p>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
            {analytics.heatmap.map((d) => (
              <div
                key={d.data}
                title={`${d.data}: ${d.concluidas} tarefas`}
                className="h-2.5 w-2.5 rounded-[2px] sm:h-3 sm:w-3"
                style={{ background: HEAT[d.nivel] ?? HEAT[0] }}
              />
            ))}
            </div>
          </div>
          {analytics.comparacaoSemanal && (
            <p className="mt-3 text-sm text-mute">
              Esta semana {formatHoras(analytics.comparacaoSemanal.atual.horas)} (
              {analytics.comparacaoSemanal.deltaHoras >= 0 ? "+" : ""}
              {formatHoras(analytics.comparacaoSemanal.deltaHoras)} vs. anterior)
            </p>
          )}
        </div>
      )}
      {perfil && perfil.logXp.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs tracking-wide text-mute uppercase">XP recente</p>
          <ul className="space-y-1">
            {perfil.logXp.slice(0, 8).map((l) => (
              <li key={l.id} className="flex justify-between rounded-xl bg-panel/40 px-3 py-2 text-sm">
                <span className="truncate text-sand/80">{l.rotulo}</span>
                <span className={l.delta >= 0 ? "text-accent" : "text-rose-300"}>
                  {l.delta >= 0 ? "+" : ""}
                  {l.delta}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
