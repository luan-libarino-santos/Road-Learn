/** Orquestra entradas leves no client — sem libs. */
export function marcarEntrada(container) {
  if (!container) return;
  container.classList.remove("vista-enter");
  // force reflow to restart animation
  void container.offsetWidth;
  container.classList.add("vista-enter");
}

export function aplicarStagger(container, seletor = ".painel-secao, .metrica-card, .aparencia-preset") {
  if (!container) return;
  const itens = container.querySelectorAll(seletor);
  itens.forEach((el, i) => {
    el.classList.add("enter-item");
    el.style.setProperty("--enter-delay", `${Math.min(i * 40, 320)}ms`);
  });
}
