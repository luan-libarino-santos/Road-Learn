from datetime import datetime, timezone

from core.ids import gerar_id

TIPOS_TAREFA = ("pratica", "pesquisa", "projeto", "analise")
TIPOS_LINK = ("video", "artigo", "doc", "repo", "outro")
DIFICULDADES = ("facil", "medio", "dificil")
PRIORIDADES = ("baixa", "media", "alta")


def agora_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def como_array(valor):
    if isinstance(valor, list):
        return valor
    if valor is None or valor == "":
        return []
    return [valor]


def pegar(obj, *chaves, default=None):
    if not isinstance(obj, dict):
        return default
    for chave in chaves:
        if chave in obj and obj[chave] is not None:
            return obj[chave]
    return default


def normalizar_tags(tags):
    vistos = []
    for t in como_array(tags):
        s = str(t).strip().lower()
        if s and s not in vistos:
            vistos.append(s)
    return vistos


def normalizar_atributos(valor):
    vistos = {}
    for item in como_array(valor):
        bruto = str(item).strip()
        if not bruto:
            continue
        chave = bruto.lower()
        if chave not in vistos:
            vistos[chave] = bruto
    return list(vistos.values())


def normalizar_depends_on(deps):
    vistos = []
    for d in como_array(deps):
        s = str(d).strip()
        if s and s not in vistos:
            vistos.append(s)
    return vistos


def normalizar_competencia(c, index=0):
    if isinstance(c, str):
        nome = c.strip()
        return {"id": gerar_id(), "nome": nome, "descricao": "", "ordem": index}
    nome = str(c.get("nome") or c.get("name") or "").strip() if isinstance(c, dict) else ""
    ordem = c.get("ordem") if isinstance(c, dict) else index
    return {
        "id": (c.get("id") if isinstance(c, dict) else None) or gerar_id(),
        "nome": nome,
        "descricao": str(
            (c.get("descricao") if isinstance(c, dict) else None)
            or (c.get("description") if isinstance(c, dict) else None)
            or ""
        ).strip(),
        "ordem": ordem if isinstance(ordem, (int, float)) else index,
    }


def normalizar_competencias(lista):
    comps = [
        normalizar_competencia(c, i)
        for i, c in enumerate(lista if isinstance(lista, list) else [])
    ]
    comps = [c for c in comps if c["nome"]]
    for i, c in enumerate(comps):
        c["ordem"] = i
    return comps


def normalizar_competencias_ids(valor, competencias_do_roadmap=None):
    refs = [str(v).strip() for v in como_array(valor) if str(v).strip()]
    if not refs:
        return []
    comps = competencias_do_roadmap or []
    por_id = {c["id"]: c for c in comps}
    por_nome = {c["nome"].strip().lower(): c for c in comps}
    ids = []
    for ref in refs:
        if ref in por_id:
            ids.append(ref)
            continue
        hit = por_nome.get(ref.lower())
        if hit:
            ids.append(hit["id"])
            continue
        ids.append(ref)
    vistos = []
    for i in ids:
        if i not in vistos:
            vistos.append(i)
    return vistos


def normalizar_historico(historico):
    saida = []
    if not isinstance(historico, list):
        return saida
    for h in historico:
        if not isinstance(h, dict):
            continue
        saida.append(
            {
                "id": h.get("id") or gerar_id(),
                "em": h.get("em") or agora_iso(),
                "tipo": h.get("tipo") or "editada",
                "detalhe": h.get("detalhe") or "",
            }
        )
    return saida


def adicionar_historico(tarefa, tipo, detalhe=""):
    hist = normalizar_historico(tarefa.get("historico"))
    hist.append({"id": gerar_id(), "em": agora_iso(), "tipo": tipo, "detalhe": detalhe})
    tarefa["historico"] = hist
    return tarefa


def normalizar_link(l):
    if not isinstance(l, dict):
        l = {}
    tipo_bruto = l.get("tipo") or l.get("type") or "outro"
    tipo = tipo_bruto if tipo_bruto in TIPOS_LINK else "outro"
    return {
        "id": l.get("id") or gerar_id(),
        "titulo": l.get("titulo") or l.get("title") or "",
        "url": l.get("url") or "",
        "tipo": tipo,
    }


