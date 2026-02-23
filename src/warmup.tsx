import { forwardRef, type HTMLAttributes, type ElementType } from "react";

export interface WarmupProps extends HTMLAttributes<HTMLElement> {
  /** Number of placeholder rows. Default: 3. */
  rows?: number;
  /** Number of columns per row. Default: 1. */
  columns?: number;
  /** HTML element to render. Default: "div". */
  as?: ElementType;
}

/**
 * Structural placeholder — CSS-only shimmer grid.
 *
 * Renders `rows x columns` animated bones that approximate the
 * dimensions of the real content. Pair with <Gigbag> so the
 * container ratchets to the larger of placeholder vs real content.
 *
 * All dimensions are CSS custom properties — consuming apps theme
 * without forking.
 */
export const Warmup = forwardRef<HTMLElement, WarmupProps>(
  function Warmup({ rows = 3, columns = 1, as: Tag = "div", className, children, ...props }, ref) {
    const merged = className
      ? `concertina-warmup ${className}`
      : "concertina-warmup";

    const cells = Array.from({ length: rows * columns }, (_, i) => (
      <div key={i} className="concertina-warmup-bone" />
    ));

    return (
      <Tag
        ref={ref}
        className={merged}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        {...props}
      >
        {cells}
      </Tag>
    );
  }
);
