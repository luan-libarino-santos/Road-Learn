import requests
from django.conf import settings

LIMITE_PADRAO = 5
LIMITE_MAX = 10

BUSCA_INTENCOES = [
    {
        "id": "youtube",
        "metodo": "GET",
        "path": "/youtube",
        "descricao": "Busca vídeos no YouTube Data API v3",
    },
    {
        "id": "brave",
        "metodo": "GET",
        "path": "/brave",
        "descricao": "Busca páginas na web via Brave Search",
    },
    {
        "id": "agregada",
        "metodo": "GET",
        "path": "/",
        "descricao": "YouTube + Brave no mesmo envelope",
    },
]


def manifest_busca():
    return {
        "versao": "1",
        "basePath": "/api/v1/busca",
        "intencoes": BUSCA_INTENCOES,
        "fontes": {
            "youtube": youtube_configurada(),
            "brave": brave_configurada(),
        },
    }


def limitar(n, padrao=LIMITE_PADRAO) -> int:
    try:
        n = int(n)
    except (TypeError, ValueError):
        n = padrao
    return max(1, min(n, LIMITE_MAX))


def youtube_configurada() -> bool:
    return bool((getattr(settings, "YOUTUBE_API_KEY", "") or "").strip())


def brave_configurada() -> bool:
    return bool((getattr(settings, "BRAVE_API_KEY", "") or "").strip())


def _falha(code: str, message: str, configurada: bool) -> dict:
    return {
        "ok": False,
        "configurada": configurada,
        "code": code,
        "message": message,
        "resultados": [],
    }


def _ok(resultados: list) -> dict:
    return {
        "ok": True,
        "configurada": True,
        "code": None,
        "message": None,
        "resultados": resultados,
    }


def buscar_youtube(query: str, max_results: int = LIMITE_PADRAO) -> dict:
    if not youtube_configurada():
        return _falha(
            "YOUTUBE_NAO_CONFIGURADO",
            "YOUTUBE_API_KEY não configurada. Defina em /configuracoes.",
            False,
        )
    limite = limitar(max_results)
    try:
        resp = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": limite,
                "key": settings.YOUTUBE_API_KEY,
            },
            timeout=10,
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
        resultados = []
        for item in items:
            video_id = (item.get("id") or {}).get("videoId")
            if not video_id:
                continue
            snippet = item.get("snippet") or {}
            thumb = ((snippet.get("thumbnails") or {}).get("default") or {}).get("url", "")
            resultados.append(
                {
                    "titulo": snippet.get("title") or "",
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "tipo": "video",
                    "videoId": video_id,
                    "canal": snippet.get("channelTitle") or "",
                    "publicadoEm": snippet.get("publishedAt") or "",
                    "descricao": snippet.get("description") or "",
                    "thumbnail": thumb,
                }
            )
        return _ok(resultados)
    except requests.Timeout:
        return _falha("YOUTUBE_TIMEOUT", "YouTube não respondeu a tempo.", True)
    except Exception as exc:
        return _falha("YOUTUBE_INDISPONIVEL", f"Falha na YouTube Data API: {exc}", True)


def buscar_brave(query: str, max_results: int = LIMITE_PADRAO) -> dict:
    if not brave_configurada():
        return _falha(
            "BRAVE_NAO_CONFIGURADO",
            "BRAVE_API_KEY não configurada. Defina em /configuracoes.",
            False,
        )
    limite = limitar(max_results)
    try:
        resp = requests.get(
            "https://api.search.brave.com/res/v1/web/search",
            params={"q": query, "count": limite},
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": settings.BRAVE_API_KEY,
            },
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json().get("web", {}).get("results", [])
        resultados = []
        for r in results[:limite]:
            url = r.get("url") or ""
            if not url:
                continue
            resultados.append(
                {
                    "titulo": r.get("title") or "",
                    "url": url,
                    "tipo": "artigo",
                    "descricao": r.get("description") or "",
                    "site": ((r.get("profile") or {}).get("name") or ""),
                    "favicon": ((r.get("profile") or {}).get("img") or r.get("favicon") or ""),
                }
            )
        return _ok(resultados)
    except requests.Timeout:
        return _falha("BRAVE_TIMEOUT", "Brave Search não respondeu a tempo.", True)
    except Exception as exc:
        return _falha("BRAVE_INDISPONIVEL", f"Falha na Brave Search API: {exc}", True)


def _achatar(pacote: dict) -> list[dict]:
    itens = []
    for r in pacote.get("resultados") or []:
        itens.append(
            {
                "titulo": r.get("titulo") or "",
                "url": r.get("url") or "",
                "tipo": r.get("tipo") or "outro",
            }
        )
    return itens


def buscar_fontes(query: str, max_results: int = LIMITE_PADRAO) -> list[dict]:
    """Agrega YouTube + Brave. Fonte sem chave é ignorada (uso interno da SPA)."""
    videos = buscar_youtube(query, max_results)
    artigos = buscar_brave(query, max_results)
    return _achatar(videos) + _achatar(artigos)


def buscar_agregada(query: str, max_results: int = LIMITE_PADRAO) -> dict:
    youtube = buscar_youtube(query, max_results)
    brave = buscar_brave(query, max_results)
    resultados = _achatar(youtube) + _achatar(brave)
    alguma_ok = youtube["ok"] or brave["ok"]
    alguma_config = youtube["configurada"] or brave["configurada"]
    if not alguma_config:
        return {
            "ok": False,
            "code": "BUSCA_NAO_CONFIGURADA",
            "message": "Nenhuma chave de busca configurada (YouTube ou Brave).",
            "query": query,
            "youtube": youtube,
            "brave": brave,
            "resultados": [],
        }
    if not alguma_ok:
        code = youtube.get("code") or brave.get("code")
        message = youtube.get("message") or brave.get("message")
        return {
            "ok": False,
            "code": code,
            "message": message,
            "query": query,
            "youtube": youtube,
            "brave": brave,
            "resultados": [],
        }
    return {
        "ok": True,
        "code": None,
        "message": None,
        "query": query,
        "youtube": youtube,
        "brave": brave,
        "resultados": resultados,
    }
