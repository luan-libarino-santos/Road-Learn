from datetime import datetime, timedelta

from roadmaps.normalize import agora_iso


def _dia_chave(valor):
    if isinstance(valor, datetime):
        return valor.strftime("%Y-%m-%d")
    s = str(valor or "")
    return s[:10] if len(s) >= 10 else ""


def _somar_intervalo(atividade, inicio, fim):
    horas = 0
    concluidas = 0
    cursor = inicio
    while cursor <= fim:
        chave = _dia_chave(cursor)
        info = atividade.get(chave) or {"concluidas": 0, "horas": 0, "eventos": 0}
        horas += info["horas"]
        concluidas += info["concluidas"]
        cursor = cursor + timedelta(days=1)
    return {"horas": round(horas * 10) / 10, "concluidas": concluidas}


def calcular_analytics_globais(roadmaps):
    todas = []
    for r in roadmaps or []:
        for t in r.get("tarefas") or []:
            todas.append({**t, "roadmapNome": r["nome"], "roadmapId": r["id"]})

    concluidas = [t for t in todas if t.get("concluida")]
    por_tipo = {"pratica": 0, "pesquisa": 0, "projeto": 0, "analise": 0}
    for t in todas:
        if t.get("tipo") in por_tipo:
            por_tipo[t["tipo"]] += 1

    horas_estimadas = sum(t.get("horasEstimadas") or 0 for t in todas)
    horas_reais = sum(t.get("horasReais") or 0 for t in todas)

    atributos_map = {}
    for t in todas:
        if not (t.get("horasReais") or 0) > 0:
            continue
        for nome in t.get("atributos") or []:
            chave = nome.lower()
            if chave not in atributos_map:
                atributos_map[chave] = {"nome": nome, "horas": 0, "tarefas": 0}
            atributos_map[chave]["horas"] += t["horasReais"]
            atributos_map[chave]["tarefas"] += 1
    atributos = sorted(
        [
            {**a, "horas": round(a["horas"] * 10) / 10}
            for a in atributos_map.values()
        ],
        key=lambda a: -a["horas"],
    )

    atividade = {}

    def marcar(chave, campo, valor=1):
        if not chave:
            return
        if chave not in atividade:
            atividade[chave] = {"concluidas": 0, "horas": 0, "eventos": 0}
        atividade[chave][campo] += valor

    for t in concluidas:
        marcar(_dia_chave(t.get("concluidaEm")), "concluidas")
    for t in todas:
        for h in t.get("historico") or []:
            tipo = h.get("tipo")
            if tipo in ("tempo", "timer_fim", "concluida"):
                marcar(_dia_chave(h.get("em")), "eventos")
            if tipo in ("tempo", "timer_fim"):
                detalhe = str(h.get("detalhe") or "")
                import re

                m = re.search(r"([\d.]+)h", detalhe)
                if m:
                    marcar(_dia_chave(h.get("em")), "horas", float(m.group(1)))

    hoje = _dia_chave(datetime.now())
    dias_ativos = {
        k
        for k, v in atividade.items()
        if v["concluidas"] > 0 or v["eventos"] > 0 or v["horas"] > 0
    }
    dias_em_sequencia = 0
    cursor = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if hoje not in dias_ativos:
        cursor -= timedelta(days=1)
    while _dia_chave(cursor) in dias_ativos:
        dias_em_sequencia += 1
        cursor -= timedelta(days=1)

    heatmap = []
    base = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(83, -1, -1):
        d = base - timedelta(days=i)
        chave = _dia_chave(d)
        info = atividade.get(chave) or {"concluidas": 0, "horas": 0, "eventos": 0}
        score = info["concluidas"] + (1 if info["horas"] > 0 else 0) + (
            1 if info["eventos"] > 0 else 0
        )
        heatmap.append(
            {
                "data": chave,
                **info,
                "nivel": 0 if score == 0 else min(4, score),
            }
        )

    semanas = []
    for i in range(7, -1, -1):
        fim = base - timedelta(days=i * 7)
        inicio = fim - timedelta(days=6)
        concluidas_s = 0
        horas_s = 0
        d = inicio
        while d <= fim:
            info = atividade.get(_dia_chave(d))
            if info:
                concluidas_s += info["concluidas"]
                horas_s += info["horas"]
            d += timedelta(days=1)
        semanas.append(
            {
                "rotulo": inicio.strftime("%d/%m"),
                "concluidas": concluidas_s,
                "horas": round(horas_s * 10) / 10,
            }
        )

    acum = 0
    progresso_tempo = []
    for d in heatmap:
        acum += d["concluidas"]
        progresso_tempo.append(
            {"data": d["data"], "acumulado": acum, "horas": d["horas"]}
        )

    weekday = (base.weekday())  # Monday=0
    inicio_semana = base - timedelta(days=weekday)
    fim_semana = inicio_semana + timedelta(days=6, hours=23, minutes=59, seconds=59)
    inicio_passada = inicio_semana - timedelta(days=7)
    fim_passada = inicio_semana - timedelta(seconds=1)

    semana_atual = _somar_intervalo(atividade, inicio_semana, fim_semana)
    semana_passada = _somar_intervalo(atividade, inicio_passada, fim_passada)

    info_hoje = atividade.get(hoje) or {"concluidas": 0, "horas": 0, "eventos": 0}
    rotulos = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    dias_da_semana = []
    for i in range(7):
        d = inicio_semana + timedelta(days=i)
        chave = _dia_chave(d)
        info = atividade.get(chave) or {"concluidas": 0, "horas": 0, "eventos": 0}
        dias_da_semana.append(
            {
                "data": chave,
                "rotulo": rotulos[i],
                "horas": round(info["horas"] * 10) / 10,
                "concluidas": info["concluidas"],
                "ehHoje": chave == hoje,
            }
        )

    inicio_mes = base.replace(day=1)
    horas_mes = 0
    concluidas_mes = 0
    for chave, info in atividade.items():
        try:
            d = datetime.fromisoformat(chave)
        except ValueError:
            continue
        if d >= inicio_mes:
            horas_mes += info["horas"]
            concluidas_mes += info["concluidas"]

    return {
        "totalRoadmaps": len(roadmaps or []),
        "totalTarefas": len(todas),
        "totalConcluidas": len(concluidas),
        "porTipo": por_tipo,
        "horasEstimadas": horas_estimadas,
        "horasReais": round(horas_reais * 100) / 100,
        "atributos": atributos,
        "diasEmSequencia": dias_em_sequencia,
        "streak": dias_em_sequencia,
        "heatmap": heatmap,
        "semanas": semanas,
        "diasDaSemana": dias_da_semana,
        "progressoTempo": progresso_tempo,
        "comparacaoSemanal": {
            "atual": semana_atual,
            "anterior": semana_passada,
            "deltaHoras": round((semana_atual["horas"] - semana_passada["horas"]) * 10)
            / 10,
            "deltaConcluidas": semana_atual["concluidas"] - semana_passada["concluidas"],
        },
        "horasHoje": round(info_hoje["horas"] * 10) / 10,
        "horasSemanaAtual": semana_atual["horas"],
        "horasMesAtual": round(horas_mes * 10) / 10,
        "concluidasSemanaAtual": semana_atual["concluidas"],
        "concluidasMesAtual": concluidas_mes,
    }
