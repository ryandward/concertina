import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransitionLock } from "../primitives/use-transition-lock";

describe("useTransitionLock", () => {
  it("starts unlocked", () => {
    const { result } = renderHook(() => useTransitionLock());
    expect(result.current.locked).toBe(false);
  });

  it("lock/unlock cycle completes within act", () => {
    // lock() sets true, then useEffect clears it — both run inside act().
    // This test verifies the full cycle completes without error.
    const { result } = renderHook(() => useTransitionLock());
    act(() => result.current.lock());
    // After act, the useEffect has already cleared locked back to false
    expect(result.current.locked).toBe(false);
  });

  it("lock triggers a render with locked=true before clearing", () => {
    // Capture every value of `locked` across renders
    const states: boolean[] = [];
    const { result } = renderHook(() => {
      const hook = useTransitionLock();
      states.push(hook.locked);
      return hook;
    });

    act(() => result.current.lock());

    // Should have seen: false (initial), true (after lock), false (after clear)
    expect(states).toContain(true);
    expect(states[states.length - 1]).toBe(false);
  });

  it("lock function identity is stable", () => {
    const { result, rerender } = renderHook(() => useTransitionLock());
    const first = result.current.lock;
    rerender();
    expect(result.current.lock).toBe(first);
  });
});
