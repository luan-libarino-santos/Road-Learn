import json

from core.errors import AppError
from core.ids import gerar_id
from projetos.models import (
    ProjetoEtapa,
    ProjetoFinal,
    ProjetoIntegrado,
    ProjetoIntegradoRoadmap,
    ProjetoItem,
)
from roadmaps.normalize import agora_iso, calcular_dominio_competencias, calcular_dominio_geral
from roadmaps.persist import obter_roadmap

PROGRESSO_MINIMO = 80
MIN_ROADMAPS_INTEGRADO = 2
MAX_ROADMAPS_NO_PROMPT = 5
COLECOES_ITEM = {
    "requisitosTecnicos",
    "requisitosFuncionais",
    "checklistImplementacao",
    "boasPraticas",
}


def como_array(valor):
    if isinstance(valor, list):
        return valor
    if valor is None or valor == "":
        return []
    return [valor]


def _txt(v):
    return str(v or "").strip()


def _lista(v):
    return [_txt(i) for i in como_array(v) if _txt(i)]


def _item(item, prefixo="item"):
    if isinstance(item, str):
        titulo = item.strip()
        return {"id": gerar_id(), "titulo": titulo, "concluido": False} if titulo else None
    if not isinstance(item, dict):
        return None
    titulo = _txt(item.get("titulo") or item.get("title") or item.get("nome"))
    if not titulo:
        return None
    return {
        "id": item.get("id") or f"{prefixo}_{gerar_id()}",
        "titulo": titulo,
        "concluido": bool(item.get("concluido") if "concluido" in item else item.get("concluida")),
    }


def _checklist(lista, prefixo):
    return [i for i in (_item(x, prefixo) for x in como_array(lista)) if i]


def _etapa(etapa, index=0):
    if not isinstance(etapa, dict):
        return None
    titulo = _txt(etapa.get("titulo") or etapa.get("title") or etapa.get("nome"))
    if not titulo:
        return None
    tarefas = [i for i in (_item(t, "et") for t in como_array(etapa.get("tarefas"))) if i]
    if etapa.get("concluida") is not None:
        concluida = bool(etapa["concluida"])
    else:
        concluida = bool(tarefas) and all(t["concluido"] for t in tarefas)
    return {
        "id": etapa.get("id") or f"e_{gerar_id()}",
        "titulo": titulo,
        "descricao": _txt(etapa.get("descricao") or etapa.get("description")),
        "ordem": etapa["ordem"] if isinstance(etapa.get("ordem"), (int, float)) else index,
        "concluida": concluida,
        "tarefas": tarefas,
    }


def _doc(doc):
    fonte = doc if isinstance(doc, dict) else {}
    readme = _txt(fonte.get("readme"))
    pastas = _lista(fonte.get("estruturaPastas") or fonte.get("pastas"))
    gitignore = _txt(fonte.get("gitignore"))
    arquivos = _lista(fonte.get("arquivosBase"))
    return {
        "readme": readme or "# Projeto\n\n## Visão\n\n## Setup\n\n## Scripts\n\n## Estrutura\n",
        "estruturaPastas": pastas or ["src/", "docs/", "README.md", ".gitignore"],
        "gitignore": gitignore or "node_modules/\n.env\n.DS_Store\ndist/\nbuild/\n*.log\n",
        "arquivosBase": arquivos or [".env.example", "docs/ARCHITECTURE.md"],
    }


def _boas_praticas():
    return [
        {"id": "bp_readme", "titulo": "README com visão, setup e estrutura", "concluido": False},
        {"id": "bp_gitignore", "titulo": ".gitignore adequado à stack", "concluido": False},
        {
            "id": "bp_estrutura",
            "titulo": "Estrutura de pastas clara e consistente",
            "concluido": False,
        },
        {
            "id": "bp_env",
            "titulo": ".env.example (sem segredos) quando houver config",
            "concluido": False,
        },
        {
            "id": "bp_organizacao",
            "titulo": "Código organizado com responsabilidades separadas",
            "concluido": False,
        },
        {
            "id": "bp_erros",
            "titulo": "Tratamento básico de erros e mensagens úteis",
            "concluido": False,
        },
    ]


