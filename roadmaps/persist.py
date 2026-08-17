from django.db import transaction

from roadmaps.models import (
    Competencia,
    HistoricoTarefa,
    Link,
    Roadmap,
    Subtarefa,
    Tarefa,
    TarefaAtributo,
    TarefaCompetencia,
    TarefaDep,
    TarefaTag,
)
from roadmaps.normalize import agora_iso, normalizar_roadmap


def _prefetch():
    return Roadmap.objects.prefetch_related(
        "competencias",
        "tarefas__deps",
        "tarefas__comps",
        "tarefas__tags_rel",
        "tarefas__attrs_rel",
        "tarefas__links",
        "tarefas__subtarefas",
        "tarefas__historico",
    )


def tarefa_para_dict(t: Tarefa) -> dict:
    return {
        "id": t.id,
        "titulo": t.titulo,
        "descricao": t.descricao,
        "prazo": t.prazo,
        "horasEstimadas": t.horas_estimadas,
        "horasReais": t.horas_reais,
        "concluida": t.concluida,
        "concluidaEm": t.concluida_em,
        "tipo": t.tipo,
        "ordem": t.ordem,
        "observacoes": t.observacoes,
        "criterioConclusao": t.criterio_conclusao,
        "dificuldade": t.dificuldade,
        "prioridade": t.prioridade,
        "tags": [x.tag for x in t.tags_rel.all()],
        "atributos": [x.atributo for x in t.attrs_rel.all()],
        "dependsOn": [x.depends_on_id for x in t.deps.all()],
        "competenciasIds": [x.competencia_id for x in t.comps.all()],
        "reviewAfterDays": t.review_after_days,
        "timerAtivoDesde": t.timer_ativo_desde,
        "links": [
            {"id": l.id, "titulo": l.titulo, "url": l.url, "tipo": l.tipo}
            for l in t.links.all()
        ],
        "subtarefas": [
            {"id": s.id, "titulo": s.titulo, "concluida": s.concluida}
            for s in t.subtarefas.all()
        ],
        "historico": [
            {"id": h.id, "em": h.em, "tipo": h.tipo, "detalhe": h.detalhe}
            for h in t.historico.all()
        ],
        "criadaEm": t.criada_em,
    }


def roadmap_para_dict(r: Roadmap) -> dict:
    dados = {
        "id": r.id,
        "nome": r.nome,
        "descricao": r.descricao,
        "criadoEm": r.criado_em,
        "competencias": [
            {
                "id": c.id,
                "nome": c.nome,
                "descricao": c.descricao,
                "ordem": c.ordem,
            }
            for c in r.competencias.all()
        ],
        "tarefas": [tarefa_para_dict(t) for t in r.tarefas.all()],
    }
    return normalizar_roadmap(dados)


