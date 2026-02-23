<p align="center">
  <img src="https://raw.githubusercontent.com/ryandward/concertina/main/concertina.svg" width="140" alt="concertina" />
</p>

<h1 align="center">concertina</h1>

<p align="center">
  React toolkit for layout stability.
</p>

## Why this exists

Concertina started because accordions in React are broken. You click an item, it expands, and the thing you just clicked scrolls off the screen because the browser dutifully shoved everything down to make room. You're now looking at content you didn't ask for while the thing you wanted is somewhere above you. On mobile it's even worse because `scrollIntoView` grabs the entire viewport and drags it around like a dog with a sock. The internet isn't supposed to work like this but every accordion library ships this exact behavior and nobody seems bothered.

So concertina started as an accordion wrapper with scroll pinning. But the deeper we got, the more we realized accordions are just one instance of a much bigger problem: things change size and the browser moves everything else to compensate. It happens when you swap a button for a stepper. It happens when a spinner gets replaced by a table. It happens when a panel mounts or unmounts. It's all the same disease.

The core idea that makes concertina work is almost embarrassingly simple: don't swap things. Render all the variants at the same time, in the same grid cell, stacked on top of each other. The cell sizes itself to the biggest one. You just toggle which one is visible. The box never changes size because all the variants are always in there. No measurement, no ResizeObserver, no layout effect. The grid cell figured it out on the first frame because that's what CSS grid already does.

That insight fixes the most common source of layout shift. But there are two cases it doesn't cover:

1. Data loads. You had a little spinner, 48 pixels of calm. Then the actual table shows up at 500 pixels and your scroll position is destroyed. You can't enumerate "all variants" upfront because the content is dynamic, so you need a container that remembers its biggest size and refuses to shrink.

2. A conditional panel mounts or unmounts. Everything below it teleports instantly. There's no animation because apparently we just live like this now.

Concertina has a small primitive for each of these, on top of the accordion and stable slot work that started the whole thing.

## Install

```bash
npm install concertina
```

```tsx
import * as Concertina from "concertina";
import "concertina/styles.css";
```

## Variant switching: StableSlot + Slot

OK so the reason your layout shifts when you swap components is that the new component is a different size than the old one and the browser is like "well I guess everything moves now." That's insane. The solution is you don't swap them. You render all of them at the same time, in the same grid cell, stacked on top of each other. The cell sizes itself to the biggest one. You just toggle which one is visible. The box never changes size. It can't. All the variants are always in there.

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
- Zero JS measurement. Pure CSS. Works on the first frame. There's nothing to measure because there's nothing to react to. The size just is what it is.

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

Parent containers must allow content-based sizing. If you put a StableSlot inside a fixed-width grid column like `grid-template-columns: 1fr 10rem`, the column clips it and you've accomplished nothing. Congratulations. Use `auto`:

```css
/* the StableSlot is trapped in here. it can't do its job */
grid-template-columns: 1fr 10rem;

/* now it can size itself. was that so hard */
grid-template-columns: 1fr auto;
```

Every independently appearing element needs its own StableSlot. If you have an Undo link that only shows up in one state, don't nest it inside a Slot of the main StableSlot. Give it its own. I shouldn't have to explain this but I'm going to because people do it wrong:

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

Every admin page in every app you've ever seen does this:

```jsx
if (loading) return <Spinner />;      // 48px
if (empty)   return <EmptyMsg />;     // 64px
return <BigTable data={data} />;      // 500px+
```

Do you see the problem? Do you see it? The spinner is 48 pixels. The table is 500. When the data arrives the container goes from 48 to 500 and the scroll region has an episode. Everything the user was looking at gets launched off screen. This is what you're shipping. This is in production right now.

Gigbag is a container that remembers its largest-ever size via ResizeObserver and will not shrink. Will not. You can put a spinner in there, then a table, then a spinner again, and it stays at the table's height the whole time. It's like a guitar case. You don't reshape the case every time you take the guitar out. That would be insane. The case is the size of the guitar. Always. It also uses `contain: layout style` so internal reflows don't bother the ancestors.

Warmup is a CSS-only shimmer grid that goes inside the Gigbag while you're waiting for data. Instead of a little spinner that tells the browser nothing about what's coming, the Warmup actually looks like the table. Rows. Columns. Pulsing. The browser knows how tall the content region is going to be because you told it. With shapes.

```tsx
<Concertina.Gigbag axis="height">
  {loading ? (
    <Concertina.Warmup rows={8} columns={3} />
  ) : (
    <DataTable data={data} />
  )}
</Concertina.Gigbag>
```

The Gigbag ratchets to whichever is taller, the Warmup or the real table. On subsequent re-fetches it holds at the table's height instead of collapsing back. The data can come and go. The container does not care.

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

`{show && <Panel />}`. You know this pattern. The panel is either in the DOM or it's not. When it enters, everything below it gets shoved down in a single frame. When it leaves, everything snaps back up. There is no transition. There is no grace. It's just on or off like a light switch except the light switch also moves your furniture.

Glide wraps conditional content with enter/exit CSS animations and delays unmount until the exit animation finishes. The panel slides in. The panel slides out. Content around it moves smoothly. This is what should have been happening the whole time.

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

The height variable is a ceiling, not an exact value. `max-height` is how you animate height on auto-height elements. `overflow: hidden` clips any overshoot. It's not perfect but CSS doesn't give us anything better and I've made my peace with it.

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

For content that changes size unpredictably (prices, names, status messages) where you can't enumerate all variants upfront. This is what Gigbag uses internally. You can use it directly when you want a ref-based API instead of a wrapper component.

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

Scrolls an element to the top of its nearest scrollable ancestor. Only touches `scrollTop` on that one container. Does not cascade to the viewport. This matters because `scrollIntoView` on mobile will grab the entire page and drag it around like a dog with a sock. Accounts for sticky headers automatically.

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
