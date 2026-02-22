import { useContext, useSyncExternalStore } from "react";
import { ConcertinaContext, ConcertinaStore } from "./store";

function useStore(): ConcertinaStore {
  const store = useContext(ConcertinaContext);
  if (!store) {
    throw new Error("useExpanded must be used inside <Concertina.Root>");
  }
  return store;
}

/**
 * Per-item expansion hook. Returns true only when this item is expanded.
 *
 * Uses useSyncExternalStore so the component only re-renders when
 * its own boolean flips — not on every accordion state change.
 */
export function useExpanded(id: string): boolean {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getValue() === id,
    () => false // server snapshot
  );
}
