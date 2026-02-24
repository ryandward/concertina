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

const HIDDEN_STYLE: React.CSSProperties = { visibility: "hidden", opacity: 0 };

/**
 * A single variant inside a <Bellows> (or <StableSlot>).
 * All slots overlap via CSS grid. Inactive slots are hidden
 * but still contribute to grid cell sizing.
 *
 * Inactive hiding uses inline styles (can't be overridden by CSS cascade)
 * plus the [inert] attribute for accessibility (non-focusable, non-interactive).
 * CSS `.concertina-stable-slot > [inert]` serves as a backup.
 */
export const Slot = forwardRef<HTMLElement, SlotProps>(
  function Slot({ active, note, as: Tag = "div", style, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);

    useContext(AxisContext); // consumed for future axis-specific behavior
    const activeNote = useContext(ActiveNoteContext);

    const isActive = active ?? (note != null ? note === activeNote : true);

    const merged = isActive ? style : style ? { ...style, ...HIDDEN_STYLE } : HIDDEN_STYLE;

    return (
      <Tag
        ref={ref}
        inert={!isActive || undefined}
        style={merged}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
