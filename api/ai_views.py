from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from roadmaps import ai_services


def _resposta_ai(resultado, code, message, status_erro=404):
    if code:
        return Response(
            {"ok": False, "code": code, "message": message},
            status=status_erro,
        )
    return Response(resultado)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ai_proximo(request):
    resultado, code, message = ai_services.ai_proximo(request.GET.get("roadmap"))
    return _resposta_ai(resultado, code, message)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ai_progresso(request):
    resultado, code, message = ai_services.ai_progresso(request.GET.get("roadmap"))
    return _resposta_ai(resultado, code, message)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ai_resumo_semana(request):
    resultado, code, message = ai_services.ai_resumo_semana()
    return _resposta_ai(resultado, code, message)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ai_hoje(request):
    resultado, code, message = ai_services.ai_hoje()
    return _resposta_ai(resultado, code, message)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ai_revisao(request):
    try:
        limite = int(request.GET.get("limite", 5))
    except (TypeError, ValueError):
        limite = 5
    resultado, code, message = ai_services.ai_revisao(limite)
    return _resposta_ai(resultado, code, message)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ai_roadmap_resumo(request, roadmap_id):
    resultado, code, message = ai_services.ai_roadmap_resumo(roadmap_id)
    return _resposta_ai(resultado, code, message)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ai_elegibilidade_projeto(request, roadmap_id):
    resultado, code, message = ai_services.ai_elegibilidade_projeto(roadmap_id)
    return _resposta_ai(resultado, code, message)
