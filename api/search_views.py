from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core import search_service


def _query_e_limite(request):
    if request.method == "POST":
        data = request.data if isinstance(request.data, dict) else {}
        query = data.get("query") or data.get("q") or ""
        limite = data.get("limite") or data.get("maxResults") or search_service.LIMITE_PADRAO
    else:
        query = request.GET.get("q") or request.GET.get("query") or ""
        limite = request.GET.get("limite") or request.GET.get("maxResults") or search_service.LIMITE_PADRAO
    return str(query).strip(), search_service.limitar(limite)


def _status_fonte(pacote: dict) -> int:
    if pacote.get("ok"):
        return 200
    code = pacote.get("code") or ""
    if code.endswith("NAO_CONFIGURADO") or code.endswith("NAO_CONFIGURADA"):
        return 503
    if "TIMEOUT" in code:
        return 504
    return 502


def _envelope_fonte(fonte: str, query: str, pacote: dict) -> dict:
    body = {
        "ok": pacote["ok"],
        "fonte": fonte,
        "query": query,
        "configurada": pacote["configurada"],
        "total": len(pacote.get("resultados") or []),
        "resultados": pacote.get("resultados") or [],
    }
    if not pacote["ok"]:
        body["code"] = pacote.get("code")
        body["message"] = pacote.get("message")
    return body


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def busca_youtube(request):
    query, limite = _query_e_limite(request)
    if not query:
        return Response({"ok": False, "code": "QUERY_OBRIGATORIA", "message": "Informe q ou query."}, status=400)
    pacote = search_service.buscar_youtube(query, limite)
    return Response(_envelope_fonte("youtube", query, pacote), status=_status_fonte(pacote))


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def busca_brave(request):
    query, limite = _query_e_limite(request)
    if not query:
        return Response({"ok": False, "code": "QUERY_OBRIGATORIA", "message": "Informe q ou query."}, status=400)
    pacote = search_service.buscar_brave(query, limite)
    return Response(_envelope_fonte("brave", query, pacote), status=_status_fonte(pacote))


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def busca_agregada(request):
    query, limite = _query_e_limite(request)
    if not query:
        return Response({"ok": False, "code": "QUERY_OBRIGATORIA", "message": "Informe q ou query."}, status=400)
    pacote = search_service.buscar_agregada(query, limite)
    youtube = pacote["youtube"]
    brave = pacote["brave"]
    body = {
        "ok": pacote["ok"],
        "query": query,
        "total": len(pacote["resultados"]),
        "youtube": _envelope_fonte("youtube", query, youtube),
        "brave": _envelope_fonte("brave", query, brave),
        "resultados": pacote["resultados"],
    }
    if not pacote["ok"]:
        body["code"] = pacote.get("code")
        body["message"] = pacote.get("message")
        return Response(body, status=_status_fonte(pacote))
    return Response(body)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def buscar_fontes(request):
    """Alias da SPA: { fontes: [{ titulo, url, tipo }] }."""
    query, limite = _query_e_limite(request)
    if not query:
        return Response({"erro": "O campo 'query' é obrigatório."}, status=400)
    fontes = search_service.buscar_fontes(query, limite)
    return Response({"fontes": fontes})
