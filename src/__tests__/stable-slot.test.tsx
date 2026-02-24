import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bellows, StableSlot } from "../components/bellows";
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

  it("renders inactive slot with inert attribute", () => {
    render(
      <StableSlot>
        <Slot active={false} data-testid="slot">inactive content</Slot>
      </StableSlot>
    );
    const el = screen.getByTestId("slot");
    expect(el).toHaveAttribute("inert");
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

describe("Bellows with activeNote", () => {
  it("activates matching Slot via note prop", () => {
    render(
      <Bellows activeNote="b">
        <Slot note="a" data-testid="a">A</Slot>
        <Slot note="b" data-testid="b">B</Slot>
      </Bellows>
    );
    expect(screen.getByTestId("a")).toHaveAttribute("inert");
    expect(screen.getByTestId("b")).not.toHaveAttribute("inert");
  });

  it("explicit active overrides context", () => {
    render(
      <Bellows activeNote="b">
        <Slot active note="a" data-testid="a">A</Slot>
        <Slot note="b" data-testid="b">B</Slot>
      </Bellows>
    );
    // active=true overrides note mismatch
    expect(screen.getByTestId("a")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("b")).not.toHaveAttribute("inert");
  });

  it("bare Slot defaults to visible", () => {
    render(
      <Bellows>
        <Slot data-testid="bare">content</Slot>
      </Bellows>
    );
    expect(screen.getByTestId("bare")).not.toHaveAttribute("inert");
  });

  it("switching activeNote toggles slots", () => {
    const { rerender } = render(
      <Bellows activeNote="a">
        <Slot note="a" data-testid="a">A</Slot>
        <Slot note="b" data-testid="b">B</Slot>
      </Bellows>
    );
    expect(screen.getByTestId("a")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("b")).toHaveAttribute("inert");

    rerender(
      <Bellows activeNote="b">
        <Slot note="a" data-testid="a">A</Slot>
        <Slot note="b" data-testid="b">B</Slot>
      </Bellows>
    );
    expect(screen.getByTestId("a")).toHaveAttribute("inert");
    expect(screen.getByTestId("b")).not.toHaveAttribute("inert");
  });
});
