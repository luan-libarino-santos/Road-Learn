from django.db import models


class Roadmap(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, default="")
    criado_em = models.CharField(max_length=40)

    class Meta:
        ordering = ["criado_em"]

    def __str__(self):
        return self.nome


class Competencia(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    roadmap = models.ForeignKey(
        Roadmap, on_delete=models.CASCADE, related_name="competencias"
    )
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, default="")
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ["ordem", "nome"]
        indexes = [models.Index(fields=["roadmap"])]


class Tarefa(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    roadmap = models.ForeignKey(
        Roadmap, on_delete=models.CASCADE, related_name="tarefas"
    )
    titulo = models.CharField(max_length=500)
    descricao = models.TextField(blank=True, default="")
    prazo = models.CharField(max_length=40, blank=True, default="")
    horas_estimadas = models.FloatField(default=0)
    horas_reais = models.FloatField(default=0)
    concluida = models.BooleanField(default=False)
    concluida_em = models.CharField(max_length=40, null=True, blank=True)
    tipo = models.CharField(max_length=20, default="pratica")
    ordem = models.IntegerField(default=0)
    observacoes = models.TextField(blank=True, default="")
    criterio_conclusao = models.TextField(blank=True, default="")
    dificuldade = models.CharField(max_length=20, default="medio")
    prioridade = models.CharField(max_length=20, default="media")
    review_after_days = models.FloatField(default=0)
    timer_ativo_desde = models.CharField(max_length=40, null=True, blank=True)
    criada_em = models.CharField(max_length=40)

    class Meta:
        ordering = ["ordem", "criada_em"]
        indexes = [models.Index(fields=["roadmap"])]


class TarefaDep(models.Model):
    tarefa = models.ForeignKey(
        Tarefa, on_delete=models.CASCADE, related_name="deps"
    )
    depends_on_id = models.CharField(max_length=64)

    class Meta:
        unique_together = ("tarefa", "depends_on_id")


class TarefaCompetencia(models.Model):
    tarefa = models.ForeignKey(
        Tarefa, on_delete=models.CASCADE, related_name="comps"
    )
    competencia_id = models.CharField(max_length=64)

    class Meta:
        unique_together = ("tarefa", "competencia_id")


class TarefaTag(models.Model):
    tarefa = models.ForeignKey(
        Tarefa, on_delete=models.CASCADE, related_name="tags_rel"
    )
    tag = models.CharField(max_length=80)

    class Meta:
        unique_together = ("tarefa", "tag")


class TarefaAtributo(models.Model):
    tarefa = models.ForeignKey(
        Tarefa, on_delete=models.CASCADE, related_name="attrs_rel"
    )
    atributo = models.CharField(max_length=80)

    class Meta:
        unique_together = ("tarefa", "atributo")


class Link(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    tarefa = models.ForeignKey(
        Tarefa, on_delete=models.CASCADE, related_name="links"
    )
    titulo = models.CharField(max_length=255, blank=True, default="")
    url = models.TextField(blank=True, default="")
    tipo = models.CharField(max_length=20, default="outro")
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ["ordem"]


class Subtarefa(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    tarefa = models.ForeignKey(
        Tarefa, on_delete=models.CASCADE, related_name="subtarefas"
    )
    titulo = models.CharField(max_length=500, blank=True, default="")
    concluida = models.BooleanField(default=False)
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ["ordem"]


class HistoricoTarefa(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    tarefa = models.ForeignKey(
        Tarefa, on_delete=models.CASCADE, related_name="historico"
    )
    em = models.CharField(max_length=40)
    tipo = models.CharField(max_length=40, default="editada")
    detalhe = models.TextField(blank=True, default="")
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ["ordem", "em"]


class SidebarGrupo(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    nome = models.CharField(max_length=120)
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ["ordem", "nome"]


class SidebarAtribuicao(models.Model):
    roadmap = models.OneToOneField(
        Roadmap, on_delete=models.CASCADE, related_name="sidebar", primary_key=True
    )
    grupo = models.ForeignKey(
        SidebarGrupo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="atribuicoes",
    )
    ordem = models.IntegerField(default=0)
    ordem_todos = models.IntegerField(default=0)
