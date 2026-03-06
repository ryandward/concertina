import {
  forwardRef,
  useContext,
  useInsertionEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ElementType,
} from "react";
import { AxisContext, ActiveNoteContext, FocusHandoffContext } from "./bellows";
import { injectStyles } from "../internal/inject-styles";
import { mergeRefs } from "../internal/merge-refs";

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
 *
 * Active slots get tabIndex={-1} so they are programmatically focusable
 * (but excluded from the tab ring) for focus handoff.
 *
 * Focus handoff: when this slot becomes active and the parent Bellows reports
 * that focus was ejected (via FocusHandoffContext), this slot focuses itself
 * in useLayoutEffect — before the browser paints. No DOM reads during render.
 */
export const Slot = forwardRef<HTMLElement, SlotProps>(
  function Slot({ active, note, as: Tag = "div", style, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);

    useContext(AxisContext); // consumed for future axis-specific behavior
    const activeNote = useContext(ActiveNoteContext);
    const focusCtx = useContext(FocusHandoffContext);

    const isActive = active ?? (note != null ? note === activeNote : true);

    const internalRef = useRef<HTMLElement>(null);
    const prevActiveRef = useRef(isActive);

    useLayoutEffect(() => {
      const wasActive = prevActiveRef.current;
      prevActiveRef.current = isActive;

      // Only hand off when this slot just became active.
      if (!isActive || wasActive) return;
      // Only when the Bellows had focus before the swap.
      if (!focusCtx?.hadFocusRef.current) return;
      // Only when focus was actually ejected: either to body (real browser)
      // or stranded inside an inert element (jsdom, which doesn't implement
      // inert focus ejection).
      const active = document.activeElement;
      if (active && active !== document.body && !active.closest?.("[inert]")) return;

      internalRef.current?.focus({ preventScroll: true });
    });

    const merged = isActive ? style : style ? { ...style, ...HIDDEN_STYLE } : HIDDEN_STYLE;

    return (
      <Tag
        ref={mergeRefs(ref, internalRef)}
        tabIndex={isActive ? -1 : undefined}
        inert={!isActive || undefined}
        style={merged}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
