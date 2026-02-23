import {
  useState,
  useEffect,
  useCallback,
  type AnimationEvent,
} from "react";

export type Phase = "entering" | "entered" | "exiting";

export interface UsePresenceReturn {
  /** Whether the element should be in the DOM. */
  mounted: boolean;
  /** Current animation phase. */
  phase: Phase;
  /** Attach to the animating element's onAnimationEnd. */
  onAnimationEnd: (e: AnimationEvent) => void;
}

/**
 * Mount/unmount state machine for enter/exit animations.
 *
 * State transitions:
 *   show=true  → mount + "entering" → animationEnd → "entered"
 *   show=false → "exiting" → animationEnd → unmount
 *
 * Extracted from Glide so any component can use animated presence.
 */
export function usePresence(show: boolean): UsePresenceReturn {
  const [mounted, setMounted] = useState(show);
  const [phase, setPhase] = useState<Phase>(show ? "entered" : "exiting");

  useEffect(() => {
    if (show) {
      setMounted(true);
      setPhase("entering");
    } else if (mounted) {
      setPhase("exiting");
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAnimationEnd = useCallback(
    (e: AnimationEvent) => {
      if (e.target !== e.currentTarget) return;
      if (phase === "entering") setPhase("entered");
      if (phase === "exiting") setMounted(false);
    },
    [phase]
  );

  return { mounted, phase, onAnimationEnd };
}
