import {
  PRESETS_TEMA,
  ICONES_IDENTIDADE,
  iniciaisDeNome,
  glyphIcone,
  temaRestaurarPadrao,
} from "./tema.js";
import { salvarTema, salvarIdentidade, obterPerfilCache } from "./profile.js";
import { aplicarStagger, marcarEntrada } from "./motion.js";

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function valorCampo(v, fallback = "") {
  return v == null || v === "" ? fallback : String(v);
}

function htmlIdentidade(identidade) {
  const id = identidade ?? { nomeExibicao: "", icone: "iniciais", cor: "#a8b4c4" };
  const iniciais = iniciaisDeNome(id.nomeExibicao);
  const glyph = glyphIcone(id.icone);
  const conteudoAvatar = glyph
    ? `<span class="ficha-avatar-glyph" aria-hidden="true">${escaparHtml(glyph)}</span>`
    : `<span class="ficha-avatar-iniciais">${escaparHtml(iniciais)}</span>`;

  return `
    <section class="ficha-identidade painel-secao" style="--identidade-cor: ${escaparHtml(id.cor)}">
      <h2>Identidade</h2>
      <p class="painel-subtitulo">Nome, avatar e cor — separados do progresso da Ficha.</p>
      <div class="ficha-identidade-corpo">
        <div class="ficha-avatar" aria-hidden="true">${conteudoAvatar}</div>
        <form class="ficha-identidade-form" id="form-identidade">
          <div class="ficha-identidade-campos">
            <label class="campo">
              <span>Nome de exibição</span>
              <input type="text" name="nomeExibicao" maxlength="48" value="${escaparHtml(id.nomeExibicao)}" placeholder="Como você quer ser identificado" />
            </label>
            <label class="campo campo-cor">
              <span>Cor de identidade</span>
              <input type="color" name="cor" value="${escaparHtml(id.cor)}" />
            </label>
          </div>
          <fieldset class="ficha-icones">
            <legend>Ícone do avatar</legend>
            <div class="ficha-icones-grid">
              ${ICONES_IDENTIDADE.map(
                (icone) => `
                <label class="ficha-icone-opcao ${id.icone === icone.id ? "selecionado" : ""}" title="${escaparHtml(icone.label)}">
                  <input type="radio" name="icone" value="${icone.id}" ${id.icone === icone.id ? "checked" : ""} />
                  <span class="ficha-icone-preview" style="--identidade-cor: ${escaparHtml(id.cor)}">
                    ${icone.glyph ? escaparHtml(icone.glyph) : escaparHtml(iniciais)}
                  </span>
                </label>`
              ).join("")}
            </div>
          </fieldset>
          <div class="ficha-identidade-acoes">
            <button type="submit" class="btn-primario btn-sm">Salvar identidade</button>
            <span class="ficha-identidade-status" id="identidade-status" aria-live="polite"></span>
          </div>
        </form>
      </div>
    </section>
  `;
}

