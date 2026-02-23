import {
  forwardRef,
  createContext,
  type HTMLAttributes,
  type ElementType,
} from "react";

export type Axis = "width" | "height" | "both";

export const AxisContext = createContext<Axis>("both");

export interface StableSlotProps extends HTMLAttributes<HTMLElement> {
  /** Which axis to stabilize. Default: "both". */
  axis?: Axis;
  /** HTML element to render. Use "span" inside buttons. Default: "div". */
  as?: ElementType;
}

/**
 * Grid container that auto-sizes to the largest child.
 * All children overlap in the same grid cell (1/1).
 * Use <Slot active={bool}> as children.
 *
 * Zero JS measurement — pure CSS grid sizing.
 */
export const StableSlot = forwardRef<HTMLElement, StableSlotProps>(
  function StableSlot({ axis = "both", as: Tag = "div", className, style, children, ...props }, ref) {
    const merged = className
      ? `concertina-stable-slot ${className}`
      : "concertina-stable-slot";

    return (
      <AxisContext.Provider value={axis}>
        <Tag ref={ref} className={merged} style={style} {...props}>
          {children}
        </Tag>
      </AxisContext.Provider>
    );
  }
);
