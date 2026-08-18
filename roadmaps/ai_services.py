import re
from datetime import datetime, timedelta

from projetos.services import (
    PROGRESSO_MINIMO,
    calcular_progresso_tarefas,
    obter_projeto_final_por_roadmap,
)
from roadmaps.analytics import calcular_analytics_globais
from roadmaps.normalize import (
    calcular_dominio_competencias,
    calcular_dominio_geral,
    tarefa_esta_bloqueada,
)
from roadmaps.persist import listar_roadmaps, obter_roadmap
from roadmaps import sidebar as sidebar_svc
from roadmaps.services import timer_aberto

AI_INTENCOES = [
    {
        "id": "proximo",
        "metodo": "GET",
        "path": "/proximo",
        "descricao": "Próxima tarefa sugerida",
    },
    {
        "id": "progresso",
        "metodo": "GET",
        "path": "/progresso",
        "descricao": "Progresso global e por roadmap",
    },
    {
        "id": "resumo-semana",
        "metodo": "GET",
        "path": "/resumo-semana",
        "descricao": "Tempo e tarefas da semana vs anterior",
    },
    {
        "id": "hoje",
        "metodo": "GET",
        "path": "/hoje",
        "descricao": "Atividade do dia",
    },
    {
        "id": "revisao",
        "metodo": "GET",
        "path": "/revisao",
        "descricao": "Tarefas com revisão espaçada vencida",
    },
    {
        "id": "roadmap-resumo",
        "metodo": "GET",
        "path": "/roadmap/{id}/resumo",
        "descricao": "Snapshot enxuto de um roadmap",
    },
    {
        "id": "elegibilidade-projeto",
        "metodo": "GET",
        "path": "/roadmap/{id}/elegibilidade-projeto",
        "descricao": "Se pode gerar Projeto Final (≥80%)",
    },
]

_PRIORIDADE_ORDEM = {"alta": 0, "media": 1, "baixa": 2}
_DIFICULDADE_ORDEM = {"facil": 0, "medio": 1, "dificil": 2}


def manifest_ai():
    return {
        "versao": "1",
        "basePath": "/api/v1/ai",
        "intencoes": AI_INTENCOES,
    }


def _dia_chave(valor):
    if isinstance(valor, datetime):
        return valor.strftime("%Y-%m-%d")
    s = str(valor or "")
    return s[:10] if len(s) >= 10 else ""


def _hoje():
    return _dia_chave(datetime.now())


def _horas_de_historico(detalhe):
    m = re.search(r"([\d.]+)h", str(detalhe or ""))
    return float(m.group(1)) if m else 0.0


def _progresso_pct(roadmap):
    tarefas = roadmap.get("tarefas") or []
    if not tarefas:
        return 0
    concluidas = sum(1 for t in tarefas if t.get("concluida"))
    return round((concluidas / len(tarefas)) * 100)


def _roadmaps_com_sidebar():
    roadmaps = listar_roadmaps()
    ids = [r["id"] for r in roadmaps]
    sidebar_svc.inicializar_atribuicoes(ids)
    atrib = sidebar_svc.obter_sidebar()["atribuicoes"]
    ordenados = sorted(
        roadmaps,
        key=lambda r: (
            atrib.get(r["id"], {}).get("ordemTodos", 9999),
            r.get("nome") or "",
        ),
    )
    return ordenados, atrib


def _contagem_tarefas(roadmap):
    tarefas = roadmap.get("tarefas") or []
    liberadas = bloqueadas = 0
    for t in tarefas:
        if t.get("concluida"):
            continue
        if tarefa_esta_bloqueada(t, tarefas)["bloqueada"]:
            bloqueadas += 1
        else:
            liberadas += 1
    return {
        "total": len(tarefas),
        "concluidas": sum(1 for t in tarefas if t.get("concluida")),
        "liberadas": liberadas,
        "bloqueadas": bloqueadas,
    }


def _candidatas_liberadas(roadmap):
    tarefas = roadmap.get("tarefas") or []
    saida = []
    for t in tarefas:
        if t.get("concluida"):
            continue
        if tarefa_esta_bloqueada(t, tarefas)["bloqueada"]:
            continue
        saida.append(t)
    return saida


