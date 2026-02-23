import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Glide } from "../components/glide";

/**
 * Dispatch a native animationend event on the element, wrapped in act()
 * since it triggers React state updates. Using native dispatch ensures
 * e.target === e.currentTarget when dispatched directly on the Glide wrapper.
 */
function simulateAnimationEnd(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
  });
}

describe("Glide", () => {
  it("renders children when show=true", () => {
    render(<Glide show>hello</Glide>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("does not render when show=false initially", () => {
    render(<Glide show={false}>hello</Glide>);
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });

  it("applies entering class when show becomes true", () => {
    const { rerender } = render(<Glide show={false} data-testid="g">hello</Glide>);
    rerender(<Glide show data-testid="g">hello</Glide>);
    const el = screen.getByTestId("g");
    expect(el).toHaveClass("concertina-glide", "concertina-glide-entering");
  });

  it("transitions to entered after animation ends", () => {
    render(<Glide show data-testid="g">hello</Glide>);
    const el = screen.getByTestId("g");

    expect(el).toHaveClass("concertina-glide-entering");

    simulateAnimationEnd(el);
    expect(el).toHaveClass("concertina-glide");
    expect(el).not.toHaveClass("concertina-glide-entering");
    expect(el).not.toHaveClass("concertina-glide-exiting");
  });

  it("applies exiting class when show becomes false", () => {
    const { rerender } = render(<Glide show data-testid="g">hello</Glide>);
    const el = screen.getByTestId("g");
    simulateAnimationEnd(el);

    rerender(<Glide show={false} data-testid="g">hello</Glide>);
    expect(el).toHaveClass("concertina-glide-exiting");
  });

  it("unmounts after exit animation ends", () => {
    const { rerender } = render(<Glide show data-testid="g">hello</Glide>);
    simulateAnimationEnd(screen.getByTestId("g"));

    rerender(<Glide show={false} data-testid="g">hello</Glide>);
    simulateAnimationEnd(screen.getByTestId("g"));
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });

  it("renders as custom element via as prop", () => {
    render(<Glide show as="section" data-testid="g">hello</Glide>);
    expect(screen.getByTestId("g").tagName).toBe("SECTION");
  });

  it("merges custom className", () => {
    render(<Glide show className="custom" data-testid="g">hello</Glide>);
    expect(screen.getByTestId("g")).toHaveClass("concertina-glide", "custom");
  });

  it("ignores animation events from children", () => {
    render(
      <Glide show data-testid="g">
        <div data-testid="child">inner</div>
      </Glide>
    );
    const el = screen.getByTestId("g");
    const child = screen.getByTestId("child");

    // Fire on child — bubbles up but target !== currentTarget
    act(() => {
      child.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    });

    // Still in entering phase
    expect(el).toHaveClass("concertina-glide-entering");
  });
});
