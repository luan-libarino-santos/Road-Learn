from core.errors import AppError
from core.ids import gerar_id
from roadmaps.models import Roadmap, Tarefa
from roadmaps.normalize import (
    DIFICULDADES,
    PRIORIDADES,
    TIPOS_TAREFA,
    adicionar_historico,
    agora_iso,
    normalizar_atributos,
    normalizar_competencia,
    normalizar_competencias,
    normalizar_competencias_ids,
    normalizar_depends_on,
    normalizar_link,
    normalizar_roadmap,
    normalizar_tags,
    normalizar_tarefa,
    pegar,
    tarefa_esta_bloqueada,
)
from roadmaps.persist import (
    gravar_roadmap_completo,
    gravar_tarefa,
    ids_ocupados,
    listar_roadmaps,
    obter_roadmap,
)


def _erro(msg, status=400):
    raise AppError(msg, status)


def montar_roadmap_de_json(dados):
    if not isinstance(dados, dict):
        raise AppError("O roadmap deve ser um objeto JSON")
    nome = dados.get("nome") if isinstance(dados.get("nome"), str) else ""
    nome = nome.strip()
    if not nome:
        raise AppError("Cada roadmap precisa de um 'nome' não vazio")

    agora = agora_iso()
    tarefas_brutas = dados.get("tarefas") if isinstance(dados.get("tarefas"), list) else []
    competencias = normalizar_competencias(pegar(dados, "competencias", "skills") or [])
    por_id = {c["id"]: c for c in competencias}
    por_nome = {c["nome"].lower(): c for c in competencias}

    for t in tarefas_brutas:
        refs = pegar(t or {}, "competenciasIds", "competencias", "skills", "skillIds")
        from roadmaps.normalize import como_array

        for ref in como_array(refs):
            texto = str(ref).strip()
            if not texto:
                continue
            if texto in por_id or texto.lower() in por_nome:
                continue
            import re

            parece_id = bool(re.match(r"^[a-z][a-z0-9_-]*$", texto, re.I)) and bool(
                re.search(r"[_-]", texto)
            )
            if parece_id:
                nome_c = (
                    texto.replace("c_", "").replace("c-", "")
                    if texto.lower().startswith("c_") or texto.lower().startswith("c-")
                    else texto
                )
                partes = re.split(r"[_-]+", nome_c)
                nome_c = " ".join(p[:1].upper() + p[1:] for p in partes if p)
                competencia = normalizar_competencia(
                    {"id": texto, "nome": nome_c}, len(competencias)
                )
            else:
                competencia = normalizar_competencia({"nome": texto}, len(competencias))
            if not competencia["nome"] or competencia["nome"].lower() in por_nome:
                continue
            competencias.append(competencia)
            por_id[competencia["id"]] = competencia
            por_nome[competencia["nome"].lower()] = competencia

    competencias = normalizar_competencias(competencias)
    tarefas = []
    for i, t in enumerate(tarefas_brutas):
        if not isinstance(t, dict):
            raise AppError(f"Tarefa na posição {i} é inválida")
        titulo = t.get("titulo") if isinstance(t.get("titulo"), str) else ""
        titulo = titulo.strip()
        if not titulo:
            raise AppError(f"Tarefa na posição {i} precisa de um 'titulo'")
        tid = t.get("id") or gerar_id()
        tarefas.append(
            normalizar_tarefa(
                {
                    **t,
                    "id": tid,
                    "titulo": titulo,
                    "criadaEm": t.get("criadaEm") or agora,
                    "historico": t.get("historico")
                    or [
                        {
                            "id": gerar_id(),
                            "em": agora,
                            "tipo": "criada",
                            "detalhe": "Importada via JSON",
                        }
                    ],
                },
                i,
                competencias,
            )
        )

    return normalizar_roadmap(
        {
            "id": dados.get("id") or gerar_id(),
            "nome": nome,
            "descricao": (dados.get("descricao") or "").strip()
            if isinstance(dados.get("descricao"), str)
            else "",
            "criadoEm": dados.get("criadoEm") or agora,
            "competencias": competencias,
            "tarefas": tarefas,
        }
    )