def _revisao_vencida(tarefa, hoje=None):
    dias = int(tarefa.get("reviewAfterDays") or 0)
    if dias <= 0 or not tarefa.get("concluida"):
        return False
    em = tarefa.get("concluidaEm")
    if not em:
        return False
    try:
        concluida = datetime.fromisoformat(str(em).replace("Z", "+00:00"))
    except ValueError:
        return False
    if concluida.tzinfo:
        concluida = concluida.replace(tzinfo=None)
    limite = concluida + timedelta(days=dias)
    agora = datetime.now()
    return agora > limite


def _ordenar_candidatas(candidatas):
    def chave(t):
        revisao = 0 if _revisao_vencida(t) else 1
        prioridade = _PRIORIDADE_ORDEM.get(t.get("prioridade") or "media", 1)
        dificuldade = _DIFICULDADE_ORDEM.get(t.get("dificuldade") or "medio", 1)
        ordem = t.get("ordem", 0)
        return (revisao, prioridade, dificuldade, ordem)

    return sorted(candidatas, key=chave)


def _motivo_tarefa(tarefa, posicao):
    if _revisao_vencida(tarefa):
        return "revisão espaçada vencida"
    if posicao == 0:
        return "pendente, sem bloqueio, maior prioridade entre liberadas"
    return "segunda prioridade" if posicao == 1 else f"prioridade {posicao + 1}"


def _roadmap_snapshot(roadmap):
    dominio = calcular_dominio_geral(roadmap)
    return {
        "id": roadmap["id"],
        "nome": roadmap["nome"],
        "progressoPct": _progresso_pct(roadmap),
        "dominioPct": dominio.get("dominio", 0),
    }


def _competencias_destaque(roadmap, limite=3):
    comps = [
        c
        for c in calcular_dominio_competencias(roadmap)
        if c.get("coberta")
    ]
    comps.sort(key=lambda c: (c.get("dominio", 0), c.get("nome") or ""))
    return [
        {"nome": c["nome"], "dominioPct": c["dominio"]}
        for c in comps[:limite]
    ]


def ai_proximo(roadmap_id=None):
    roadmaps, _ = _roadmaps_com_sidebar()
    if roadmap_id:
        roadmap = obter_roadmap(roadmap_id)
        if not roadmap:
            return None, "ROADMAP_NAO_ENCONTRADO", f"Roadmap '{roadmap_id}' não existe."
        candidatos_rm = [roadmap]
    else:
        com_liberadas = []
        for r in roadmaps:
            if _candidatas_liberadas(r):
                com_liberadas.append(r)
        if not com_liberadas:
            return {
                "ok": True,
                "summary": "Nenhuma tarefa liberada nos roadmaps ativos.",
                "roadmap": None,
                "tarefa": None,
                "alternativas": [],
            }, None, None
        com_liberadas.sort(key=lambda r: (_progresso_pct(r), r.get("nome") or ""))
        candidatos_rm = [com_liberadas[0]]

    roadmap = candidatos_rm[0]
    candidatas = _ordenar_candidatas(_candidatas_liberadas(roadmap))
    snap = _roadmap_snapshot(roadmap)

    if not candidatas:
        nome = roadmap.get("nome") or roadmap_id or roadmap["id"]
        return {
            "ok": True,
            "summary": f"Todas as tarefas de {nome} estão bloqueadas ou concluídas.",
            "roadmap": snap,
            "tarefa": None,
            "alternativas": [],
        }, None, None

    principal = candidatas[0]
    alternativas = []
    for i, t in enumerate(candidatas[1:3], start=1):
        alternativas.append(
            {
                "id": t["id"],
                "titulo": t["titulo"],
                "roadmapId": roadmap["id"],
                "motivo": _motivo_tarefa(t, i),
            }
        )

    prioridade = principal.get("prioridade") or "media"
    summary = (
        f"Próximo: {roadmap['nome']} — {principal['titulo']} "
        f"({snap['progressoPct']}% do roadmap). "
        f"Tarefa liberada, prioridade {prioridade}."
    )

    return {
        "ok": True,
        "summary": summary,
        "roadmap": snap,
        "tarefa": {
            "id": principal["id"],
            "titulo": principal["titulo"],
            "tipo": principal.get("tipo") or "pratica",
            "prioridade": prioridade,
            "dificuldade": principal.get("dificuldade") or "medio",
            "horasEstimadas": principal.get("horasEstimadas") or 0,
            "motivo": _motivo_tarefa(principal, 0),
        },
        "alternativas": alternativas,
    }, None, None


