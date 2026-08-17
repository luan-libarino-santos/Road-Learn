export type HubLinks = {
  dinheiro: string;
  treinos: string;
  tasks: string;
};

export type Competencia = {
  id: string;
  nome: string;
  descricao: string;
  ordem?: number;
  dominio?: number;
  totalTarefas?: number;
  tarefasConcluidas?: number;
  coberta?: boolean;
};

export type LinkItem = {
  id: string;
  titulo: string;
  url: string;
  tipo: string;
};

export type Subtarefa = {
  id: string;
  titulo: string;
  concluida: boolean;
};

export type Historico = {
  id: string;
  em: string;
  tipo: string;
  detalhe: string;
};

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string;
  prazo: string;
  horasEstimadas: number;
  horasReais: number;
  concluida: boolean;
  concluidaEm: string | null;
  tipo: string;
  ordem: number;
  observacoes: string;
  criterioConclusao: string;
  dificuldade: string;
  prioridade: string;
  tags: string[];
  atributos: string[];
  dependsOn: string[];
  competenciasIds: string[];
  reviewAfterDays: number;
  timerAtivoDesde: string | null;
  links: LinkItem[];
  subtarefas: Subtarefa[];
  historico: Historico[];
  criadaEm: string;
};

export type Roadmap = {
  id: string;
  nome: string;
  descricao: string;
  criadoEm: string;
  competencias: Competencia[];
  tarefas: Tarefa[];
  dominio?: { dominio: number; total: number; cobertas: number };
  competenciasDominio?: Competencia[];
};

export type Grupo = { id: string; nome: string; ordem: number };
export type Atribuicao = { grupoId: string | null; ordem: number; ordemTodos: number };
export type Sidebar = {
  grupos: Grupo[];
  atribuicoes: Record<string, Atribuicao>;
};

export type Habilidade = {
  id: string;
  tipo: string;
  nome: string;
  nivel: number;
  tier?: string;
};

export type Perfil = {
  xp: number;
  identidade: { nomeExibicao: string; icone: string; cor: string };
  habilidades: Habilidade[];
  habilidadesBase: Habilidade[];
  habilidadesEspeciais: Habilidade[];
  logXp: { id: string; em: string; delta: number; origem: string; rotulo: string }[];
  nivel: {
    nivel: number;
    xp: number;
    xpNoNivel: number;
    xpParaProximo: number;
    progresso: number;
  };
  badge: { indice: number; forma: string | null; rotulo: string | null };
};

export type HeatCell = {
  data: string;
  concluidas: number;
  horas: number;
  eventos: number;
  nivel: number;
};

export type Analytics = {
  totalRoadmaps: number;
  totalTarefas: number;
  totalConcluidas: number;
  porTipo: Record<string, number>;
  horasEstimadas: number;
  horasReais: number;
  atributos: { nome: string; horas: number; tarefas: number }[];
  streak: number;
  heatmap: HeatCell[];
  comparacaoSemanal: {
    atual: { horas: number; concluidas: number };
    anterior: { horas: number; concluidas: number };
    deltaHoras: number;
    deltaConcluidas: number;
  };
  horasHoje: number;
  horasSemanaAtual: number;
  horasMesAtual: number;
};

export type ChecklistItem = { id: string; titulo: string; concluido: boolean };
export type Etapa = {
  id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  concluida: boolean;
  tarefas: ChecklistItem[];
};

export type Projeto = {
  id: string;
  nome: string;
  objetivo: string;
  descricao: string;
  roadmapId?: string;
  roadmapIds?: string[];
  stackObrigatoria: string[];
  requisitosTecnicos: ChecklistItem[];
  requisitosFuncionais: ChecklistItem[];
  checklistImplementacao: ChecklistItem[];
  criteriosConclusao: string[];
  etapas: Etapa[];
  documentacaoInicial: {
    readme: string;
    estruturaPastas: string[];
    gitignore: string;
    arquivosBase: string[];
  };
  boasPraticas: ChecklistItem[];
  topicoOrigem: { titulo: string; resumo: string };
  concluido: boolean;
};

export type Topico = {
  id: string;
  titulo: string;
  resumo: string;
  categoria: string;
  stackSugerida: string[];
  competenciasAlvoIds: string[];
};

export type TimerAberto = {
  tarefaId: string;
  roadmapId: string;
  titulo: string;
  timerAtivoDesde: string;
} | null;
