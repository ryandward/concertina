import { forwardRef, type HTMLAttributes, type ElementType } from "react";

export interface WarmupLineProps extends HTMLAttributes<HTMLElement> {
  /** HTML element to render. Default: "div". */
  as?: ElementType;
}

/**
 * Single shimmer line — CSS-aware placeholder for text.
 *
 * Sizes itself via `height: 1lh` — the CSS `lh` unit resolves to
 * the element's computed line-height. The shimmer inherits font
 * styles from its context, so it's exactly as tall as the text it
 * replaces. No magic numbers, no manual token mapping.
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