def normalizar_projeto_final(dados, roadmap_id=None, preservar_id=None):
    dados = dados or {}
    rt = _checklist(dados.get("requisitosTecnicos"), "rt")
    rf = _checklist(dados.get("requisitosFuncionais"), "rf")
    ci = _checklist(dados.get("checklistImplementacao"), "ci")
    bp = _checklist(dados.get("boasPraticas"), "bp") or _boas_praticas()
    etapas = [
        e
        for e in (_etapa(x, i) for i, x in enumerate(como_array(dados.get("etapas"))))
        if e
    ]
    for i, e in enumerate(etapas):
        e["ordem"] = i
    topico = dados.get("topicoOrigem") if isinstance(dados.get("topicoOrigem"), dict) else {}
    topico_origem = {
        "titulo": _txt(topico.get("titulo")),
        "resumo": _txt(topico.get("resumo")),
    }
    nome = _txt(dados.get("nome") or dados.get("titulo")) or topico_origem["titulo"] or "Projeto Final"
    concluido = bool(dados.get("concluido"))
    agora = agora_iso()
    return {
        "id": preservar_id or dados.get("id") or f"pf_{gerar_id()}",
        "roadmapId": roadmap_id or dados.get("roadmapId"),
        "nome": nome,
        "objetivo": _txt(dados.get("objetivo")),
        "descricao": _txt(dados.get("descricao")),
        "stackObrigatoria": _lista(dados.get("stackObrigatoria") or dados.get("stack")),
        "requisitosTecnicos": rt,
        "requisitosFuncionais": rf,
        "checklistImplementacao": ci,
        "criteriosConclusao": _lista(dados.get("criteriosConclusao")),
        "etapas": etapas,
        "documentacaoInicial": _doc(dados.get("documentacaoInicial")),
        "boasPraticas": bp,
        "competenciasAlvoIds": _lista(
            dados.get("competenciasAlvoIds") or dados.get("competenciasAlvo")
        ),
        "topicoOrigem": topico_origem,
        "criadoEm": dados.get("criadoEm") or agora,
        "atualizadoEm": agora,
        "concluido": concluido,
        "concluidoEm": (dados.get("concluidoEm") or agora) if concluido else None,
    }


def normalizar_roadmap_ids(ids):
    vistos = []
    for bruto in ids if isinstance(ids, list) else []:
        i = str(bruto or "").strip()
        if i and i not in vistos:
            vistos.append(i)
    return vistos


def assert_roadmap_ids(ids):
    rids = normalizar_roadmap_ids(ids)
    if len(rids) < MIN_ROADMAPS_INTEGRADO:
        raise AppError(
            f"Selecione pelo menos {MIN_ROADMAPS_INTEGRADO} roadmaps para um Projeto Integrado"
        )
    return rids


def normalizar_projeto_integrado(dados, roadmap_ids=None, preservar_id=None):
    ids = assert_roadmap_ids(roadmap_ids or (dados or {}).get("roadmapIds"))
    base = normalizar_projeto_final(
        {
            **(dados or {}),
            "nome": (dados or {}).get("nome")
            or (dados or {}).get("titulo")
            or ((dados or {}).get("topicoOrigem") or {}).get("titulo")
            or "Projeto Integrado",
        },
        preservar_id=preservar_id or (dados or {}).get("id"),
    )
    base.pop("roadmapId", None)
    base["id"] = preservar_id or (dados or {}).get("id") or f"pi_{gerar_id()}"
    base["roadmapIds"] = ids
    return base


def calcular_progresso_projeto(projeto):
    itens = [
        *(projeto.get("requisitosTecnicos") or []),
        *(projeto.get("requisitosFuncionais") or []),
        *(projeto.get("checklistImplementacao") or []),
        *(projeto.get("boasPraticas") or []),
    ]
    for etapa in projeto.get("etapas") or []:
        itens.append({"concluido": etapa.get("concluida")})
        itens.extend(etapa.get("tarefas") or [])
    total = len(itens)
    if not total:
        return {"total": 0, "concluidos": 0, "progresso": 0}
    concluidos = sum(1 for i in itens if i.get("concluido") or i.get("concluida"))
    return {"total": total, "concluidos": concluidos, "progresso": round((concluidos / total) * 100)}


