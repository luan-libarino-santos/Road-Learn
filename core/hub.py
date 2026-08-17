from urllib.parse import urlparse, urlunparse

_LOCAL = {"127.0.0.1", "localhost", "0.0.0.0", "::1"}


def hub_publico(request, url: str) -> str:
    """Troca localhost/127.0.0.1 pelo Host da requisição, mantendo a porta do app."""
    if not url:
        return url
    parsed = urlparse(url)
    atual = (request.get_host() or "").split(":")[0]
    if not atual or parsed.hostname not in _LOCAL:
        return url
    netloc = f"{atual}:{parsed.port}" if parsed.port else atual
    scheme = "https" if request.is_secure() else (parsed.scheme or "http")
    path = parsed.path or "/"
    return urlunparse((scheme, netloc, path, "", parsed.query, parsed.fragment))
