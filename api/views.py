from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.errors import AppError
from core.hub import hub_publico
from perfil.services import (
    atualizar_identidade,
    garantir_perfil_inicial,
    rebuild_perfil,
)
from projetos import ia as ia_svc
from projetos.services import (
    atualizar_projeto_final,
    atualizar_projeto_integrado,
    criar_projeto_integrado,
    excluir_projeto_final,
    excluir_projeto_integrado,
    listar_projetos_integrados,
    obter_projeto_final_por_id,
    obter_projeto_final_por_roadmap,
    obter_projeto_integrado_por_id,
    toggle_item_final,
    toggle_item_integrado,
    upsert_final_dados,
)
from roadmaps.analytics import calcular_analytics_globais
from roadmaps.normalize import calcular_dominio_competencias, calcular_dominio_geral
from roadmaps.persist import listar_roadmaps, obter_roadmap
from roadmaps.services import (
    adicionar_competencia,
    adicionar_subtarefa,
    adicionar_tarefa,
    atualizar_competencia,
    atualizar_subtarefa,
    atualizar_tarefa,
    atualizar_roadmap,
    criar_roadmap,
    excluir_competencia,
    excluir_roadmap,
    excluir_subtarefa,
    excluir_tarefa,
    importar_de_json,
    iniciar_timer,
    mover_tarefa,
    parar_timer,
    registrar_tempo,
    reordenar_tarefas,
    timer_aberto,
)
from roadmaps import sidebar as sidebar_svc


