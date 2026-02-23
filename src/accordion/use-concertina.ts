import {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";
import { pinToScrollTop } from "../primitives/pin-to-scroll-top";

export interface ConcertinaRootProps {
  value: string;
  onValueChange: (value: string) => void;
  "data-switching"?: true;
}

export interface UseConcertinaReturn {
  /** Currently expanded item value, empty string when collapsed. */
  value: string;
  /** Change handler. Manages switching state automatically. */
  onValueChange: (value: string) => void;
  /** True during a switch between items (animations suppressed). */
  switching: boolean;
  /** Spread onto Accordion.Root. Includes value, onValueChange, data-switching. */
  rootProps: ConcertinaRootProps;
  /** Returns a ref callback for an Accordion.Item. Pass the item's value. */
  getItemRef: (id: string) => (el: HTMLElement | null) => void;
}

/**
 * React hook for scroll-pinned Radix Accordion panels.
 *
 * Handles five things:
 * 1. Suppresses close/open animations when switching between items
 * 2. Pins the newly opened item to the top of the scroll container
 * 3. Uses scrollTop adjustment instead of scrollIntoView (no viewport cascade)
 * 4. Coordinates React state batching so layout is final before scroll measurement
 * 5. Clears the switching flag after paint so future animations work normally
 */
export function useConcertina(): UseConcertinaReturn {
  const [value, setValue] = useState("");
  const [switching, setSwitching] = useState(false);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  const onValueChange = useCallback(
    (newValue: string) => {
      if (!newValue) {
        setSwitching(false);
        setValue("");
        return;
      }
      // React 18+ batches both updates into one render.
      // CSS [data-switching] suppresses animations so layout is
      // in its final state when useLayoutEffect measures for scroll.
      setSwitching(!!value && value !== newValue);
      setValue(newValue);
    },
    [value]
  );

  // Scroll after React + Radix have committed the DOM
  useLayoutEffect(() => {
    if (!value) return;
    pinToScrollTop(itemRefs.current[value]);
  }, [value]);

  // Clear switching flag after paint so future animations work
  useEffect(() => {
    if (switching) setSwitching(false);
  }, [switching]);

  const getItemRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      itemRefs.current[id] = el;
    },
    []
  );

  const rootProps: ConcertinaRootProps = {
    value,
    onValueChange,
    ...(switching ? { "data-switching": true as const } : {}),
  };

  return { value, onValueChange, switching, rootProps, getItemRef };
}
