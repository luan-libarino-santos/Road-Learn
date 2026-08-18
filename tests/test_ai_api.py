from django.test import Client, TestCase

from roadmaps.services import criar_roadmap, importar_de_json


class SaudeAiManifestTests(TestCase):
    def test_saude_inclui_manifest_ai(self):
        r = Client().get("/api/v1/saude")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["app"], "road-learn")
        self.assertIn("ai", body)
        self.assertEqual(body["ai"]["basePath"], "/api/v1/ai")
        self.assertGreaterEqual(len(body["ai"]["intencoes"]), 7)


class AiApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        resultado = importar_de_json(
            {
                "nome": "Docker",
                "descricao": "Containers",
                "competencias": [{"id": "c_net", "nome": "Networking"}],
                "tarefas": [
                    {
                        "id": "t1",
                        "titulo": "Imagens",
                        "tipo": "pratica",
                        "prioridade": "media",
                        "concluida": True,
                        "competencias": ["c_net"],
                    },
                    {
                        "id": "t2",
                        "titulo": "Redes",
                        "tipo": "pratica",
                        "prioridade": "alta",
                        "dependsOn": ["t1"],
                        "competencias": ["c_net"],
                    },
                    {
                        "id": "t3",
                        "titulo": "Volumes",
                        "tipo": "pratica",
                        "prioridade": "baixa",
                        "dependsOn": ["t1"],
                        "competencias": ["c_net"],
                    },
                ],
            }
        )
        self.roadmap_id = resultado["importados"][0]["id"]

    def test_ai_proximo_retorna_tarefa_liberada(self):
        r = self.client.get("/api/v1/ai/proximo")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertIn("Redes", body["summary"])
        self.assertEqual(body["tarefa"]["titulo"], "Redes")
        self.assertEqual(body["tarefa"]["prioridade"], "alta")

    def test_ai_proximo_roadmap_inexistente(self):
        r = self.client.get("/api/v1/ai/proximo?roadmap=inexistente")
        self.assertEqual(r.status_code, 404)
        body = r.json()
        self.assertFalse(body["ok"])
        self.assertEqual(body["code"], "ROADMAP_NAO_ENCONTRADO")

    def test_ai_progresso_global_e_filtrado(self):
        r = self.client.get("/api/v1/ai/progresso")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertIn("global", body["data"])
        self.assertGreater(body["data"]["global"]["tarefasTotal"], 0)

        r2 = self.client.get(f"/api/v1/ai/progresso?roadmap={self.roadmap_id}")
        self.assertEqual(r2.status_code, 200)
        body2 = r2.json()
        self.assertEqual(body2["data"]["nome"], "Docker")
        self.assertIn("tarefas", body2["data"])

    def test_ai_resumo_semana(self):
        r = self.client.get("/api/v1/ai/resumo-semana")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertIn("atual", body["data"])
        self.assertIn("delta", body["data"])
        self.assertEqual(len(body["data"]["porDia"]), 7)

    def test_ai_hoje(self):
        r = self.client.get("/api/v1/ai/hoje")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["ok"])

    def test_ai_revisao(self):
        r = self.client.get("/api/v1/ai/revisao?limite=5")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["ok"])

    def test_ai_roadmap_resumo(self):
        r = self.client.get(f"/api/v1/ai/roadmap/{self.roadmap_id}/resumo")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["data"]["nome"], "Docker")
        self.assertIsNotNone(body["data"]["proximaLiberada"])

    def test_ai_elegibilidade_projeto(self):
        r = self.client.get(
            f"/api/v1/ai/roadmap/{self.roadmap_id}/elegibilidade-projeto"
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertIn("elegivel", body["data"])
        self.assertEqual(body["data"]["minimoPct"], 80)

    def test_ai_revisao_respeita_review_after_days(self):
        importar_de_json(
            {
                "nome": "Laravel",
                "competencias": [{"id": "c1", "nome": "MVC"}],
                "tarefas": [
                    {
                        "id": "lr1",
                        "titulo": "Controllers",
                        "concluida": True,
                        "concluidaEm": "2020-01-01T12:00:00Z",
                        "reviewAfterDays": 7,
                        "competencias": ["c1"],
                    }
                ],
            }
        )
        r = self.client.get("/api/v1/ai/revisao")
        body = r.json()
        self.assertTrue(body["ok"])
        self.assertGreater(body["data"]["total"], 0)
        self.assertEqual(body["data"]["tarefas"][0]["titulo"], "Controllers")
