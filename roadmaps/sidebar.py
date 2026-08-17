from core.errors import AppError
from core.ids import gerar_id
from roadmaps.models import Roadmap, SidebarAtribuicao, SidebarGrupo


def _erro(msg, status=400):
    raise AppError(msg, status)


def _ordenar_grupos(grupos):
    return sorted(grupos, key=lambda g: (g["ordem"], g["nome"]))


def obter_sidebar():
    grupos = [
        {"id": g.id, "nome": g.nome, "ordem": g.ordem}
        for g in SidebarGrupo.objects.all()
    ]
    grupos = _ordenar_grupos([g for g in grupos if g["nome"]])
    ids_grupo = {g["id"] for g in grupos}
    atribuicoes = {}
    for a in SidebarAtribuicao.objects.select_related("grupo").all():
        gid = a.grupo_id if a.grupo_id in ids_grupo else None
        atribuicoes[a.roadmap_id] = {
            "grupoId": gid,
            "ordem": a.ordem,
            "ordemTodos": a.ordem_todos,
        }
    return {"grupos": grupos, "atribuicoes": atribuicoes}


def criar_grupo(nome):
    nome_limpo = str(nome or "").strip()
    if not nome_limpo:
        _erro("Nome do grupo é obrigatório")
    if SidebarGrupo.objects.filter(nome__iexact=nome_limpo).exists():
        _erro("Já existe um grupo com esse nome")
    grupo = SidebarGrupo.objects.create(
        id=gerar_id(),
        nome=nome_limpo,
        ordem=SidebarGrupo.objects.count(),
    )
    return {"id": grupo.id, "nome": grupo.nome, "ordem": grupo.ordem}


def atualizar_grupo(grupo_id, dados=None):
    dados = dados or {}
    try:
        grupo = SidebarGrupo.objects.get(pk=grupo_id)
    except SidebarGrupo.DoesNotExist:
        return None
    if "nome" in dados:
        nome_limpo = str(dados["nome"]).strip()
        if not nome_limpo:
            _erro("Nome do grupo é obrigatório")
        if (
            SidebarGrupo.objects.exclude(pk=grupo_id)
            .filter(nome__iexact=nome_limpo)
            .exists()
        ):
            _erro("Já existe um grupo com esse nome")
        grupo.nome = nome_limpo
    if dados.get("ordem") is not None:
        try:
            grupo.ordem = int(dados["ordem"])
        except (TypeError, ValueError):
            pass
    grupo.save()
    grupos = list(SidebarGrupo.objects.all())
    grupos.sort(key=lambda g: (g.ordem, g.nome))
    for i, g in enumerate(grupos):
        if g.ordem != i:
            g.ordem = i
            g.save(update_fields=["ordem"])
    grupo.refresh_from_db()
    return {"id": grupo.id, "nome": grupo.nome, "ordem": grupo.ordem}


def excluir_grupo(grupo_id):
    try:
        grupo = SidebarGrupo.objects.get(pk=grupo_id)
    except SidebarGrupo.DoesNotExist:
        return False
    grupo.delete()
    for i, g in enumerate(SidebarGrupo.objects.order_by("ordem", "nome")):
        g.ordem = i
        g.save(update_fields=["ordem"])
    return True


def reordenar_grupos(ids):
    if not isinstance(ids, list) or not ids:
        _erro("Lista de ids é obrigatória")
    existentes = list(SidebarGrupo.objects.all())
    mapa = {g.id: g for g in existentes}
    if any(i not in mapa for i in ids) or len(ids) != len(mapa):
        _erro("Lista de grupos inválida")
    for i, gid in enumerate(ids):
        g = mapa[gid]
        g.ordem = i
        g.save(update_fields=["ordem"])
    return obter_sidebar()["grupos"]


def _reindexar_grupo(grupo_id):
    qs = SidebarAtribuicao.objects.filter(grupo_id=grupo_id).order_by("ordem")
    for i, a in enumerate(qs):
        if a.ordem != i:
            a.ordem = i
            a.save(update_fields=["ordem"])


