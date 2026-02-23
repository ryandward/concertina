import { useState, useEffect, useCallback } from "react";

/**
 * Suppress CSS transitions during batched state changes.
 *
 * Three things work together:
 * 1. lock() sets the flag synchronously — batched with state changes in React 18
 * 2. After DOM commit (useLayoutEffect window) — consumer does measurement/scroll/pin work
 * 3. useEffect auto-clears the flag after paint — transitions re-enable
 *
 * Usage:
 *   const { locked, lock } = useTransitionLock();
 *   <div data-locked={locked || undefined}>...</div>
 */
export function useTransitionLock() {
  const [locked, setLocked] = useState(false);

  const lock = useCallback(() => setLocked(true), []);

  // Clear after paint so transitions re-enable
  useEffect(() => {
    if (locked) setLocked(false);
  }, [locked]);

  return { locked, lock } as const;
}
