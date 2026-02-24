import { forwardRef, useInsertionEffect, type HTMLAttributes, type ElementType } from "react";
import { injectStyles } from "../internal/inject-styles";

export interface WarmupProps extends HTMLAttributes<HTMLElement> {
  /** Number of placeholder rows. */
  rows: number;
  /** Number of columns per row. */
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
  function Warmup({ rows, columns, as: Tag = "div", className, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);
    const merged = className
      ? `concertina-warmup ${className}`
      : "concertina-warmup";

    const count = columns ? rows * columns : rows;

    const cells = Array.from({ length: count }, (_, i) => (
      <div key={i} className="concertina-warmup-bone">
        <div className="concertina-warmup-line" />
        <div className="concertina-warmup-line" />
      </div>
    ));

    const gridStyle = columns
      ? { gridTemplateColumns: `repeat(${columns}, auto)`, gridTemplateAreas: `'${"chamber ".repeat(columns).trim()}'` }
      : { gridTemplateAreas: "'chamber'" };

    return (
      <Tag
        ref={ref}
        className={merged}
        style={gridStyle}
        {...props}
      >
        {cells}
      </Tag>
    );
  }
);
