from django.test import Client, TestCase

from projetos.services import upsert_final_dados
from roadmaps.services import criar_roadmap


class SaudeTests(TestCase):
    def test_saude(self):
        r = Client().get("/api/v1/saude")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["ok"])
        self.assertIn("ai", r.json())


class ProjetoFinalApiTests(TestCase):
    def test_get_sem_projeto_retorna_204(self):
        r = Client().get("/api/v1/projetos-finais", {"roadmapId": "rm_inexistente"})
        self.assertEqual(r.status_code, 204)

    def test_carrega_tarefas_das_etapas_pelo_codigo(self):
        roadmap = criar_roadmap("Com projeto")
        salvo = upsert_final_dados(
            roadmap["id"],
            {
                "nome": "App",
                "etapas": [
                    {
                        "id": "e_setup",
                        "titulo": "Setup",
                        "tarefas": [{"id": "et_1", "titulo": "Init", "concluido": False}],
                    }
                ],
            },
        )
        r = Client().get("/api/v1/projetos-finais", {"roadmapId": roadmap["id"]})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["id"], salvo["id"])
        self.assertEqual(body["etapas"][0]["tarefas"][0]["titulo"], "Init")
