from django.test import TestCase

from roadmaps.normalize import (
    calcular_dominio_competencias,
    calcular_dominio_geral,
    tarefa_esta_bloqueada,
)
from roadmaps.services import criar_roadmap, importar_de_json


class DominioTests(TestCase):
    def test_dominio_por_peso(self):
        roadmap = {
            "competencias": [{"id": "c1", "nome": "A", "descricao": ""}],
            "tarefas": [
                {
                    "id": "t1",
                    "horasEstimadas": 2,
                    "concluida": True,
                    "competenciasIds": ["c1"],
                },
                {
                    "id": "t2",
                    "horasEstimadas": 2,
                    "concluida": False,
                    "competenciasIds": ["c1"],
                },
            ],
        }
        d = calcular_dominio_competencias(roadmap)
        self.assertEqual(d[0]["dominio"], 50)
        self.assertEqual(calcular_dominio_geral(roadmap)["dominio"], 50)

    def test_bloqueio(self):
        tarefas = [
            {"id": "t1", "titulo": "A", "concluida": False, "dependsOn": []},
            {"id": "t2", "titulo": "B", "concluida": False, "dependsOn": ["t1"]},
        ]
        info = tarefa_esta_bloqueada(tarefas[1], tarefas)
        self.assertTrue(info["bloqueada"])


class ImportTests(TestCase):
    def test_importa_roadmap(self):
        resultado = importar_de_json(
            {
                "nome": "HTML",
                "descricao": "Base",
                "competencias": [{"id": "c_html", "nome": "HTML"}],
                "tarefas": [
                    {
                        "id": "t1",
                        "titulo": "Tags",
                        "tipo": "pesquisa",
                        "competencias": ["c_html"],
                    }
                ],
            }
        )
        self.assertEqual(resultado["quantidade"] if "quantidade" in resultado else len(resultado["importados"]), 1)
        r = criar_roadmap("Novo")
        self.assertEqual(r["nome"], "Novo")
        self.assertEqual(r["tarefas"], [])
