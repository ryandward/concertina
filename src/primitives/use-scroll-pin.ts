import { useLayoutEffect, type DependencyList } from "react";
import { pinToScrollTop } from "./pin-to-scroll-top";

/**
 * Pin an element to the top of its scroll container after layout changes.
 *
 * Runs pinToScrollTop inside useLayoutEffect — after React commits
 * the DOM but before the browser paints. This ensures scroll
 * correction happens synchronously with layout changes.
 *
 * Extracted from accordion Root so any component can do scroll pinning.
 */
export function useScrollPin(
  getElement: () => HTMLElement | null,
  deps: DependencyList
): void {
  useLayoutEffect(() => {
    const el = getElement();
    if (!el) return;
    pinToScrollTop(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
