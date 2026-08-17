import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useCatalogo } from "../lib/catalogo";
import { AppHeader } from "./AppHeader";
import { SideNav } from "./SideNav";

export function Layout() {
  const { menuAberto, setMenuAberto } = useCatalogo();
  const location = useLocation();

  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname, setMenuAberto]);

  useEffect(() => {
    if (!menuAberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuAberto(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuAberto, setMenuAberto]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}
      <aside
        id="menu-principal"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(100%,280px)] flex-col overflow-y-auto overscroll-contain border-r border-line bg-ink-2 transition-transform duration-200 ease-out ${
          menuAberto ? "translate-x-0" : "-translate-x-full pointer-events-none"
        } lg:static lg:z-auto lg:h-auto lg:min-h-dvh lg:w-auto lg:translate-x-0 lg:pointer-events-auto`}
      >
        <SideNav onNavigate={() => setMenuAberto(false)} />
      </aside>
      <div className="min-w-0">
        <AppHeader />
        <main className="mx-auto w-full max-w-4xl px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
