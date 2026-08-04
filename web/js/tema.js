const CUSTOM_KEYS = [
  ["accent", "--accent"],
  ["bgApp", "--bg-app"],
  ["bgElevated", "--bg-elevated"],
  ["bgSurface", "--bg-surface"],
];

const OVERRIDE_PROPS = [
  "--accent",
  "--accent-soft",
  "--accent-strong",
  "--bg-app",
  "--bg-elevated",
  "--bg-surface",
  "--bg-surface-2",
  "--bg-hover",
  "--radius",
  "--radius-sm",
  "--bg-gradient",
  "--heatmap-1",
  "--heatmap-2",
  "--heatmap-3",
  "--heatmap-4",
];

export const PRESETS_TEMA = [
  { id: "midnight", label: "Midnight", accent: "#a8b4c4", bg: "#0a0a0b" },
  { id: "ocean", label: "Ocean", accent: "#6ba3c7", bg: "#071018" },
  { id: "forest", label: "Forest", accent: "#7eaa8a", bg: "#0a120e" },
  { id: "ember", label: "Ember", accent: "#c4896a", bg: "#120c0a" },
  { id: "slate", label: "Slate", accent: "#8b95a8", bg: "#0c0e12" },
];

export const ICONES_IDENTIDADE = [
  { id: "iniciais", label: "Iniciais", glyph: null },
  { id: "livro", label: "Livro", glyph: "◈" },
  { id: "codigo", label: "Código", glyph: "</>" },
  { id: "compasso", label: "Compasso", glyph: "◎" },
  { id: "estrela", label: "Estrela", glyph: "✦" },
  { id: "terminal", label: "Terminal", glyph: ">_" },
  { id: "mapa", label: "Mapa", glyph: "⬡" },
];

export function iniciaisDeNome(nome) {
  const partes = String(nome ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return "RL";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function glyphIcone(iconeId) {
  return ICONES_IDENTIDADE.find((i) => i.id === iconeId)?.glyph ?? null;
}

function hexParaRgb(hex) {
  const h = String(hex).replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexParaRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function misturarComPreto(hex, fator) {
  const { r, g, b } = hexParaRgb(hex);
  const m = (c) => Math.round(c * (1 - fator));
  const to = (n) => n.toString(16).padStart(2, "0");
  return `#${to(m(r))}${to(m(g))}${to(m(b))}`;
}

function limparOverrides(root) {
  for (const prop of OVERRIDE_PROPS) {
    root.style.removeProperty(prop);
  }
}

/**
 * Aplica preset + overrides custom no documentElement.
 * @param {{ preset?: string, custom?: object }} tema
 */
export function aplicarTema(tema) {
  const root = document.documentElement;
  const preset = tema?.preset && PRESETS_TEMA.some((p) => p.id === tema.preset)
    ? tema.preset
    : "midnight";
  const custom = tema?.custom ?? {};

  root.dataset.theme = preset;
  limparOverrides(root);

  for (const [key, prop] of CUSTOM_KEYS) {
    if (custom[key]) root.style.setProperty(prop, custom[key]);
  }

  if (custom.accent) {
    root.style.setProperty("--accent-soft", rgba(custom.accent, 0.16));
    root.style.setProperty("--accent-strong", custom.accent);
    root.style.setProperty("--heatmap-1", misturarComPreto(custom.accent, 0.72));
    root.style.setProperty("--heatmap-2", misturarComPreto(custom.accent, 0.5));
    root.style.setProperty("--heatmap-3", misturarComPreto(custom.accent, 0.25));
    root.style.setProperty("--heatmap-4", custom.accent);
  }

  if (custom.bgSurface) {
    root.style.setProperty("--bg-surface-2", custom.bgSurface);
    root.style.setProperty("--bg-hover", custom.bgSurface);
  }

  if (custom.radius != null && Number.isFinite(Number(custom.radius))) {
    const r = Math.max(0, Math.min(24, Number(custom.radius)));
    root.style.setProperty("--radius", `${r}px`);
    root.style.setProperty("--radius-sm", `${Math.max(0, Math.round(r * 0.6))}px`);
  }

  if (custom.backgroundMode === "gradient" && custom.bgGradientTo) {
    const from = custom.bgApp || getComputedStyle(root).getPropertyValue("--bg-app").trim() || "#0a0a0b";
    root.style.setProperty(
      "--bg-gradient",
      `linear-gradient(160deg, ${from} 0%, ${custom.bgGradientTo} 100%)`
    );
    document.body.classList.add("tem-gradiente");
  } else {
    root.style.removeProperty("--bg-gradient");
    document.body.classList.remove("tem-gradiente");
  }
}

export function temaRestaurarPadrao() {
  return {
    preset: "midnight",
    custom: {
      accent: null,
      bgApp: null,
      bgElevated: null,
      bgSurface: null,
      radius: null,
      backgroundMode: "solid",
      bgGradientTo: null,
    },
  };
}
