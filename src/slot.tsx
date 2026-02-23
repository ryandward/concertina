import {
  forwardRef,
  useContext,
  type HTMLAttributes,
  type CSSProperties,
} from "react";
import { AxisContext, type Axis } from "./stable-slot";

export interface SlotProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether this slot is the active (visible) variant. */
  active: boolean;
}

function inactiveStyle(axis: Axis): CSSProperties {
  const base: CSSProperties = { visibility: "hidden", overflow: "hidden" };

  if (axis === "width") {
    // Contribute width, collapse height — row height follows active child only
    base.maxHeight = 0;
  } else if (axis === "height") {
    // Contribute height, collapse width
    base.maxWidth = 0;
  }
  // axis === "both" — contribute both dimensions, just invisible

  return base;
}

/**
 * A single variant inside a <StableSlot>.
 * All slots overlap via CSS grid. Inactive slots are hidden
 * but still contribute to grid cell sizing.
 *
 * Five things work together:
 * 1. grid-area: 1/1 — all slots overlap in the same cell
 * 2. visibility: hidden — invisible but in layout flow
 * 3. inert — no focus, no clicks, no screen reader
 * 4. max-height/max-width: 0 — axis-aware collapse
 * 5. overflow: hidden — prevents content bleed from collapsed axis
 */
export const Slot = forwardRef<HTMLDivElement, SlotProps>(
  function Slot({ active, style, children, ...props }, ref) {
    const axis = useContext(AxisContext);

    const merged: CSSProperties = active
      ? { ...style }
      : { ...inactiveStyle(axis), ...style };

    return (
      <div
        ref={ref}
        inert={!active || undefined}
        style={merged}
        {...props}
      >
        {children}
      </div>
    );
  }
);