def _garantir_id_livre(ident, ocupados):
    atual = ident or gerar_id()
    if atual not in ocupados:
        ocupados.add(atual)
        return atual, False, atual
    novo = gerar_id()
    while novo in ocupados:
        novo = gerar_id()
    ocupados.add(novo)
    return novo, True, atual


def _remapear_ids(montado, ocupados, avisos):
    mapa_c = {}
    mapa_t = {}
    for comp in montado.get("competencias") or []:
        nid, rem, antigo = _garantir_id_livre(comp["id"], ocupados["competencias"])
        if rem:
            mapa_c[antigo] = nid
            avisos.append(
                f'Roadmap "{montado["nome"]}": competência id "{antigo}" já existia — gerado "{nid}"'
            )
        comp["id"] = nid
    for tarefa in montado.get("tarefas") or []:
        nid, rem, antigo = _garantir_id_livre(tarefa["id"], ocupados["tarefas"])
        if rem:
            mapa_t[antigo] = nid
            avisos.append(
                f'Roadmap "{montado["nome"]}": tarefa id "{antigo}" já existia — gerado "{nid}"'
            )
        tarefa["id"] = nid
        for link in tarefa.get("links") or []:
            lid, r, antigo_l = _garantir_id_livre(link["id"], ocupados["links"])
            if r:
                avisos.append(
                    f'Roadmap "{montado["nome"]}": link id "{antigo_l}" já existia — gerado "{lid}"'
                )
            link["id"] = lid
        for sub in tarefa.get("subtarefas") or []:
            sid, r, antigo_s = _garantir_id_livre(sub["id"], ocupados["subtarefas"])
            if r:
                avisos.append(
                    f'Roadmap "{montado["nome"]}": subtarefa id "{antigo_s}" já existia — gerado "{sid}"'
                )
            sub["id"] = sid
        for h in tarefa.get("historico") or []:
            hid, r, antigo_h = _garantir_id_livre(h["id"], ocupados["historico"])
            if r:
                avisos.append(
                    f'Roadmap "{montado["nome"]}": histórico id "{antigo_h}" já existia — gerado "{hid}"'
                )
            h["id"] = hid
    if not mapa_t and not mapa_c:
        return
    for tarefa in montado.get("tarefas") or []:
        if mapa_t:
            tarefa["dependsOn"] = [mapa_t.get(d, d) for d in tarefa.get("dependsOn") or []]
        if mapa_c:
            tarefa["competenciasIds"] = [
                mapa_c.get(c, c) for c in tarefa.get("competenciasIds") or []
            ]


def importar_de_json(payload):
    if isinstance(payload, list):
        lista = payload
    elif isinstance(payload, dict):
        if isinstance(payload.get("roadmaps"), list):
            lista = payload["roadmaps"]
        elif "nome" in payload or "tarefas" in payload:
            lista = [payload]
        else:
            raise AppError(
                'JSON inválido. Envie um roadmap, um array de roadmaps, ou { "roadmaps": [...] }'
            )
    else:
        raise AppError("JSON inválido")
    if not lista:
        raise AppError("Nenhum roadmap para importar")

    avisos = []
    importados = []
    ocupados = ids_ocupados()
    for i, item in enumerate(lista):
        try:
            montado = montar_roadmap_de_json(item)
        except AppError as e:
            raise AppError(f"Roadmap #{i + 1}: {e}") from e
        rid, rem, antigo = _garantir_id_livre(montado["id"], ocupados["roadmaps"])
        if rem:
            avisos.append(
                f'Roadmap "{montado["nome"]}": id "{antigo}" já existia — gerado novo id "{rid}"'
            )
        montado["id"] = rid
        _remapear_ids(montado, ocupados, avisos)
        gravar_roadmap_completo(montado)
        from roadmaps.sidebar import atribuir_se_novo

        atribuir_se_novo(rid)
        importados.append(obter_roadmap(rid))
    return {"importados": importados, "avisos": avisos}


