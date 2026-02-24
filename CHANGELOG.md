# Changelog

## 0.10.1

**Fix: inactive Slot content visible during parent transitions.**

Elements inside a Slot that use `transition-all` (buttons, inputs, cards)
would transition inherited `visibility: hidden` over their transition
duration instead of hiding instantly. The outgoing variant stayed visible
while the incoming one was already rendered.

Root cause: CSS `visibility` is inherited. When a Slot sets
`visibility: hidden` on its root div, children inherit the change. If a
child has `transition-all`, the browser transitions visibility from
`visible` to `hidden` over the child's transition duration. CSS visibility
transitions hold the `visible` value until the duration ends, then flip.
The child stays painted the entire time.

Fix (two layers):
- Slot inline style now sets `opacity: 0` alongside `visibility: hidden`.
  Opacity is not inherited, so children cannot transition it. The Slot div
  has no transition of its own, so opacity applies instantly.
- CSS backup: `.concertina-stable-slot > [inert] { visibility: hidden; opacity: 0; }`
  catches edge cases where inline styles are overridden.

Consumers no longer need to avoid `transition-all` on elements inside Slots.

## 0.10.0

**Accordion sub-path export. README overhaul.**

- Added `concertina/accordion` sub-path export. Accordion components
  (`Root`, `Item`, `Content`, `Header`, `Trigger`, `useExpanded`) now
  have their own entry point, separate from layout primitives.
- README restructured around spatial / temporal / positional stability
  taxonomy. Added Primer `SkeletonText` comparison (70 lines of leading
  math vs. `height: 1lh`). Added roadmap section.
- WarmupLine docstring updated to reference `1lh` unit.
- `tsup.config.ts` builds both `src/index.ts` and `src/accordion.ts`.

Migration (optional, non-breaking):
```tsx
// Before
import * as Concertina from "concertina";
<Concertina.Root> <Concertina.Item> ...

// After
import * as Accordion from "concertina/accordion";
import { StableSlot, Slot, WarmupLine } from "concertina";
<Accordion.Root> <Accordion.Item> ...
```

## 0.9.0

**WarmupLine component. useWarmupExit hook. 1lh shimmer height.**

- `WarmupLine` — React component for shimmer lines. Accepts `className`
  so the shimmer inherits the text styles it replaces. Height uses the
  CSS `lh` unit (one computed line-height), not magic px/em/rem values.
- `useWarmupExit` — hook that holds stub data for one animation cycle
  when loading finishes, so warmup lines fade out before real content
  mounts.
- Shimmer height changed from `1em` to `1lh`. `1em` is font-size; `1lh`
  is line-height, the actual height of one line of text.
- Removed `-short`/`-long` shimmer variants (both were `1em`, distinction
  was meaningless).

## 0.8.0

**Extract foundation primitives.**

- Restructured `src/` into `primitives/`, `components/`, and `accordion/`
  directories.
- Extracted `useSize`, `usePresence`, `useScrollPin` as composable
  building blocks.
- `Glide` now wraps `usePresence` (~15 lines). `Root` uses `useScrollPin`
  instead of inline `useLayoutEffect`.
- All public exports preserved (non-breaking). 66 tests.

## 0.7.0

**Gigbag, Warmup, Glide primitives for progressive loading.**

- `Gigbag` — size-reserving container via ResizeObserver ratchet. Never
  shrinks below its high-water mark.
- `Warmup` — CSS-only shimmer placeholder grid. Structural bones that
  match the final layout.
- `Glide` — enter/exit animation wrapper with delayed unmount.

## 0.6.1

- Added `prepare` script so git-based installs (`npm install github:...`)
  build `dist/`. Without this, `@import "concertina/styles.css"` fails
  on deploy platforms.

## 0.6.0

**Fix StableSlot sizing. Polymorphic rendering.**

- Inactive Slots now use only `visibility: hidden` (removed
  `overflow: hidden` and `maxHeight/maxWidth: 0` which caused CSS Grid
  to clamp inactive items' size contributions to 0).
- Slots render as `flex-column` so content stretches to fill the reserved
  width.
- Added `as` prop to `StableSlot` and `Slot` for polymorphic rendering
  (`span` inside buttons).

## 0.5.0

**StableSlot, useStableSlot, useTransitionLock.**

- `StableSlot` / `Slot` — CSS grid overlap for zero-shift discrete
  variant switching. All children occupy the same grid cell; inactive
  ones are hidden but still contribute their dimensions.
- `useStableSlot` — ResizeObserver ratchet hook for dynamic content.
- `useTransitionLock` — animation suppression across React commit phases.
- `Root` refactored to consume `useTransitionLock` internally.

## 0.4.0

**Component API with per-item memoization.**

- `Root`, `Item`, `Content`, `Trigger`, `Header` components backed by
  `useSyncExternalStore`. Each accordion item subscribes independently;
  only expanding/collapsing items re-render.
- Legacy `useConcertina` hook preserved for backward compat.

## 0.1.0

**Initial release.**

- `useConcertina` hook for scroll-pinned Radix Accordion panels.
- `pinToScrollTop` — walks up to nearest scrollable ancestor and adjusts
  only that container's `scrollTop`. Never cascades to the viewport.
- Animation suppression via `[data-switching]` attribute during item
  switching.
