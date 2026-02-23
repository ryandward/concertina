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

<p align="center"><b>47 tests</b> &middot; 716 lines of source &middot; 1 dependency</p>

## Why this exists

Concertina started because accordions in React are broken. You click an item, it expands, and the thing you just clicked scrolls off the screen. The browser shoved everything down to make room and now you're staring at content you didn't ask for while the thing you wanted is somewhere above you. On mobile it's worse — `scrollIntoView` grabs the entire viewport and drags it around like a dog with a sock.

So concertina started as an accordion wrapper with scroll pinning. But the deeper we got, the more we realized accordions are just one instance of a bigger problem: things change size and the browser moves everything else to compensate. Swap a button for a stepper. Replace a spinner with a table. Mount a panel. Unmount it. Same disease, every time.

The core idea is almost embarrassingly simple: don't swap things. Render all the variants at the same time, in the same grid cell, stacked on top of each other. The cell sizes itself to the biggest one. You toggle which one is visible. The box never changes size because all the variants are always in there. No measurement, no ResizeObserver, no layout effect. CSS grid figured it out on the first frame because that's what it already does.

That covers the most common source of layout shift. Two cases it doesn't cover:

1. **Data loads.** A spinner sits at 48 pixels. The real table shows up at 500. The scroll region has an episode. You can't enumerate all variants upfront because the content is dynamic, so you need a container that remembers its biggest size and refuses to shrink.

2. **Conditional content.** A panel mounts or unmounts. Everything below it teleports in a single frame. No transition. No grace. On, off, furniture moved.

Concertina has a small primitive for each.

## Install

```bash
npm install concertina
```

```tsx
import * as Concertina from "concertina";
import "concertina/styles.css";
```

## Variant switching: StableSlot + Slot

Your layout shifts when you swap components because the new one is a different size and the browser just rolls with it. The fix: don't swap them. Render all of them at the same time, same grid cell, stacked. The cell sizes to the biggest one. Toggle visibility. The box can't change size. All the variants are always in there.

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

How it works:

- `display: grid` on the container, `grid-area: 1/1` on all Slots. Everything overlaps in one cell.
- Inactive Slots get `visibility: hidden` (invisible, still in layout flow) and `inert` (no focus, no clicks, no screen reader).
- Each Slot uses `display: flex; flex-direction: column` so content stretches to fill the reserved width.
- Zero JS measurement. Pure CSS. Works on the first frame.

### StableSlot props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `axis` | `"width"` \| `"height"` \| `"both"` | `"both"` | Which axis to stabilize |
| `as` | `ElementType` | `"div"` | HTML element to render |
| `className` | `string` | | Passed to wrapper |

### Slot props

| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Controls visibility |
| `as` | `ElementType` | HTML element to render. Default `"div"`. |

All other HTML attributes are forwarded on both components.

### Rules for correct behavior

Parent containers must allow content-based sizing. A StableSlot inside `grid-template-columns: 1fr 10rem` is trapped — the fixed column clips it and the whole thing is pointless. Use `auto`:

```css
/* StableSlot can't do its job in here */
grid-template-columns: 1fr 10rem;

/* now it can size itself */
grid-template-columns: 1fr auto;
```

Every independently appearing element needs its own StableSlot. An Undo link that only shows up in one state gets its own wrapper — don't nest it inside a Slot of the main StableSlot:

```tsx
<div className="action-column">
  <Concertina.StableSlot axis="width">
    <Concertina.Slot active={showDeliver}><Button>Deliver</Button></Concertina.Slot>
    <Concertina.Slot active={showCharge}><Button>Charge</Button></Concertina.Slot>
  </Concertina.StableSlot>
  <Concertina.StableSlot>
    <Concertina.Slot active={showCharge}>
      <button className="undo-link">Undo</button>
    </Concertina.Slot>
  </Concertina.StableSlot>
</div>
```

A single Slot inside a StableSlot is valid. It reserves the element's space, showing or hiding it without shift. This is fine. This is good actually.

## Progressive loading: Gigbag + Warmup

You've seen this a thousand times:

```jsx
if (loading) return <Spinner />;      // 48px
if (empty)   return <EmptyMsg />;     // 64px
return <BigTable data={data} />;      // 500px+
```

The spinner is 48 pixels. The table is 500. When the data arrives, the container quintuples in height and everything the user was looking at gets launched off screen.

Gigbag is a container that remembers its largest-ever size via ResizeObserver and will not shrink. Will not. Put a spinner in there, then a table, then a spinner again — it stays at the table's height the whole time. Like a guitar case. You don't reshape the case every time you take the guitar out. The case is the size of the guitar. Always. It also uses `contain: layout style` so internal reflows don't bother the ancestors.

Warmup is a CSS-only shimmer grid that goes inside the Gigbag while you're loading. Instead of a spinner that tells the browser nothing about what's coming, the Warmup looks like the content. Rows. Columns. Pulsing. The browser knows how tall things will be because you told it. With shapes.

