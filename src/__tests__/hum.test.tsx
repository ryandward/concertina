import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Hum } from "../components/hum";

describe("Hum", () => {
  it("renders shimmer with inert ghost children when loading", () => {
    render(<Hum loading data-testid="hum">text</Hum>);
    const el = screen.getByTestId("hum");
    expect(el).toHaveClass("concertina-warmup-line");
    // Ghost children are present but inert
    const ghost = el.firstElementChild!;
    expect(ghost).toHaveAttribute("inert");
    expect(ghost).toHaveTextContent("text");
  });

  it("renders children visibly when not loading", () => {
    render(<Hum loading={false} data-testid="hum">text</Hum>);
    const el = screen.getByTestId("hum");
    expect(el).not.toHaveClass("concertina-warmup-line");
    expect(el).toHaveTextContent("text");
  });

  it("passes className through to shimmer when loading", () => {
    render(<Hum loading className="text-lg font-bold" data-testid="hum">text</Hum>);
    const el = screen.getByTestId("hum");
    expect(el).toHaveClass("concertina-warmup-line", "text-lg", "font-bold");
  });

  it("renders as custom element via as prop", () => {
    render(<Hum loading={false} as="div" data-testid="hum">text</Hum>);
    expect(screen.getByTestId("hum").tagName).toBe("DIV");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Hum loading={false} ref={ref}>text</Hum>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it("defaults to span element", () => {
    render(<Hum loading={false} data-testid="hum">text</Hum>);
    expect(screen.getByTestId("hum").tagName).toBe("SPAN");
  });
});