def criar_roadmap(nome, descricao=""):
    roadmap = {
        "id": gerar_id(),
        "nome": nome.strip(),
        "descricao": (descricao or "").strip(),
        "criadoEm": agora_iso(),
        "competencias": [],
        "tarefas": [],
    }
    gravar_roadmap_completo(roadmap)
    from roadmaps.sidebar import atribuir_se_novo

    atribuir_se_novo(roadmap["id"])
    return roadmap


def atualizar_roadmap(roadmap_id, dados):
    atual = obter_roadmap(roadmap_id)
    if not atual:
        return None
    if "nome" in dados:
        nome = str(dados["nome"]).strip()
        if not nome:
            _erro("Nome é obrigatório")
        atual["nome"] = nome
    if "descricao" in dados:
        atual["descricao"] = str(dados["descricao"]).strip()
    if "competencias" in dados:
        atual["competencias"] = normalizar_competencias(dados["competencias"])
    gravar_roadmap_completo(atual)
    return obter_roadmap(roadmap_id)


def adicionar_competencia(roadmap_id, dados):
    atual = obter_roadmap(roadmap_id)
    if not atual:
        return None
    nome = str((dados or {}).get("nome") or "").strip()
    if not nome:
        _erro("Nome da competência é obrigatório")
    competencia = normalizar_competencia(
        {
            "id": dados.get("id") or gerar_id(),
            "nome": nome,
            "descricao": dados.get("descricao") or "",
        },
        len(atual["competencias"]),
    )
    atual["competencias"].append(competencia)
    gravar_roadmap_completo(atual)
    return competencia


def atualizar_competencia(roadmap_id, competencia_id, dados):
    atual = obter_roadmap(roadmap_id)
    if not atual:
        return None
    comp = next((c for c in atual["competencias"] if c["id"] == competencia_id), None)
    if not comp:
        return None
    if "nome" in dados:
        nome = str(dados["nome"]).strip()
        if not nome:
            _erro("Nome da competência é obrigatório")
        comp["nome"] = nome
    if "descricao" in dados:
        comp["descricao"] = str(dados["descricao"]).strip()
    gravar_roadmap_completo(atual)
    return comp


def excluir_competencia(roadmap_id, competencia_id):
    atual = obter_roadmap(roadmap_id)
    if not atual:
        return
    atual["competencias"] = [c for c in atual["competencias"] if c["id"] != competencia_id]
    for t in atual["tarefas"]:
        t["competenciasIds"] = [
            cid for cid in t.get("competenciasIds") or [] if cid != competencia_id
        ]
    gravar_roadmap_completo(atual)


def excluir_roadmap(roadmap_id):
    from perfil.services import limpar_bonus_roadmap_excluido
    from projetos.services import (
        excluir_projeto_por_roadmap_id,
        remover_roadmap_dos_integrados,
    )
    from roadmaps.sidebar import remover_roadmap_das_atribuicoes

    Roadmap.objects.filter(pk=roadmap_id).delete()
    remover_roadmap_das_atribuicoes(roadmap_id)
    limpar_bonus_roadmap_excluido(roadmap_id)
    excluir_projeto_por_roadmap_id(roadmap_id)
    remover_roadmap_dos_integrados(roadmap_id)


def adicionar_tarefa(roadmap_id, tarefa):
    atual = obter_roadmap(roadmap_id)
    if not atual:
        return None
    agora = agora_iso()
    nova = normalizar_tarefa(
        {
            "id": gerar_id(),
            "titulo": (tarefa.get("titulo") or "").strip(),
            "descricao": (tarefa.get("descricao") or "").strip(),
            "prazo": tarefa.get("prazo") or "",
            "horasEstimadas": tarefa.get("horasEstimadas") or 0,
            "tipo": tarefa.get("tipo") or "pratica",
            "ordem": len(atual["tarefas"]),
            "concluida": False,
            "observacoes": (tarefa.get("observacoes") or "").strip(),
            "criterioConclusao": (tarefa.get("criterioConclusao") or "").strip(),
            "dificuldade": tarefa.get("dificuldade"),
            "prioridade": tarefa.get("prioridade"),
            "tags": tarefa.get("tags"),
            "atributos": tarefa.get("atributos")
            or tarefa.get("atributo")
            or tarefa.get("areas"),
            "dependsOn": tarefa.get("dependsOn"),
            "competenciasIds": tarefa.get("competenciasIds") or tarefa.get("competencias"),
            "reviewAfterDays": tarefa.get("reviewAfterDays"),
            "links": [],
            "subtarefas": [],
            "criadaEm": agora,
            "historico": [{"id": gerar_id(), "em": agora, "tipo": "criada", "detalhe": ""}],
        },
        len(atual["tarefas"]),
        atual["competencias"],
    )
    rm = Roadmap.objects.get(pk=roadmap_id)
    gravar_tarefa(rm, nova)
    return nova


