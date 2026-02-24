import {
  forwardRef,
  useInsertionEffect,
  type HTMLAttributes,
  type ElementType,
  type ReactNode,
  type ReactElement,
  type Ref,
} from "react";
import { Gigbag } from "./gigbag";
import { Warmup } from "./warmup";
import { useWarmupExit } from "../primitives/use-warmup-exit";
import { injectStyles } from "../internal/inject-styles";

export interface EnsembleProps<T> extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Data items to render. */
  items: T[];
  /** Whether data is loading. Shows warmup stubs when true. */
  loading: boolean;
  /** Render function for each item. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Number of placeholder rows during loading. */
  stubCount: number;
  /** Exit animation duration in ms. Must match CSS --concertina-close-duration. */
  exitDuration: number;
  /** HTML element to render. Default: "div". */
  as?: ElementType;
}

function EnsembleInner<T>(
  {
    items,
    loading,
    renderItem,
    stubCount,
    exitDuration,
    as: Tag = "div",
    className,
    ...props
  }: EnsembleProps<T>,
  ref: Ref<HTMLElement>
) {
  useInsertionEffect(injectStyles, []);

  const { showWarmup, exiting } = useWarmupExit(loading, exitDuration);

  const warmupClass = exiting
    ? className ? `concertina-warmup-exiting ${className}` : "concertina-warmup-exiting"
    : className;

  return (
    <Gigbag ref={ref} axis="height" as={Tag} {...props}>
      {showWarmup ? (
        <Warmup rows={stubCount} className={warmupClass} />
      ) : (
        <Tag className={className}>
          {items.map(renderItem)}
        </Tag>
      )}
    </Gigbag>
  );
}

/**
 * Loading-aware collection.
 *
 * Shows warmup shimmer stubs while loading, then transitions
 * to rendered items. Wrapped in a Gigbag ratchet to prevent
 * layout shift during the transition.
 */
export const Ensemble = forwardRef(EnsembleInner) as <T>(
  props: EnsembleProps<T> & { ref?: Ref<HTMLElement> }
) => ReactElement | null;

export { Ensemble as StableCollection };
