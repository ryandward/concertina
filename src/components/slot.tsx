import {
  forwardRef,
  useContext,
  type HTMLAttributes,
  type CSSProperties,
  type ElementType,
} from "react";
import { AxisContext, type Axis } from "./stable-slot";

export interface SlotProps extends HTMLAttributes<HTMLElement> {
  /** Whether this slot is the active (visible) variant. */
  active: boolean;
  /** HTML element to render. Use "span" inside buttons. Default: "div". */
  as?: ElementType;
}

function inactiveStyle(_axis: Axis): CSSProperties {
  // Inactive slots are invisible and non-interactive (inert attribute).
  // They remain full-size so they contribute their intrinsic dimensions
  // to the CSS grid track sizing.  The grid cell sizes to the largest
  // child, giving the StableSlot a fixed bounding box.
  //
  // visibility: hidden keeps the element in layout flow.
  // opacity: 0 is a belt-and-suspenders backup — some CSS environments
  // (Tailwind v4 layer interactions, grid child display overrides) can
  // leave visibility-hidden content partially painted.
  //
  // No overflow: hidden — causes grid to clamp auto minimum to 0.
  // No maxHeight/maxWidth: 0 — causes browsers to skip the element's
  // cross-axis contribution to grid track sizing.
  return { visibility: "hidden", opacity: 0 };
}

/**
 * A single variant inside a <StableSlot>.
 * All slots overlap via CSS grid. Inactive slots are hidden
 * but still contribute to grid cell sizing.
 *
 * Four things work together:
 * 1. grid-area: 1/1 — all slots overlap in the same cell
 * 2. visibility: hidden + opacity: 0 — invisible but in layout flow
 * 3. inert — no focus, no clicks, no screen reader
 * 4. CSS backup via [inert] selector in styles.css
 */
export const Slot = forwardRef<HTMLElement, SlotProps>(
  function Slot({ active, as: Tag = "div", style, children, ...props }, ref) {
    const axis = useContext(AxisContext);

    const merged: CSSProperties = active
      ? { ...style }
      : { ...inactiveStyle(axis), ...style };

    return (
      <Tag
        ref={ref}
        inert={!active || undefined}
        style={merged}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
