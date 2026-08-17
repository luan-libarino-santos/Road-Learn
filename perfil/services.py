import json
import re
import unicodedata
from difflib import SequenceMatcher

from core.errors import AppError
from core.ids import gerar_id
from perfil.models import (
    Perfil,
    PerfilHabilidade,
    PerfilHistoricoHabilidade,
    PerfilLogXp,
    PerfilRoadmapBonus,
)
from roadmaps.normalize import agora_iso
from roadmaps.persist import listar_roadmaps

ICONES_IDENTIDADE = [
    "iniciais",
    "livro",
    "codigo",
    "compasso",
    "estrela",
    "terminal",
    "mapa",
]

XP_TAREFA = 10
XP_SUBTAREFA = 2
XP_ROADMAP = 100
LOG_MAX = 20
TIERS = ["Comum", "Rara", "Épica", "Lendária", "Celestial"]
BADGE_FORMAS = ["", "circulo", "losango", "hexagono", "escudo", "estrela"]
MULTIPLICADOR = {"facil": 1, "medio": 2, "dificil": 3}
LIMIAR_SIMILAR = 0.88


def identidade_padrao():
    return {"nomeExibicao": "", "icone": "iniciais", "cor": "#8ec5e8"}


def perfil_vazio():
    return {
        "atualizadoEm": agora_iso(),
        "xp": 0,
        "roadmapsCompletosBonus": [],
        "habilidades": [],
        "logXp": [],
        "historicoHabilidades": [],
        "identidade": identidade_padrao(),
    }


def _hex_valido(v):
    return isinstance(v, str) and bool(re.match(r"^#[0-9a-fA-F]{6}$", v.strip()))


