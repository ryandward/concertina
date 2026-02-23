import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import { usePresence } from "../primitives/use-presence";
import type { Phase } from "../primitives/use-presence";

describe("usePresence", () => {
  it("starts mounted in entering phase when show=true", () => {
    const { result } = renderHook(() => usePresence(true));
    expect(result.current.mounted).toBe(true);
    // useEffect fires and sets phase to "entering" — needs animationEnd to reach "entered"
    expect(result.current.phase).toBe("entering");
  });

  it("starts unmounted when show=false", () => {
    const { result } = renderHook(() => usePresence(false));
    expect(result.current.mounted).toBe(false);
  });

  it("mounts and enters when show becomes true", () => {
    const { result, rerender } = renderHook(
      ({ show }) => usePresence(show),
      { initialProps: { show: false } }
    );
    expect(result.current.mounted).toBe(false);

    rerender({ show: true });
    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("entering");
  });

  it("transitions entering → entered on animationEnd", () => {
    const { result } = renderHook(() => usePresence(true));
    // Initial show=true triggers entering via useEffect
    // After the effect runs, phase is "entering" (since useEffect sets it)
    // But the initial state is "entered" — let's test from false→true transition
    const { result: r2, rerender } = renderHook(
      ({ show }) => usePresence(show),
      { initialProps: { show: false } }
    );
    rerender({ show: true });
    expect(r2.current.phase).toBe("entering");

    // Simulate animationEnd with matching target/currentTarget
    const fakeEvent = {
      target: document.createElement("div"),
      currentTarget: null as any,
    };
    fakeEvent.currentTarget = fakeEvent.target;
    act(() => r2.current.onAnimationEnd(fakeEvent as any));
    expect(r2.current.phase).toBe("entered");
  });

  it("transitions to exiting when show becomes false", () => {
    const { result, rerender } = renderHook(
      ({ show }) => usePresence(show),
      { initialProps: { show: true } }
    );

    rerender({ show: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("exiting");
  });

  it("unmounts after exit animation ends", () => {
    const { result, rerender } = renderHook(
      ({ show }) => usePresence(show),
      { initialProps: { show: true } }
    );

    rerender({ show: false });
    expect(result.current.phase).toBe("exiting");

    const fakeEvent = {
      target: document.createElement("div"),
      currentTarget: null as any,
    };
    fakeEvent.currentTarget = fakeEvent.target;
    act(() => result.current.onAnimationEnd(fakeEvent as any));
    expect(result.current.mounted).toBe(false);
  });

  it("ignores animation events from children (target !== currentTarget)", () => {
    const { result, rerender } = renderHook(
      ({ show }) => usePresence(show),
      { initialProps: { show: false } }
    );
    rerender({ show: true });
    expect(result.current.phase).toBe("entering");

    const parent = document.createElement("div");
    const child = document.createElement("div");
    const fakeEvent = { target: child, currentTarget: parent };
    act(() => result.current.onAnimationEnd(fakeEvent as any));

    // Should still be entering — event ignored
    expect(result.current.phase).toBe("entering");
  });

  it("full lifecycle: unmounted → entering → entered → exiting → unmounted", () => {
    const phases: Phase[] = [];
    const { result, rerender } = renderHook(
      ({ show }) => {
        const p = usePresence(show);
        if (p.mounted) phases.push(p.phase);
        return p;
      },
      { initialProps: { show: false } }
    );

    // Mount
    rerender({ show: true });
    expect(result.current.phase).toBe("entering");

    // Animation end → entered
    const fakeEvent = {
      target: document.createElement("div"),
      currentTarget: null as any,
    };
    fakeEvent.currentTarget = fakeEvent.target;
    act(() => result.current.onAnimationEnd(fakeEvent as any));
    expect(result.current.phase).toBe("entered");

    // Hide → exiting
    rerender({ show: false });
    expect(result.current.phase).toBe("exiting");

    // Animation end → unmount
    act(() => result.current.onAnimationEnd(fakeEvent as any));
    expect(result.current.mounted).toBe(false);
  });
});
