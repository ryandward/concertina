import { forwardRef, useInsertionEffect, type HTMLAttributes, type ElementType } from "react";
import { useStableSlot } from "../primitives/use-stable-slot";
import { mergeRefs } from "../internal/merge-refs";
import { injectStyles } from "../internal/inject-styles";
import type { Axis } from "./bellows";

export interface GigbagProps extends HTMLAttributes<HTMLElement> {
  /** Which axis to ratchet. Default: "height". */
  axis?: Axis;
  /** HTML element to render. Default: "div". */
  as?: ElementType;
}

/**
 * Size-reserving container.
 *
 * Remembers its largest-ever size (ResizeObserver ratchet) and never
 * shrinks. Swap a spinner for a table inside — no reflow.
 *
 * Uses `contain: layout style` to isolate internal reflow from
 * ancestors.
 */
export const Gigbag = forwardRef<HTMLElement, GigbagProps>(
  function Gigbag({ axis = "height", as: Tag = "div", className, style, children, ...props }, fwdRef) {
    useInsertionEffect(injectStyles, []);
    const { ref: ratchetRef, style: ratchetStyle } = useStableSlot({ axis });

    const merged = className
      ? `concertina-gigbag ${className}`
      : "concertina-gigbag";

    return (
      <Tag
        ref={mergeRefs(ratchetRef, fwdRef)}
        className={merged}
        style={{ ...ratchetStyle, ...style }}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
