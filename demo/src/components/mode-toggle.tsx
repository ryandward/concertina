import { useConcertinaMode } from "@/context/concertina-mode";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { enabled, toggle } = useConcertinaMode();

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-2">
        concertina
      </span>
      <div className="relative h-12 w-72 rounded-full bg-slate-100 p-1 border border-border flex">
        {/* Sliding background indicator */}
        <div
          className={cn(
            "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            enabled
              ? "left-[calc(50%+2px)] bg-gradient-to-r from-indigo-500 to-violet-500 shadow-md"
              : "left-1 bg-white shadow-sm",
          )}
        />
        <button
          type="button"
          onClick={enabled ? toggle : undefined}
          className={cn(
            "relative z-10 flex-1 rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200",
            !enabled ? "text-zinc-900" : "text-muted-foreground",
          )}
        >
          OFF
        </button>
        <button
          type="button"
          onClick={!enabled ? toggle : undefined}
          className={cn(
            "relative z-10 flex-1 rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200",
            enabled ? "text-white" : "text-muted-foreground",
          )}
        >
          ON
        </button>
      </div>
    </div>
  );
}
