import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Gigbag } from "../components/gigbag";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
  );
});

describe("Gigbag", () => {
  it("renders with concertina-gigbag class", () => {
    render(<Gigbag data-testid="gb">content</Gigbag>);
    const el = screen.getByTestId("gb");
    expect(el).toHaveClass("concertina-gigbag");
    expect(el.tagName).toBe("DIV");
  });

  it("merges custom className", () => {
    render(<Gigbag className="custom" data-testid="gb">content</Gigbag>);
    expect(screen.getByTestId("gb")).toHaveClass("concertina-gigbag", "custom");
  });

  it("renders as custom element via as prop", () => {
    render(<Gigbag as="section" data-testid="gb">content</Gigbag>);
    expect(screen.getByTestId("gb").tagName).toBe("SECTION");
  });

  it("renders children", () => {
    render(<Gigbag>hello world</Gigbag>);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});
