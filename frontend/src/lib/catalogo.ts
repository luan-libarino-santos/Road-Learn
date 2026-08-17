import { createContext, useContext } from "react";
import type { HubLinks, Perfil, Projeto, Roadmap, Sidebar, TimerAberto } from "./types";

export type Catalogo = {
  roadmaps: Roadmap[];
  sidebar: Sidebar;
  perfil: Perfil | null;
  hub: HubLinks;
  projetosIntegrados: Projeto[];
  timerAberto: TimerAberto;
  reload: () => Promise<void>;
  menuAberto: boolean;
  setMenuAberto: (v: boolean) => void;
  abrirNovo: () => void;
  abrirImport: () => void;
};

export const CatalogoContext = createContext<Catalogo | null>(null);

export function useCatalogo(): Catalogo {
  const ctx = useContext(CatalogoContext);
  if (!ctx) throw new Error("CatalogoContext ausente");
  return ctx;
}