def atualizar_tarefa(roadmap_id, tarefa_id, dados):
    atual_rm = obter_roadmap(roadmap_id)
    if not atual_rm:
        return None
    index = next((i for i, t in enumerate(atual_rm["tarefas"]) if t["id"] == tarefa_id), -1)
    if index < 0:
        return None
    comps = atual_rm["competencias"]
    atual = normalizar_tarefa(atual_rm["tarefas"][index], index, comps)
    if dados.get("concluida") is True and not atual["concluida"]:
        info = tarefa_esta_bloqueada(atual, atual_rm["tarefas"])
        if info["bloqueada"]:
            nomes = ", ".join(p["titulo"] for p in info["pendentes"])
            _erro(f"Tarefa bloqueada. Conclua antes: {nomes}")

    atualizada = normalizar_tarefa({**atual, **dados}, index, comps)
    if "horasEstimadas" in dados:
        atualizada["horasEstimadas"] = float(dados["horasEstimadas"] or 0)
    if "horasReais" in dados:
        atualizada["horasReais"] = float(dados["horasReais"] or 0)
    if dados.get("tipo") in TIPOS_TAREFA:
        atualizada["tipo"] = dados["tipo"]
    if dados.get("dificuldade") in DIFICULDADES:
        atualizada["dificuldade"] = dados["dificuldade"]
    if dados.get("prioridade") in PRIORIDADES:
        atualizada["prioridade"] = dados["prioridade"]
    if "tags" in dados:
        atualizada["tags"] = normalizar_tags(dados["tags"])
    if any(k in dados for k in ("atributos", "atributo", "areas")):
        atualizada["atributos"] = normalizar_atributos(
            dados.get("atributos") or dados.get("atributo") or dados.get("areas")
        )
    if "dependsOn" in dados:
        atualizada["dependsOn"] = normalizar_depends_on(dados["dependsOn"])
    if "competenciasIds" in dados or "competencias" in dados:
        atualizada["competenciasIds"] = normalizar_competencias_ids(
            dados.get("competenciasIds") or dados.get("competencias"), comps
        )
    if "reviewAfterDays" in dados:
        try:
            n = float(dados["reviewAfterDays"])
        except (TypeError, ValueError):
            n = 0
        atualizada["reviewAfterDays"] = n if n > 0 else 0
    if "criterioConclusao" in dados:
        atualizada["criterioConclusao"] = str(dados["criterioConclusao"])
    if "links" in dados:
        atualizada["links"] = [normalizar_link(l) for l in dados.get("links") or []]

    mudou = "concluida" in dados and bool(dados["concluida"]) != atual["concluida"]
    if mudou:
        if dados["concluida"]:
            atualizada["concluidaEm"] = agora_iso()
            adicionar_historico(atualizada, "concluida")
        else:
            atualizada["concluidaEm"] = None
            adicionar_historico(atualizada, "reaberta")
    elif any(
        k in dados
        for k in (
            "titulo",
            "descricao",
            "observacoes",
            "criterioConclusao",
            "tipo",
            "prazo",
            "links",
            "subtarefas",
            "tags",
            "atributos",
            "dependsOn",
            "competenciasIds",
            "competencias",
        )
    ):
        adicionar_historico(atualizada, "editada")

    if "horasReais" in dados and float(dados["horasReais"] or 0) != atual["horasReais"]:
        delta = float(dados["horasReais"] or 0) - atual["horasReais"]
        if delta:
            adicionar_historico(
                atualizada,
                "tempo",
                f"+{delta}h registradas" if delta > 0 else f"{delta}h ajustadas",
            )

    rm = Roadmap.objects.get(pk=roadmap_id)
    gravar_tarefa(rm, atualizada)

    from perfil.services import ao_concluir_tarefa, ao_reabrir_tarefa

    if mudou:
        atual_rm["tarefas"][index] = atualizada
        if atualizada["concluida"]:
            ao_concluir_tarefa(atual_rm, atualizada)
        else:
            ao_reabrir_tarefa(atual_rm, atualizada)
    return atualizada


