import {
  forwardRef,
  useState,
  useEffect,
  useCallback,
  type HTMLAttributes,
  type ElementType,
  type AnimationEvent,
} from "react";

export interface GlideProps extends HTMLAttributes<HTMLElement> {
  /** Whether the content is visible. */
  show: boolean;
  /** HTML element to render. Default: "div". */
  as?: ElementType;
}

type Phase = "entering" | "entered" | "exiting";

/**
 * Enter/exit animation wrapper.
 *
 * State machine:
 *   show=true  -> mount + "entering" -> animationEnd -> "entered"
 *   show=false -> "exiting" -> animationEnd -> unmount
 *
 * CSS classes: concertina-glide-entering, concertina-glide-exiting
 */
export const Glide = forwardRef<HTMLElement, GlideProps>(
  function Glide({ show, as: Tag = "div", className, children, ...props }, ref) {
    const [mounted, setMounted] = useState(show);
    const [phase, setPhase] = useState<Phase>(show ? "entered" : "exiting");

    useEffect(() => {
      if (show) {
        setMounted(true);
        setPhase("entering");
      } else if (mounted) {
        setPhase("exiting");
      }
    }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

    const onAnimationEnd = useCallback(
      (e: AnimationEvent) => {
        // Only react to our own animations, not children's
        if (e.target !== e.currentTarget) return;
        if (phase === "entering") setPhase("entered");
        if (phase === "exiting") setMounted(false);
      },
      [phase]
    );

    if (!mounted) return null;

    const phaseClass =
      phase === "entering"
        ? "concertina-glide-entering"
        : phase === "exiting"
          ? "concertina-glide-exiting"
          : "";

    const merged = ["concertina-glide", phaseClass, className]
      .filter(Boolean)
      .join(" ");

    return (
      <Tag
        ref={ref}
        className={merged}
        onAnimationEnd={onAnimationEnd}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
