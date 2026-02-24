<p align="center">
  <img src="https://raw.githubusercontent.com/ryandward/concertina/main/concertina.svg" width="140" alt="concertina" />
</p>

<h1 align="center">concertina</h1>

<p align="center">
  React toolkit for layout stability.
</p>

<p align="center">
  <a href="https://github.com/ryandward/concertina/actions/workflows/ci.yml"><img src="https://github.com/ryandward/concertina/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

<p align="center"><b>66 tests</b> &middot; ~900 lines of source &middot; 1 dependency</p>

## The problem

Layout shift happens when the browser changes the size of a box and moves everything else to compensate. A button swaps for a stepper — the text next to it reflows. A spinner becomes a table — the page jumps. An accordion opens — the thing you clicked scrolls off the screen.

The React ecosystem treats this as a state problem. Suspense, skeleton libraries, loading spinners — they model the transition between pending and loaded. They give you a nice-looking placeholder that's a completely different DOM structure from the real content, then act surprised when the swap causes a jump.

It's not a state problem. It's a **structure problem.** The box changed size because you swapped the structure inside it.

## The fix

Don't swap structures. Swap what's inside them.

Every tool in concertina addresses one of three kinds of instability:

| Kind | What went wrong | Tools |
|------|-----------------|-------|
| **Spatial** | The box changed size | StableSlot, Gigbag, useStableSlot |
| **Temporal** | The content loaded or animated | WarmupLine, Warmup, Glide, useWarmupExit, usePresence |
| **Positional** | The viewport scrolled unexpectedly | Accordion, pinToScrollTop, useScrollPin |

Structure is the contract. Content is what varies. If you internalize that, the API is obvious. If you don't, no amount of tooling will save you.

## Install

```bash
npm install concertina
```

```tsx
// Stability primitives
import { StableSlot, Slot, Gigbag, WarmupLine, Glide, useWarmupExit } from "concertina";

// Accordion (Radix integration) — separate namespace
import * as Accordion from "concertina/accordion";

// Styles
import "concertina/styles.css";
```

The main entry exports all stability primitives. The `concertina/accordion` sub-path exports the Radix Accordion wrappers (Root, Item, Content, Header, Trigger, useExpanded) so they live in their own namespace. Both entry points are also available from the main `"concertina"` import for backward compatibility.

---

## Spatial stability

The box changed size. Something swapped, grew, or shrank and everything around it moved.

### StableSlot + Slot

Two components swap in one slot. An "Add" button becomes a quantity stepper. The stepper is wider. The text next to it jumps left.

The fix: don't swap them. Render both at the same time, in the same grid cell, stacked. The cell sizes to the bigger one. Toggle which one is visible. The box never changes size because both variants are always in there.

```tsx
import { StableSlot, Slot } from "concertina";

<StableSlot axis="width" className="action-slot">
  <Slot active={!isInCart}>
    <AddButton />
  </Slot>
  <Slot active={isInCart}>
    <QuantityControl />
  </Slot>
</StableSlot>
```

How it works:

- `display: grid` on the container, `grid-area: 1/1` on all Slots. Everything overlaps in one cell.
- Inactive Slots get `visibility: hidden` (invisible, still in layout flow) and `inert` (no focus, no clicks, no screen reader).
- Each Slot uses `display: flex; flex-direction: column` so content stretches to fill the reserved width.
- Zero JS measurement. Pure CSS. Works on the first frame.

#### StableSlot props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `axis` | `"width"` \| `"height"` \| `"both"` | `"both"` | Which axis to stabilize |
| `as` | `ElementType` | `"div"` | HTML element to render |
| `className` | `string` | | Passed to wrapper |

#### Slot props

| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Controls visibility |
| `as` | `ElementType` | HTML element to render. Default `"div"`. |

All other HTML attributes are forwarded on both components.

#### Rules for correct behavior

Parent containers must allow content-based sizing. A StableSlot inside `grid-template-columns: 1fr 10rem` is trapped — the fixed column clips it. Use `auto`:

```css
/* StableSlot can't do its job in here */
grid-template-columns: 1fr 10rem;

/* now it can size itself */
grid-template-columns: 1fr auto;
```

