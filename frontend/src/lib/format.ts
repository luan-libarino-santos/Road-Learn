export function hubHref(url: string): string {
  if (!url || typeof window === "undefined") return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (["127.0.0.1", "localhost", "0.0.0.0"].includes(parsed.hostname)) {
      parsed.hostname = window.location.hostname;
      parsed.protocol = window.location.protocol;
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function formatHoras(horas: number): string {
  const n = Number(horas);
  if (!Number.isFinite(n) || n === 0) return "0 min";
  const sinal = n < 0 ? "-" : "";
  const totalMin = Math.round(Math.abs(n) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${sinal}${m} min`;
  if (m === 0) return `${sinal}${h} ${h === 1 ? "Hora" : "Horas"}`;
  return `${sinal}${h}:${String(m).padStart(2, "0")} Horas`;
}

export function formatDuracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(rest).padStart(2, "0")}s`;
  return `${rest}s`;
}

export const TIPOS: Record<string, string> = {
  pratica: "Prática",
  pesquisa: "Pesquisa",
  projeto: "Projeto",
  analise: "Análise",
};

export const DIFICULDADES: Record<string, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export const PRIORIDADES: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};
