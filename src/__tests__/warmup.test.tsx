import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Warmup } from "../components/warmup";

describe("Warmup", () => {
  it("renders specified number of bones", () => {
    render(<Warmup rows={3} data-testid="w" />);
    const el = screen.getByTestId("w");
    expect(el).toHaveClass("concertina-warmup");
    expect(el.querySelectorAll(".concertina-warmup-bone")).toHaveLength(3);
  });

  it("renders rows x columns bones", () => {
    render(<Warmup rows={4} columns={2} data-testid="w" />);
    const el = screen.getByTestId("w");
    expect(el.querySelectorAll(".concertina-warmup-bone")).toHaveLength(8);
  });

  it("sets grid-template-columns with auto sizing", () => {
    render(<Warmup rows={3} columns={3} data-testid="w" />);
    expect(screen.getByTestId("w")).toHaveStyle({
      gridTemplateColumns: "repeat(3, auto)",
    });
  });

  it("renders as custom element via as prop", () => {
    render(<Warmup rows={3} as="section" data-testid="w" />);
    expect(screen.getByTestId("w").tagName).toBe("SECTION");
  });

  it("merges custom className", () => {
    render(<Warmup rows={3} className="custom" data-testid="w" />);
    expect(screen.getByTestId("w")).toHaveClass("concertina-warmup", "custom");
  });

  it("passes through HTML attributes", () => {
    render(<Warmup rows={3} aria-busy="true" data-testid="w" />);
    expect(screen.getByTestId("w")).toHaveAttribute("aria-busy", "true");
  });
});