def normalizar_tarefa(tarefa, index=0, competencias_do_roadmap=None):
    tarefa = tarefa if isinstance(tarefa, dict) else {}
    tipo_bruto = tarefa.get("tipo") or "pratica"
    tipo = tipo_bruto if tipo_bruto in TIPOS_TAREFA else "pratica"
    dificuldade_bruta = pegar(tarefa, "dificuldade", "difficulty", default="medio")
    dificuldade = dificuldade_bruta if dificuldade_bruta in DIFICULDADES else "medio"
    prioridade_bruta = pegar(tarefa, "prioridade", "priority", default="media")
    prioridade = prioridade_bruta if prioridade_bruta in PRIORIDADES else "media"
    review_raw = pegar(tarefa, "reviewAfterDays", "review_after_days")
    try:
        review = float(review_raw) if review_raw is not None else 0
    except (TypeError, ValueError):
        review = 0
    review_ok = review if review > 0 else 0
    try:
        horas_reais = float(pegar(tarefa, "horasReais", "horas_reais", default=0) or 0)
    except (TypeError, ValueError):
        horas_reais = 0
    concluida = bool(tarefa.get("concluida"))
    comps_refs = pegar(
        tarefa, "competenciasIds", "competencias", "skills", "skillIds"
    )
    ordem = tarefa.get("ordem")
    try:
        horas_est = float(tarefa.get("horasEstimadas") or 0)
    except (TypeError, ValueError):
        horas_est = 0
    return {
        "id": tarefa.get("id") or gerar_id(),
        "titulo": tarefa.get("titulo") or "",
        "descricao": str(
            pegar(tarefa, "descricao", "description", default="") or ""
        ).strip(),
        "prazo": tarefa.get("prazo") or "",
        "horasEstimadas": horas_est,
        "horasReais": horas_reais,
        "concluida": concluida,
        "concluidaEm": tarefa.get("concluidaEm")
        or (tarefa.get("criadaEm") if concluida else None),
        "tipo": tipo,
        "ordem": ordem if isinstance(ordem, (int, float)) else index,
        "observacoes": tarefa.get("observacoes") or "",
        "criterioConclusao": pegar(
            tarefa,
            "criterioConclusao",
            "criterio_conclusao",
            "completionCriteria",
            default="",
        )
        or "",
        "dificuldade": dificuldade,
        "prioridade": prioridade,
        "tags": normalizar_tags(pegar(tarefa, "tags", "categorias")),
        "atributos": normalizar_atributos(
            pegar(tarefa, "atributos", "atributo", "areas", "stats")
        ),
        "dependsOn": normalizar_depends_on(pegar(tarefa, "dependsOn", "depends_on")),
        "competenciasIds": normalizar_competencias_ids(
            comps_refs, competencias_do_roadmap or []
        ),
        "reviewAfterDays": review_ok,
        "timerAtivoDesde": tarefa.get("timerAtivoDesde"),
        "links": [normalizar_link(l) for l in (tarefa.get("links") or [])],
        "subtarefas": [
            {
                "id": s.get("id") or gerar_id(),
                "titulo": s.get("titulo") or "",
                "concluida": bool(s.get("concluida")),
            }
            for s in (tarefa.get("subtarefas") or [])
            if isinstance(s, dict)
        ],
        "historico": normalizar_historico(tarefa.get("historico")),
        "criadaEm": tarefa.get("criadaEm") or agora_iso(),
    }


def tarefa_esta_bloqueada(tarefa, todas):
    deps = tarefa.get("dependsOn") or []
    if not deps:
        return {"bloqueada": False, "pendentes": []}
    por_id = {t["id"]: t for t in (todas or [])}
    pendentes = [por_id[i] for i in deps if i in por_id and not por_id[i].get("concluida")]
    return {
        "bloqueada": bool(pendentes),
        "pendentes": [{"id": t["id"], "titulo": t["titulo"]} for t in pendentes],
    }


def calcular_dominio_competencias(roadmap):
    competencias = roadmap.get("competencias") or []
    tarefas = roadmap.get("tarefas") or []
    saida = []
    for comp in competencias:
        relacionadas = [
            t for t in tarefas if comp["id"] in (t.get("competenciasIds") or [])
        ]
        peso_total = sum(max(float(t.get("horasEstimadas") or 0), 1) for t in relacionadas)
        peso_feito = sum(
            max(float(t.get("horasEstimadas") or 0), 1)
            for t in relacionadas
            if t.get("concluida")
        )
        dominio = round((peso_feito / peso_total) * 100) if peso_total else 0
        saida.append(
            {
                "id": comp["id"],
                "nome": comp["nome"],
                "descricao": comp.get("descricao") or "",
                "totalTarefas": len(relacionadas),
                "tarefasConcluidas": sum(1 for t in relacionadas if t.get("concluida")),
                "dominio": dominio,
                "coberta": bool(relacionadas),
            }
        )
    saida.sort(key=lambda c: (-c["totalTarefas"], -c["dominio"]))
    return saida


def calcular_dominio_geral(roadmap):
    lista = calcular_dominio_competencias(roadmap)
    cobertas = [c for c in lista if c["coberta"]]
    if not cobertas:
        return {"dominio": 0, "total": len(lista), "cobertas": 0}
    soma = sum(c["dominio"] for c in cobertas)
    return {
        "dominio": round(soma / len(cobertas)),
        "total": len(lista),
        "cobertas": len(cobertas),
    }


def normalizar_roadmap(roadmap):
    competencias = normalizar_competencias(
        pegar(roadmap, "competencias", "skills") or roadmap.get("competencias") or []
    )
    tarefas = [
        normalizar_tarefa(t, i, competencias)
        for i, t in enumerate(roadmap.get("tarefas") or [])
    ]
    tarefas.sort(key=lambda t: t["ordem"])
    ids_validos = {c["id"] for c in competencias}
    for i, t in enumerate(tarefas):
        t["ordem"] = i
        t["competenciasIds"] = [cid for cid in t.get("competenciasIds") or [] if cid in ids_validos]
    return {**roadmap, "competencias": competencias, "tarefas": tarefas}
