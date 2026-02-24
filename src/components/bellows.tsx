import {
  forwardRef,
  createContext,
  useInsertionEffect,
  type HTMLAttributes,
  type ElementType,
} from "react";
import { injectStyles } from "../internal/inject-styles";

export type Axis = "width" | "height" | "both";

export const AxisContext = createContext<Axis>("both");

export const ActiveNoteContext = createContext<string | undefined>(undefined);

export interface BellowsProps extends HTMLAttributes<HTMLElement> {
  /** Which axis to stabilize. Default: "both". */
  axis?: Axis;
  /** Active note identifier. Slots with a matching `note` prop become active. */
  activeNote?: string;
  /** HTML element to render. Use "span" inside buttons. Default: "div". */
  as?: ElementType;
}

/** @deprecated Use {@link BellowsProps} instead. */
export type StableSlotProps = BellowsProps;

/**
 * Grid container that auto-sizes to the largest child.
 * All children overlap in the same grid cell (1/1).
 * Use <Slot active={bool}> or <Slot note="..."> as children.
 *
 * Zero JS measurement — pure CSS grid sizing.
 */
export const Bellows = forwardRef<HTMLElement, BellowsProps>(
  function Bellows({ axis = "both", activeNote, as: Tag = "div", className, style, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);

    const merged = className
      ? `concertina-stable-slot ${className}`
      : "concertina-stable-slot";

    return (
      <AxisContext.Provider value={axis}>
        <ActiveNoteContext.Provider value={activeNote}>
          <Tag ref={ref} className={merged} style={style} {...props}>
            {children}
          </Tag>
        </ActiveNoteContext.Provider>
      </AxisContext.Provider>
    );
  }
);

export { Bellows as StableSlot };
