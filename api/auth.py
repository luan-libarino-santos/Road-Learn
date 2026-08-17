from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ApiKeyUser:
    is_authenticated = True
    pk = None
    username = "api-key"


class ApiKeyAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header:
            return None
        parts = header.split(None, 1)
        if len(parts) != 2 or parts[0] != self.keyword:
            return None
        key = parts[1].strip()
        expected = settings.ROADLEARN_API_KEY
        if not expected:
            raise AuthenticationFailed("ROADLEARN_API_KEY não configurada.")
        if key != expected:
            raise AuthenticationFailed("API key inválida.")
        return (ApiKeyUser(), key)

    def authenticate_header(self, request):
        return self.keyword