def calcular_progresso_tarefas(roadmap):
    tarefas = roadmap.get("tarefas") or []
    total = len(tarefas)
    if not total:
        return {"total": 0, "concluidas": 0, "progresso": 0}
    concluidas = sum(1 for t in tarefas if t.get("concluida"))
    return {
        "total": total,
        "concluidas": concluidas,
        "progresso": round((concluidas / total) * 100),
    }


def assert_elegivel(roadmap):
    info = calcular_progresso_tarefas(roadmap)
    if info["progresso"] < PROGRESSO_MINIMO:
        raise AppError(
            f"Conclua pelo menos {PROGRESSO_MINIMO}% das tarefas do roadmap para gerar o Projeto Final "
            f"(atual: {info['progresso']}% — {info['concluidas']}/{info['total']})."
        )
    return info


def frequencias(lista):
    mapa = {}
    for item in lista:
        chave = str(item or "").strip()
        if not chave:
            continue
        mapa[chave] = mapa.get(chave, 0) + 1
    return [
        {"valor": k, "contagem": v}
        for k, v in sorted(mapa.items(), key=lambda x: -x[1])
    ]


def montar_contexto_compacto(roadmap):
    progresso = calcular_progresso_tarefas(roadmap)
    dominio = calcular_dominio_geral(roadmap)
    comps = calcular_dominio_competencias(roadmap)
    if len(comps) > 15:
        comps = sorted(comps, key=lambda c: -c["dominio"])[:15]
    tarefas = roadmap.get("tarefas") or []
    return {
        "nome": roadmap["nome"],
        "descricao": roadmap.get("descricao") or "",
        "progressoTarefas": progresso["progresso"],
        "dominioGeral": dominio["dominio"],
        "competencias": [{"id": c["id"], "nome": c["nome"], "dominio": c["dominio"]} for c in comps],
        "atributosFrequentes": frequencias([a for t in tarefas for a in t.get("atributos") or []])[:8],
        "tagsFrequentes": frequencias([a for t in tarefas for a in t.get("tags") or []])[:8],
        "tarefas": [{"titulo": t["titulo"], "concluida": bool(t.get("concluida"))} for t in tarefas],
    }


def montar_contexto_completo(roadmap):
    base = montar_contexto_compacto(roadmap)
    base["competencias"] = [
        {
            "id": c["id"],
            "nome": c["nome"],
            "descricao": c.get("descricao") or "",
            "dominio": c["dominio"],
        }
        for c in calcular_dominio_competencias(roadmap)
    ]
    base["tarefas"] = [
        {
            "titulo": t["titulo"],
            "tipo": t.get("tipo"),
            "dificuldade": t.get("dificuldade"),
            "concluida": bool(t.get("concluida")),
            "atributos": t.get("atributos") or [],
            "tags": t.get("tags") or [],
            "competenciasIds": t.get("competenciasIds") or [],
            "subtarefas": [
                {"titulo": s["titulo"], "concluida": bool(s.get("concluida"))}
                for s in t.get("subtarefas") or []
            ],
        }
        for t in roadmap.get("tarefas") or []
    ]
    return base


def normalizar_topico(topico):
    if not isinstance(topico, dict):
        raise AppError("Tópico escolhido é obrigatório")
    titulo = _txt(topico.get("titulo"))
    resumo = _txt(topico.get("resumo"))
    if not titulo or not resumo:
        raise AppError("Tópico precisa de titulo e resumo")
    return {
        "id": _txt(topico.get("id")) or None,
        "titulo": titulo,
        "resumo": resumo,
        "categoria": _txt(topico.get("categoria")).lower() or None,
        "stackSugerida": _lista(topico.get("stackSugerida") or topico.get("stack")),
        "competenciasAlvoIds": _lista(
            topico.get("competenciasAlvoIds") or topico.get("competenciasAlvo")
        ),
    }