def ai_progresso(roadmap_id=None):
    if roadmap_id:
        roadmap = obter_roadmap(roadmap_id)
        if not roadmap:
            return None, "ROADMAP_NAO_ENCONTRADO", f"Roadmap '{roadmap_id}' não existe."
        contagem = _contagem_tarefas(roadmap)
        dominio = calcular_dominio_geral(roadmap)
        progresso = _progresso_pct(roadmap)
        faltam = contagem["total"] - contagem["concluidas"]
        summary = (
            f"{roadmap['nome']}: {progresso}% das tarefas, "
            f"domínio {dominio.get('dominio', 0)}%. "
            f"Faltam {faltam} tarefas ({contagem['bloqueadas']} bloqueadas)."
        )
        comps = calcular_dominio_competencias(roadmap)
        comps_cobertas = [c for c in comps if c.get("coberta")]
        comps_cobertas.sort(key=lambda c: (c.get("dominio", 0), c.get("nome") or ""))
        return {
            "ok": True,
            "summary": summary,
            "data": {
                "id": roadmap["id"],
                "nome": roadmap["nome"],
                "progressoPct": progresso,
                "dominioPct": dominio.get("dominio", 0),
                "tarefas": contagem,
                "competencias": [
                    {
                        "id": c["id"],
                        "nome": c["nome"],
                        "dominioPct": c["dominio"],
                        "tarefasConcluidas": c["tarefasConcluidas"],
                        "tarefasTotal": c["totalTarefas"],
                    }
                    for c in comps_cobertas[:5]
                ],
            },
        }, None, None

    roadmaps, _ = _roadmaps_com_sidebar()
    total_tarefas = total_concluidas = 0
    horas_estimadas = horas_reais = 0.0
    dominios = []
    por_roadmap = []

    for r in roadmaps:
        contagem = _contagem_tarefas(r)
        total_tarefas += contagem["total"]
        total_concluidas += contagem["concluidas"]
        dominio = calcular_dominio_geral(r)
        dominios.append(dominio.get("dominio", 0))
        for t in r.get("tarefas") or []:
            horas_estimadas += float(t.get("horasEstimadas") or 0)
            horas_reais += float(t.get("horasReais") or 0)
        por_roadmap.append(
            {
                "id": r["id"],
                "nome": r["nome"],
                "progressoPct": _progresso_pct(r),
                "dominioPct": dominio.get("dominio", 0),
                "tarefasConcluidas": contagem["concluidas"],
                "tarefasTotal": contagem["total"],
                "competenciasDestaque": _competencias_destaque(r),
            }
        )

    progresso_global = round((total_concluidas / total_tarefas) * 100) if total_tarefas else 0
    dominio_medio = round(sum(dominios) / len(dominios)) if dominios else 0
    summary = (
        f"{len(roadmaps)} roadmaps ativos: {total_tarefas} tarefas, "
        f"{total_concluidas} concluídas ({progresso_global}%). "
        f"Domínio médio {dominio_medio}%."
    )

    return {
        "ok": True,
        "summary": summary,
        "data": {
            "global": {
                "roadmapsAtivos": len(roadmaps),
                "tarefasTotal": total_tarefas,
                "tarefasConcluidas": total_concluidas,
                "progressoPct": progresso_global,
                "dominioPct": dominio_medio,
                "horasEstimadas": round(horas_estimadas * 10) / 10,
                "horasReais": round(horas_reais * 100) / 100,
            },
            "porRoadmap": por_roadmap,
        },
    }, None, None


