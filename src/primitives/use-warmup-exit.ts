import { useState, useEffect, useRef } from "react";

/**
 * Manages the warmup → content transition for stub-data tables.
 *
 * When `loading` transitions from true to false, holds stub data
 * for one animation cycle so warmup lines can fade out before
 * real content mounts.
 *
 * @deprecated Use `<Ensemble>` instead.
 * @param loading - Whether data is still loading
 * @param duration - Exit animation duration in ms. Must match CSS --concertina-close-duration.
 */
export function useWarmupExit(loading: boolean, duration: number) {
  const [exiting, setExiting] = useState(false);
  const prevLoading = useRef(loading);

  useEffect(() => {
    if (prevLoading.current && !loading) {
      setExiting(true);
      const id = setTimeout(() => setExiting(false), duration);
      prevLoading.current = loading;
      return () => clearTimeout(id);
    }
    prevLoading.current = loading;
  }, [loading, duration]);

  return {
    /** True during loading AND during exit animation — use for data selection */
    showWarmup: loading || exiting,
    /** True only during the exit animation — use for CSS class */
    exiting,
  };
}
