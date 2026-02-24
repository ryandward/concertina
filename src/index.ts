// Accordion — Radix integration (v0.4.0+)
export { Root } from "./accordion/root";
export { Item } from "./accordion/item";
export { Content } from "./accordion/content";
export { useExpanded } from "./accordion/use-expanded";
export { ConcertinaStore, ConcertinaContext } from "./accordion/store";

// Re-export Radix primitives that need no wrapping
export { Trigger, Header } from "@radix-ui/react-accordion";

// High-level compositions (v0.11.0+)
export { Bellows, Bellows as StableSlot } from "./components/bellows";
export type { BellowsProps, BellowsProps as StableSlotProps, Axis } from "./components/bellows";
export { Slot } from "./components/slot";
export type { SlotProps } from "./components/slot";
export { Hum, Hum as StableText } from "./components/hum";
export type { HumProps, HumProps as StableTextProps } from "./components/hum";
export { Vamp, VampContext, useVamp } from "./components/vamp";
export type { VampProps } from "./components/vamp";
export { Ensemble, Ensemble as StableCollection } from "./components/ensemble";
export type { EnsembleProps, EnsembleProps as StableCollectionProps } from "./components/ensemble";

// Progressive loading (v0.7.0+)
export { Gigbag } from "./components/gigbag";
export type { GigbagProps } from "./components/gigbag";
export { Warmup } from "./components/warmup";
export type { WarmupProps } from "./components/warmup";
export { WarmupLine } from "./components/warmup-line";
export type { WarmupLineProps } from "./components/warmup-line";
export { Glide } from "./components/glide";
export type { GlideProps } from "./components/glide";

// Primitives — composable building blocks (v0.8.0+)
export { useSize } from "./primitives/use-size";
export type { Size } from "./primitives/use-size";
export { usePresence } from "./primitives/use-presence";
export type { Phase, UsePresenceReturn } from "./primitives/use-presence";
export { useScrollPin } from "./primitives/use-scroll-pin";
export { useStableSlot } from "./primitives/use-stable-slot";
export { useTransitionLock } from "./primitives/use-transition-lock";
export { pinToScrollTop } from "./primitives/pin-to-scroll-top";
export { useWarmupExit } from "./primitives/use-warmup-exit";

// Legacy hook API (backward compat)
export { useConcertina } from "./accordion/use-concertina";
export type { UseConcertinaReturn, ConcertinaRootProps } from "./accordion/use-concertina";
