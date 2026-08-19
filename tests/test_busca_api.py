from django.test import Client, TestCase, override_settings
from unittest.mock import patch


class SaudeBuscaManifestTests(TestCase):
    def test_saude_inclui_manifest_busca(self):
        r = Client().get("/api/v1/saude")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("busca", body)
        self.assertEqual(body["busca"]["basePath"], "/api/v1/busca")
        ids = {i["id"] for i in body["busca"]["intencoes"]}
        self.assertEqual(ids, {"youtube", "brave", "agregada"})
        self.assertIn("youtube", body["busca"]["fontes"])
        self.assertIn("brave", body["busca"]["fontes"])


class BuscaApiValidacaoTests(TestCase):
    def test_youtube_sem_query(self):
        r = Client().get("/api/v1/busca/youtube")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["code"], "QUERY_OBRIGATORIA")

    def test_brave_sem_query(self):
        r = Client().post(
            "/api/v1/busca/brave",
            data={},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["code"], "QUERY_OBRIGATORIA")

    def test_agregada_sem_query(self):
        r = Client().get("/api/v1/busca")
        self.assertEqual(r.status_code, 400)

    def test_buscar_fontes_sem_query(self):
        r = Client().post(
            "/api/v1/buscar-fontes",
            data={},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("erro", r.json())


@override_settings(YOUTUBE_API_KEY="", BRAVE_API_KEY="")
class BuscaNaoConfiguradaTests(TestCase):
    def test_youtube_503(self):
        r = Client().get("/api/v1/busca/youtube", {"q": "docker"})
        self.assertEqual(r.status_code, 503)
        body = r.json()
        self.assertEqual(body["code"], "YOUTUBE_NAO_CONFIGURADO")
        self.assertFalse(body["configurada"])
        self.assertEqual(body["resultados"], [])

    def test_brave_503(self):
        r = Client().get("/api/v1/busca/brave", {"q": "docker"})
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["code"], "BRAVE_NAO_CONFIGURADO")

    def test_agregada_503(self):
        r = Client().get("/api/v1/busca", {"q": "docker"})
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["code"], "BUSCA_NAO_CONFIGURADA")

    def test_buscar_fontes_vazio(self):
        r = Client().post(
            "/api/v1/buscar-fontes",
            data={"query": "docker"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["fontes"], [])


@override_settings(YOUTUBE_API_KEY="fake-yt", BRAVE_API_KEY="fake-brave")
class BuscaMockTests(TestCase):
    def test_youtube_sucesso(self):
        pacote = {
            "ok": True,
            "configurada": True,
            "code": None,
            "message": None,
            "resultados": [
                {
                    "titulo": "Docker em 100s",
                    "url": "https://www.youtube.com/watch?v=abc",
                    "tipo": "video",
                    "videoId": "abc",
                    "canal": "Fireship",
                    "publicadoEm": "2024-01-01T00:00:00Z",
                    "descricao": "Intro",
                    "thumbnail": "",
                }
            ],
        }
        with patch("core.search_service.buscar_youtube", return_value=pacote):
            r = Client().get("/api/v1/busca/youtube", {"q": "docker", "limite": "3"})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["fonte"], "youtube")
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["resultados"][0]["videoId"], "abc")

    def test_brave_post(self):
        pacote = {
            "ok": True,
            "configurada": True,
            "code": None,
            "message": None,
            "resultados": [
                {
                    "titulo": "Docs Docker",
                    "url": "https://docs.docker.com",
                    "tipo": "artigo",
                    "descricao": "Official docs",
                    "site": "docs.docker.com",
                    "favicon": "",
                }
            ],
        }
        with patch("core.search_service.buscar_brave", return_value=pacote):
            r = Client().post(
                "/api/v1/busca/brave",
                data={"query": "docker", "limite": 5},
                content_type="application/json",
            )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["fonte"], "brave")
        self.assertEqual(r.json()["resultados"][0]["site"], "docs.docker.com")
