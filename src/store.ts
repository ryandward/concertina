import { createContext } from "react";

type Listener = () => void;

/**
 * External store for concertina accordion state.
 * Lives outside React — one instance per Root.
 * Subscribers get notified on value or switching changes.
 */
export class ConcertinaStore {
  private _value = "";
  private _switching = false;
  private _itemRefs: Record<string, HTMLElement | null> = {};
  private _listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  private _notify() {
    for (const listener of this._listeners) listener();
  }

  getValue = (): string => this._value;

  getSwitching = (): boolean => this._switching;

  setValue(newValue: string) {
    const wasSwitching = !!this._value && this._value !== newValue && !!newValue;
    this._switching = wasSwitching;
    this._value = newValue || "";
    this._notify();
  }

  clearSwitching() {
    if (!this._switching) return;
    this._switching = false;
    this._notify();
  }

  getItemRef(id: string): HTMLElement | null {
    return this._itemRefs[id] ?? null;
  }

  setItemRef(id: string, el: HTMLElement | null) {
    this._itemRefs[id] = el;
  }
}

export const ConcertinaContext = createContext<ConcertinaStore | null>(null);