```tsx
<Concertina.Gigbag axis="height">
  {loading ? (
    <Concertina.Warmup rows={8} columns={3} />
  ) : (
    <DataTable data={data} />
  )}
</Concertina.Gigbag>
```

The Gigbag ratchets to whichever is taller. On subsequent re-fetches it holds at the table's height instead of collapsing back. The data can come and go. The container does not care.

### Gigbag props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `axis` | `"width"` \| `"height"` \| `"both"` | `"height"` | Which axis to ratchet |
| `as` | `ElementType` | `"div"` | HTML element to render |

### Warmup props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `number` | `3` | Number of placeholder rows |
| `columns` | `number` | `1` | Columns per row |
| `as` | `ElementType` | `"div"` | HTML element to render |

### Theming Warmup

All dimensions are CSS custom properties. Override them to match your app:

```css
.concertina-warmup {
  --concertina-warmup-gap: 0.5rem;
  --concertina-warmup-bone-height: 2.5rem;
  --concertina-warmup-bone-radius: 0.25rem;
  --concertina-warmup-bone-color: #e5e7eb;
}
```

## Conditional content: Glide

`{show && <Panel />}`. The panel is either in the DOM or it's not. When it enters, everything below it gets shoved down in a single frame. When it leaves, everything snaps back up. It's a light switch that also moves your furniture.

Glide wraps conditional content with enter/exit CSS animations and delays unmount until the exit animation finishes. The panel slides in, the panel slides out, content around it moves smoothly.

```tsx
<Concertina.Glide show={showPanel}>
  <Panel />
</Concertina.Glide>
```

When `show` goes true, children mount with a `concertina-glide-entering` class. When `show` goes false, they get `concertina-glide-exiting` and stay in the DOM until the animation finishes. Then they unmount for real.

### Glide props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `boolean` | | Whether the content is visible |
| `as` | `ElementType` | `"div"` | HTML element to render |

### Customizing Glide timing

```css
.concertina-glide {
  --concertina-glide-duration: 300ms;
  --concertina-glide-height: 2000px; /* max-height ceiling for the animation */
}
```

The height variable is a ceiling, not an exact value. `max-height` is how you animate height on auto-height elements. `overflow: hidden` clips any overshoot. CSS doesn't give us anything better.

## Composing them

Gigbag and Glide solve different problems and they compose:

```tsx
{/* a form that animates in/out and doesn't collapse during re-renders */}
<Concertina.Glide show={isEditing}>
  <Concertina.Gigbag axis="height">
    <EditForm />
  </Concertina.Gigbag>
</Concertina.Glide>
```

## Dynamic text: useStableSlot

For content that changes size unpredictably (prices, names, status messages) where you can't enumerate all variants upfront. This is what Gigbag uses internally. Use it directly when you want a ref-based API instead of a wrapper component.

```tsx
const slot = Concertina.useStableSlot({ axis: "width" });

<div ref={slot.ref} style={slot.style} className="price-amount">
  {formattedPrice}
</div>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `axis` | `"width"` \| `"height"` \| `"both"` | `"both"` | Which axis to ratchet |

Returns `{ ref, style }`. Attach both to the container element.

## Animation suppression: useTransitionLock

Suppresses CSS transitions during batched state changes. Sets a flag synchronously (batched with state updates in React 18), auto-clears after paint.

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

## Scroll pinning: pinToScrollTop

Scrolls an element to the top of its nearest scrollable ancestor. Only touches `scrollTop` on that one container. Never cascades to the viewport — no full-page drag on mobile. Accounts for sticky headers automatically.

```tsx
Concertina.pinToScrollTop(element);
```

## Accordion

Wraps Radix Accordion with scroll pinning, animation suppression during switches, and per-item memoization via `useSyncExternalStore`.

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

`useExpanded(id)` is a per-item expansion hook. Only re-renders when this specific item's boolean flips:

```tsx
function MyItem({ item }) {
  const expanded = Concertina.useExpanded(item.id);
  // only re-renders when this specific item opens/closes
}
```

### Legacy hook API

For cases where you need to manage Radix Accordion directly:

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
| `rootProps` | `object` | Spread onto `Accordion.Root`. Contains `value`, `onValueChange`, `data-switching`. |
| `getItemRef` | `(id: string) => RefCallback` | Attach to each `Accordion.Item` |
| `value` | `string` | Currently expanded item (empty string when collapsed) |
| `switching` | `boolean` | True during a switch between items |

### Customizing accordion animation

```css
.concertina-content {
  --concertina-open-duration: 300ms;
  --concertina-close-duration: 200ms;
}
```

If items near the bottom can't scroll to the top, add `padding-bottom: 50vh` to the scroll container.

## Picking the right tool

| Problem | Tool |
|---------|------|
| Two variants swap in one slot | StableSlot + Slot |
| Text changes width unpredictably | useStableSlot (or CSS `tabular-nums` for numbers) |
| Spinner replaced by loaded content | Gigbag + Warmup |
| Panel mounts/unmounts conditionally | Glide |
| Accordion with scroll pinning | Root + Item + Content |

## License

MIT
