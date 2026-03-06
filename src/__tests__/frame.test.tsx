import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Frame } from "../components/frame";
import { Vamp } from "../components/vamp";

describe("Frame", () => {
  it("renders shimmer placeholder when loading", () => {
    render(<Frame aspectRatio={16 / 9} loading data-testid="frame" />);
    const el = screen.getByTestId("frame");
    expect(el).toHaveClass("concertina-frame", "concertina-frame-loading");
  });

  it("renders children when not loading", () => {
    render(
      <Frame aspectRatio={16 / 9} loading={false} data-testid="frame">
        <img src="test.jpg" alt="test" />
      </Frame>,
    );
    const el = screen.getByTestId("frame");
    expect(el).toHaveClass("concertina-frame");
    expect(el).not.toHaveClass("concertina-frame-loading");
    expect(el.querySelector("img")).not.toBeNull();
  });

  it("does not render children when loading", () => {
    render(
      <Frame aspectRatio={1} loading data-testid="frame">
        <img src="test.jpg" alt="test" />
      </Frame>,
    );
    const el = screen.getByTestId("frame");
    expect(el.querySelector("img")).toBeNull();
  });

  it("applies inline style (aspect-ratio passed through)", () => {
    // jsdom strips unknown CSS properties like aspect-ratio, so we
    // verify the style prop pass-through with a property jsdom recognizes.
    render(
      <Frame aspectRatio={16 / 9} loading={false} style={{ maxWidth: "400px" }} data-testid="frame" />,
    );
    const el = screen.getByTestId("frame");
    expect(el.style.maxWidth).toBe("400px");
  });

  it("passes className through in both states", () => {
    const { rerender } = render(
      <Frame aspectRatio={1} loading className="rounded-lg" data-testid="frame" />,
    );
    expect(screen.getByTestId("frame")).toHaveClass("concertina-frame", "concertina-frame-loading", "rounded-lg");

    rerender(
      <Frame aspectRatio={1} loading={false} className="rounded-lg" data-testid="frame" />,
    );
    expect(screen.getByTestId("frame")).toHaveClass("concertina-frame", "rounded-lg");
    expect(screen.getByTestId("frame")).not.toHaveClass("concertina-frame-loading");
  });

  it("reads loading from Vamp context when no prop", () => {
    render(
      <Vamp loading>
        <Frame aspectRatio={4 / 3} data-testid="frame" />
      </Vamp>,
    );
    expect(screen.getByTestId("frame")).toHaveClass("concertina-frame-loading");
  });

  it("explicit loading prop overrides Vamp context", () => {
    render(
      <Vamp loading>
        <Frame aspectRatio={1} loading={false} data-testid="frame">
          <img src="test.jpg" alt="test" />
        </Frame>
      </Vamp>,
    );
    const el = screen.getByTestId("frame");
    expect(el).not.toHaveClass("concertina-frame-loading");
    expect(el.querySelector("img")).not.toBeNull();
  });

  it("renders as custom element via as prop", () => {
    render(<Frame aspectRatio={1} loading={false} as="section" data-testid="frame" />);
    expect(screen.getByTestId("frame").tagName).toBe("SECTION");
  });

  it("defaults to div element", () => {
    render(<Frame aspectRatio={1} loading={false} data-testid="frame" />);
    expect(screen.getByTestId("frame").tagName).toBe("DIV");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLElement>();
    render(<Frame aspectRatio={1} loading={false} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it("merges consumer style without clobbering", () => {
    render(
      <Frame
        aspectRatio={16 / 9}
        loading
        style={{ borderRadius: "8px", maxWidth: "500px" }}
        data-testid="frame"
      />,
    );
    const el = screen.getByTestId("frame");
    expect(el.style.borderRadius).toBe("8px");
    expect(el.style.maxWidth).toBe("500px");
  });
});