def _erro(exc):
    status = getattr(exc, "status", 400) or 400
    return Response({"erro": str(exc)}, status=status)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def saude(request):
    return Response(
        {
            "ok": True,
            "app": "road-learn",
            "armazenamento": "sqlite",
            "hub": {
                "dinheiro": hub_publico(request, settings.HUB_DINHEIRO_URL),
                "treinos": hub_publico(request, settings.HUB_TREINOS_URL),
                "tasks": hub_publico(request, settings.HUB_TASKS_URL),
            },
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request):
    return Response({"csrfToken": get_token(request)})


@api_view(["GET"])
def analytics(request):
    roadmaps = listar_roadmaps()
    return Response(calcular_analytics_globais(roadmaps))


@api_view(["GET", "POST"])
def roadmaps_lista(request):
    if request.method == "GET":
        lista = listar_roadmaps()
        for r in lista:
            r["dominio"] = calcular_dominio_geral(r)
            r["competenciasDominio"] = calcular_dominio_competencias(r)
        return Response(lista)
    nome = (request.data or {}).get("nome") or ""
    if not str(nome).strip():
        return Response({"erro": "Nome é obrigatório"}, status=400)
    return Response(
        criar_roadmap(nome, (request.data or {}).get("descricao") or ""),
        status=201,
    )


@api_view(["POST"])
def roadmaps_importar(request):
    try:
        resultado = importar_de_json(request.data)
    except AppError as e:
        return _erro(e)
    return Response(
        {
            "quantidade": len(resultado["importados"]),
            "avisos": resultado["avisos"],
            "roadmaps": resultado["importados"],
        },
        status=201,
    )


@api_view(["POST"])
def roadmaps_gerar_preview(request):
    try:
        return Response(ia_svc.preview_prompt_geracao(request.data))
    except AppError as e:
        return _erro(e)


@api_view(["POST"])
def roadmaps_gerar(request):
    try:
        return Response(ia_svc.gerar_roadmap_com_ia(request.data))
    except AppError as e:
        return _erro(e)


@api_view(["GET", "PUT", "DELETE"])
def roadmap_detalhe(request, roadmap_id):
    if request.method == "GET":
        r = obter_roadmap(roadmap_id)
        if not r:
            return Response({"erro": "Roadmap não encontrado"}, status=404)
        r["dominio"] = calcular_dominio_geral(r)
        r["competenciasDominio"] = calcular_dominio_competencias(r)
        return Response(r)
    if request.method == "DELETE":
        if not obter_roadmap(roadmap_id):
            return Response({"erro": "Roadmap não encontrado"}, status=404)
        excluir_roadmap(roadmap_id)
        return Response(status=204)
    try:
        r = atualizar_roadmap(roadmap_id, request.data or {})
    except AppError as e:
        return _erro(e)
    if not r:
        return Response({"erro": "Roadmap não encontrado"}, status=404)
    return Response(r)


@api_view(["POST"])
def competencias_criar(request, roadmap_id):
    try:
        c = adicionar_competencia(roadmap_id, request.data or {})
    except AppError as e:
        return _erro(e)
    if not c:
        return Response({"erro": "Roadmap não encontrado"}, status=404)
    return Response(c, status=201)


@api_view(["PUT", "DELETE"])
def competencia_detalhe(request, roadmap_id, competencia_id):
    if request.method == "DELETE":
        if not obter_roadmap(roadmap_id):
            return Response({"erro": "Roadmap não encontrado"}, status=404)
        excluir_competencia(roadmap_id, competencia_id)
        return Response(status=204)
    try:
        c = atualizar_competencia(roadmap_id, competencia_id, request.data or {})
    except AppError as e:
        return _erro(e)
    if not c:
        return Response({"erro": "Competência não encontrada"}, status=404)
    return Response(c)


@api_view(["POST"])
def tarefas_criar(request, roadmap_id):
    t = adicionar_tarefa(roadmap_id, request.data or {})
    if not t:
        return Response({"erro": "Roadmap não encontrado"}, status=404)
    return Response(t, status=201)


@api_view(["PUT"])
def tarefas_reordenar(request, roadmap_id):
    ids = (request.data or {}).get("ids")
    if not isinstance(ids, list):
        return Response({"erro": "Lista de ids inválida"}, status=400)
    r = reordenar_tarefas(roadmap_id, ids)
    if not r:
        return Response({"erro": "Não foi possível reordenar"}, status=400)
    return Response(r)


@api_view(["PUT", "DELETE"])
def tarefa_detalhe(request, roadmap_id, tarefa_id):
    if request.method == "DELETE":
        excluir_tarefa(roadmap_id, tarefa_id)
        return Response(status=204)
    try:
        t = atualizar_tarefa(roadmap_id, tarefa_id, request.data or {})
    except AppError as e:
        return _erro(e)
    if not t:
        return Response({"erro": "Tarefa não encontrada"}, status=404)
    return Response(t)


@api_view(["POST"])
def tarefa_tempo(request, roadmap_id, tarefa_id):
    try:
        t = registrar_tempo(roadmap_id, tarefa_id, (request.data or {}).get("horas"))
    except AppError as e:
        return _erro(e)
    if not t:
        return Response({"erro": "Tarefa não encontrada"}, status=404)
    return Response(t)


@api_view(["POST"])
def tarefa_timer_iniciar(request, roadmap_id, tarefa_id):
    t = iniciar_timer(roadmap_id, tarefa_id)
    if not t:
        return Response({"erro": "Tarefa não encontrada"}, status=404)
    return Response(t)


@api_view(["POST"])
def tarefa_timer_parar(request, roadmap_id, tarefa_id):
    t = parar_timer(roadmap_id, tarefa_id)
    if not t:
        return Response({"erro": "Tarefa não encontrada"}, status=404)
    return Response(t)


@api_view(["PUT"])
def tarefa_mover(request, roadmap_id, tarefa_id):
    direcao = (request.data or {}).get("direcao")
    try:
        direcao = int(direcao)
    except (TypeError, ValueError):
        direcao = 0
    if direcao not in (1, -1):
        return Response({"erro": "Direção inválida"}, status=400)
    r = mover_tarefa(roadmap_id, tarefa_id, direcao)
    if not r:
        return Response({"erro": "Não foi possível mover"}, status=404)
    return Response(r)


@api_view(["POST"])
def subtarefas_criar(request, roadmap_id, tarefa_id):
    s = adicionar_subtarefa(roadmap_id, tarefa_id, (request.data or {}).get("titulo") or "")
    if not s:
        return Response({"erro": "Tarefa não encontrada"}, status=404)
    return Response(s, status=201)


@api_view(["PUT", "DELETE"])
def subtarefa_detalhe(request, roadmap_id, tarefa_id, subtarefa_id):
    if request.method == "DELETE":
        excluir_subtarefa(roadmap_id, tarefa_id, subtarefa_id)
        return Response(status=204)
    s = atualizar_subtarefa(roadmap_id, tarefa_id, subtarefa_id, request.data or {})
    if not s:
        return Response({"erro": "Subtarefa não encontrada"}, status=404)
    return Response(s)


@api_view(["GET"])
def timer(request):
    return Response({"aberta": timer_aberto()})


@api_view(["GET"])
def sidebar(request):
    ids = [r["id"] for r in listar_roadmaps()]
    sidebar_svc.inicializar_atribuicoes(ids)
    return Response(sidebar_svc.obter_sidebar())


@api_view(["POST"])
def sidebar_grupos(request):
    try:
        return Response(sidebar_svc.criar_grupo((request.data or {}).get("nome")), status=201)
    except AppError as e:
        return _erro(e)


@api_view(["PUT"])
def sidebar_grupos_reordenar(request):
    try:
        return Response(sidebar_svc.reordenar_grupos((request.data or {}).get("ids")))
    except AppError as e:
        return _erro(e)


@api_view(["PUT", "DELETE"])
def sidebar_grupo(request, grupo_id):
    if request.method == "DELETE":
        ok = sidebar_svc.excluir_grupo(grupo_id)
        if not ok:
            return Response({"erro": "Grupo não encontrado"}, status=404)
        return Response(status=204)
    try:
        g = sidebar_svc.atualizar_grupo(grupo_id, request.data or {})
    except AppError as e:
        return _erro(e)
    if not g:
        return Response({"erro": "Grupo não encontrado"}, status=404)
    return Response(g)


@api_view(["PUT"])
def sidebar_atribuir(request, roadmap_id):
    try:
        return Response(sidebar_svc.atribuir_roadmap(roadmap_id, request.data or {}))
    except AppError as e:
        return _erro(e)


@api_view(["PUT"])
def sidebar_reordenar(request):
    try:
        return Response(
            sidebar_svc.reordenar_roadmaps(
                (request.data or {}).get("grupoId"),
                (request.data or {}).get("ids"),
            )
        )
    except AppError as e:
        return _erro(e)


@api_view(["GET"])
def perfil_get(request):
    return Response(garantir_perfil_inicial())


@api_view(["POST"])
def perfil_rebuild(request):
    return Response(rebuild_perfil())


@api_view(["PATCH"])
def perfil_identidade(request):
    try:
        return Response(atualizar_identidade(request.data or {}))
    except AppError as e:
        return _erro(e)


@api_view(["GET", "POST"])
def projetos_finais(request):
    if request.method == "GET":
        rid = request.query_params.get("roadmapId") or ""
        if not rid.strip():
            return Response({"erro": "roadmapId é obrigatório"}, status=400)
        return Response(obter_projeto_final_por_roadmap(rid.strip()))
    try:
        rid = str((request.data or {}).get("roadmapId") or "").strip()
        if not rid:
            return Response({"erro": "roadmapId é obrigatório"}, status=400)
        return Response(upsert_final_dados(rid, request.data or {}), status=201)
    except AppError as e:
        return _erro(e)


@api_view(["POST"])
def pf_sugerir(request):
    try:
        return Response(ia_svc.sugerir_topicos_final((request.data or {}).get("roadmapId")))
    except AppError as e:
        return _erro(e)


@api_view(["POST"])
def pf_gerar(request):
    try:
        body = request.data or {}
        return Response(ia_svc.gerar_projeto_final_ia(body.get("roadmapId"), body.get("topico")))
    except AppError as e:
        return _erro(e)


@api_view(["GET", "PUT", "DELETE"])
def pf_detalhe(request, projeto_id):
    if request.method == "GET":
        p = obter_projeto_final_por_id(projeto_id)
        if not p:
            return Response({"erro": "Projeto Final não encontrado"}, status=404)
        return Response(p)
    if request.method == "DELETE":
        ok = excluir_projeto_final(projeto_id)
        if not ok:
            return Response({"erro": "Projeto Final não encontrado"}, status=404)
        return Response(status=204)
    p = atualizar_projeto_final(projeto_id, request.data or {})
    if not p:
        return Response({"erro": "Projeto Final não encontrado"}, status=404)
    return Response(p)


@api_view(["PUT"])
def pf_itens(request, projeto_id):
    body = request.data or {}
    if not body.get("colecao") or not body.get("itemId"):
        return Response({"erro": "colecao e itemId são obrigatórios"}, status=400)
    try:
        p = toggle_item_final(
            projeto_id,
            body.get("colecao"),
            body.get("itemId"),
            body.get("concluido"),
            body.get("etapaId"),
        )
    except AppError as e:
        return _erro(e)
    if not p:
        return Response({"erro": "Projeto Final não encontrado"}, status=404)
    return Response(p)


@api_view(["GET", "POST"])
def projetos_integrados(request):
    if request.method == "GET":
        return Response(listar_projetos_integrados())
    try:
        return Response(criar_projeto_integrado(request.data or {}), status=201)
    except AppError as e:
        return _erro(e)


@api_view(["POST"])
def pi_sugerir(request):
    try:
        return Response(ia_svc.sugerir_topicos_integrado((request.data or {}).get("roadmapIds")))
    except AppError as e:
        return _erro(e)


@api_view(["POST"])
def pi_gerar(request):
    try:
        body = request.data or {}
        return Response(
            ia_svc.gerar_projeto_integrado_ia(body.get("roadmapIds"), body.get("topico"))
        )
    except AppError as e:
        return _erro(e)


@api_view(["GET", "PUT", "DELETE"])
def pi_detalhe(request, projeto_id):
    if request.method == "GET":
        p = obter_projeto_integrado_por_id(projeto_id)
        if not p:
            return Response({"erro": "Projeto Integrado não encontrado"}, status=404)
        return Response(p)
    if request.method == "DELETE":
        ok = excluir_projeto_integrado(projeto_id)
        if not ok:
            return Response({"erro": "Projeto Integrado não encontrado"}, status=404)
        return Response(status=204)
    try:
        p = atualizar_projeto_integrado(projeto_id, request.data or {})
    except AppError as e:
        return _erro(e)
    if not p:
        return Response({"erro": "Projeto Integrado não encontrado"}, status=404)
    return Response(p)


@api_view(["PUT"])
def pi_itens(request, projeto_id):
    body = request.data or {}
    if not body.get("colecao") or not body.get("itemId"):
        return Response({"erro": "colecao e itemId são obrigatórios"}, status=400)
    try:
        p = toggle_item_integrado(
            projeto_id,
            body.get("colecao"),
            body.get("itemId"),
            body.get("concluido"),
            body.get("etapaId"),
        )
    except AppError as e:
        return _erro(e)
    if not p:
        return Response({"erro": "Projeto Integrado não encontrado"}, status=404)
    return Response(p)
