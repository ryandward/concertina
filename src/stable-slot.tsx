import {
  forwardRef,
  createContext,
  type HTMLAttributes,
} from "react";

export type Axis = "width" | "height" | "both";

export const AxisContext = createContext<Axis>("both");

export interface StableSlotProps extends HTMLAttributes<HTMLDivElement> {
  /** Which axis to stabilize. Default: "both". */
  axis?: Axis;
}

/**
 * Grid container that auto-sizes to the largest child.
 * All children overlap in the same grid cell (1/1).
 * Use <Slot active={bool}> as children.
 *
 * Zero JS measurement — pure CSS grid sizing.
 */
export const StableSlot = forwardRef<HTMLDivElement, StableSlotProps>(
  function StableSlot({ axis = "both", className, children, ...props }, ref) {
    const merged = className
      ? `concertina-stable-slot ${className}`
      : "concertina-stable-slot";

    return (
      <AxisContext.Provider value={axis}>
        <div ref={ref} className={merged} {...props}>
          {children}
        </div>
      </AxisContext.Provider>
    );
  }
);