def _reindexar_todos():
    qs = SidebarAtribuicao.objects.order_by("ordem_todos")
    for i, a in enumerate(qs):
        if a.ordem_todos != i:
            a.ordem_todos = i
            a.save(update_fields=["ordem_todos"])


def atribuir_roadmap(roadmap_id, dados=None):
    dados = dados or {}
    if not Roadmap.objects.filter(pk=roadmap_id).exists():
        _erro("Roadmap não encontrado", 404)
    atrib, _ = SidebarAtribuicao.objects.get_or_create(
        roadmap_id=roadmap_id,
        defaults={"ordem": 0, "ordem_todos": SidebarAtribuicao.objects.count()},
    )
    grupo_anterior = atrib.grupo_id
    if "grupoId" in dados:
        gid = dados["grupoId"]
        if gid in (None, ""):
            atrib.grupo = None
        else:
            if not SidebarGrupo.objects.filter(pk=gid).exists():
                _erro("Grupo não encontrado")
            atrib.grupo_id = gid
    if dados.get("ordem") is not None:
        atrib.ordem = int(dados["ordem"])
    if dados.get("ordemTodos") is not None:
        atrib.ordem_todos = int(dados["ordemTodos"])
    atrib.save()
    if grupo_anterior and grupo_anterior != atrib.grupo_id:
        _reindexar_grupo(grupo_anterior)
    if atrib.grupo_id:
        if "ordem" not in dados:
            max_o = (
                SidebarAtribuicao.objects.filter(grupo_id=atrib.grupo_id)
                .exclude(pk=atrib.pk)
                .order_by("-ordem")
                .values_list("ordem", flat=True)
                .first()
            )
            atrib.ordem = (max_o if max_o is not None else -1) + 1
            atrib.save(update_fields=["ordem"])
        _reindexar_grupo(atrib.grupo_id)
    return {
        "grupoId": atrib.grupo_id,
        "ordem": atrib.ordem,
        "ordemTodos": atrib.ordem_todos,
    }


def reordenar_roadmaps(grupo_id, ids):
    if not isinstance(ids, list):
        _erro("Lista de ids é obrigatória")
    grupo = grupo_id or None
    for i, rid in enumerate(ids):
        atrib, _ = SidebarAtribuicao.objects.get_or_create(
            roadmap_id=rid, defaults={"ordem": i, "ordem_todos": i}
        )
        if grupo:
            atrib.grupo_id = grupo
            atrib.ordem = i
        else:
            atrib.ordem_todos = i
        atrib.save()
    return obter_sidebar()["atribuicoes"]


def remover_roadmap_das_atribuicoes(roadmap_id):
    try:
        atrib = SidebarAtribuicao.objects.get(pk=roadmap_id)
    except SidebarAtribuicao.DoesNotExist:
        return
    grupo_id = atrib.grupo_id
    atrib.delete()
    if grupo_id:
        _reindexar_grupo(grupo_id)
    _reindexar_todos()


def atribuir_se_novo(roadmap_id):
    if SidebarAtribuicao.objects.filter(pk=roadmap_id).exists():
        return
    max_todos = (
        SidebarAtribuicao.objects.order_by("-ordem_todos")
        .values_list("ordem_todos", flat=True)
        .first()
    )
    SidebarAtribuicao.objects.create(
        roadmap_id=roadmap_id,
        ordem=0,
        ordem_todos=(max_todos if max_todos is not None else -1) + 1,
    )


def inicializar_atribuicoes(roadmap_ids):
    ids = list(roadmap_ids)
    existentes = set(SidebarAtribuicao.objects.values_list("roadmap_id", flat=True))
    max_todos = (
        SidebarAtribuicao.objects.order_by("-ordem_todos")
        .values_list("ordem_todos", flat=True)
        .first()
    )
    n = max_todos if max_todos is not None else -1
    for rid in ids:
        if rid not in existentes:
            n += 1
            SidebarAtribuicao.objects.create(
                roadmap_id=rid, ordem=0, ordem_todos=n
            )
    validos = set(ids)
    SidebarAtribuicao.objects.exclude(roadmap_id__in=validos).delete()
    _reindexar_todos()
    return obter_sidebar()["atribuicoes"]
