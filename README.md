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

## The problem

Layout shift happens when the browser changes the size of a box and moves everything else to compensate. A button swaps for a stepper — the text next to it reflows. A spinner becomes a table — the page jumps 400 pixels. An accordion opens — the thing you clicked scrolls off the screen.

The React ecosystem treats this as a **state problem**. Suspense, skeleton libraries, loading spinners — they model the transition between pending and loaded. They give you a nice-looking placeholder that's a completely different DOM structure from the real content, then act surprised when the swap causes a jump.

It's not a state problem. It's a **structure problem.** The box changed size because you swapped the structure inside it.

## The fix

Don't swap structures. Swap what's inside them.

Every tool in concertina is a different expression of this one idea:

| What changes | Tool | How it works |
|---|---|---|
| Which variant is visible | StableSlot + Slot | Render all variants in one grid cell, toggle visibility |
| Content loading | Gigbag | Container remembers its biggest size, refuses to shrink |
| Data arriving in a table | Stub data pattern | Same render path for loading and loaded — shimmer or content inside the same wrapper |
| A panel mounting/unmounting | Glide | Animated enter/exit instead of instant DOM swap |
| Which accordion item is open | Root + Item + Content | Scroll pinning keeps the opened item visible |

Structure is the contract. Content is what varies. If you internalize that, the API is obvious. If you don't, no amount of tooling will save you.

## Install

```bash
npm install concertina
```

```tsx
import * as Concertina from "concertina";
import "concertina/styles.css";
```

---

## StableSlot + Slot

Two components swap in one slot. An "Add" button becomes a quantity stepper. The stepper is wider. The text next to it jumps left.

The fix: don't swap them. Render both at the same time, in the same grid cell, stacked. The cell sizes to the bigger one. Toggle which one is visible. The box never changes size because both variants are always in there.

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

A single Slot inside a StableSlot is valid. It reserves the element's space, showing or hiding it without shift.

---

## Gigbag + Warmup

```jsx
if (loading) return <Spinner />;      // 48px
if (empty)   return <EmptyMsg />;     // 64px
return <BigTable data={data} />;      // 500px+
```

Three different structures, three different heights. Every transition jumps.

Gigbag is a container that remembers its largest-ever size via ResizeObserver and will not shrink. Put a spinner in there, then a table, then a spinner again — it stays at the table's height the whole time. Like a guitar case. You don't reshape the case every time you take the guitar out. It also uses `contain: layout style` so internal reflows don't bother the ancestors.

Warmup is a CSS-only shimmer grid that goes inside the Gigbag while you're loading. Instead of a spinner that tells the browser nothing about what's coming, the Warmup approximates the content's shape. The browser knows how tall things will be because you told it.

```tsx
<Concertina.Gigbag axis="height">
  {loading ? (
    <Concertina.Warmup rows={8} columns={3} />
  ) : (
    <DataTable data={data} />
  )}
</Concertina.Gigbag>
```

The Gigbag ratchets to whichever child is taller. On subsequent re-fetches it holds at the table's height instead of collapsing back.

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

All dimensions are CSS custom properties:

```css
.concertina-warmup {
  --concertina-warmup-gap: 0.5rem;
  --concertina-warmup-bone-height: 2.5rem;
  --concertina-warmup-bone-radius: 0.25rem;
  --concertina-warmup-bone-color: #e5e7eb;
}
```

---

## The stub-data pattern

Gigbag + Warmup works for flat containers. But when your content renders through structured components — an accordion with `Root > Item > Trigger > Content`, or a data table with cell wrappers — a separate loading skeleton is a different DOM structure. Different wrappers, different padding, different height. The swap from skeleton to real content shifts layout. It has to. The structures are different.

This is where the core principle applies directly. Don't build a separate loading path. **Pass placeholder data through the same render path as real data.**

### How it works

Create stub objects with the same shape as your real data, marked with a `_warmup` flag. Pass them to the same component that renders real data. Each cell renders shimmer or content inside the same wrapper — one wrapper definition, ternary on the guts:

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
      ? <div className="concertina-warmup-line concertina-warmup-line-long" />
      : row.original.name
    }
  </span>
)

