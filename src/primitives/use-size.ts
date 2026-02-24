import { useState, useCallback, useRef } from "react";

export interface Size {
  width: number;
  height: number;
}

const NO_OBSERVATION: Size = { width: Number.NaN, height: Number.NaN };

interface UseSizeReturn {
  /** RefCallback — attach to the element to observe. */
  ref: (el: HTMLElement | null) => void;
  /** Current border-box size. NaN before first observation. */
  size: Size;
}

/**
 * Raw border-box size observation via ResizeObserver.
 *
 * Reports every resize — no ratchet, no policy. Use this when you
 * need the actual current size for your own logic (e.g. breakpoints,
 * conditional rendering, animations).
 *
 * For a ratcheting min-size that only grows, use useStableSlot instead.
 *
 * @deprecated Use `<Gigbag>` instead.
 */
export function useSize(): UseSizeReturn {
  const [size, setSize] = useState<Size>(NO_OBSERVATION);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((el: HTMLElement | null) => {
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
          const rect = entry.target.getBoundingClientRect();
          w = rect.width;
          h = rect.height;
        }

        setSize({ width: w, height: h });
      }
    });

    observer.observe(el, { box: "border-box" });
    observerRef.current = observer;
  }, []);

  return { ref, size };
}