Every independently appearing element needs its own StableSlot. An Undo link that only shows up in one state gets its own wrapper:

```tsx
<div className="action-column">
  <StableSlot axis="width">
    <Slot active={showDeliver}><Button>Deliver</Button></Slot>
    <Slot active={showCharge}><Button>Charge</Button></Slot>
  </StableSlot>
  <StableSlot>
    <Slot active={showCharge}>
      <button className="undo-link">Undo</button>
    </Slot>
  </StableSlot>
</div>
```

A single Slot inside a StableSlot is valid. It reserves the element's space, showing or hiding it without shift.

### Gigbag

```jsx
if (loading) return <Spinner />;      // 48px
if (empty)   return <EmptyMsg />;     // 64px
return <BigTable data={data} />;      // 500px+
```

Three different structures, three different heights. Every transition jumps.

Gigbag is a container that remembers its largest-ever size via ResizeObserver and will not shrink. Put a spinner in there, then a table, then a spinner again — it stays at the table's height the whole time. Like a guitar case. You don't reshape the case every time you take the guitar out. It also uses `contain: layout style` so internal reflows don't bother the ancestors.

```tsx
import { Gigbag, Warmup } from "concertina";

<Gigbag axis="height">
  {loading ? (
    <Warmup rows={8} columns={3} />
  ) : (
    <DataTable data={data} />
  )}
</Gigbag>
```

#### Gigbag props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `axis` | `"width"` \| `"height"` \| `"both"` | `"height"` | Which axis to ratchet |
| `as` | `ElementType` | `"div"` | HTML element to render |

### useStableSlot

For content that changes size unpredictably (prices, names, status messages) where you can't enumerate all variants upfront. This is what Gigbag uses internally. Use it directly when you want a ref-based API instead of a wrapper component.

```tsx
import { useStableSlot } from "concertina";

const slot = useStableSlot({ axis: "width" });

<div ref={slot.ref} style={slot.style} className="price-amount">
  {formattedPrice}
</div>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `axis` | `"width"` \| `"height"` \| `"both"` | `"both"` | Which axis to ratchet |

Returns `{ ref, style }`. Attach both to the container element.

---

## Temporal stability

The content loaded or animated. Something appeared, disappeared, or transitioned between states and the layout jumped during the change.

### WarmupLine — shimmer that inherits text metrics

This is the single most important thing in the library and the easiest to get wrong.

A shimmer line replaces text. It needs to be exactly as tall as the text it replaces. For 17 years, CSS had no unit for "one line of text." `em` is font-size, not line-height. `rem` is the root font-size. `px` is absolute. Every shimmer library picked a number — `height: 0.75em`, `height: 12px`, `height: 1rem` — and it was wrong, because text height is determined by line-height, which is determined by the font styles on the element. A shimmer that invents its own height is a shimmer that shifts layout when the real text arrives.

CSS now has the `lh` unit. `1lh` resolves to the element's computed line-height. The shimmer uses `height: 1lh`. That's not a magic number — it's a relative unit that derives its value from the element's styles, the same way `100%` derives its value from the container's size.

But `1lh` only works if the shimmer has the right styles. A bare `<div className="concertina-warmup-line" />` inherits line-height from its parent. If it's inside a `<span className="text-sm">`, it inherits `text-sm`'s line-height. Correct. But if it's a direct child of a toolbar with no font context, `1lh` resolves against the default line-height. Wrong.

**The `WarmupLine` component exists so you can pass the text styles explicitly:**

```tsx
import { WarmupLine } from "concertina";

// Toolbar — no parent provides text styles, so pass them directly
{loading
  ? <WarmupLine className="text-sm text-stone flex-1" />
  : <span className="text-sm text-stone">{count} customers</span>
}

// Grid cell — parent wrapper provides text styles via inheritance
<span className="table-val-primary">
  {row._warmup
    ? <div className="concertina-warmup-line" />
    : row.name
  }
