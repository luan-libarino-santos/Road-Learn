import type {
  Analytics,
  HubLinks,
  LinkItem,
  Perfil,
  Projeto,
  Roadmap,
  Sidebar,
  TimerAberto,
  Topico,
} from "./types";

function csrfCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const csrf = csrfCookie();
  if (csrf && !headers.has("X-CSRFToken")) {
    headers.set("X-CSRFToken", csrf);
  }
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const erro =
      (data as { erro?: string; detail?: string }).erro ??
      (data as { detail?: string }).detail ??
      "Falha na requisição.";
    throw new Error(typeof erro === "string" ? erro : JSON.stringify(data));
  }
  return data as T;
}

export type Saude = { ok: boolean; app: string; armazenamento: string; hub: HubLinks };
export type ConfigKeys = { geminiApiKey: string; youtubeApiKey: string; braveApiKey: string };
export type ConfigSaveResult = { ok: boolean; atualizados: string[] };
export type FonteSugerida = Pick<LinkItem, "titulo" | "url" | "tipo">;

export const api = {
  saude: () => request<Saude>("/api/v1/saude"),
  csrf: () => request<{ csrfToken: string }>("/api/v1/csrf"),
  analytics: () => request<Analytics>("/api/v1/analytics"),
  timer: () => request<{ aberta: TimerAberto }>("/api/v1/timer"),
  roadmaps: {
    list: () => request<Roadmap[]>("/api/v1/roadmaps"),
    get: (id: string) => request<Roadmap>(`/api/v1/roadmaps/${id}`),
    create: (dados: { nome: string; descricao?: string }) =>
      request<Roadmap>("/api/v1/roadmaps", { method: "POST", body: JSON.stringify(dados) }),
    update: (id: string, dados: Record<string, unknown>) =>
      request<Roadmap>(`/api/v1/roadmaps/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
    remove: (id: string) =>
      request<void>(`/api/v1/roadmaps/${id}`, { method: "DELETE" }),
    importar: (payload: unknown) =>
      request<{ quantidade: number; avisos: string[]; roadmaps: Roadmap[] }>(
        "/api/v1/roadmaps/import",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    gerarPreview: (dados: Record<string, unknown>) =>
      request<{ prompt: string }>("/api/v1/roadmaps/gerar/preview", {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    gerar: (dados: Record<string, unknown>) =>
      request<{ roadmap: unknown; modeloUsado: string }>("/api/v1/roadmaps/gerar", {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    addCompetencia: (id: string, dados: { nome: string; descricao?: string }) =>
      request(`/api/v1/roadmaps/${id}/competencias`, {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    updateCompetencia: (id: string, cid: string, dados: Record<string, unknown>) =>
      request(`/api/v1/roadmaps/${id}/competencias/${cid}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      }),
    removeCompetencia: (id: string, cid: string) =>
      request<void>(`/api/v1/roadmaps/${id}/competencias/${cid}`, { method: "DELETE" }),
    addTarefa: (id: string, dados: Record<string, unknown>) =>
      request(`/api/v1/roadmaps/${id}/tarefas`, {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    updateTarefa: (id: string, tid: string, dados: Record<string, unknown>) =>
      request(`/api/v1/roadmaps/${id}/tarefas/${tid}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      }),
    removeTarefa: (id: string, tid: string) =>
      request<void>(`/api/v1/roadmaps/${id}/tarefas/${tid}`, { method: "DELETE" }),
    tempo: (id: string, tid: string, horas: number) =>
      request(`/api/v1/roadmaps/${id}/tarefas/${tid}/tempo`, {
        method: "POST",
        body: JSON.stringify({ horas }),
      }),
    timerIniciar: (id: string, tid: string) =>
      request(`/api/v1/roadmaps/${id}/tarefas/${tid}/timer/iniciar`, { method: "POST" }),
    timerParar: (id: string, tid: string) =>
      request(`/api/v1/roadmaps/${id}/tarefas/${tid}/timer/parar`, { method: "POST" }),
    mover: (id: string, tid: string, direcao: number) =>
      request(`/api/v1/roadmaps/${id}/tarefas/${tid}/mover`, {
        method: "PUT",
        body: JSON.stringify({ direcao }),
      }),
    addSub: (id: string, tid: string, titulo: string) =>
      request(`/api/v1/roadmaps/${id}/tarefas/${tid}/subtarefas`, {
        method: "POST",
        body: JSON.stringify({ titulo }),
      }),
    updateSub: (id: string, tid: string, sid: string, dados: Record<string, unknown>) =>
      request(`/api/v1/roadmaps/${id}/tarefas/${tid}/subtarefas/${sid}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      }),
    removeSub: (id: string, tid: string, sid: string) =>
      request<void>(`/api/v1/roadmaps/${id}/tarefas/${tid}/subtarefas/${sid}`, {
        method: "DELETE",
      }),
  },
  sidebar: {
    get: () => request<Sidebar>("/api/v1/sidebar"),
    criarGrupo: (nome: string) =>
      request("/api/v1/sidebar/grupos", { method: "POST", body: JSON.stringify({ nome }) }),
    updateGrupo: (id: string, dados: Record<string, unknown>) =>
      request(`/api/v1/sidebar/grupos/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
    removeGrupo: (id: string) =>
      request<void>(`/api/v1/sidebar/grupos/${id}`, { method: "DELETE" }),
    atribuir: (roadmapId: string, dados: Record<string, unknown>) =>
      request(`/api/v1/sidebar/atribuicoes/${roadmapId}`, {
        method: "PUT",
        body: JSON.stringify(dados),
      }),
  },
  profile: {
    get: () => request<Perfil>("/api/v1/profile"),
    rebuild: () => request<Perfil>("/api/v1/profile/rebuild", { method: "POST" }),
    identidade: (dados: Record<string, unknown>) =>
      request<Perfil>("/api/v1/profile/identidade", {
        method: "PATCH",
        body: JSON.stringify(dados),
      }),
  },
  pf: {
    get: (roadmapId: string) =>
      request<Projeto | null>(`/api/v1/projetos-finais?roadmapId=${encodeURIComponent(roadmapId)}`),
    sugerir: (roadmapId: string) =>
      request<{ topicos: Topico[]; modeloUsado: string }>("/api/v1/projetos-finais/sugerir-topicos", {
        method: "POST",
        body: JSON.stringify({ roadmapId }),
      }),
    gerar: (roadmapId: string, topico: Topico) =>
      request<{ projeto: Projeto; modeloUsado: string }>("/api/v1/projetos-finais/gerar", {
        method: "POST",
        body: JSON.stringify({ roadmapId, topico }),
      }),
    save: (dados: Record<string, unknown>) =>
      request<Projeto>("/api/v1/projetos-finais", {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    toggle: (id: string, dados: Record<string, unknown>) =>
      request<Projeto>(`/api/v1/projetos-finais/${id}/itens`, {
        method: "PUT",
        body: JSON.stringify(dados),
      }),
  },
  pi: {
    list: () => request<Projeto[]>("/api/v1/projetos-integrados"),
    get: (id: string) => request<Projeto>(`/api/v1/projetos-integrados/${id}`),
    sugerir: (roadmapIds: string[]) =>
      request<{ topicos: Topico[]; modeloUsado: string }>(
        "/api/v1/projetos-integrados/sugerir-topicos",
        { method: "POST", body: JSON.stringify({ roadmapIds }) },
      ),
    gerar: (roadmapIds: string[], topico: Topico) =>
      request<{ projeto: Projeto; modeloUsado: string }>("/api/v1/projetos-integrados/gerar", {
        method: "POST",
        body: JSON.stringify({ roadmapIds, topico }),
      }),
    save: (dados: Record<string, unknown>) =>
      request<Projeto>("/api/v1/projetos-integrados", {
        method: "POST",
        body: JSON.stringify(dados),
      }),
    toggle: (id: string, dados: Record<string, unknown>) =>
      request<Projeto>(`/api/v1/projetos-integrados/${id}/itens`, {
        method: "PUT",
        body: JSON.stringify(dados),
      }),
    remove: (id: string) =>
      request<void>(`/api/v1/projetos-integrados/${id}`, { method: "DELETE" }),
  },
  config: {
    get: () => request<ConfigKeys>("/api/v1/config"),
    save: (dados: ConfigKeys) =>
      request<ConfigSaveResult>("/api/v1/config", {
        method: "POST",
        body: JSON.stringify(dados),
      }),
  },
  buscarFontes: (query: string) =>
    request<{ fontes: FonteSugerida[] }>("/api/v1/buscar-fontes", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
};
