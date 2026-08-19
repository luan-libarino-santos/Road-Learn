import re
from pathlib import Path

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

ENV_PATH = Path(settings.BASE_DIR) / ".env"

CHAVES = {
    "geminiApiKey": "GEMINI_API_KEY",
    "youtubeApiKey": "YOUTUBE_API_KEY",
    "braveApiKey": "BRAVE_API_KEY",
}


def _mascarar(valor: str) -> str:
    if not valor:
        return ""
    if len(valor) <= 8:
        return "***"
    return valor[:4] + "..." + valor[-4:]


def _ler_valores_env() -> dict[str, str]:
    if not ENV_PATH.exists():
        return {k: "" for k in CHAVES}
    texto = ENV_PATH.read_text(encoding="utf-8")
    resultado = {}
    for chave_json, chave_env in CHAVES.items():
        m = re.search(rf"^{chave_env}=(.*)$", texto, re.MULTILINE)
        resultado[chave_json] = m.group(1).strip() if m else ""
    return resultado


def _escrever_env(atualizacoes: dict[str, str]) -> None:
    texto = ENV_PATH.read_text(encoding="utf-8") if ENV_PATH.exists() else ""
    for chave_json, novo_valor in atualizacoes.items():
        chave_env = CHAVES[chave_json]
        if re.search(rf"^{chave_env}=", texto, re.MULTILINE):
            texto = re.sub(
                rf"^{chave_env}=.*$",
                f"{chave_env}={novo_valor}",
                texto,
                flags=re.MULTILINE,
            )
        else:
            texto = texto.rstrip("\n") + f"\n{chave_env}={novo_valor}\n"
    ENV_PATH.write_text(texto, encoding="utf-8")


def _valor_e_mascara(valor: str) -> bool:
    """Retorna True se o valor parece ser um mascarado (não deve ser gravado)."""
    return "..." in valor and len(valor) <= 12


@api_view(["GET", "POST"])
def config(request):
    if request.method == "GET":
        valores = _ler_valores_env()
        return Response({k: _mascarar(v) for k, v in valores.items()})

    # POST — grava apenas campos com valores reais (não mascarados e não vazios)
    atualizacoes: dict[str, str] = {}
    for chave_json in CHAVES:
        valor = request.data.get(chave_json, "")
        if not isinstance(valor, str):
            continue
        valor = valor.strip()
        if valor and not _valor_e_mascara(valor):
            atualizacoes[chave_json] = valor

    if atualizacoes:
        _escrever_env(atualizacoes)
        for chave_json, novo_valor in atualizacoes.items():
            chave_env = CHAVES[chave_json]
            setattr(settings, chave_env, novo_valor)

    return Response({"ok": True, "atualizados": list(atualizacoes.keys())})