def gravar_tarefa(roadmap: Roadmap, tarefa: dict):
    obj, _ = Tarefa.objects.update_or_create(
        id=tarefa["id"],
        defaults={
            "roadmap": roadmap,
            "titulo": tarefa.get("titulo") or "",
            "descricao": tarefa.get("descricao") or "",
            "prazo": tarefa.get("prazo") or "",
            "horas_estimadas": tarefa.get("horasEstimadas") or 0,
            "horas_reais": tarefa.get("horasReais") or 0,
            "concluida": bool(tarefa.get("concluida")),
            "concluida_em": tarefa.get("concluidaEm"),
            "tipo": tarefa.get("tipo") or "pratica",
            "ordem": int(tarefa.get("ordem") or 0),
            "observacoes": tarefa.get("observacoes") or "",
            "criterio_conclusao": tarefa.get("criterioConclusao") or "",
            "dificuldade": tarefa.get("dificuldade") or "medio",
            "prioridade": tarefa.get("prioridade") or "media",
            "review_after_days": tarefa.get("reviewAfterDays") or 0,
            "timer_ativo_desde": tarefa.get("timerAtivoDesde"),
            "criada_em": tarefa.get("criadaEm") or agora_iso(),
        },
    )
    obj.deps.all().delete()
    obj.comps.all().delete()
    obj.tags_rel.all().delete()
    obj.attrs_rel.all().delete()
    obj.links.all().delete()
    obj.subtarefas.all().delete()
    obj.historico.all().delete()

    TarefaDep.objects.bulk_create(
        [
            TarefaDep(tarefa=obj, depends_on_id=d)
            for d in tarefa.get("dependsOn") or []
        ]
    )
    TarefaCompetencia.objects.bulk_create(
        [
            TarefaCompetencia(tarefa=obj, competencia_id=c)
            for c in tarefa.get("competenciasIds") or []
        ]
    )
    TarefaTag.objects.bulk_create(
        [TarefaTag(tarefa=obj, tag=tag) for tag in tarefa.get("tags") or []]
    )
    TarefaAtributo.objects.bulk_create(
        [
            TarefaAtributo(tarefa=obj, atributo=a)
            for a in tarefa.get("atributos") or []
        ]
    )
    Link.objects.bulk_create(
        [
            Link(
                id=l["id"],
                tarefa=obj,
                titulo=l.get("titulo") or "",
                url=l.get("url") or "",
                tipo=l.get("tipo") or "outro",
                ordem=i,
            )
            for i, l in enumerate(tarefa.get("links") or [])
        ]
    )
    Subtarefa.objects.bulk_create(
        [
            Subtarefa(
                id=s["id"],
                tarefa=obj,
                titulo=s.get("titulo") or "",
                concluida=bool(s.get("concluida")),
                ordem=i,
            )
            for i, s in enumerate(tarefa.get("subtarefas") or [])
        ]
    )
    HistoricoTarefa.objects.bulk_create(
        [
            HistoricoTarefa(
                id=h["id"],
                tarefa=obj,
                em=h.get("em") or agora_iso(),
                tipo=h.get("tipo") or "editada",
                detalhe=h.get("detalhe") or "",
                ordem=i,
            )
            for i, h in enumerate(tarefa.get("historico") or [])
        ]
    )
    return obj


def gravar_roadmap_completo(dados: dict):
    dados = normalizar_roadmap(dados)
    with transaction.atomic():
        roadmap, _ = Roadmap.objects.update_or_create(
            id=dados["id"],
            defaults={
                "nome": dados["nome"],
                "descricao": dados.get("descricao") or "",
                "criado_em": dados.get("criadoEm") or agora_iso(),
            },
        )
        roadmap.competencias.all().delete()
        Competencia.objects.bulk_create(
            [
                Competencia(
                    id=c["id"],
                    roadmap=roadmap,
                    nome=c["nome"],
                    descricao=c.get("descricao") or "",
                    ordem=c.get("ordem") or i,
                )
                for i, c in enumerate(dados.get("competencias") or [])
            ]
        )
        Tarefa.objects.filter(roadmap=roadmap).delete()
        for t in dados.get("tarefas") or []:
            gravar_tarefa(roadmap, t)
    return obter_roadmap(dados["id"])


def listar_roadmaps():
    return [roadmap_para_dict(r) for r in _prefetch().all()]


def obter_roadmap(roadmap_id):
    try:
        r = _prefetch().get(pk=roadmap_id)
    except Roadmap.DoesNotExist:
        return None
    return roadmap_para_dict(r)


def ids_ocupados():
    return {
        "roadmaps": set(Roadmap.objects.values_list("id", flat=True)),
        "competencias": set(Competencia.objects.values_list("id", flat=True)),
        "tarefas": set(Tarefa.objects.values_list("id", flat=True)),
        "links": set(Link.objects.values_list("id", flat=True)),
        "subtarefas": set(Subtarefa.objects.values_list("id", flat=True)),
        "historico": set(HistoricoTarefa.objects.values_list("id", flat=True)),
    }
