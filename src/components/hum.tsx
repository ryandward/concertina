import { type HTMLAttributes, type ElementType } from "react";
import "../internal/inject-styles";
import { useVamp } from "./vamp";

export interface HumProps extends HTMLAttributes<HTMLElement> {
  /**
   * Whether data is loading. Shows shimmer when true, children when false.
   * When omitted, falls back to the nearest `<Vamp>` ancestor's loading state.
   */
  loading?: boolean;
  /** HTML element to render. Default: "span". */
  as?: ElementType;
}

/**
 * Loading-aware text wrapper.
 *
 * When loading, renders children as an inert ghost inside a shimmer.
 * The ghost gives the shimmer its intrinsic width — exactly as wide
 * as the text it replaces. No forced width, no layout blow-out in
 * flex or inline contexts.
 *
 * The className is passed through so `1lh` inherits the correct font
 * metrics from the consuming context.
 *
 * When no explicit `loading` prop is provided, Hum reads from the
 * nearest `<Vamp>` ancestor. This lets a single provider control
 * shimmer state for an entire subtree.
 */
export function Hum({ loading, as: Tag = "span", className, children, ...props }: HumProps) {
  const vampLoading = useVamp();
  const isLoading = loading ?? vampLoading;

  if (isLoading) {
    const merged = className
      ? `concertina-warmup-line ${className}`
      : "concertina-warmup-line";

    return (
      <Tag className={merged} {...props}>
        <Tag inert>{children}</Tag>
      </Tag>
    );
  }

  return (
    <Tag className={className} {...props}>
      {children}
    </Tag>
  );
}

export { Hum as StableText };
