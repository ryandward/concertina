import {
  forwardRef,
  useInsertionEffect,
  type HTMLAttributes,
  type ElementType,
} from "react";
import { injectStyles } from "../internal/inject-styles";

export interface HumProps extends HTMLAttributes<HTMLElement> {
  /** Whether data is loading. Shows shimmer when true, children when false. */
  loading: boolean;
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
 */
export const Hum = forwardRef<HTMLElement, HumProps>(
  function Hum({ loading, as: Tag = "span", className, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);

    if (loading) {
      const merged = className
        ? `concertina-warmup-line ${className}`
        : "concertina-warmup-line";

      return (
        <Tag ref={ref} className={merged} {...props}>
          <Tag inert>{children}</Tag>
        </Tag>
      );
    }

    return (
      <Tag ref={ref} className={className} {...props}>
        {children}
      </Tag>
    );
  }
);

export { Hum as StableText };
