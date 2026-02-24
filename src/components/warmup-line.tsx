import { forwardRef, type HTMLAttributes, type ElementType } from "react";

export interface WarmupLineProps extends HTMLAttributes<HTMLElement> {
  /** HTML element to render. Default: "div". */
  as?: ElementType;
}

/**
 * Single shimmer line — CSS-aware placeholder for text.
 *
 * Sizes itself from inherited text styles (font-size, line-height)
 * via an invisible `::before` character. No explicit height — the
 * shimmer IS one line of text in whatever font context it lives in.
 *
 * Pass `className` to apply the same text styles as the content
 * this shimmer stands in for. Width fills the container by default
 * (block element).
 */
export const WarmupLine = forwardRef<HTMLElement, WarmupLineProps>(
  function WarmupLine({ as: Tag = "div", className, ...props }, ref) {
    const merged = className
      ? `concertina-warmup-line ${className}`
      : "concertina-warmup-line";
    return <Tag ref={ref as any} className={merged} {...props} />;
  }
);