def registrar_tempo(roadmap_id, tarefa_id, horas):
    try:
        delta = float(horas)
    except (TypeError, ValueError):
        delta = 0
    if not delta:
        _erro("Informe um valor de horas diferente de zero")
    atual_rm = obter_roadmap(roadmap_id)
    if not atual_rm:
        return None
    index = next((i for i, t in enumerate(atual_rm["tarefas"]) if t["id"] == tarefa_id), -1)
    if index < 0:
        return None
    atual = normalizar_tarefa(atual_rm["tarefas"][index], index)
    atual["horasReais"] = max(0, (atual["horasReais"] or 0) + delta)
    adicionar_historico(
        atual,
        "tempo",
        f"+{delta}h registradas" if delta > 0 else f"{delta}h ajustadas",
    )
    gravar_tarefa(Roadmap.objects.get(pk=roadmap_id), atual)
    return atual


def iniciar_timer(roadmap_id, tarefa_id):
    atual_rm = obter_roadmap(roadmap_id)
    if not atual_rm:
        return None
    index = next((i for i, t in enumerate(atual_rm["tarefas"]) if t["id"] == tarefa_id), -1)
    if index < 0:
        return None
    atual = normalizar_tarefa(atual_rm["tarefas"][index], index)
    if atual.get("timerAtivoDesde"):
        return atual
    atual["timerAtivoDesde"] = agora_iso()
    adicionar_historico(atual, "timer_inicio")
    gravar_tarefa(Roadmap.objects.get(pk=roadmap_id), atual)
    return atual


def parar_timer(roadmap_id, tarefa_id):
    from datetime import datetime, timezone

    atual_rm = obter_roadmap(roadmap_id)
    if not atual_rm:
        return None
    index = next((i for i, t in enumerate(atual_rm["tarefas"]) if t["id"] == tarefa_id), -1)
    if index < 0:
        return None
    atual = normalizar_tarefa(atual_rm["tarefas"][index], index)
    if not atual.get("timerAtivoDesde"):
        return atual
    inicio = datetime.fromisoformat(atual["timerAtivoDesde"].replace("Z", "+00:00"))
    horas = round(max(0, (datetime.now(timezone.utc) - inicio).total_seconds()) / 3600, 2)
    atual["horasReais"] = round((atual["horasReais"] or 0) + horas, 2)
    atual["timerAtivoDesde"] = None
    adicionar_historico(
        atual, "timer_fim", f"+{horas}h pelo timer" if horas > 0 else "Timer parado"
    )
    gravar_tarefa(Roadmap.objects.get(pk=roadmap_id), atual)
    return atual


def excluir_tarefa(roadmap_id, tarefa_id):
    Tarefa.objects.filter(pk=tarefa_id, roadmap_id=roadmap_id).delete()


def reordenar_tarefas(roadmap_id, ids):
    atual = obter_roadmap(roadmap_id)
    if not atual or not isinstance(ids, list):
        return None
    por_id = {t["id"]: t for t in atual["tarefas"]}
    if set(ids) != set(por_id):
        return None
    for i, tid in enumerate(ids):
        por_id[tid]["ordem"] = i
    atual["tarefas"] = [por_id[tid] for tid in ids]
    gravar_roadmap_completo(atual)
    return obter_roadmap(roadmap_id)


def mover_tarefa(roadmap_id, tarefa_id, direcao):
    atual = obter_roadmap(roadmap_id)
    if not atual:
        return None
    tarefas = sorted(atual["tarefas"], key=lambda t: t["ordem"])
    index = next((i for i, t in enumerate(tarefas) if t["id"] == tarefa_id), -1)
    novo = index + int(direcao)
    if index < 0 or novo < 0 or novo >= len(tarefas):
        return None
    tarefas[index], tarefas[novo] = tarefas[novo], tarefas[index]
    return reordenar_tarefas(roadmap_id, [t["id"] for t in tarefas])