def _roadmaps_mais_ativos_semana(roadmaps, inicio, fim):
    stats = {}
    for r in roadmaps:
        rid = r["id"]
        stats[rid] = {
            "id": rid,
            "nome": r["nome"],
            "tarefasConcluidas": 0,
            "horas": 0.0,
        }
        for t in r.get("tarefas") or []:
            em = _dia_chave(t.get("concluidaEm"))
            if em and inicio <= em <= fim:
                stats[rid]["tarefasConcluidas"] += 1
            for h in t.get("historico") or []:
                if h.get("tipo") not in ("tempo", "timer_fim"):
                    continue
                dia = _dia_chave(h.get("em"))
                if dia and inicio <= dia <= fim:
                    stats[rid]["horas"] += _horas_de_historico(h.get("detalhe"))

    ativos = [v for v in stats.values() if v["tarefasConcluidas"] > 0 or v["horas"] > 0]
    ativos.sort(key=lambda x: (-x["tarefasConcluidas"], -x["horas"]))
    for item in ativos:
        item["horas"] = round(item["horas"] * 10) / 10
    return ativos[:5]


def ai_resumo_semana():
    roadmaps = listar_roadmaps()
    analytics = calcular_analytics_globais(roadmaps)
    comp = analytics["comparacaoSemanal"]
    dias = analytics["diasDaSemana"]
    inicio = dias[0]["data"] if dias else ""
    fim = dias[-1]["data"] if dias else ""

    atual = comp["atual"]
    anterior = comp["anterior"]
    delta_h = comp["deltaHoras"]
    delta_c = comp["deltaConcluidas"]

    sinal_h = f"+{delta_h}" if delta_h >= 0 else str(delta_h)
    summary = (
        f"Esta semana: {atual['horas']} h e {atual['concluidas']} tarefas concluídas "
        f"({sinal_h} h vs semana passada)."
    )

    return {
        "ok": True,
        "summary": summary,
        "data": {
            "periodo": {"inicio": inicio, "fim": fim},
            "atual": {
                "horas": atual["horas"],
                "tarefasConcluidas": atual["concluidas"],
            },
            "anterior": {
                "horas": anterior["horas"],
                "tarefasConcluidas": anterior["concluidas"],
            },
            "delta": {"horas": delta_h, "tarefasConcluidas": delta_c},
            "porDia": [
                {
                    "data": d["data"],
                    "rotulo": d["rotulo"],
                    "horas": d["horas"],
                    "concluidas": d["concluidas"],
                }
                for d in dias
            ],
            "roadmapsMaisAtivos": _roadmaps_mais_ativos_semana(roadmaps, inicio, fim),
        },
    }, None, None


def ai_hoje():
    hoje = _hoje()
    roadmaps = listar_roadmaps()
    analytics = calcular_analytics_globais(roadmaps)
    horas = analytics.get("horasHoje") or 0
    concluidas = []

    for r in roadmaps:
        for t in r.get("tarefas") or []:
            if _dia_chave(t.get("concluidaEm")) == hoje:
                concluidas.append(
                    {
                        "roadmapId": r["id"],
                        "tarefaId": t["id"],
                        "titulo": t["titulo"],
                        "em": t.get("concluidaEm"),
                    }
                )

    timer = timer_aberto()
    timer_ativo = None
    if timer:
        timer_ativo = {
            "roadmapId": timer["roadmapId"],
            "tarefaId": timer["tarefaId"],
            "titulo": timer["titulo"],
            "desde": timer["timerAtivoDesde"],
        }

    partes = [f"Hoje: {horas} h registradas, {len(concluidas)} tarefas concluídas."]
    if timer_ativo:
        partes.append(f"Timer ativo em '{timer_ativo['titulo']}' ({timer_ativo['roadmapId']}).")

    return {
        "ok": True,
        "summary": " ".join(partes),
        "data": {
            "data": hoje,
            "horas": horas,
            "tarefasConcluidas": len(concluidas),
            "timerAtivo": timer_ativo,
            "concluidas": concluidas,
        },
    }, None, None


def _info_revisao(tarefa, roadmap_id, hoje=None):
    dias_rev = int(tarefa.get("reviewAfterDays") or 0)
    if dias_rev <= 0 or not tarefa.get("concluida"):
        return None
    em = tarefa.get("concluidaEm")
    if not em:
        return None
    try:
        concluida = datetime.fromisoformat(str(em).replace("Z", "+00:00"))
    except ValueError:
        return None
    if concluida.tzinfo:
        concluida = concluida.replace(tzinfo=None)
    dias_desde = (datetime.now() - concluida).days
    atraso = dias_desde - dias_rev
    if atraso <= 0:
        return None
    return {
        "roadmapId": roadmap_id,
        "tarefaId": tarefa["id"],
        "titulo": tarefa["titulo"],
        "concluidaEm": em,
        "reviewAfterDays": dias_rev,
        "diasDesdeConclusao": dias_desde,
        "atrasoDias": atraso,
    }


