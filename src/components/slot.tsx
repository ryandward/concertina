import {
  forwardRef,
  useContext,
  useInsertionEffect,
  type HTMLAttributes,
  type ElementType,
} from "react";
import { AxisContext, ActiveNoteContext } from "./bellows";
import { injectStyles } from "../internal/inject-styles";

export interface SlotProps extends HTMLAttributes<HTMLElement> {
  /** Whether this slot is the active (visible) variant. Overrides `note` context. */
  active?: boolean;
  /** Note identifier. Active when it matches the parent Bellows `activeNote`. */
  note?: string;
  /** HTML element to render. Use "span" inside buttons. Default: "div". */
  as?: ElementType;
}

/**
 * A single variant inside a <Bellows> (or <StableSlot>).
 * All slots overlap via CSS grid. Inactive slots are hidden
 * but still contribute to grid cell sizing.
 *
 * Inactive hiding is handled entirely by CSS via the [inert] attribute:
 *   .concertina-stable-slot > [inert] { visibility: hidden; opacity: 0; }
 * No inline style overrides needed — injectStyles guarantees the rules exist.
 */
export const Slot = forwardRef<HTMLElement, SlotProps>(
  function Slot({ active, note, as: Tag = "div", style, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);

    useContext(AxisContext); // consumed for future axis-specific behavior
    const activeNote = useContext(ActiveNoteContext);

    const isActive = active ?? (note != null && activeNote != null ? note === activeNote : true);

    return (
      <Tag
        ref={ref}
        inert={!isActive || undefined}
        style={style}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
