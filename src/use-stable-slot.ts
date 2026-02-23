import { useState, useCallback, useRef, type CSSProperties } from "react";
import type { Axis } from "./stable-slot";

interface UseStableSlotOptions {
  /** Which axis to ratchet. Default: "both". */
  axis?: Axis;
}

interface UseStableSlotReturn {
  /** RefCallback — attach to the container element. */
  ref: (el: HTMLElement | null) => void;
  /** Spread onto the element: { minWidth?, minHeight? } */
  style: CSSProperties;
}

/**
 * ResizeObserver ratchet for dynamic content.
 *
 * Watches the element, tracks maximum width/height ever observed,
 * applies min-width/min-height that only ratchets up.
 *
 * Five things work together:
 * 1. ResizeObserver uses borderBoxSize — includes padding/border
 * 2. Ratchet is one-way — max only increases, never resets
 * 3. setStyle only called when ratchet grows — no infinite loops
 * 4. RefCallback disconnects observer on unmount — no leak
 * 5. SSR graceful no-op — typeof ResizeObserver guard
 */
export function useStableSlot(
  options: UseStableSlotOptions = {}
): UseStableSlotReturn {
  const { axis = "both" } = options;
  const [style, setStyle] = useState<CSSProperties>({});
  const maxRef = useRef({ w: 0, h: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!el || typeof ResizeObserver === "undefined") return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          let w: number;
          let h: number;

          if (entry.borderBoxSize?.length) {
            const box = entry.borderBoxSize[0];
            w = box.inlineSize;
            h = box.blockSize;
          } else {
            // Fallback for older browsers
            const rect = entry.target.getBoundingClientRect();
            w = rect.width;
            h = rect.height;
          }

          const max = maxRef.current;
          let grew = false;

          if ((axis === "width" || axis === "both") && w > max.w) {
            max.w = w;
            grew = true;
          }
          if ((axis === "height" || axis === "both") && h > max.h) {
            max.h = h;
            grew = true;
          }

          if (grew) {
            const next: CSSProperties = {};
            if (axis === "width" || axis === "both") next.minWidth = max.w;
            if (axis === "height" || axis === "both") next.minHeight = max.h;
            setStyle(next);
          }
        }
      });

      observer.observe(el, { box: "border-box" });
      observerRef.current = observer;
    },
    [axis]
  );

  return { ref, style };
}
