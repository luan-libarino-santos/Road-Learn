import json
from pathlib import Path

from django.conf import settings

from core.errors import AppError
from projetos.services import (
    assert_elegivel,
    carregar_roadmaps_elegiveis,
    montar_contexto_compacto,
    montar_contexto_completo,
    montar_contexto_integrado_compacto,
    montar_contexto_integrado_completo,
    normalizar_projeto_final,
    normalizar_projeto_integrado,
    normalizar_topico,
)
from roadmaps.persist import obter_roadmap

DOCS = Path(settings.BASE_DIR) / "docs"

MODELOS_FALLBACK = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
]

OBJETIVOS_VALIDOS = [
    "Aprendizado inicial",
    "Aprofundamento",
    "Revisão",
    "Projetos práticos",
    "Preparação profissional",
]
EXPERIENCIAS_VALIDAS = [
    "Iniciante",
    "Já tenho fundamentos",
    "Intermediário",
    "Avançado",
]
ESTILOS_VALIDOS = [
    "Teórico",
    "Prático",
    "Equilibrado",
    "Baseado em projetos",
    "Desafios/exercícios",
]
PROFUNDIDADES_VALIDAS = ["Resumo", "Normal", "Completo", "Extenso"]
TIPOS_ATIVIDADE_VALIDOS = [
    "Conceitos",
    "Exercícios",
    "Projetos",
    "Pesquisas",
    "Leituras",
    "Revisões",
]
CATEGORIAS_TOPICOS = {
    "software",
    "github",
    "hardware",
    "profissional",
    "humano",
    "hibrido",
    "outro",
}


def _lista(valor):
    if isinstance(valor, list):
        return [str(i or "").strip() for i in valor if str(i or "").strip()]
    if valor is None or valor == "":
        return []
    s = str(valor).strip()
    return [s] if s else []


def _validar_enum(lista, permitidos, rotulo):
    if not lista:
        raise AppError(f"{rotulo} é obrigatório — selecione ao menos uma opção")
    invalidos = [i for i in lista if i not in permitidos]
    if invalidos:
        raise AppError(
            f"{rotulo} inválido ({', '.join(invalidos)}). Use: {', '.join(permitidos)}"
        )


def _tamanho(tempo, profundidade):
    por_tempo = {
        "1 semana": "Pequeno (5–10 tarefas)",
        "1 mês": "Médio (11–20 tarefas)",
        "3 meses": "Completo (21–30 tarefas)",
        "6 meses": "Extenso (31+ tarefas)",
    }
    if tempo in por_tempo:
        return por_tempo[tempo]
    por_prof = {
        "Resumo": "Pequeno (5–10 tarefas)",
        "Normal": "Médio (11–20 tarefas)",
        "Completo": "Completo (21–30 tarefas)",
        "Extenso": "Extenso (31+ tarefas)",
    }
    faixa = por_prof.get(profundidade, "Médio (11–20 tarefas)")
    if tempo == "Sem prazo":
        return faixa
    return f'Inferir pela carga "{tempo}" (referência pela profundidade: {faixa})'


def normalizar_params_geracao(params):
    params = params or {}
    tema = str(params.get("tema") or "").strip()
    objetivos = _lista(params.get("objetivos"))
    experiencia = str(params.get("experiencia") or "").strip()
    estilo = str(params.get("estilo") or "").strip()
    profundidade = str(params.get("profundidade") or "").strip()
    tempo = str(params.get("tempo") or "").strip()
    tipos = _lista(params.get("tiposAtividade"))
    restricoes = str(params.get("restricoes") or "").strip()
    if not tema:
        raise AppError("Tema é obrigatório")
    _validar_enum(objetivos, OBJETIVOS_VALIDOS, "Objetivo")
    _validar_enum(tipos, TIPOS_ATIVIDADE_VALIDOS, "Tipos de atividades")
    if experiencia not in EXPERIENCIAS_VALIDAS:
        raise AppError(f"Experiência inválida. Use: {', '.join(EXPERIENCIAS_VALIDAS)}")
    if estilo not in ESTILOS_VALIDOS:
        raise AppError(f"Estilo inválido. Use: {', '.join(ESTILOS_VALIDOS)}")
    if profundidade not in PROFUNDIDADES_VALIDAS:
        raise AppError(f"Profundidade inválida. Use: {', '.join(PROFUNDIDADES_VALIDAS)}")
    if not tempo:
        raise AppError("Tempo disponível é obrigatório")
    return {
        "tema": tema,
        "objetivos": objetivos,
        "experiencia": experiencia,
        "estilo": estilo,
        "profundidade": profundidade,
        "tempo": tempo,
        "tiposAtividade": tipos,
        "restricoes": restricoes,
    }


