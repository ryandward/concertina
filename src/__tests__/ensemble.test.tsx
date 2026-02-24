import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Ensemble } from "../components/ensemble";

const EXIT_MS = 150;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Ensemble", () => {
  it("renders stub rows when loading", () => {
    render(
      <Ensemble
        items={[]}
        loading
        stubCount={3}
        exitDuration={EXIT_MS}
        renderItem={() => null}
        data-testid="ens"
      />
    );
    const bones = document.querySelectorAll(".concertina-warmup-bone");
    expect(bones.length).toBe(3);
  });

  it("renders items when not loading", () => {
    render(
      <Ensemble
        items={["a", "b", "c"]}
        loading={false}
        stubCount={3}
        exitDuration={EXIT_MS}
        renderItem={(item, i) => <div key={i} data-testid={`item-${item}`}>{item}</div>}
      />
    );
    expect(screen.getByTestId("item-a")).toHaveTextContent("a");
    expect(screen.getByTestId("item-b")).toHaveTextContent("b");
    expect(screen.getByTestId("item-c")).toHaveTextContent("c");
  });

  it("applies exit animation class during transition", () => {
    const { rerender } = render(
      <Ensemble
        items={[]}
        loading
        stubCount={3}
        exitDuration={EXIT_MS}
        renderItem={() => null}
      />
    );

    rerender(
      <Ensemble
        items={["a"]}
        loading={false}
        stubCount={3}
        exitDuration={EXIT_MS}
        renderItem={(item, i) => <div key={i}>{item}</div>}
      />
    );

    const exiting = document.querySelector(".concertina-warmup-exiting");
    expect(exiting).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(EXIT_MS);
    });

    expect(document.querySelector(".concertina-warmup-exiting")).toBeNull();
  });

  it("respects custom stubCount", () => {
    render(
      <Ensemble
        items={[]}
        loading
        stubCount={5}
        exitDuration={EXIT_MS}
        renderItem={() => null}
      />
    );
    const bones = document.querySelectorAll(".concertina-warmup-bone");
    expect(bones.length).toBe(5);
  });

  it("respects custom exitDuration via fake timers", () => {
    const SLOW_EXIT = EXIT_MS * 2;
    const { rerender } = render(
      <Ensemble
        items={[]}
        loading
        stubCount={3}
        exitDuration={SLOW_EXIT}
        renderItem={() => null}
      />
    );

    rerender(
      <Ensemble
        items={["a"]}
        loading={false}
        stubCount={3}
        exitDuration={SLOW_EXIT}
        renderItem={(item, i) => <div key={i}>{item}</div>}
      />
    );

    // Still exiting at half the duration
    act(() => {
      vi.advanceTimersByTime(EXIT_MS);
    });
    expect(document.querySelector(".concertina-warmup-exiting")).not.toBeNull();

    // Done at full duration
    act(() => {
      vi.advanceTimersByTime(EXIT_MS);
    });
    expect(document.querySelector(".concertina-warmup-exiting")).toBeNull();
  });

  it("wraps in Gigbag for size stability", () => {
    render(
      <Ensemble
        items={[]}
        loading
        stubCount={3}
        exitDuration={EXIT_MS}
        renderItem={() => null}
        data-testid="ens"
      />
    );
    const gigbag = document.querySelector(".concertina-gigbag");
    expect(gigbag).not.toBeNull();
  });
});