def _gravar_itens(tipo, projeto_id, projeto):
    ProjetoEtapa.objects.filter(projeto_tipo=tipo, projeto_id=projeto_id).delete()
    ProjetoItem.objects.filter(projeto_tipo=tipo, projeto_id=projeto_id).delete()
    etapas = []
    itens = []
    for i, e in enumerate(projeto.get("etapas") or []):
        etapas.append(
            ProjetoEtapa(
                codigo=e["id"],
                projeto_tipo=tipo,
                projeto_id=projeto_id,
                titulo=e.get("titulo") or "",
                descricao=e.get("descricao") or "",
                ordem=i,
                concluida=bool(e.get("concluida")),
            )
        )
        for j, t in enumerate(e.get("tarefas") or []):
            itens.append(
                ProjetoItem(
                    codigo=t["id"],
                    projeto_tipo=tipo,
                    projeto_id=projeto_id,
                    colecao="etapaTarefa",
                    titulo=t.get("titulo") or "",
                    concluido=bool(t.get("concluido") or t.get("concluida")),
                    ordem=j,
                    etapa_id=e["id"],
                )
            )
    for colecao in COLECOES_ITEM:
        for j, item in enumerate(projeto.get(colecao) or []):
            itens.append(
                ProjetoItem(
                    codigo=item["id"],
                    projeto_tipo=tipo,
                    projeto_id=projeto_id,
                    colecao=colecao,
                    titulo=item.get("titulo") or "",
                    concluido=bool(item.get("concluido")),
                    ordem=j,
                )
            )
    ProjetoEtapa.objects.bulk_create(etapas)
    ProjetoItem.objects.bulk_create(itens)


def _carregar_aninhados(tipo, projeto_id, base):
    etapas_db = list(
        ProjetoEtapa.objects.filter(projeto_tipo=tipo, projeto_id=projeto_id)
    )
    itens = list(ProjetoItem.objects.filter(projeto_tipo=tipo, projeto_id=projeto_id))
    por_etapa = {}
    for item in itens:
        if item.colecao == "etapaTarefa" and item.etapa_id:
            por_etapa.setdefault(item.etapa_id, []).append(
                {"id": item.codigo, "titulo": item.titulo, "concluido": item.concluido}
            )
    base["etapas"] = [
        {
            "id": e.codigo,
            "titulo": e.titulo,
            "descricao": e.descricao,
            "ordem": e.ordem,
            "concluida": e.concluida,
            "tarefas": por_etapa.get(e.id, []),
        }
        for e in etapas_db
    ]
    for colecao in COLECOES_ITEM:
        base[colecao] = [
            {"id": i.codigo, "titulo": i.titulo, "concluido": i.concluido}
            for i in itens
            if i.colecao == colecao
        ]
    return base


def _defaults_projeto(row, extra):
    try:
        stack = json.loads(row.stack_json or "[]")
    except json.JSONDecodeError:
        stack = []
    try:
        criterios = json.loads(row.criterios_json or "[]")
    except json.JSONDecodeError:
        criterios = []
    try:
        comps = json.loads(row.competencias_json or "[]")
    except json.JSONDecodeError:
        comps = []
    try:
        doc = json.loads(row.documentacao_json or "{}")
    except json.JSONDecodeError:
        doc = {}
    try:
        topico = json.loads(row.topico_json or "{}")
    except json.JSONDecodeError:
        topico = {}
    dados = {
        "id": row.id,
        "nome": row.nome,
        "objetivo": row.objetivo,
        "descricao": row.descricao,
        "stackObrigatoria": stack,
        "criteriosConclusao": criterios,
        "competenciasAlvoIds": comps,
        "documentacaoInicial": doc,
        "topicoOrigem": topico,
        "criadoEm": row.criado_em,
        "atualizadoEm": row.atualizado_em,
        "concluido": row.concluido,
        "concluidoEm": row.concluido_em,
        **extra,
    }
    return dados


def _salvar_campos(row, projeto):
    row.nome = projeto["nome"]
    row.objetivo = projeto.get("objetivo") or ""
    row.descricao = projeto.get("descricao") or ""
    row.stack_json = json.dumps(projeto.get("stackObrigatoria") or [])
    row.criterios_json = json.dumps(projeto.get("criteriosConclusao") or [])
    row.competencias_json = json.dumps(projeto.get("competenciasAlvoIds") or [])
    row.documentacao_json = json.dumps(projeto.get("documentacaoInicial") or {})
    row.topico_json = json.dumps(projeto.get("topicoOrigem") or {})
    row.criado_em = projeto.get("criadoEm") or agora_iso()
    row.atualizado_em = agora_iso()
    row.concluido = bool(projeto.get("concluido"))
    row.concluido_em = projeto.get("concluidoEm")
    row.save()


