import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StableSlot } from "../components/stable-slot";
import { Slot } from "../components/slot";

describe("StableSlot", () => {
  it("renders with concertina-stable-slot class", () => {
    render(<StableSlot data-testid="ss">content</StableSlot>);
    const el = screen.getByTestId("ss");
    expect(el).toHaveClass("concertina-stable-slot");
    expect(el.tagName).toBe("DIV");
  });

  it("merges custom className", () => {
    render(<StableSlot data-testid="ss" className="my-class">content</StableSlot>);
    const el = screen.getByTestId("ss");
    expect(el).toHaveClass("concertina-stable-slot", "my-class");
  });

  it("renders as custom element via as prop", () => {
    render(<StableSlot data-testid="ss" as="span">content</StableSlot>);
    expect(screen.getByTestId("ss").tagName).toBe("SPAN");
  });

  it("passes through HTML attributes", () => {
    render(<StableSlot data-testid="ss" aria-label="test">content</StableSlot>);
    expect(screen.getByTestId("ss")).toHaveAttribute("aria-label", "test");
  });
});

describe("Slot", () => {
  it("renders active slot without inert", () => {
    render(
      <StableSlot>
        <Slot active data-testid="slot">active content</Slot>
      </StableSlot>
    );
    const el = screen.getByTestId("slot");
    expect(el).not.toHaveAttribute("inert");
    expect(el).toBeVisible();
  });

  it("renders inactive slot with inert and visibility hidden", () => {
    render(
      <StableSlot>
        <Slot active={false} data-testid="slot">inactive content</Slot>
      </StableSlot>
    );
    const el = screen.getByTestId("slot");
    expect(el).toHaveAttribute("inert");
    expect(el).toHaveStyle({ visibility: "hidden" });
  });

  it("renders as custom element via as prop", () => {
    render(
      <StableSlot>
        <Slot active as="span" data-testid="slot">content</Slot>
      </StableSlot>
    );
    expect(screen.getByTestId("slot").tagName).toBe("SPAN");
  });
});
