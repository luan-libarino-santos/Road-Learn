PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roadmaps (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS competencias (
  id TEXT PRIMARY KEY,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_competencias_roadmap ON competencias(roadmap_id);

CREATE TABLE IF NOT EXISTS tarefas (
  id TEXT PRIMARY KEY,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  prazo TEXT NOT NULL DEFAULT '',
  horas_estimadas REAL NOT NULL DEFAULT 0,
  horas_reais REAL NOT NULL DEFAULT 0,
  concluida INTEGER NOT NULL DEFAULT 0,
  concluida_em TEXT,
  tipo TEXT NOT NULL DEFAULT 'pratica',
  ordem INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT NOT NULL DEFAULT '',
  criterio_conclusao TEXT NOT NULL DEFAULT '',
  dificuldade TEXT NOT NULL DEFAULT 'medio',
  prioridade TEXT NOT NULL DEFAULT 'media',
  review_after_days REAL NOT NULL DEFAULT 0,
  timer_ativo_desde TEXT,
  criada_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tarefas_roadmap ON tarefas(roadmap_id);

CREATE TABLE IF NOT EXISTS tarefa_deps (
  tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL,
  PRIMARY KEY (tarefa_id, depends_on_id)
);

CREATE TABLE IF NOT EXISTS tarefa_competencias (
  tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  competencia_id TEXT NOT NULL,
  PRIMARY KEY (tarefa_id, competencia_id)
);

CREATE TABLE IF NOT EXISTS tarefa_tags (
  tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (tarefa_id, tag)
);

CREATE TABLE IF NOT EXISTS tarefa_atributos (
  tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  atributo TEXT NOT NULL,
  PRIMARY KEY (tarefa_id, atributo)
);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'outro',
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_links_tarefa ON links(tarefa_id);

CREATE TABLE IF NOT EXISTS subtarefas (
  id TEXT PRIMARY KEY,
  tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  concluida INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_subtarefas_tarefa ON subtarefas(tarefa_id);

CREATE TABLE IF NOT EXISTS historico_tarefas (
  id TEXT PRIMARY KEY,
  tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  em TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'editada',
  detalhe TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_historico_tarefa ON historico_tarefas(tarefa_id);

CREATE TABLE IF NOT EXISTS sidebar_grupos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sidebar_atribuicoes (
  roadmap_id TEXT PRIMARY KEY,
  grupo_id TEXT REFERENCES sidebar_grupos(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ordem_todos INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS perfil (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  xp REAL NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL,
  identidade_json TEXT NOT NULL,
  tema_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS perfil_habilidades (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  nivel REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS perfil_log_xp (
  id TEXT PRIMARY KEY,
  em TEXT NOT NULL,
  delta REAL NOT NULL,
  origem TEXT NOT NULL DEFAULT '',
  rotulo TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS perfil_historico_habilidades (
  em TEXT PRIMARY KEY,
  itens_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS perfil_roadmaps_bonus (
  roadmap_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS projetos_finais (
  id TEXT PRIMARY KEY,
  roadmap_id TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  objetivo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  stack_json TEXT NOT NULL DEFAULT '[]',
  criterios_json TEXT NOT NULL DEFAULT '[]',
  competencias_alvo_json TEXT NOT NULL DEFAULT '[]',
  documentacao_json TEXT NOT NULL DEFAULT '{}',
  topico_json TEXT NOT NULL DEFAULT '{}',
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  concluido_em TEXT
);

CREATE TABLE IF NOT EXISTS projetos_integrados (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  objetivo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  stack_json TEXT NOT NULL DEFAULT '[]',
  criterios_json TEXT NOT NULL DEFAULT '[]',
  competencias_alvo_json TEXT NOT NULL DEFAULT '[]',
  documentacao_json TEXT NOT NULL DEFAULT '{}',
  topico_json TEXT NOT NULL DEFAULT '{}',
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  concluido_em TEXT
);

CREATE TABLE IF NOT EXISTS projeto_integrado_roadmaps (
  projeto_id TEXT NOT NULL REFERENCES projetos_integrados(id) ON DELETE CASCADE,
  roadmap_id TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (projeto_id, roadmap_id)
);

CREATE TABLE IF NOT EXISTS projeto_etapas (
  id TEXT NOT NULL,
  projeto_tipo TEXT NOT NULL CHECK (projeto_tipo IN ('final', 'integrado')),
  projeto_id TEXT NOT NULL,
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  concluida INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (projeto_tipo, projeto_id, id)
);

CREATE INDEX IF NOT EXISTS idx_projeto_etapas ON projeto_etapas(projeto_tipo, projeto_id);

CREATE TABLE IF NOT EXISTS projeto_itens (
  id TEXT NOT NULL,
  projeto_tipo TEXT NOT NULL CHECK (projeto_tipo IN ('final', 'integrado')),
  projeto_id TEXT NOT NULL,
  colecao TEXT NOT NULL,
  titulo TEXT NOT NULL DEFAULT '',
  concluido INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  etapa_id TEXT,
  PRIMARY KEY (projeto_tipo, projeto_id, id)
);

CREATE INDEX IF NOT EXISTS idx_projeto_itens ON projeto_itens(projeto_tipo, projeto_id);