def normalizar_nome_habilidade(texto):
    s = unicodedata.normalize("NFD", str(texto or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"[-_/]+", " ", s)
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def encontrar_habilidade_similar(habilidades, tipo, nome):
    normalizado = normalizar_nome_habilidade(nome)
    if not normalizado:
        return None
    melhor = None
    melhor_score = 0
    for hab in habilidades or []:
        if hab.get("tipo") != tipo:
            continue
        alvo = normalizar_nome_habilidade(hab.get("nome"))
        if not alvo:
            continue
        if alvo == normalizado:
            return {"habilidade": hab, "score": 1}
        score = SequenceMatcher(None, normalizado, alvo).ratio()
        if score > melhor_score:
            melhor_score = score
            melhor = hab
    if melhor and melhor_score >= LIMIAR_SIMILAR:
        return {"habilidade": melhor, "score": melhor_score}
    return None


def calcular_nivel_xp(xp_bruto):
    xp = max(0, float(xp_bruto or 0))
    nivel = 1
    gasto = 0
    while nivel < 500:
        custo = 40 + (nivel - 1) * 15
        if xp < gasto + custo:
            no_nivel = xp - gasto
            return {
                "nivel": nivel,
                "xp": xp,
                "xpNoNivel": no_nivel,
                "xpParaProximo": custo,
                "progresso": min(100, round((no_nivel / custo) * 100)),
            }
        gasto += custo
        nivel += 1
    return {
        "nivel": nivel,
        "xp": xp,
        "xpNoNivel": 0,
        "xpParaProximo": 1,
        "progresso": 100,
    }


def calcular_tier_habilidade(tipo, nivel):
    n = max(0, float(nivel or 0))
    passo = 25 if tipo == "base" else 10
    indice = min(len(TIERS) - 1, int(n // passo))
    no_topo = indice >= len(TIERS) - 1
    return {
        "tier": TIERS[indice],
        "passoTier": passo,
        "progressoNoTier": passo if no_topo else n % passo,
        "indiceTier": indice,
        "noTopo": no_topo,
    }


def calcular_badge(nivel):
    n = max(1, int(nivel or 1))
    indice = n // 20
    if indice <= 0:
        return {"indice": 0, "forma": None, "rotulo": None}
    forma = BADGE_FORMAS[min(indice, len(BADGE_FORMAS) - 1)]
    return {"indice": indice, "forma": forma, "rotulo": f"N{indice * 20}+"}


def _enriquecer_hab(hab):
    return {**hab, **calcular_tier_habilidade(hab["tipo"], hab["nivel"])}


def enriquecer_perfil(perfil):
    nivel = calcular_nivel_xp(perfil.get("xp"))
    habilidades = sorted(
        [_enriquecer_hab(h) for h in perfil.get("habilidades") or []],
        key=lambda h: (-h["nivel"], h["nome"]),
    )
    return {
        **perfil,
        "habilidades": habilidades,
        "habilidadesBase": [h for h in habilidades if h["tipo"] == "base"],
        "habilidadesEspeciais": [h for h in habilidades if h["tipo"] == "especial"],
        "nivel": nivel,
        "badge": calcular_badge(nivel["nivel"]),
    }


def _ler_perfil():
    row, _ = Perfil.objects.get_or_create(
        pk=1,
        defaults={
            "xp": 0,
            "atualizado_em": agora_iso(),
            "identidade_json": json.dumps(identidade_padrao()),
            "tema_json": "{}",
        },
    )
    try:
        identidade = json.loads(row.identidade_json or "{}")
    except json.JSONDecodeError:
        identidade = identidade_padrao()
    habilidades = [
        {"id": h.id, "tipo": h.tipo, "nome": h.nome, "nivel": h.nivel}
        for h in PerfilHabilidade.objects.all()
    ]
    logs = [
        {
            "id": l.id,
            "em": l.em,
            "delta": l.delta,
            "origem": l.origem,
            "rotulo": l.rotulo,
        }
        for l in PerfilLogXp.objects.all()[:LOG_MAX]
    ]
    hist = [
        {"em": h.em, "itens": json.loads(h.itens_json or "[]")}
        for h in PerfilHistoricoHabilidade.objects.all()
    ]
    bonus = list(PerfilRoadmapBonus.objects.values_list("roadmap_id", flat=True))
    return {
        "xp": row.xp,
        "atualizadoEm": row.atualizado_em,
        "identidade": identidade or identidade_padrao(),
        "habilidades": habilidades,
        "logXp": logs,
        "historicoHabilidades": hist,
        "roadmapsCompletosBonus": bonus,
    }


def _salvar_perfil(perfil):
    row, _ = Perfil.objects.get_or_create(pk=1, defaults={"atualizado_em": agora_iso()})
    row.xp = perfil.get("xp") or 0
    row.atualizado_em = agora_iso()
    row.identidade_json = json.dumps(perfil.get("identidade") or identidade_padrao())
    row.save()
    PerfilHabilidade.objects.all().delete()
    PerfilHabilidade.objects.bulk_create(
        [
            PerfilHabilidade(
                id=h["id"], tipo=h["tipo"], nome=h["nome"], nivel=h.get("nivel") or 0
            )
            for h in perfil.get("habilidades") or []
        ]
    )
    PerfilLogXp.objects.all().delete()
    PerfilLogXp.objects.bulk_create(
        [
            PerfilLogXp(
                id=l["id"],
                em=l["em"],
                delta=l["delta"],
                origem=l.get("origem") or "",
                rotulo=l.get("rotulo") or "",
                ordem=i,
            )
            for i, l in enumerate(perfil.get("logXp") or [])
        ]
    )
    PerfilHistoricoHabilidade.objects.all().delete()
    PerfilHistoricoHabilidade.objects.bulk_create(
        [
            PerfilHistoricoHabilidade(
                em=h["em"], itens_json=json.dumps(h.get("itens") or [])
            )
            for h in (perfil.get("historicoHabilidades") or [])[-120:]
        ]
    )
    PerfilRoadmapBonus.objects.all().delete()
    PerfilRoadmapBonus.objects.bulk_create(
        [
            PerfilRoadmapBonus(roadmap_id=rid)
            for rid in perfil.get("roadmapsCompletosBonus") or []
        ]
    )


def obter_perfil():
    return enriquecer_perfil(_ler_perfil())


def _xp_tarefa(tarefa):
    return XP_TAREFA * MULTIPLICADOR.get(str(tarefa.get("dificuldade") or "facil").lower(), 1)


def _xp_sub(tarefa):
    return XP_SUBTAREFA * MULTIPLICADOR.get(str(tarefa.get("dificuldade") or "facil").lower(), 1)


def _encontrar_ou_criar(perfil, tipo, nome):
    nome_limpo = str(nome or "").strip()
    if not nome_limpo:
        return None
    match = encontrar_habilidade_similar(perfil["habilidades"], tipo, nome_limpo)
    if match:
        return match["habilidade"]
    nova = {"id": gerar_id(), "tipo": tipo, "nome": nome_limpo, "nivel": 0}
    perfil["habilidades"].append(nova)
    return nova


def _ajustar_hab(perfil, tipo, nome, delta):
    hab = _encontrar_ou_criar(perfil, tipo, nome)
    if not hab:
        return
    hab["nivel"] = max(0, (hab.get("nivel") or 0) + delta)


def _registrar_xp(perfil, delta, origem, rotulo):
    if not delta:
        return
    perfil["xp"] = max(0, (perfil.get("xp") or 0) + delta)
    texto = str(rotulo or "").strip()
    if len(texto) > 72:
        texto = texto[:71] + "…"
    perfil["logXp"] = [
        {
            "id": gerar_id(),
            "em": agora_iso(),
            "delta": delta,
            "origem": origem,
            "rotulo": texto,
        },
        *(perfil.get("logXp") or []),
    ][:LOG_MAX]


def _hist_habs(perfil):
    dia = agora_iso()[:10]
    itens = [{"id": h["id"], "nivel": h["nivel"]} for h in perfil.get("habilidades") or []]
    lista = perfil.get("historicoHabilidades") or []
    snap = {"em": dia, "itens": itens}
    idx = next((i for i, h in enumerate(lista) if h.get("em") == dia), -1)
    if idx >= 0:
        lista[idx] = snap
    else:
        lista.append(snap)
    perfil["historicoHabilidades"] = lista[-120:]


def _roadmap_completo(roadmap):
    tarefas = roadmap.get("tarefas") or []
    return bool(tarefas) and all(t.get("concluida") for t in tarefas)


def _aplicar_habs(perfil, roadmap, tarefa, delta):
    for attr in tarefa.get("atributos") or []:
        _ajustar_hab(perfil, "base", attr, delta)
    comps = {c["id"]: c for c in roadmap.get("competencias") or []}
    for cid in tarefa.get("competenciasIds") or []:
        comp = comps.get(cid)
        if comp and comp.get("nome"):
            _ajustar_hab(perfil, "especial", comp["nome"], delta)


def _bonus(perfil, roadmap, conceder):
    ids = perfil.get("roadmapsCompletosBonus") or []
    tem = roadmap["id"] in ids
    if conceder:
        if tem or not _roadmap_completo(roadmap):
            return
        perfil["roadmapsCompletosBonus"] = [*ids, roadmap["id"]]
        _registrar_xp(perfil, XP_ROADMAP, "roadmap", f"Roadmap completo: {roadmap['nome']}")
    elif tem and not _roadmap_completo(roadmap):
        perfil["roadmapsCompletosBonus"] = [i for i in ids if i != roadmap["id"]]
        _registrar_xp(perfil, -XP_ROADMAP, "roadmap", f"Bônus revogado: {roadmap['nome']}")


def _mutar(fn):
    perfil = _ler_perfil()
    fn(perfil)
    _hist_habs(perfil)
    _salvar_perfil(perfil)
    return enriquecer_perfil(perfil)


def ao_concluir_tarefa(roadmap, tarefa):
    return _mutar(
        lambda p: (
            _aplicar_habs(p, roadmap, tarefa, 1),
            _registrar_xp(p, _xp_tarefa(tarefa), "tarefa", f"Concluiu: {tarefa['titulo']}"),
            _bonus(p, roadmap, True),
        )
    )


def ao_reabrir_tarefa(roadmap, tarefa):
    return _mutar(
        lambda p: (
            _aplicar_habs(p, roadmap, tarefa, -1),
            _registrar_xp(p, -_xp_tarefa(tarefa), "tarefa", f"Reabriu: {tarefa['titulo']}"),
            _bonus(p, roadmap, False),
        )
    )


def ao_concluir_subtarefa(roadmap, tarefa, subtarefa, tarefa_acabou_de_concluir=False):
    def fn(p):
        _registrar_xp(
            p,
            _xp_sub(tarefa),
            "subtarefa",
            f"Subtarefa: {subtarefa.get('titulo') or tarefa['titulo']}",
        )
        if tarefa_acabou_de_concluir:
            _aplicar_habs(p, roadmap, tarefa, 1)
            _registrar_xp(p, _xp_tarefa(tarefa), "tarefa", f"Concluiu: {tarefa['titulo']}")
            _bonus(p, roadmap, True)

    return _mutar(fn)


def ao_reabrir_subtarefa(roadmap, tarefa, subtarefa, tarefa_acabou_de_reabrir=False):
    def fn(p):
        _registrar_xp(
            p,
            -_xp_sub(tarefa),
            "subtarefa",
            f"Reabriu subtarefa: {subtarefa.get('titulo') or tarefa['titulo']}",
        )
        if tarefa_acabou_de_reabrir:
            _aplicar_habs(p, roadmap, tarefa, -1)
            _registrar_xp(p, -_xp_tarefa(tarefa), "tarefa", f"Reabriu: {tarefa['titulo']}")
            _bonus(p, roadmap, False)

    return _mutar(fn)


def limpar_bonus_roadmap_excluido(roadmap_id):
    perfil = _ler_perfil()
    antes = perfil.get("roadmapsCompletosBonus") or []
    if roadmap_id not in antes:
        return enriquecer_perfil(perfil)
    perfil["roadmapsCompletosBonus"] = [i for i in antes if i != roadmap_id]
    _salvar_perfil(perfil)
    return enriquecer_perfil(perfil)


def atualizar_identidade(dados):
    if not isinstance(dados, dict):
        raise AppError("Dados de identidade inválidos")
    perfil = _ler_perfil()
    atual = perfil.get("identidade") or identidade_padrao()
    proxima = {**atual}
    if "nomeExibicao" in dados:
        proxima["nomeExibicao"] = str(dados.get("nomeExibicao") or "").strip()[:48]
    if "icone" in dados:
        if dados["icone"] not in ICONES_IDENTIDADE:
            raise AppError("Ícone inválido")
        proxima["icone"] = dados["icone"]
    if "cor" in dados:
        if not _hex_valido(dados["cor"]):
            raise AppError("Cor inválida (use #RRGGBB)")
        proxima["cor"] = dados["cor"].strip().lower()
    perfil["identidade"] = proxima
    _salvar_perfil(perfil)
    return enriquecer_perfil(perfil)


def rebuild_perfil():
    anterior = _ler_perfil()
    identidade = anterior.get("identidade") or identidade_padrao()
    perfil = perfil_vazio()
    perfil["identidade"] = identidade
    eventos = []
    for roadmap in listar_roadmaps():
        for tarefa in roadmap.get("tarefas") or []:
            for sub in tarefa.get("subtarefas") or []:
                if sub.get("concluida"):
                    eventos.append(
                        {
                            "em": tarefa.get("concluidaEm") or tarefa.get("criadaEm") or "",
                            "tipo": "subtarefa",
                            "roadmap": roadmap,
                            "tarefa": tarefa,
                            "subtarefa": sub,
                        }
                    )
            if tarefa.get("concluida"):
                eventos.append(
                    {
                        "em": tarefa.get("concluidaEm") or tarefa.get("criadaEm") or "",
                        "tipo": "tarefa",
                        "roadmap": roadmap,
                        "tarefa": tarefa,
                    }
                )
    eventos.sort(key=lambda e: str(e["em"]))
    for ev in eventos:
        if ev["tipo"] == "subtarefa":
            _registrar_xp(
                perfil,
                _xp_sub(ev["tarefa"]),
                "subtarefa",
                f"Subtarefa: {ev['subtarefa'].get('titulo') or ev['tarefa']['titulo']}",
            )
        else:
            _aplicar_habs(perfil, ev["roadmap"], ev["tarefa"], 1)
            _registrar_xp(
                perfil, _xp_tarefa(ev["tarefa"]), "tarefa", f"Concluiu: {ev['tarefa']['titulo']}"
            )
    for roadmap in listar_roadmaps():
        if _roadmap_completo(roadmap):
            perfil["roadmapsCompletosBonus"].append(roadmap["id"])
            _registrar_xp(
                perfil, XP_ROADMAP, "roadmap", f"Roadmap completo: {roadmap['nome']}"
            )
    _hist_habs(perfil)
    _salvar_perfil(perfil)
    return enriquecer_perfil(perfil)


def garantir_perfil_inicial():
    perfil = _ler_perfil()
    vazio = (
        not perfil.get("habilidades")
        and not perfil.get("xp")
        and not perfil.get("logXp")
    )
    if not vazio:
        return enriquecer_perfil(perfil)
    roadmaps = listar_roadmaps()
    tem = any(
        t.get("concluida") or any(s.get("concluida") for s in t.get("subtarefas") or [])
        for r in roadmaps
        for t in r.get("tarefas") or []
    )
    if not tem:
        return enriquecer_perfil(perfil)
    return rebuild_perfil()
