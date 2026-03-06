import { type HTMLAttributes, type ElementType, type Ref } from "react";
import "../internal/inject-styles";
import { useVamp } from "./vamp";

export interface FrameProps extends HTMLAttributes<HTMLElement> {
  /**
   * Aspect ratio for the media container (e.g. `16/9`, `1`, `4/3`).
   * Applied as the CSS `aspect-ratio` property, so the container
   * reserves exact space before any content loads.
   */
  aspectRatio: number;
  /**
   * Whether media is loading. Shows shimmer when true, children when false.
   * When omitted, falls back to the nearest `<Vamp>` ancestor's loading state.
   */
  loading?: boolean;
  /** HTML element to render. Default: "div". */
  as?: ElementType;
  /** Forwarded ref (React 19 style). */
  ref?: Ref<HTMLElement>;
}

/**
 * Loading-aware wrapper for images and video.
 *
 * Reserves space via `aspect-ratio` so the bounding box is stable
 * before media loads. During loading, renders a shimmer placeholder
 * at the exact aspect ratio. When loaded, reveals children in the
 * same bounding box — zero layout shift.
 *
 * Reads from the nearest `<Vamp>` ancestor when no explicit `loading`
 * prop is provided, just like `<Hum>`.
 *
 * ```tsx
 * <Frame aspectRatio={16/9} loading={!loaded}>
 *   <img src={src} alt={alt} onLoad={() => setLoaded(true)} />
 * </Frame>
 * ```
 */
export function Frame({
  aspectRatio,
  loading,
  as: Tag = "div",
  className,
  style,
  children,
  ...props
}: FrameProps) {
  const vampLoading = useVamp();
  const isLoading = loading ?? vampLoading;

  const baseStyle = {
    aspectRatio,
    ...style,
  };

  if (isLoading) {
    const merged = className
      ? `concertina-frame concertina-frame-loading ${className}`
      : "concertina-frame concertina-frame-loading";

    return (
      <Tag className={merged} style={baseStyle} {...props} />
    );
  }

  const merged = className
    ? `concertina-frame ${className}`
    : "concertina-frame";

  return (
    <Tag className={merged} style={baseStyle} {...props}>
      {children}
    </Tag>
  );
}
