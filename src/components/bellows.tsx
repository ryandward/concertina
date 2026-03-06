import {
  forwardRef,
  createContext,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  type HTMLAttributes,
  type ElementType,
} from "react";
import { injectStyles } from "../internal/inject-styles";
import { mergeRefs } from "../internal/merge-refs";

export type Axis = "width" | "height" | "both";

export const AxisContext = createContext<Axis>("both");

export const ActiveNoteContext = createContext<string | undefined>(undefined);

/** Shared between Bellows and Slot for focus handoff on inert swap. */
export interface FocusHandoffValue {
  readonly hadFocusRef: React.RefObject<boolean>;
}

export const FocusHandoffContext = createContext<FocusHandoffValue | null>(null);

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
 *
 * Focus handoff: tracks whether focus is inside the container via native
 * focusin/focusout listeners. When `inert` ejects focus (relatedTarget is
 * null), the flag stays set so the incoming active Slot can reclaim focus.
 */
export const Bellows = forwardRef<HTMLElement, BellowsProps>(
  function Bellows({ axis = "both", activeNote, as: Tag = "div", className, style, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);

    const internalRef = useRef<HTMLElement>(null);
    const hadFocusRef = useRef(false);

    useEffect(() => {
      const el = internalRef.current;
      if (!el) return;

      const onFocusIn = () => {
        hadFocusRef.current = true;
      };
      const onFocusOut = (e: FocusEvent) => {
        // Only clear when focus moves to a known element outside the
        // container. When `inert` ejects focus, relatedTarget is null —
        // keeping hadFocusRef true lets the incoming Slot claim the handoff.
        const target = e.relatedTarget as Node | null;
        if (target && !el.contains(target)) {
          hadFocusRef.current = false;
        }
      };

      el.addEventListener("focusin", onFocusIn);
      el.addEventListener("focusout", onFocusOut);
      return () => {
        el.removeEventListener("focusin", onFocusIn);
        el.removeEventListener("focusout", onFocusOut);
      };
    }, []);

    const focusCtx = useMemo<FocusHandoffValue>(() => ({ hadFocusRef }), []);

    const merged = className
      ? `concertina-stable-slot ${className}`
      : "concertina-stable-slot";

    return (
      <AxisContext.Provider value={axis}>
        <ActiveNoteContext.Provider value={activeNote}>
          <FocusHandoffContext.Provider value={focusCtx}>
            <Tag ref={mergeRefs(ref, internalRef)} className={merged} style={style} {...props}>
              {children}
            </Tag>
          </FocusHandoffContext.Provider>
        </ActiveNoteContext.Provider>
      </AxisContext.Provider>
    );
  }
);

export { Bellows as StableSlot };
