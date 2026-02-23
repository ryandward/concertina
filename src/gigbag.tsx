import { forwardRef, type HTMLAttributes, type ElementType } from "react";
import { useStableSlot } from "./use-stable-slot";
import type { Axis } from "./stable-slot";

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
    const { ref: ratchetRef, style: ratchetStyle } = useStableSlot({ axis });

    const merged = className
      ? `concertina-gigbag ${className}`
      : "concertina-gigbag";

    return (
      <Tag
        ref={(el: HTMLElement | null) => {
          ratchetRef(el);
          if (typeof fwdRef === "function") fwdRef(el);
          else if (fwdRef) fwdRef.current = el;
        }}
        className={merged}
        style={{ ...ratchetStyle, ...style }}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