export function renderizarAparencia(container, perfil = null) {
  const tema = perfil?.tema ?? temaRestaurarPadrao();
  const custom = tema.custom ?? {};
  const radius = custom.radius != null ? custom.radius : 10;

  container.innerHTML = `
    <header class="roadmap-header">
      <div class="roadmap-header-info">
        <h1>Personalização</h1>
        <p class="roadmap-descricao">Identidade visual e tema da interface. As mudanças aplicam ao salvar.</p>
      </div>
    </header>

    ${htmlIdentidade(perfil?.identidade)}

    <form class="aparencia-form painel-secao" id="form-aparencia">
      <h2>Tema</h2>
      <p class="painel-subtitulo">Presets e ajustes de cores da interface.</p>
      <div class="aparencia-presets" role="radiogroup" aria-label="Preset de tema">
        ${PRESETS_TEMA.map(
          (p) => `
          <label class="aparencia-preset ${tema.preset === p.id ? "selecionado" : ""}" style="--preset-accent: ${p.accent}; --preset-bg: ${p.bg}">
            <input type="radio" name="preset" value="${p.id}" ${tema.preset === p.id ? "checked" : ""} />
            <span class="aparencia-preset-swatch" aria-hidden="true"></span>
            <span class="aparencia-preset-nome">${escaparHtml(p.label)}</span>
          </label>`
        ).join("")}
      </div>

      <h2>Personalização do tema</h2>
      <p class="painel-subtitulo">Campos vazios usam o preset. Deixe em branco para herdar.</p>
      <div class="aparencia-grid">
        <label class="campo">
          <span>Accent</span>
          <div class="campo-cor-linha">
            <input type="color" name="accentPicker" value="${escaparHtml(valorCampo(custom.accent, "#a8b4c4"))}" />
            <input type="text" name="accent" maxlength="7" placeholder="#a8b4c4" value="${escaparHtml(valorCampo(custom.accent))}" />
            <button type="button" class="btn-secundario btn-sm" data-limpar="accent">Limpar</button>
          </div>
        </label>
        <label class="campo">
          <span>Fundo do app</span>
          <div class="campo-cor-linha">
            <input type="color" name="bgAppPicker" value="${escaparHtml(valorCampo(custom.bgApp, "#0a0a0b"))}" />
            <input type="text" name="bgApp" maxlength="7" placeholder="#0a0a0b" value="${escaparHtml(valorCampo(custom.bgApp))}" />
            <button type="button" class="btn-secundario btn-sm" data-limpar="bgApp">Limpar</button>
          </div>
        </label>
        <label class="campo">
          <span>Fundo elevado</span>
          <div class="campo-cor-linha">
            <input type="color" name="bgElevatedPicker" value="${escaparHtml(valorCampo(custom.bgElevated, "#111113"))}" />
            <input type="text" name="bgElevated" maxlength="7" placeholder="#111113" value="${escaparHtml(valorCampo(custom.bgElevated))}" />
            <button type="button" class="btn-secundario btn-sm" data-limpar="bgElevated">Limpar</button>
          </div>
        </label>
        <label class="campo">
          <span>Superfície</span>
          <div class="campo-cor-linha">
            <input type="color" name="bgSurfacePicker" value="${escaparHtml(valorCampo(custom.bgSurface, "#161618"))}" />
            <input type="text" name="bgSurface" maxlength="7" placeholder="#161618" value="${escaparHtml(valorCampo(custom.bgSurface))}" />
            <button type="button" class="btn-secundario btn-sm" data-limpar="bgSurface">Limpar</button>
          </div>
        </label>
        <label class="campo">
          <span>Raio dos botões (${radius}px)</span>
          <input type="range" name="radius" min="0" max="20" value="${radius}" />
        </label>
        <label class="campo">
          <span>Modo de fundo</span>
          <select name="backgroundMode">
            <option value="solid" ${custom.backgroundMode !== "gradient" ? "selected" : ""}>Sólido</option>
            <option value="gradient" ${custom.backgroundMode === "gradient" ? "selected" : ""}>Gradiente</option>
          </select>
        </label>
        <label class="campo campo-gradient-to">
          <span>Gradiente até</span>
          <div class="campo-cor-linha">
            <input type="color" name="bgGradientToPicker" value="${escaparHtml(valorCampo(custom.bgGradientTo, "#1c1c1f"))}" />
            <input type="text" name="bgGradientTo" maxlength="7" placeholder="#1c1c1f" value="${escaparHtml(valorCampo(custom.bgGradientTo))}" />
            <button type="button" class="btn-secundario btn-sm" data-limpar="bgGradientTo">Limpar</button>
          </div>
        </label>
      </div>

      <div class="aparencia-acoes">
        <button type="submit" class="btn-primario">Salvar tema</button>
        <button type="button" class="btn-secundario" id="btn-restaurar-tema">Restaurar padrão</button>
        <span class="aparencia-status" id="aparencia-status" aria-live="polite"></span>
      </div>
    </form>
  `;

  configurarFormIdentidade(container);
  configurarFormAparencia(container);
  marcarEntrada(container);
  aplicarStagger(container);
}

