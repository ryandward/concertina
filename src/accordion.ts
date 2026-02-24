// concertina/accordion — Radix Accordion integration with scroll pinning
//
// Sub-path export so accordion wrappers live in their own namespace:
//   import * as Accordion from "concertina/accordion";
//   <Accordion.Root> … </Accordion.Root>

export { Root } from "./accordion/root";
export { Item } from "./accordion/item";
export { Content } from "./accordion/content";
export { useExpanded } from "./accordion/use-expanded";
export { ConcertinaStore, ConcertinaContext } from "./accordion/store";

// Re-export Radix primitives that need no wrapping
export { Trigger, Header } from "@radix-ui/react-accordion";

// Legacy hook API (backward compat)
export { useConcertina } from "./accordion/use-concertina";
export type { UseConcertinaReturn, ConcertinaRootProps } from "./accordion/use-concertina";
