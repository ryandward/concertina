import {
  forwardRef,
  useInsertionEffect,
  type HTMLAttributes,
  type ElementType,
} from "react";
import { usePresence } from "../primitives/use-presence";
import { injectStyles } from "../internal/inject-styles";

export interface GlideProps extends HTMLAttributes<HTMLElement> {
  /** Whether the content is visible. */
  show: boolean;
  /** HTML element to render. Default: "div". */
  as?: ElementType;
}

/**
 * Enter/exit animation wrapper.
 *
 * Thin composition over usePresence. Adds CSS class names:
 *   concertina-glide-entering, concertina-glide-exiting
 */
export const Glide = forwardRef<HTMLElement, GlideProps>(
  function Glide({ show, as: Tag = "div", className, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);
    const { mounted, phase, onAnimationEnd } = usePresence(show);

    if (!mounted) return null;

    const phaseClass =
      phase === "entering"
        ? "concertina-glide-entering"
        : phase === "exiting"
          ? "concertina-glide-exiting"
          : "";

    const merged = ["concertina-glide", phaseClass, className]
      .filter(Boolean)
      .join(" ");

    return (
      <Tag
        ref={ref}
        className={merged}
        onAnimationEnd={onAnimationEnd}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