function configurarFormIdentidade(container) {
  const form = container.querySelector("#form-identidade");
  if (!form) return;

  const status = container.querySelector("#identidade-status");
  const avatar = container.querySelector(".ficha-avatar");
  const previews = container.querySelectorAll(".ficha-icone-preview");

  const atualizarPreviews = () => {
    const nome = form.nomeExibicao.value;
    const iniciais = iniciaisDeNome(nome);
    const cor = form.cor.value;
    const iconeSel = form.querySelector('input[name="icone"]:checked')?.value || "iniciais";
    const glyph = glyphIcone(iconeSel);

    container.querySelector(".ficha-identidade")?.style.setProperty("--identidade-cor", cor);
    if (avatar) {
      avatar.innerHTML = glyph
        ? `<span class="ficha-avatar-glyph" aria-hidden="true">${escaparHtml(glyph)}</span>`
        : `<span class="ficha-avatar-iniciais">${escaparHtml(iniciais)}</span>`;
    }
    previews.forEach((el) => {
      el.style.setProperty("--identidade-cor", cor);
      const radio = el.closest("label")?.querySelector('input[name="icone"]');
      if (radio?.value === "iniciais") el.textContent = iniciais;
    });
    form.querySelectorAll(".ficha-icone-opcao").forEach((lab) => {
      lab.classList.toggle("selecionado", lab.querySelector("input")?.checked);
    });
  };

  form.addEventListener("input", atualizarPreviews);
  form.addEventListener("change", atualizarPreviews);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dados = {
      nomeExibicao: form.nomeExibicao.value,
      icone: form.querySelector('input[name="icone"]:checked')?.value || "iniciais",
      cor: form.cor.value,
    };
    if (status) status.textContent = "Salvando…";
    try {
      await salvarIdentidade(dados);
      if (status) status.textContent = "Salvo.";
      setTimeout(() => {
        if (status) status.textContent = "";
      }, 2000);
    } catch (erro) {
      if (status) status.textContent = erro.message || "Erro ao salvar";
    }
  });
}

function hexOuVazio(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return null;
  return /^#[0-9a-fA-F]{6}$/.test(t) ? t.toLowerCase() : null;
}

function sincronizarPar(form, textName, pickerName) {
  const text = form[textName];
  const picker = form[pickerName];
  if (!text || !picker) return;
  picker.addEventListener("input", () => {
    text.value = picker.value;
  });
  text.addEventListener("change", () => {
    if (/^#[0-9a-fA-F]{6}$/.test(text.value.trim())) {
      picker.value = text.value.trim();
    }
  });
}

function configurarFormAparencia(container) {
  const form = container.querySelector("#form-aparencia");
  if (!form) return;
  const status = container.querySelector("#aparencia-status");

  const atualizarUiLocal = () => {
    form.querySelectorAll(".aparencia-preset").forEach((lab) => {
      lab.classList.toggle("selecionado", lab.querySelector("input")?.checked);
    });
    const r = form.radius?.value ?? 10;
    const span = form.querySelector('input[name="radius"]')?.closest("label")?.querySelector("span");
    if (span) span.textContent = `Raio dos botões (${r}px)`;
  };

  form.addEventListener("change", atualizarUiLocal);
  form.radius?.addEventListener("input", atualizarUiLocal);

  sincronizarPar(form, "accent", "accentPicker");
  sincronizarPar(form, "bgApp", "bgAppPicker");
  sincronizarPar(form, "bgElevated", "bgElevatedPicker");
  sincronizarPar(form, "bgSurface", "bgSurfacePicker");
  sincronizarPar(form, "bgGradientTo", "bgGradientToPicker");

  form.querySelectorAll("[data-limpar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.limpar;
      if (form[key]) form[key].value = "";
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dados = {
      preset: form.querySelector('input[name="preset"]:checked')?.value || "midnight",
      custom: {
        accent: hexOuVazio(form.accent.value),
        bgApp: hexOuVazio(form.bgApp.value),
        bgElevated: hexOuVazio(form.bgElevated.value),
        bgSurface: hexOuVazio(form.bgSurface.value),
        radius: Number(form.radius.value),
        backgroundMode: form.backgroundMode.value,
        bgGradientTo: hexOuVazio(form.bgGradientTo.value),
      },
    };
    if (status) status.textContent = "Salvando…";
    try {
      await salvarTema(dados);
      if (status) status.textContent = "Salvo.";
      setTimeout(() => {
        if (status) status.textContent = "";
      }, 2000);
    } catch (erro) {
      if (status) status.textContent = erro.message || "Erro ao salvar";
    }
  });

  container.querySelector("#btn-restaurar-tema")?.addEventListener("click", async () => {
    if (status) status.textContent = "Restaurando…";
    try {
      await salvarTema(temaRestaurarPadrao());
      renderizarAparencia(container, obterPerfilCache());
    } catch (erro) {
      if (status) status.textContent = erro.message || "Erro ao restaurar";
    }
  });
}