def _instrucoes(nome):
    return (DOCS / nome).read_text(encoding="utf-8")


def _prompt_roadmap(p):
    bloco = (
        f"\n- **Restrições / Observações:** {p['restricoes']}" if p["restricoes"] else ""
    )
    return f"""{_instrucoes("INSTRUCOES_IA_ROADMAP.md")}

---

## Pedido do usuário

Gere o roadmap com estes parâmetros:

- **Tema:** {p["tema"]}
- **Objetivo(s):** {"; ".join(p["objetivos"])}
- **Experiência atual:** {p["experiencia"]}
- **Formato de aprendizado:** {p["estilo"]}
- **Profundidade:** {p["profundidade"]}
- **Tempo disponível:** {p["tempo"]}
- **Tamanho sugerido:** {_tamanho(p["tempo"], p["profundidade"])}
- **Tipos de atividades:** {"; ".join(p["tiposAtividade"])}{bloco}

Responda APENAS com o JSON válido, sem markdown e sem explicações."""


def preview_prompt_geracao(params):
    return {"prompt": _prompt_roadmap(normalizar_params_geracao(params))}


def _msg_erro(erro):
    partes = [str(getattr(erro, "message", "") or erro)]
    for attr in ("status", "code", "statusText"):
        if getattr(erro, attr, None):
            partes.append(str(getattr(erro, attr)))
    return " ".join(partes)


def _deve_tentar_proximo(erro):
    texto = _msg_erro(erro).lower()
    status = getattr(erro, "status", None) or getattr(erro, "code", None)
    if status in (429, 404, 503):
        return True
    if isinstance(status, str):
        s = status.upper()
        if any(
            x in s
            for x in (
                "RESOURCE_EXHAUSTED",
                "UNAVAILABLE",
                "NOT_FOUND",
                "TOO_MANY_REQUESTS",
            )
        ):
            return True
    return any(
        x in texto
        for x in (
            "resource_exhausted",
            "quota",
            "rate limit",
            "rate_limit",
            "billing",
            "exhausted",
            "unavailable",
            "not found",
            "not_found",
            "model_not_found",
            "is not found",
            "does not exist",
            "429",
            "503",
            "404",
        )
    )


def _gerar_json(prompt):
    api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
    if not api_key:
        raise AppError("Configure GEMINI_API_KEY no .env", 503)
    try:
        from google import genai
    except ImportError as exc:
        raise AppError("Pacote google-genai não instalado", 503) from exc

    client = genai.Client(api_key=api_key)
    tentativas = []
    for modelo in MODELOS_FALLBACK:
        try:
            response = client.models.generate_content(
                model=modelo,
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )
            texto = getattr(response, "text", None) or ""
            if not texto.strip():
                tentativas.append({"modelo": modelo, "motivo": "resposta vazia"})
                continue
            try:
                dados = json.loads(texto)
            except json.JSONDecodeError:
                tentativas.append({"modelo": modelo, "motivo": "JSON inválido"})
                continue
            if not isinstance(dados, dict):
                tentativas.append({"modelo": modelo, "motivo": "JSON sem objeto raiz"})
                continue
            return dados, modelo
        except AppError:
            raise
        except Exception as erro:  # noqa: BLE001
            tentativas.append({"modelo": modelo, "motivo": str(erro)})
            if _deve_tentar_proximo(erro):
                continue
            raise AppError(str(erro) or "Falha ao gerar com IA", 502) from erro
    resumo = " · ".join(f"{t['modelo']}: {t['motivo']}" for t in tentativas)
    raise AppError(
        f"Nenhum modelo Gemini disponível.{(' Tentativas: ' + resumo) if resumo else ''}",
        502,
    )


def gerar_roadmap_com_ia(params):
    normalizados = normalizar_params_geracao(params)
    dados, modelo = _gerar_json(_prompt_roadmap(normalizados))
    return {"roadmap": dados, "modeloUsado": modelo}


def _normalizar_topicos(dados):
    lista = dados.get("topicos") if isinstance(dados.get("topicos"), list) else []
    topicos = []
    for i, t in enumerate(lista):
        if not isinstance(t, dict):
            continue
        titulo = str(t.get("titulo") or "").strip()
        resumo = str(t.get("resumo") or "").strip()
        if not titulo or not resumo:
            continue
        cat = str(t.get("categoria") or "outro").strip().lower()
        topicos.append(
            {
                "id": str(t.get("id") or f"t{i + 1}").strip() or f"t{i + 1}",
                "titulo": titulo,
                "resumo": resumo,
                "categoria": cat if cat in CATEGORIAS_TOPICOS else "outro",
                "stackSugerida": [
                    str(s).strip()
                    for s in (t.get("stackSugerida") or [])
                    if str(s).strip()
                ]
                if isinstance(t.get("stackSugerida"), list)
                else [],
                "competenciasAlvoIds": [
                    str(s).strip()
                    for s in (t.get("competenciasAlvoIds") or [])
                    if str(s).strip()
                ]
                if isinstance(t.get("competenciasAlvoIds"), list)
                else [],
            }
        )
        if len(topicos) == 3:
            break
    if len(topicos) != 3:
        raise AppError("A IA não retornou exatamente 3 tópicos válidos", 502)
    return topicos


