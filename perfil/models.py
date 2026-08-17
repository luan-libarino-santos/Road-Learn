from django.db import models


class Perfil(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    xp = models.FloatField(default=0)
    atualizado_em = models.CharField(max_length=40)
    identidade_json = models.TextField(default="{}")
    tema_json = models.TextField(default="{}")


class PerfilHabilidade(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    tipo = models.CharField(max_length=20)
    nome = models.CharField(max_length=255)
    nivel = models.FloatField(default=0)


class PerfilLogXp(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    em = models.CharField(max_length=40)
    delta = models.FloatField()
    origem = models.CharField(max_length=40, blank=True, default="")
    rotulo = models.CharField(max_length=120, blank=True, default="")
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ["ordem", "-em"]


class PerfilHistoricoHabilidade(models.Model):
    em = models.CharField(max_length=12, primary_key=True)
    itens_json = models.TextField(default="[]")


class PerfilRoadmapBonus(models.Model):
    roadmap_id = models.CharField(max_length=64, primary_key=True)
