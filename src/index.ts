// Component API (v0.4.0+)
export { Root } from "./root";
export { Item } from "./item";
export { Content } from "./content";
export { useExpanded } from "./use-expanded";
export { ConcertinaStore, ConcertinaContext } from "./store";

// Re-export Radix primitives that need no wrapping
export { Trigger, Header } from "@radix-ui/react-accordion";

// Layout stability (v0.5.0+)
export { StableSlot } from "./stable-slot";
export type { StableSlotProps, Axis } from "./stable-slot";
export { Slot } from "./slot";
export type { SlotProps } from "./slot";
export { useStableSlot } from "./use-stable-slot";
export { useTransitionLock } from "./use-transition-lock";

// Progressive loading (v0.7.0+)
export { Gigbag } from "./gigbag";
export type { GigbagProps } from "./gigbag";
export { Warmup } from "./warmup";
export type { WarmupProps } from "./warmup";
export { Glide } from "./glide";
export type { GlideProps } from "./glide";

// Utilities
export { pinToScrollTop } from "./pin-to-scroll-top";

// Legacy hook API (backward compat)
export { useConcertina } from "./use-concertina";
export type { UseConcertinaReturn, ConcertinaRootProps } from "./use-concertina";