def adicionar_subtarefa(roadmap_id, tarefa_id, titulo):
    atual_rm = obter_roadmap(roadmap_id)
    if not atual_rm:
        return None
    tarefa = next((t for t in atual_rm["tarefas"] if t["id"] == tarefa_id), None)
    if not tarefa:
        return None
    sub = {"id": gerar_id(), "titulo": (titulo or "").strip(), "concluida": False}
    tarefa["subtarefas"] = tarefa.get("subtarefas") or []
    tarefa["subtarefas"].append(sub)
    gravar_tarefa(Roadmap.objects.get(pk=roadmap_id), normalizar_tarefa(tarefa))
    return sub


def atualizar_subtarefa(roadmap_id, tarefa_id, subtarefa_id, dados):
    atual_rm = obter_roadmap(roadmap_id)
    if not atual_rm:
        return None
    tarefa = next((t for t in atual_rm["tarefas"] if t["id"] == tarefa_id), None)
    if not tarefa:
        return None
    index = next(
        (i for i, s in enumerate(tarefa.get("subtarefas") or []) if s["id"] == subtarefa_id),
        -1,
    )
    if index < 0:
        return None
    sub_antes = tarefa["subtarefas"][index]
    tarefa_estava = bool(tarefa.get("concluida"))
    sub_estava = bool(sub_antes.get("concluida"))
    tarefa["subtarefas"][index] = {**sub_antes, **dados}
    subtarefa = tarefa["subtarefas"][index]

    if "concluida" in dados:
        todas = tarefa["subtarefas"] and all(s.get("concluida") for s in tarefa["subtarefas"])
        if todas:
            normalizada = normalizar_tarefa(tarefa)
            if not tarefa_esta_bloqueada(normalizada, atual_rm["tarefas"])["bloqueada"]:
                tarefa["concluida"] = True
                tarefa["concluidaEm"] = agora_iso()
                adicionar_historico(tarefa, "concluida", "Todas as subtarefas concluídas")
        elif not dados["concluida"] and tarefa.get("concluida"):
            tarefa["concluida"] = False
            tarefa["concluidaEm"] = None
            adicionar_historico(tarefa, "reaberta", "Subtarefa reaberta")

    gravar_tarefa(Roadmap.objects.get(pk=roadmap_id), normalizar_tarefa(tarefa))

    from perfil.services import ao_concluir_subtarefa, ao_reabrir_subtarefa

    if "concluida" in dados and bool(dados["concluida"]) != sub_estava:
        if dados["concluida"]:
            ao_concluir_subtarefa(
                atual_rm,
                tarefa,
                subtarefa,
                tarefa_acabou_de_concluir=not tarefa_estava and bool(tarefa.get("concluida")),
            )
        else:
            ao_reabrir_subtarefa(
                atual_rm,
                tarefa,
                subtarefa,
                tarefa_acabou_de_reabrir=tarefa_estava and not tarefa.get("concluida"),
            )
    return subtarefa


def excluir_subtarefa(roadmap_id, tarefa_id, subtarefa_id):
    atual_rm = obter_roadmap(roadmap_id)
    if not atual_rm:
        return
    tarefa = next((t for t in atual_rm["tarefas"] if t["id"] == tarefa_id), None)
    if not tarefa:
        return
    tarefa["subtarefas"] = [s for s in tarefa.get("subtarefas") or [] if s["id"] != subtarefa_id]
    gravar_tarefa(Roadmap.objects.get(pk=roadmap_id), normalizar_tarefa(tarefa))


def timer_aberto():
    t = (
        Tarefa.objects.exclude(timer_ativo_desde__isnull=True)
        .exclude(timer_ativo_desde="")
        .first()
    )
    if not t:
        return None
    return {
        "tarefaId": t.id,
        "roadmapId": t.roadmap_id,
        "titulo": t.titulo,
        "timerAtivoDesde": t.timer_ativo_desde,
    }