def upsert_projeto_final(projeto):
    row, _ = ProjetoFinal.objects.update_or_create(
        id=projeto["id"],
        defaults={"roadmap_id": projeto["roadmapId"], "nome": projeto["nome"]},
    )
    row.roadmap_id = projeto["roadmapId"]
    _salvar_campos(row, projeto)
    _gravar_itens("final", row.id, projeto)
    return obter_projeto_final_por_id(row.id)


def obter_projeto_final_por_id(pid):
    try:
        row = ProjetoFinal.objects.get(pk=pid)
    except ProjetoFinal.DoesNotExist:
        return None
    dados = _defaults_projeto(row, {"roadmapId": row.roadmap_id})
    dados = _carregar_aninhados("final", row.id, dados)
    return normalizar_projeto_final(dados, roadmap_id=row.roadmap_id, preservar_id=row.id)


def obter_projeto_final_por_roadmap(roadmap_id):
    try:
        row = ProjetoFinal.objects.get(roadmap_id=roadmap_id)
    except ProjetoFinal.DoesNotExist:
        return None
    return obter_projeto_final_por_id(row.id)


def excluir_projeto_final(pid):
    n, _ = ProjetoFinal.objects.filter(pk=pid).delete()
    ProjetoEtapa.objects.filter(projeto_tipo="final", projeto_id=pid).delete()
    ProjetoItem.objects.filter(projeto_tipo="final", projeto_id=pid).delete()
    return n > 0


def excluir_projeto_por_roadmap_id(roadmap_id):
    try:
        row = ProjetoFinal.objects.get(roadmap_id=roadmap_id)
    except ProjetoFinal.DoesNotExist:
        return False
    return excluir_projeto_final(row.id)


def upsert_projeto_integrado(projeto):
    row, _ = ProjetoIntegrado.objects.update_or_create(
        id=projeto["id"], defaults={"nome": projeto["nome"]}
    )
    _salvar_campos(row, projeto)
    ProjetoIntegradoRoadmap.objects.filter(projeto=row).delete()
    ProjetoIntegradoRoadmap.objects.bulk_create(
        [
            ProjetoIntegradoRoadmap(projeto=row, roadmap_id=rid, ordem=i)
            for i, rid in enumerate(projeto.get("roadmapIds") or [])
        ]
    )
    _gravar_itens("integrado", row.id, projeto)
    return obter_projeto_integrado_por_id(row.id)


def obter_projeto_integrado_por_id(pid):
    try:
        row = ProjetoIntegrado.objects.get(pk=pid)
    except ProjetoIntegrado.DoesNotExist:
        return None
    ids = list(row.roadmaps_rel.order_by("ordem").values_list("roadmap_id", flat=True))
    dados = _defaults_projeto(row, {"roadmapIds": ids})
    dados = _carregar_aninhados("integrado", row.id, dados)
    try:
        return normalizar_projeto_integrado(dados, roadmap_ids=ids, preservar_id=row.id)
    except AppError:
        return None


def listar_projetos_integrados():
    saida = []
    for row in ProjetoIntegrado.objects.all():
        p = obter_projeto_integrado_por_id(row.id)
        if p:
            saida.append(p)
    return saida


def excluir_projeto_integrado(pid):
    n, _ = ProjetoIntegrado.objects.filter(pk=pid).delete()
    ProjetoEtapa.objects.filter(projeto_tipo="integrado", projeto_id=pid).delete()
    ProjetoItem.objects.filter(projeto_tipo="integrado", projeto_id=pid).delete()
    return n > 0


def upsert_final_dados(roadmap_id, dados):
    roadmap = obter_roadmap(roadmap_id)
    if not roadmap:
        raise AppError("Roadmap não encontrado", 404)
    existente = obter_projeto_final_por_roadmap(roadmap_id)
    projeto = normalizar_projeto_final(
        {**(dados or {}), "roadmapId": roadmap_id},
        roadmap_id=roadmap_id,
        preservar_id=existente["id"] if existente else None,
    )
    if existente:
        projeto["criadoEm"] = existente.get("criadoEm") or projeto["criadoEm"]
    return upsert_projeto_final(projeto)


