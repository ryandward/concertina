// Component API (v0.4.0+)
export { Root } from "./root";
export { Item } from "./item";
export { Content } from "./content";
export { useExpanded } from "./use-expanded";
export { ConcertinaStore, ConcertinaContext } from "./store";

// Re-export Radix primitives that need no wrapping
export { Trigger, Header } from "@radix-ui/react-accordion";

// Legacy hook API (backward compat)
export { useConcertina } from "./use-concertina";
export { pinToScrollTop } from "./pin-to-scroll-top";
export type { UseConcertinaReturn, ConcertinaRootProps } from "./use-concertina";
