<p align="center">
  <img src="https://raw.githubusercontent.com/ryandward/concertina/main/concertina.svg" width="140" alt="concertina" />
</p>

<h1 align="center">concertina</h1>

<p align="center">
  React toolkit for layout stability.
</p>

## Install

```bash
npm install concertina
```

```tsx
import * as Concertina from "concertina";
import "concertina/styles.css";
```

---

## Layer 1: Primitives

### StableSlot + Slot — Zero-shift variant switching

A UI slot toggles between variants of different sizes (Add button ↔ quantity stepper). Surrounding content reflows. The fix: render **all variants simultaneously** in the same CSS grid cell. The cell auto-sizes to the largest child. Only the active variant is visible.

```tsx
<Concertina.StableSlot axis="width" className="action-slot">
  <Concertina.Slot active={!isInCart}>
    <AddButton />
  </Concertina.Slot>
  <Concertina.Slot active={isInCart}>
    <QuantityControl />
  </Concertina.Slot>
</Concertina.StableSlot>
```

**How it works:**
1. `display: grid` on container, `grid-area: 1/1` on all slots — everything overlaps
2. `visibility: hidden` on inactive slots — invisible but still in layout flow
3. `inert` attribute on inactive slots — no focus, no clicks, no screen reader
4. Axis-aware collapse (`max-height: 0` or `max-width: 0`) so only the relevant axis contributes to sizing
5. Zero JS measurement — pure CSS, works on first frame

**StableSlot props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `axis` | `"width"` \| `"height"` \| `"both"` | `"both"` | Which axis to stabilize |
| `className` | `string` | — | Passed to wrapper div |

All other div attributes are forwarded.

**Slot props:**

| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Controls visibility |

### useStableSlot — ResizeObserver ratchet for dynamic content

For content that changes size unpredictably (prices, names, status messages) where you can't enumerate all variants upfront. Watches the container, tracks the maximum size ever observed, applies min-width/min-height that only ratchets up.

```tsx
const slot = Concertina.useStableSlot({ axis: "width" });

<div ref={slot.ref} style={slot.style} className="price-amount">
  {formattedPrice}
</div>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `axis` | `"width"` \| `"height"` \| `"both"` | `"both"` | Which axis to ratchet |

Returns `{ ref, style }` — attach both to the container element.

### useTransitionLock — Animation suppression

Suppress CSS transitions during batched state changes. Sets a flag synchronously (batched with state updates in React 18), auto-clears after paint.

```tsx
const { locked, lock } = Concertina.useTransitionLock();

const handleChange = (newValue) => {
  lock();
  setValue(newValue);
};

<div data-locked={locked || undefined}>
  {/* CSS: [data-locked] .animated { transition-duration: 0s } */}
</div>
```

### pinToScrollTop(el)

Scrolls `el` to the top of its nearest scrollable ancestor. Adjusts `scrollTop` only — never cascades to the viewport (critical on mobile where `scrollIntoView` yanks the whole page). Accounts for sticky headers automatically.

### When to use which

| Content type | Tool | Shift behavior |
|-------------|------|----------------|
| Discrete variants (button A ↔ button B) | `StableSlot` + `Slot` | Zero — ever |
| Dynamic text (prices, names, messages) | `useStableSlot` | Once per new max, then stable |
| Numeric text specifically | CSS `tabular-nums` | Zero (font-level) |

---

## Layer 2: Accordion

Wraps Radix Accordion with scroll pinning, animation suppression during switches, and per-item memoization via `useSyncExternalStore`.

### Component API

```tsx
<Concertina.Root className="my-accordion">
  {items.map((item) => (
    <Concertina.Item key={item.id} value={item.id}>
      <Concertina.Header>
        <Concertina.Trigger>{item.title}</Concertina.Trigger>
      </Concertina.Header>
      <Concertina.Content>{item.body}</Concertina.Content>
    </Concertina.Item>
  ))}
</Concertina.Root>
```

When you switch between items, the new one pins to the top of the scroll container. Animations are suppressed during the switch and restored after paint.

**`useExpanded(id)`** — per-item expansion hook. Only re-renders when this item's boolean flips:

```tsx
function MyItem({ item }) {
  const expanded = Concertina.useExpanded(item.id);
  // only re-renders when this specific item opens/closes
}
```

### Hook API (legacy)

```tsx
const { rootProps, getItemRef } = Concertina.useConcertina();

<Accordion.Root type="single" collapsible {...rootProps}>
  <Accordion.Item value="a" ref={getItemRef("a")}>
    ...
  </Accordion.Item>
</Accordion.Root>
```

| Property | Type | Description |
|---|---|---|
| `rootProps` | `object` | Spread onto `Accordion.Root` — contains `value`, `onValueChange`, `data-switching` |
| `getItemRef` | `(id: string) => RefCallback` | Attach to each `Accordion.Item` |
| `value` | `string` | Currently expanded item (empty string when collapsed) |
| `switching` | `boolean` | True during a switch between items |

## Customize animation timing

```css
.concertina-content {
  --concertina-open-duration: 300ms;
  --concertina-close-duration: 200ms;
}
```

If items near the bottom can't scroll to the top, add `padding-bottom: 50vh` to the scroll container.

## License

MIT
