import { useConcertinaMode } from "@/context/concertina-mode";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { enabled, toggle } = useConcertinaMode();

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-2">
        concertina
      </span>
      <div className="h-12 w-72 rounded-full bg-slate-100 p-1 border border-border flex">
        <button
          type="button"
          onClick={enabled ? toggle : undefined}
          className={cn(
            "flex-1 rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200",
            !enabled
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-muted-foreground",
          )}
        >
          OFF
        </button>
        <button
          type="button"
          onClick={!enabled ? toggle : undefined}
          className={cn(
            "flex-1 rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200",
            enabled
              ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
              : "text-muted-foreground",
          )}
        >
          ON
        </button>
      </div>
    </div>
  );
}