// Table component — no separate loading branch
function MyTable({ data, loading }) {
  return (
    <Concertina.Root>
      {(loading ? STUB_ROWS : data).map((row) => (
        <Concertina.Item key={row.id} value={row.id}>
          <Concertina.Trigger>
            {/* cells render shimmer or content in the same wrappers */}
          </Concertina.Trigger>
          <Concertina.Content>
            {row._warmup ? null : <DetailPanel row={row} />}
          </Concertina.Content>
        </Concertina.Item>
      ))}
    </Concertina.Root>
  );
}
```

The stub rows go through `Root > Item > Trigger > Content` — the exact same components as real rows. The `Content` element exists in the DOM (collapsed, zero height) for both stubs and real data. Every wrapper, every padding, every border is identical. The only difference is what's inside the cells.

### The wrapper-once rule

This is the part that matters. The wrapper is the structural contract — it determines padding, font-size, line-height, and therefore the cell's height. Define it once. Put the ternary inside it. Never write the wrapper in two branches.

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

When the wrapper is duplicated across branches, it will drift. Someone adds a class to the live branch, forgets the warmup branch. The heights diverge. Layout shifts. And nobody notices until a user watches their screen jump on every page load.

One wrapper. One definition. Ternary on the guts. That's the whole rule.

### Action columns with StableSlot

For columns with interactive controls, pass `null` as the entity during warmup. The StableSlot still renders all variants in `visibility: hidden`, reserving the exact same space:

```tsx
<ActionCell entity={row._warmup ? null : row} />
```

### What TypeScript enforces (and what it doesn't)

A discriminated union guarantees you check `_warmup` before accessing real data:

```ts
type WarmupRow = {
  _warmup: true;
  id: string;
};

type RealRow = {
  _warmup?: never;
  id: string;
  name: string;
  items: Item[];
};

type Row = WarmupRow | RealRow;
```

The compiler forces the branch:

```ts
function renderCell(row: Row) {
  // TS error: 'name' doesn't exist on WarmupRow
  return <span className="table-val-primary">{row.name}</span>;

  // compiles — wrapper once, ternary inside
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

You can't access `row.name` without checking `_warmup` first. A cell renderer that forgets the check fails at build time.

**What TypeScript does NOT enforce:** that you use the wrapper-once pattern. The compiler can't see inside JSX structure. This compiles without error and shifts layout:

```ts
// TS is happy. Layout shifts anyway. Don't do this.
if (row._warmup) return <div className="concertina-warmup-line" />;
return <span className="table-val-primary">{row.name}</span>;
```

TypeScript prevents you from forgetting the branch. The wrapper-once pattern prevents you from forgetting the wrapper. Use both.

---

## Glide

`{show && <Panel />}`. The panel is either in the DOM or it's not. When it enters, everything below it gets shoved down in a single frame. When it leaves, everything snaps back up. A light switch that also moves your furniture.

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

The height variable is a ceiling, not an exact value. `max-height` is how you animate height on auto-height elements. `overflow: hidden` clips any overshoot.

---

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

---

## useStableSlot

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

## useTransitionLock

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

## pinToScrollTop

Scrolls an element to the top of its nearest scrollable ancestor. Only touches `scrollTop` on that one container. Never cascades to the viewport — no full-page drag on mobile. Accounts for sticky headers automatically.

```tsx
Concertina.pinToScrollTop(element);
```

---

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

---

## Picking the right tool

| Problem | Tool |
|---------|------|
| Two variants swap in one slot | StableSlot + Slot |
| Text changes width unpredictably | useStableSlot (or CSS `tabular-nums` for numbers) |
| Spinner replaced by loaded content | Gigbag + Warmup |
| Accordion/table loading skeleton | Stub data through same render path |
| Panel mounts/unmounts conditionally | Glide |
| Accordion with scroll pinning | Root + Item + Content |

## License

MIT