</span>
```

In grid cells, the shimmer inherits from its wrapper (wrapper-once pattern). In standalone contexts like toolbars, pass the same `className` you'd put on the text element. The shimmer's `1lh` resolves against those styles and matches the text exactly.

**Width** comes from the container, not the shimmer. In a grid cell, the column definition provides width. In a flex toolbar, pass `flex-1` so the shimmer fills the available space. The shimmer never invents a width — it fills whatever its context provides.

> **vs. GitHub Primer's `SkeletonText`**
>
> Primer uses `height: var(--font-size)` plus ~70 lines of manual leading math via CSS custom properties. It requires a `size` prop mapped to design tokens (`'bodyMedium'`, `'titleLarge'`). Each token is a hand-maintained record of font-size, line-height, and letter-spacing for that tier.
>
> Concertina uses `height: 1lh` — one CSS declaration. `lh` is a relative unit that resolves to the element's computed line-height. Pass text styles via `className` and the shimmer inherits the correct metrics. No token mapping, no manual math, no `size` prop to keep in sync.
>
> **Trade-off:** `lh` requires modern browsers (Chrome 109+, Firefox 120+, Safari 16.4+). Primer supports older browsers. If you need IE or pre-2023 Safari, Primer's approach is the right one. If your audience is on modern browsers, `1lh` eliminates an entire category of maintenance.

### The stub-data pattern

Gigbag + Warmup works for flat containers. But when your content renders through structured components — an accordion with `Root > Item > Trigger > Content`, or a data table with cell wrappers — a separate loading skeleton is a different DOM structure. Different wrappers, different padding, different height. The swap from skeleton to real content shifts layout.

This is where the core principle applies directly. Don't build a separate loading path. **Pass placeholder data through the same render path as real data.**

Create stub objects with the same shape as your real data, marked with a `_warmup` flag. Pass them to the same component that renders real data. Each cell renders shimmer or content inside the same wrapper:

```tsx
// Stub data — same shape as real rows
const STUB_ROWS = Array.from({ length: 8 }, (_, i) => ({
  _warmup: true as const,
  id: `warmup-${i}`,
  name: null,
  items: [],
}));

// Cell renderer — wrapper defined once, content varies inside it
cell: ({ row }) => (
  <span className="table-val-primary">
    {row.original._warmup
      ? <div className="concertina-warmup-line" />
      : row.original.name
    }
  </span>
)
```

#### The wrapper-once rule

The wrapper is the structural contract — it determines padding, font-size, line-height, and therefore the cell's height. Define it once. Put the ternary inside it. Never write the wrapper in two branches.

```tsx
// WRONG — wrapper duplicated, will drift apart silently
if (row.original._warmup) {
  return <span className="table-val-money"><div className="concertina-warmup-line" /></span>;
}
return <span className="table-val-money">${total}</span>;

// RIGHT — wrapper defined once, content switches inside it
<span className="table-val-money">
  {row.original._warmup
    ? <div className="concertina-warmup-line" />
    : `$${total}`
  }
</span>
```

#### TypeScript enforcement

A discriminated union guarantees you check `_warmup` before accessing real data:

```ts
type WarmupRow = { _warmup: true; id: string };
type RealRow = { _warmup?: never; id: string; name: string; items: Item[] };
type Row = WarmupRow | RealRow;

function renderCell(row: Row) {
  return (
    <span className="table-val-primary">
      {row._warmup
        ? <div className="concertina-warmup-line" />
        : row.name  // TS narrows to RealRow here
      }
    </span>
  );
}
```

TypeScript prevents you from forgetting the branch. The wrapper-once pattern prevents you from forgetting the wrapper. Use both.

### useWarmupExit

Manages the warmup-to-content transition. When `loading` goes from true to false, holds the warmup state for one animation cycle so shimmer lines can fade out before real content mounts.

```tsx
import { useWarmupExit } from "concertina";

const warmup = useWarmupExit(loading);
const rows = warmup.showWarmup ? STUB_ROWS : realData;

<div className={warmup.exiting ? "concertina-warmup-exiting" : undefined}>
  {rows.map(row => /* same render path */)}
