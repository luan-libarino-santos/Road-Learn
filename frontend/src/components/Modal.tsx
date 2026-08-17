import { useEffect, type ReactNode } from "react";

type Props = {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

export function Modal({ titulo, onClose, children, wide }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-ink-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:pb-4 ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display mb-4 text-lg">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
