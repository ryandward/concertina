import { describe, it, expect, vi } from "vitest";
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

  it("sets tabIndex={-1} on active slot", () => {
    render(
      <StableSlot>
        <Slot active data-testid="active">A</Slot>
        <Slot active={false} data-testid="inactive">B</Slot>
      </StableSlot>
    );
    expect(screen.getByTestId("active")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByTestId("inactive")).not.toHaveAttribute("tabindex");
  });

  it("allows user tabIndex to override default", () => {
    render(
      <StableSlot>
        <Slot active tabIndex={0} data-testid="slot">content</Slot>
      </StableSlot>
    );
    expect(screen.getByTestId("slot")).toHaveAttribute("tabindex", "0");
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

describe("Slot focus handoff", () => {
  it("moves focus to the incoming slot wrapper when the focused slot deactivates", () => {
    const { rerender } = render(
      <Bellows activeNote="a">
        <Slot note="a" data-testid="a"><button data-testid="btn-a">A</button></Slot>
        <Slot note="b" data-testid="b"><button data-testid="btn-b">B</button></Slot>
      </Bellows>
    );

    // Focus a button inside slot A
    screen.getByTestId("btn-a").focus();
    expect(document.activeElement).toBe(screen.getByTestId("btn-a"));

    // Switch active note to B — slot A deactivates while holding focus
    rerender(
      <Bellows activeNote="b">
        <Slot note="a" data-testid="a"><button data-testid="btn-a">A</button></Slot>
        <Slot note="b" data-testid="b"><button data-testid="btn-b">B</button></Slot>
      </Bellows>
    );

    // Focus should land on the slot B wrapper itself, not a child
    expect(document.activeElement).toBe(screen.getByTestId("b"));
  });

  it("does not move focus when the deactivating slot did not hold focus", () => {
    const { rerender } = render(
      <Bellows activeNote="a">
        <Slot note="a" data-testid="a"><button data-testid="btn-a">A</button></Slot>
        <Slot note="b" data-testid="b"><button data-testid="btn-b">B</button></Slot>
      </Bellows>
    );

    // Do NOT focus anything inside slot A
    expect(document.activeElement).toBe(document.body);

    const slotB = screen.getByTestId("b");
    const focusSpy = vi.spyOn(slotB, "focus");

    rerender(
      <Bellows activeNote="b">
        <Slot note="a" data-testid="a"><button data-testid="btn-a">A</button></Slot>
        <Slot note="b" data-testid="b"><button data-testid="btn-b">B</button></Slot>
      </Bellows>
    );

    // Focus should not have been moved — no handoff needed
    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it("handles slots with no focusable children gracefully", () => {
    const { rerender } = render(
      <Bellows activeNote="a">
        <Slot note="a" data-testid="a"><button data-testid="btn-a">A</button></Slot>
        <Slot note="b" data-testid="b"><span>no focusable elements</span></Slot>
      </Bellows>
    );

    screen.getByTestId("btn-a").focus();
    expect(document.activeElement).toBe(screen.getByTestId("btn-a"));

    // Switch to slot B — handoff focuses the slot wrapper itself (tabIndex={-1})
    rerender(
      <Bellows activeNote="b">
        <Slot note="a" data-testid="a"><button data-testid="btn-a">A</button></Slot>
        <Slot note="b" data-testid="b"><span>no focusable elements</span></Slot>
      </Bellows>
    );

    // Focus lands on the slot wrapper via tabIndex={-1}, even with no
    // focusable children — no crash, no focus stranded on body
    expect(document.activeElement).toBe(screen.getByTestId("b"));
  });

  it("works with explicit active prop (not activeNote)", () => {
    const { rerender } = render(
      <Bellows>
        <Slot active data-testid="a"><button data-testid="btn-a">A</button></Slot>
        <Slot active={false} data-testid="b"><button data-testid="btn-b">B</button></Slot>
      </Bellows>
    );

    screen.getByTestId("btn-a").focus();

    rerender(
      <Bellows>
        <Slot active={false} data-testid="a"><button data-testid="btn-a">A</button></Slot>
        <Slot active data-testid="b"><button data-testid="btn-b">B</button></Slot>
      </Bellows>
    );

    expect(document.activeElement).toBe(screen.getByTestId("b"));
  });
});