</div>
```

| Return | Type | Description |
|--------|------|-------------|
| `showWarmup` | `boolean` | True during loading AND exit animation — use for data selection |
| `exiting` | `boolean` | True only during exit animation — use for CSS class |

### Glide

`{show && <Panel />}`. The panel is either in the DOM or it's not. When it enters, everything below shoves down in a single frame. When it leaves, everything snaps back.

Glide wraps conditional content with enter/exit CSS animations and delays unmount until the exit animation finishes.

```tsx
import { Glide } from "concertina";

<Glide show={showPanel}>
  <Panel />
</Glide>
```

When `show` goes true, children mount with a `concertina-glide-entering` class. When `show` goes false, they get `concertina-glide-exiting` and stay in the DOM until the animation finishes. Then they unmount for real.

#### Glide props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `boolean` | | Whether the content is visible |
| `as` | `ElementType` | `"div"` | HTML element to render |

#### Customizing Glide timing

```css
.concertina-glide {
  --concertina-glide-duration: 300ms;
  --concertina-glide-height: 2000px; /* max-height ceiling for the animation */
}
```

### Warmup grid

For flat containers where the stub-data pattern is overkill. Renders `rows x columns` animated shimmer bones.

```tsx
import { Gigbag, Warmup } from "concertina";

<Gigbag axis="height">
  {loading ? <Warmup rows={8} columns={3} /> : <DataTable data={data} />}
</Gigbag>
```

#### Warmup props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `number` | `3` | Number of placeholder rows |
| `columns` | `number` | `1` | Columns per row |
| `as` | `ElementType` | `"div"` | HTML element to render |

#### Theming

```css
.concertina-warmup-line {
  --concertina-warmup-line-radius: 0.125rem;
  --concertina-warmup-line-color: #e5e7eb;
  --concertina-warmup-line-highlight: #f3f4f6;
}
.concertina-warmup-bone {
  --concertina-warmup-bone-gap: 0.125rem;
  --concertina-warmup-bone-padding: 0.375rem 0.5rem;
}
.concertina-warmup {
  --concertina-warmup-gap: 0.75rem;
}
```

### Composing spatial + temporal

Gigbag and Glide solve different problems and they compose:

```tsx
{/* a form that animates in/out and doesn't collapse during re-renders */}
<Glide show={isEditing}>
  <Gigbag axis="height">
    <EditForm />
  </Gigbag>
</Glide>
```

---

## Positional stability

The viewport scrolled unexpectedly. You opened an accordion item and the thing you clicked scrolled off the screen.

### Accordion

Wraps Radix Accordion with scroll pinning, animation suppression during switches, and per-item memoization via `useSyncExternalStore`. The accordion components live in their own sub-path so they have a clear namespace:

```tsx
import * as Accordion from "concertina/accordion";
import "concertina/styles.css";

<Accordion.Root className="my-accordion">
  {items.map((item) => (
    <Accordion.Item key={item.id} value={item.id}>
      <Accordion.Header>
        <Accordion.Trigger>{item.title}</Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content>{item.body}</Accordion.Content>
    </Accordion.Item>
  ))}
</Accordion.Root>
```

When you switch between items, the new one pins to the top of the scroll container. Animations are suppressed during the switch and restored after paint.

`useExpanded(id)` is a per-item expansion hook. Only re-renders when this specific item's boolean flips:

```tsx
import { useExpanded } from "concertina/accordion";

function MyItem({ item }) {
  const expanded = useExpanded(item.id);
  // only re-renders when this specific item opens/closes
}
```

#### Customizing accordion animation

```css
.concertina-content {
  --concertina-open-duration: 300ms;
  --concertina-close-duration: 200ms;
}
```

If items near the bottom can't scroll to the top, add `padding-bottom: 50vh` to the scroll container.

#### Legacy hook API

For cases where you need to manage Radix Accordion directly:

```tsx
import { useConcertina } from "concertina/accordion";
import * as RadixAccordion from "@radix-ui/react-accordion";

const { rootProps, getItemRef } = useConcertina();

<RadixAccordion.Root type="single" collapsible {...rootProps}>
  <RadixAccordion.Item value="a" ref={getItemRef("a")}>
    ...
  </RadixAccordion.Item>
