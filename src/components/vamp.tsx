import { createContext, useContext, type ReactNode } from "react";

/** Context carrying the ambient loading state set by Vamp. */
export const VampContext = createContext(false);

/**
 * Read the nearest Vamp's loading state.
 * Returns `false` when no Vamp ancestor exists.
 */
export function useVamp(): boolean {
  return useContext(VampContext);
}

export interface VampProps {
  /** Whether the subtree is in a loading/warmup state. */
  loading: boolean;
  children: ReactNode;
}

/**
 * Ambient loading provider — musical "vamping" (repeating a pattern
 * while waiting for a cue).
 *
 * Wrapping a subtree in `<Vamp loading>` lets every nested `<Hum>`
 * pick up the loading state automatically, without threading an
 * explicit `loading` prop through every cell.
 */
export function Vamp({ loading, children }: VampProps) {
  return (
    <VampContext.Provider value={loading}>{children}</VampContext.Provider>
  );
}