def atualizar_projeto_final(pid, dados):
    atual = obter_projeto_final_por_id(pid)
    if not atual:
        return None
    mesclado = {**atual, **(dados or {}), "id": atual["id"], "roadmapId": atual["roadmapId"], "criadoEm": atual["criadoEm"]}
    if dados.get("concluido") is True:
        mesclado["concluido"] = True
        mesclado["concluidoEm"] = atual.get("concluidoEm") or agora_iso()
    elif dados.get("concluido") is False:
        mesclado["concluido"] = False
        mesclado["concluidoEm"] = None
    projeto = normalizar_projeto_final(
        mesclado, roadmap_id=atual["roadmapId"], preservar_id=atual["id"]
    )
    return upsert_projeto_final(projeto)


def criar_projeto_integrado(dados):
    ids = assert_roadmap_ids((dados or {}).get("roadmapIds"))
    for rid in ids:
        if not obter_roadmap(rid):
            raise AppError(f"Roadmap não encontrado: {rid}", 404)
    projeto = normalizar_projeto_integrado(dados or {}, roadmap_ids=ids)
    return upsert_projeto_integrado(projeto)


def atualizar_projeto_integrado(pid, dados):
    atual = obter_projeto_integrado_por_id(pid)
    if not atual:
        return None
    ids = (
        assert_roadmap_ids(dados["roadmapIds"])
        if dados.get("roadmapIds")
        else atual["roadmapIds"]
    )
    mesclado = {**atual, **(dados or {}), "id": atual["id"], "roadmapIds": ids, "criadoEm": atual["criadoEm"]}
    if dados.get("concluido") is True:
        mesclado["concluido"] = True
        mesclado["concluidoEm"] = atual.get("concluidoEm") or agora_iso()
    elif dados.get("concluido") is False:
        mesclado["concluido"] = False
        mesclado["concluidoEm"] = None
    projeto = normalizar_projeto_integrado(mesclado, roadmap_ids=ids, preservar_id=atual["id"])
    return upsert_projeto_integrado(projeto)


def _toggle(projeto, colecao, item_id, concluido, etapa_id):
    if colecao == "etapas":
        etapa = next(
            (e for e in projeto["etapas"] if e["id"] == etapa_id or e["id"] == item_id),
            None,
        )
        if not etapa:
            raise AppError("Etapa não encontrada", 404)
        if etapa_id and item_id and etapa_id != item_id:
            tarefa = next((t for t in etapa["tarefas"] if t["id"] == item_id), None)
            if not tarefa:
                raise AppError("Tarefa da etapa não encontrada", 404)
            tarefa["concluido"] = bool(concluido) if concluido is not None else not tarefa["concluido"]
            etapa["concluida"] = bool(etapa["tarefas"]) and all(
                t.get("concluido") for t in etapa["tarefas"]
            )
        else:
            etapa["concluida"] = bool(concluido) if concluido is not None else not etapa["concluida"]
            if etapa["concluida"]:
                for t in etapa["tarefas"]:
                    t["concluido"] = True
    elif colecao in COLECOES_ITEM:
        item = next((i for i in projeto[colecao] if i["id"] == item_id), None)
        if not item:
            raise AppError("Item não encontrado", 404)
        item["concluido"] = bool(concluido) if concluido is not None else not item["concluido"]
    else:
        raise AppError("Coleção inválida")
    progresso = calcular_progresso_projeto(projeto)
    if progresso["progresso"] >= 100:
        projeto["concluido"] = True
        projeto["concluidoEm"] = projeto.get("concluidoEm") or agora_iso()
    projeto["atualizadoEm"] = agora_iso()
    return projeto


def toggle_item_final(pid, colecao, item_id, concluido=None, etapa_id=None):
    projeto = obter_projeto_final_por_id(pid)
    if not projeto:
        return None
    projeto = _toggle(projeto, colecao, item_id, concluido, etapa_id)
    return upsert_projeto_final(projeto)