</RadixAccordion.Root>
```

| Property | Type | Description |
|---|---|---|
| `rootProps` | `object` | Spread onto `Accordion.Root`. Contains `value`, `onValueChange`, `data-switching`. |
| `getItemRef` | `(id: string) => RefCallback` | Attach to each `Accordion.Item` |
| `value` | `string` | Currently expanded item (empty string when collapsed) |
| `switching` | `boolean` | True during a switch between items |

### pinToScrollTop

Scrolls an element to the top of its nearest scrollable ancestor. Only touches `scrollTop` on that one container — never cascades to the viewport, which matters on mobile where `scrollIntoView` pulls the whole page. Automatically accounts for sticky headers.

```tsx
import { pinToScrollTop } from "concertina";

pinToScrollTop(element);
```

---

## Primitives reference

Lower-level hooks extracted from the components above. Use these when you need to compose your own stability solutions.

### useTransitionLock

Suppresses CSS transitions during batched state changes. Sets a flag synchronously (batched with state updates in React 18), auto-clears after paint.

```tsx
import { useTransitionLock } from "concertina";

const { locked, lock } = useTransitionLock();

const handleChange = (newValue) => {
  lock();
  setValue(newValue);
};

<div data-locked={locked || undefined}>
  {/* CSS: [data-locked] .animated { transition-duration: 0s } */}
</div>
```

### usePresence

Mount/unmount state machine for enter/exit animations. This is what Glide uses internally.

```tsx
import { usePresence } from "concertina";

const { mounted, phase, onAnimationEnd } = usePresence(show);
// phase: "entering" | "entered" | "exiting"

{mounted && (
  <div className={`panel panel-${phase}`} onAnimationEnd={onAnimationEnd}>
    {children}
  </div>
)}
```

### useSize

Raw border-box size observation via ResizeObserver. Reports every resize — no ratchet, no policy. Use this when you need the actual current size for your own logic (breakpoints, conditional rendering, animations).

```tsx
import { useSize } from "concertina";

const { ref, size } = useSize();

<div ref={ref}>
  {size.width > 600 ? <WideLayout /> : <NarrowLayout />}
</div>
```

### useScrollPin

Runs `pinToScrollTop` inside `useLayoutEffect` — after React commits the DOM but before the browser paints. Use this when a state change moves content and you need to correct scroll position synchronously.

```tsx
import { useScrollPin } from "concertina";

useScrollPin(() => itemRefs.get(activeId), [activeId]);
```

---

## Picking the right tool

| Problem | Tool |
|---------|------|
| Two variants swap in one slot | StableSlot + Slot |
| Text changes width unpredictably | useStableSlot (or CSS `tabular-nums` for numbers) |
| Spinner replaced by loaded content | Gigbag + Warmup |
| Accordion/table loading skeleton | Stub data through same render path + WarmupLine |
| Panel mounts/unmounts conditionally | Glide |
| Shimmer lines that match text height | WarmupLine (uses `1lh`) |
| Shimmer-to-content exit animation | useWarmupExit |
| Accordion with scroll pinning | Accordion.Root + Item + Content |
| Custom scroll correction | pinToScrollTop or useScrollPin |

---

## Roadmap

Stability problems concertina could address in future versions:

- **Scroll anchoring** — When content above a target element changes (items prepended, banners inserted), maintain scroll position relative to the target. CSS `overflow-anchor` is inconsistent across browsers and doesn't cover programmatic insertions.

- **Media reservation** — Reserve space for images/video before load via `aspect-ratio`. A thin wrapper that accepts `width`/`height` from an API response and prevents CLS. The browser's native `width`/`height` attributes help but don't cover dynamic aspect ratios or art-directed responsive images.

- **Focus stability** — When DOM mutations remove the focused element, trap focus to the nearest surviving ancestor instead of resetting to `<body>`. The `inert` attribute on inactive Slots partially addresses this for StableSlot, but general-purpose focus recovery during list reorders or filtered views is unsolved.

These are proposals, not commitments. If any of these would unblock your project, open an issue.

## License

MIT
