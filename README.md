# Sistema de Roadmaps

Gestão de roadmaps com **Node.js**, **Express** e armazenamento **NoSQL em JSON** (`data/roadmaps.json`).

## Pré-requisitos

- [Node.js](https://nodejs.org/) instalado (v18 ou superior)

## Instalação

```powershell
cd "d:\luanl\Documents\Sistema Aprendizado"
npm install
```

## Executar

```powershell
npm start
```

Ou com recarregamento automático ao editar o servidor:

```powershell
npm run dev
```

## Acessar

| Dispositivo | URL |
|-------------|-----|
| PC | http://localhost:3000 |
| Celular (mesma rede Wi-Fi) | http://SEU-IP:3000 |

O IP do celular aparece no terminal ao iniciar o servidor.

## Estrutura

```
├── data/
│   └── roadmaps.json       ← banco de dados JSON
├── docs/
│   ├── GERAR_ROADMAP.md    ← como gerar/importar roadmaps via JSON
│   └── templates/          ← templates de exemplo
├── server/
│   ├── index.js            ← servidor Express
│   ├── db.js               ← leitura/escrita do JSON
│   ├── roadmaps-service.js
│   └── routes/
└── web/                    ← interface (frontend)
```

## Capabilidades

Veja o que o sistema faz de ponta a ponta em [`docs/CAPACIDADES.md`](docs/CAPACIDADES.md) — inclui dependências, critérios de conclusão, tags, timer, histórico e painel global (streak/heatmap).

## Importar roadmaps via JSON

Dá para criar roadmaps completos (tarefas, links, subtarefas, dependências, tags…) de uma vez:

1. Use o template em `docs/templates/roadmap.template.json`
2. Siga o guia em [`docs/GERAR_ROADMAP.md`](docs/GERAR_ROADMAP.md) (prompt para IA atualizado)
3. Na interface, clique em **⤓ JSON** na sidebar (ou `POST /api/roadmaps/import`)

**Importante:** reinicie o servidor (`iniciar.bat` ou `npm start`) depois de atualizar o código para carregar as novas rotas.