def ai_revisao(limite=5):
    limite = max(1, min(int(limite or 5), 10))
    roadmaps = listar_roadmaps()
    pendentes = []
    for r in roadmaps:
        for t in r.get("tarefas") or []:
            info = _info_revisao(t, r["id"])
            if info:
                pendentes.append(info)

    pendentes.sort(key=lambda x: -x["atrasoDias"])
    lista = pendentes[:limite]

    if not lista:
        return {
            "ok": True,
            "summary": "Nenhuma tarefa pede revisão no momento.",
            "data": {"total": 0, "tarefas": []},
        }, None, None

    titulos = ", ".join(t["titulo"] for t in lista[:3])
    total = len(pendentes)
    if total > 3:
        summary = f"{total} tarefas pedem revisão, incluindo: {titulos}."
    else:
        summary = f"{total} tarefa(s) pedem revisão: {titulos}."

    return {
        "ok": True,
        "summary": summary,
        "data": {"total": total, "tarefas": lista},
    }, None, None


def ai_roadmap_resumo(roadmap_id):
    roadmap = obter_roadmap(roadmap_id)
    if not roadmap:
        return None, "ROADMAP_NAO_ENCONTRADO", f"Roadmap '{roadmap_id}' não existe."

    contagem = _contagem_tarefas(roadmap)
    dominio = calcular_dominio_geral(roadmap)
    progresso = _progresso_pct(roadmap)
    candidatas = _ordenar_candidatas(_candidatas_liberadas(roadmap))
    proxima = (
        {"id": candidatas[0]["id"], "titulo": candidatas[0]["titulo"]}
        if candidatas
        else None
    )

    revisao_pendente = 0
    for t in roadmap.get("tarefas") or []:
        if _info_revisao(t, roadmap_id):
            revisao_pendente += 1

    comps = [
        {"nome": c["nome"], "dominioPct": c["dominio"]}
        for c in calcular_dominio_competencias(roadmap)
        if c.get("coberta")
    ][:5]

    prox_txt = proxima["titulo"] if proxima else "nenhuma liberada"
    summary = (
        f"{roadmap['nome']}: {contagem['total']} tarefas, {progresso}% concluídas. "
        f"Próxima liberada: {prox_txt}."
    )

    return {
        "ok": True,
        "summary": summary,
        "data": {
            "id": roadmap["id"],
            "nome": roadmap["nome"],
            "descricao": roadmap.get("descricao") or "",
            "progressoPct": progresso,
            "dominioPct": dominio.get("dominio", 0),
            "competencias": comps,
            "proximaLiberada": proxima,
            "bloqueadas": contagem["bloqueadas"],
            "revisaoPendente": revisao_pendente,
        },
    }, None, None


def ai_elegibilidade_projeto(roadmap_id):
    roadmap = obter_roadmap(roadmap_id)
    if not roadmap:
        return None, "ROADMAP_NAO_ENCONTRADO", f"Roadmap '{roadmap_id}' não existe."

    info = calcular_progresso_tarefas(roadmap)
    progresso = info["progresso"]
    elegivel = progresso >= PROGRESSO_MINIMO
    projeto_existe = obter_projeto_final_por_roadmap(roadmap_id) is not None

    if elegivel:
        summary = f"{roadmap['nome']} atinge {progresso}% — elegível para Projeto Final."
    else:
        summary = (
            f"{roadmap['nome']} está em {progresso}% — "
            f"faltam {PROGRESSO_MINIMO - progresso} p.p. para o Projeto Final."
        )

    return {
        "ok": True,
        "summary": summary,
        "data": {
            "roadmapId": roadmap_id,
            "progressoPct": progresso,
            "minimoPct": PROGRESSO_MINIMO,
            "elegivel": elegivel,
            "projetoFinalExiste": projeto_existe,
        },
    }, None, None
