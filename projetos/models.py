from django.db import models


class ProjetoFinal(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    roadmap_id = models.CharField(max_length=64, unique=True)
    nome = models.CharField(max_length=255)
    objetivo = models.TextField(blank=True, default="")
    descricao = models.TextField(blank=True, default="")
    stack_json = models.TextField(default="[]")
    criterios_json = models.TextField(default="[]")
    competencias_json = models.TextField(default="[]")
    documentacao_json = models.TextField(default="{}")
    topico_json = models.TextField(default="{}")
    criado_em = models.CharField(max_length=40)
    atualizado_em = models.CharField(max_length=40)
    concluido = models.BooleanField(default=False)
    concluido_em = models.CharField(max_length=40, null=True, blank=True)


class ProjetoIntegrado(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    nome = models.CharField(max_length=255)
    objetivo = models.TextField(blank=True, default="")
    descricao = models.TextField(blank=True, default="")
    stack_json = models.TextField(default="[]")
    criterios_json = models.TextField(default="[]")
    competencias_json = models.TextField(default="[]")
    documentacao_json = models.TextField(default="{}")
    topico_json = models.TextField(default="{}")
    criado_em = models.CharField(max_length=40)
    atualizado_em = models.CharField(max_length=40)
    concluido = models.BooleanField(default=False)
    concluido_em = models.CharField(max_length=40, null=True, blank=True)


class ProjetoIntegradoRoadmap(models.Model):
    projeto = models.ForeignKey(
        ProjetoIntegrado, on_delete=models.CASCADE, related_name="roadmaps_rel"
    )
    roadmap_id = models.CharField(max_length=64)
    ordem = models.IntegerField(default=0)

    class Meta:
        unique_together = ("projeto", "roadmap_id")
        ordering = ["ordem"]


class ProjetoEtapa(models.Model):
    codigo = models.CharField(max_length=64)
    projeto_tipo = models.CharField(max_length=20)
    projeto_id = models.CharField(max_length=64)
    titulo = models.CharField(max_length=255, blank=True, default="")
    descricao = models.TextField(blank=True, default="")
    ordem = models.IntegerField(default=0)
    concluida = models.BooleanField(default=False)

    class Meta:
        unique_together = ("projeto_tipo", "projeto_id", "codigo")
        ordering = ["ordem"]
        indexes = [models.Index(fields=["projeto_tipo", "projeto_id"])]


class ProjetoItem(models.Model):
    codigo = models.CharField(max_length=64)
    projeto_tipo = models.CharField(max_length=20)
    projeto_id = models.CharField(max_length=64)
    colecao = models.CharField(max_length=40)
    titulo = models.CharField(max_length=500, blank=True, default="")
    concluido = models.BooleanField(default=False)
    ordem = models.IntegerField(default=0)
    etapa_id = models.CharField(max_length=64, null=True, blank=True)

    class Meta:
        unique_together = ("projeto_tipo", "projeto_id", "codigo")
        ordering = ["ordem"]
        indexes = [models.Index(fields=["projeto_tipo", "projeto_id"])]
