import {
  forwardRef,
  useInsertionEffect,
  type HTMLAttributes,
  type ElementType,
} from "react";
import { Gigbag } from "./gigbag";
import { Vamp } from "./vamp";
import { useWarmupExit } from "../primitives/use-warmup-exit";
import { injectStyles } from "../internal/inject-styles";

export interface OvertureProps extends HTMLAttributes<HTMLElement> {
  /** Whether data is loading. Sets Vamp context for all nested Hum instances. */
  loading: boolean;
  /** Exit animation duration in ms. Must match CSS --concertina-close-duration. */
  exitDuration: number;
  /** HTML element to render. Default: "div". */
  as?: ElementType;
}

/**
 * Loading-aware subtree wrapper — the opening act before the real content.
 *
 * Composes three behaviors into one component:
 * - **Vamp** context: every nested `<Hum>` reads loading state automatically.
 * - **Gigbag** ratchet: container never shrinks during the shimmer-to-content swap.
 * - **Exit transition**: applies `concertina-warmup-exiting` class during the
 *   fade-out so shimmer lines animate before real content mounts.
 *
 * Write one JSX tree for both states. Hum instances handle the visual toggle.
 *
 * ```tsx
 * <Overture loading={isLoading} exitDuration={150}>
 *   <h2><Hum className="text-xl">{user?.name}</Hum></h2>
 *   <p><Hum className="text-sm">{user?.bio}</Hum></p>
 * </Overture>
 * ```
 */
export const Overture = forwardRef<HTMLElement, OvertureProps>(
  function Overture({ loading, exitDuration, as: Tag = "div", className, children, ...props }, ref) {
    useInsertionEffect(injectStyles, []);

    const { showWarmup, exiting } = useWarmupExit(loading, exitDuration);

    const merged = exiting
      ? className ? `concertina-warmup-exiting ${className}` : "concertina-warmup-exiting"
      : className;

    return (
      <Gigbag ref={ref} axis="height" as={Tag} className={merged} {...props}>
        <Vamp loading={showWarmup}>
          {children}
        </Vamp>
      </Gigbag>
    );
  }
);