def sugerir_topicos_final(roadmap_id):
    rid = str(roadmap_id or "").strip()
    if not rid:
        raise AppError("roadmapId é obrigatório")
    roadmap = obter_roadmap(rid)
    if not roadmap:
        raise AppError("Roadmap não encontrado", 404)
    assert_elegivel(roadmap)
    contexto = montar_contexto_compacto(roadmap)
    prompt = f"""{_instrucoes("INSTRUCOES_IA_TOPICOS_PROJETO_FINAL.md")}

---

## Contexto do roadmap (compacto)

```json
{json.dumps(contexto, ensure_ascii=False)}
```

Responda APENAS com o JSON válido dos 3 tópicos, sem markdown e sem explicações."""
    dados, modelo = _gerar_json(prompt)
    return {"topicos": _normalizar_topicos(dados), "modeloUsado": modelo}


def gerar_projeto_final_ia(roadmap_id, topico_bruto):
    rid = str(roadmap_id or "").strip()
    if not rid:
        raise AppError("roadmapId é obrigatório")
    roadmap = obter_roadmap(rid)
    if not roadmap:
        raise AppError("Roadmap não encontrado", 404)
    assert_elegivel(roadmap)
    topico = normalizar_topico(topico_bruto)
    contexto = montar_contexto_completo(roadmap)
    prompt = f"""{_instrucoes("INSTRUCOES_IA_PROJETO_FINAL.md")}

---

## Contexto do roadmap

```json
{json.dumps(contexto, ensure_ascii=False)}
```

## Tópico escolhido

```json
{json.dumps(topico, ensure_ascii=False)}
```

Responda APENAS com o JSON válido do Projeto Final, sem markdown e sem explicações."""
    dados, modelo = _gerar_json(prompt)
    projeto = normalizar_projeto_final(
        {
            **dados,
            "roadmapId": roadmap["id"],
            "topicoOrigem": {"titulo": topico["titulo"], "resumo": topico["resumo"]},
            "competenciasAlvoIds": dados.get("competenciasAlvoIds")
            or topico.get("competenciasAlvoIds"),
            "stackObrigatoria": dados.get("stackObrigatoria") or topico.get("stackSugerida"),
        },
        roadmap_id=roadmap["id"],
    )
    return {"projeto": projeto, "modeloUsado": modelo}


def sugerir_topicos_integrado(roadmap_ids):
    info = carregar_roadmaps_elegiveis(roadmap_ids)
    contexto = montar_contexto_integrado_compacto(
        info["paraPrompt"], info.get("avisoTruncamento")
    )
    prompt = f"""{_instrucoes("INSTRUCOES_IA_TOPICOS_PROJETO_INTEGRADO.md")}

---

## Contexto dos roadmaps (compacto)

```json
{json.dumps(contexto, ensure_ascii=False)}
```

Responda APENAS com o JSON válido dos 3 tópicos, sem markdown e sem explicações."""
    dados, modelo = _gerar_json(prompt)
    return {"topicos": _normalizar_topicos(dados), "modeloUsado": modelo}


def gerar_projeto_integrado_ia(roadmap_ids, topico_bruto):
    info = carregar_roadmaps_elegiveis(roadmap_ids)
    topico = normalizar_topico(topico_bruto)
    contexto = montar_contexto_integrado_completo(
        info["paraPrompt"], info.get("avisoTruncamento")
    )
    prompt = f"""{_instrucoes("INSTRUCOES_IA_PROJETO_INTEGRADO.md")}

---

## Contexto dos roadmaps

```json
{json.dumps(contexto, ensure_ascii=False)}
```

## Tópico escolhido

```json
{json.dumps(topico, ensure_ascii=False)}
```

Responda APENAS com o JSON válido do Projeto Integrado, sem markdown e sem explicações."""
    dados, modelo = _gerar_json(prompt)
    projeto = normalizar_projeto_integrado(
        {
            **dados,
            "roadmapIds": info["roadmapIds"],
            "topicoOrigem": {"titulo": topico["titulo"], "resumo": topico["resumo"]},
        },
        roadmap_ids=info["roadmapIds"],
    )
    return {"projeto": projeto, "modeloUsado": modelo}
