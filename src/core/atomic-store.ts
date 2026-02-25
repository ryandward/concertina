/**
 * AtomicStore — single source of truth for the Core Stability Engine.
 *
 * Components subscribe only to their specific slice via useAtomicSlice,
 * which uses useSyncExternalStore to prevent global re-renders.
 * A component re-renders only when the slice it selected changes by reference.
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import {
  INITIAL_STORE_STATE,
  type StoreState,
  type WorkerEvent,
  type StreamStatus,
} from "./types";

type Listener = () => void;

// ─── AtomicStore ──────────────────────────────────────────────────────────────

export class AtomicStore {
  private state: StoreState = INITIAL_STORE_STATE;
  private readonly listeners = new Set<Listener>();

  // useSyncExternalStore-compatible subscribe
  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify(): void {
    for (const l of this.listeners) l();
  }

  getState(): StoreState {
    return this.state;
  }

  // ── Dispatch: accepts worker events and applies them to state ────────────────
  dispatch(event: WorkerEvent): void {
    switch (event.type) {
      case "LAYOUT_READY":
        this.merge({ layout: event.layout, status: "streaming" });
        break;

      case "WINDOW_UPDATE":
        this.merge({
          window:    event.window,
          layout:    event.window.layout,
          totalRows: event.window.layout.totalRows,
        });
        break;

      case "BACKPRESSURE":
        this.merge({ backpressure: event.state });
        break;

      case "TOTAL_ROWS_UPDATED":
        // Layout will arrive with the next WINDOW_UPDATE; avoid stale totalRows.
        if (this.state.totalRows !== event.totalRows) {
          this.merge({ totalRows: event.totalRows });
        }
        break;

      case "INGEST_ERROR":
        this.merge({
          status: "error",
          error:  `Batch ${event.seq}: ${event.message}`,
        });
        break;
    }
  }

  /** Transition stream lifecycle status. */
  setStatus(status: StreamStatus, error?: string): void {
    this.merge({ status, error: error ?? this.state.error });
  }

  private merge(patch: Partial<StoreState>): void {
    const next = { ...this.state, ...patch } as StoreState;
    this.state = next;
    this.notify();
  }
}

// ─── useAtomicSlice ────────────────────────────────────────────────────────────
//
// Components call this with a selector function. They only re-render when the
// selected value changes by reference (or by a custom equality predicate).
//
// The contract for useSyncExternalStore requires that getSnapshot() returns
// a referentially stable value when the relevant slice hasn't changed.
// We achieve this by caching the previous slice and returning the same object
// reference if equalityFn says it hasn't changed.

type EqualityFn<T> = (a: T, b: T) => boolean;

export function useAtomicSlice<T>(
  store: AtomicStore,
  selector: (state: StoreState) => T,
  equalityFn: EqualityFn<T> = Object.is,
): T {
  // Keep selector + equality fn up-to-date without recreating getSnapshot
  const selectorRef   = useRef<(state: StoreState) => T>(selector);
  const equalityRef   = useRef<EqualityFn<T>>(equalityFn);
  selectorRef.current = selector;
  equalityRef.current = equalityFn;

  // Stable snapshot cache — only broken when the slice actually changes
  const cachedSlice = useRef<{ value: T } | null>(null);

  const getSnapshot = useCallback((): T => {
    const next = selectorRef.current(store.getState());

    if (
      cachedSlice.current !== null &&
      equalityRef.current(cachedSlice.current.value, next)
    ) {
      // Referentially identical cache hit → same object → no re-render
      return cachedSlice.current.value;
    }

    cachedSlice.current = { value: next };
    return next;
  }, [store]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