def toggle_item_integrado(pid, colecao, item_id, concluido=None, etapa_id=None):
    projeto = obter_projeto_integrado_por_id(pid)
    if not projeto:
        return None
    projeto = _toggle(projeto, colecao, item_id, concluido, etapa_id)
    return upsert_projeto_integrado(projeto)


def remover_roadmap_dos_integrados(roadmap_id):
    rid = str(roadmap_id or "").strip()
    if not rid:
        return False
    mudou = False
    for row in list(ProjetoIntegrado.objects.all()):
        projeto = obter_projeto_integrado_por_id(row.id)
        if not projeto or rid not in projeto["roadmapIds"]:
            continue
        mudou = True
        restantes = [i for i in projeto["roadmapIds"] if i != rid]
        if len(restantes) >= MIN_ROADMAPS_INTEGRADO:
            upsert_projeto_integrado(
                normalizar_projeto_integrado(
                    {**projeto, "roadmapIds": restantes},
                    roadmap_ids=restantes,
                    preservar_id=projeto["id"],
                )
            )
        else:
            excluir_projeto_integrado(projeto["id"])
    return mudou


def carregar_roadmaps_elegiveis(ids_brutos):
    ids = assert_roadmap_ids(ids_brutos)
    pares = []
    for rid in ids:
        roadmap = obter_roadmap(rid)
        if not roadmap:
            raise AppError(f"Roadmap não encontrado: {rid}", 404)
        assert_elegivel(roadmap)
        pares.append({"roadmap": roadmap, "progresso": calcular_progresso_tarefas(roadmap)["progresso"]})
    pares.sort(key=lambda x: -x["progresso"])
    para_prompt = [p["roadmap"] for p in pares[:MAX_ROADMAPS_NO_PROMPT]]
    truncado = len(pares) > MAX_ROADMAPS_NO_PROMPT
    return {
        "roadmapIds": ids,
        "roadmaps": [p["roadmap"] for p in pares],
        "paraPrompt": para_prompt,
        "truncado": truncado,
        "avisoTruncamento": (
            f"Foram selecionados {len(pares)} roadmaps; o prompt usa os {MAX_ROADMAPS_NO_PROMPT} com maior progresso."
            if truncado
            else None
        ),
    }


def montar_contexto_integrado_compacto(roadmaps, aviso=None):
    blocos = []
    for r in roadmaps:
        comps = sorted(calcular_dominio_competencias(r), key=lambda c: -c["dominio"])[:8]
        blocos.append(
            {
                "id": r["id"],
                "nome": r["nome"],
                "progressoTarefas": calcular_progresso_tarefas(r)["progresso"],
                "competencias": [
                    {"id": c["id"], "nome": c["nome"], "dominio": c["dominio"], "roadmapId": r["id"]}
                    for c in comps
                ],
                "tarefas": [
                    {"titulo": t["titulo"], "concluida": bool(t.get("concluida"))}
                    for t in (r.get("tarefas") or [])[:25]
                ],
            }
        )
    todas = [t for r in roadmaps for t in r.get("tarefas") or []]
    dados = {
        "roadmaps": blocos,
        "atributosFrequentes": frequencias([a for t in todas for a in t.get("atributos") or []])[:6],
        "tagsFrequentes": frequencias([a for t in todas for a in t.get("tags") or []])[:6],
    }
    if aviso:
        dados["aviso"] = aviso
    return dados


def montar_contexto_integrado_completo(roadmaps, aviso=None):
    base = montar_contexto_integrado_compacto(roadmaps, aviso)
    for i, r in enumerate(roadmaps):
        tarefas = []
        for t in (r.get("tarefas") or [])[:20]:
            item = {
                "titulo": t["titulo"],
                "tipo": t.get("tipo"),
                "dificuldade": t.get("dificuldade"),
                "concluida": bool(t.get("concluida")),
            }
            subs = t.get("subtarefas") or []
            if 0 < len(subs) <= 3:
                item["subtarefas"] = [
                    {"titulo": s["titulo"], "concluida": bool(s.get("concluida"))} for s in subs
                ]
            tarefas.append(item)
        base["roadmaps"][i]["tarefas"] = tarefas
    return base
