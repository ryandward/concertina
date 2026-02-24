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

<p align="center"><b>92 tests</b> &middot; ~1200 lines of source &middot; 1 dependency</p>

## The problem

Layout shift happens when the browser changes the size of a box and moves everything else to compensate. A button swaps for a stepper; the text next to it reflows. A spinner becomes a table; the page jumps. An accordion opens; the thing you clicked scrolls off the screen.

The React ecosystem treats this as a state problem. Suspense, skeleton libraries, loading spinners: they model the transition between pending and loaded. They give you a nice-looking placeholder that's a completely different DOM structure from the real content, then act surprised when the swap causes a jump.

It's not a state problem. It's a **structure problem.** The box changed size because you swapped the structure inside it.

## The fix

Don't swap structures. Swap what's inside them.

Concertina gives you three high-level components: **Bellows**, **Hum**, and **Ensemble**. They handle the math so you can focus on the music. CSS is auto-injected on first render. No manual imports needed.

```bash
npm install concertina
```

```tsx
import { Bellows, Slot, Hum, Ensemble } from "concertina";
// That's it. No CSS import required.
```

> SSR users: keep `import "concertina/styles.css"` in your server entry. Auto-injection runs on first client render, but SSR needs the styles before that.

---

## Before & after

v0.11.0 replaces manual wiring with musical composition.

**Before (v0.10)**: manual CSS import, boolean wiring, separate warmup plumbing.

```tsx
import { StableSlot, Slot, Gigbag, Warmup, useWarmupExit } from "concertina";
import "concertina/styles.css";

function Tabs({ activeTab }) {
  return (
    <StableSlot>
      <Slot active={activeTab === "profile"}>
        <ProfilePanel />
      </Slot>
      <Slot active={activeTab === "settings"}>
        <SettingsPanel />
      </Slot>
    </StableSlot>
  );
}

function UserList({ users, loading }) {
  const { showWarmup, exiting } = useWarmupExit(loading, 150);
  return (
    <Gigbag axis="height">
      {showWarmup ? (
        <Warmup
          rows={5}
          className={exiting ? "concertina-warmup-exiting" : undefined}
        />
      ) : (
        <div>{users.map(u => <UserCard key={u.id} user={u} />)}</div>
      )}
    </Gigbag>
  );
}
```

**After (v0.11.0)**: named notes, no CSS import, no plumbing.

```tsx
import { Bellows, Slot, Ensemble } from "concertina";

function Tabs({ activeTab }) {
  return (
    <Bellows activeNote={activeTab}>
      <Slot note="profile"><ProfilePanel /></Slot>
      <Slot note="settings"><SettingsPanel /></Slot>
    </Bellows>
  );
}

function UserList({ users, loading }) {
  return (
    <Ensemble
      items={users}
      loading={loading}
      stubCount={5}
      exitDuration={150}
      renderItem={(u, i) => <UserCard key={u.id} user={u} />}
    />
  );
}
```

Same stability guarantees. Half the code. Zero configuration.

---

## Bellows: spatial stability

Two components swap in one slot. An "Add" button becomes a quantity stepper. The stepper is wider. The text next to it jumps left.

The fix: render both at the same time, in the same grid cell, stacked. The cell sizes to the bigger one. Toggle which one is visible via named notes.

```tsx
import { Bellows, Slot } from "concertina";

<Bellows activeNote={isInCart ? "stepper" : "add"} axis="width">
  <Slot note="add"><AddButton /></Slot>
  <Slot note="stepper"><QuantityControl /></Slot>
</Bellows>
```

How it works:

- `display: grid` on the container, `grid-area: 1/1` on all Slots. Everything overlaps in one cell (the **chamber**).
- Inactive Slots get the `inert` attribute: no focus, no clicks, no screen reader. CSS handles `visibility: hidden` and `opacity: 0` via the `[inert]` selector.
- Each Slot uses `display: flex; flex-direction: column` so content stretches to fill the reserved width.
- Zero JS measurement. Pure CSS. Works on the first frame.

The `note` prop identifies a Slot. The parent `activeNote` determines which one is visible. Explicit `active={true|false}` overrides context when you need manual control. A bare `<Slot>` with neither prop defaults to visible.

#### Bellows props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `activeNote` | `string` | | Which Slot to activate by `note` |
| `axis` | `"width"` \| `"height"` \| `"both"` | `"both"` | Which axis to stabilize |
| `as` | `ElementType` | `"div"` | HTML element to render |

#### Slot props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `note` | `string` | | Identifier matched against `activeNote` |
| `active` | `boolean` | | Manual override (takes precedence over `note`) |
| `as` | `ElementType` | `"div"` | HTML element to render |

> `StableSlot` is an alias for `Bellows`. `SlotProps.active` is now optional.

#### Rules for correct behavior

Parent containers must allow content-based sizing. A Bellows inside `grid-template-columns: 1fr 10rem` is trapped; the fixed column clips it. Use `auto`:

```css
/* Bellows can't do its job in here */
grid-template-columns: 1fr 10rem;

/* now it can size itself */
grid-template-columns: 1fr auto;
```

Every independently appearing element needs its own Bellows. A single Slot inside a Bellows is valid. It reserves the element's space, showing or hiding it without shift.

---

## Hum: temporal stability for text

A line of text loads from an API. You want a shimmer that's the exact width of the text it replaces. Not `100%`, not a guess.

Hum uses the **Inert Ghost** strategy: it renders your children inside the shimmer but marks them `inert`. The ghost text is invisible but present in the layout, giving the shimmer its intrinsic width. When loading finishes, the ghost is replaced by the real content. No width changes. No shift.

```tsx
import { Hum } from "concertina";

<h2>
  <Hum loading={!user} className="text-xl font-bold">
    {user?.name}
  </Hum>
</h2>
```

The `className` is passed through to the shimmer so `1lh` inherits the correct font metrics. The shimmer is exactly as tall as the text it replaces because `1lh` resolves to the element's computed line-height. Not font-size, not a token, not a guess.

#### Hum props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | | Show shimmer (true) or children (false) |
| `as` | `ElementType` | `"span"` | HTML element to render |
| `className` | `string` | | Applied to both shimmer and content states |

> `StableText` is an alias for `Hum`.

---

## Ensemble: temporal stability for collections

A list loads from an API. You want shimmer rows while loading, then a smooth transition to real items, and the container must never collapse during the swap.

Ensemble composes `Gigbag` (size ratchet) + `Warmup` (shimmer grid) + `useWarmupExit` (fade transition) into a single component.

```tsx
import { Ensemble } from "concertina";

<Ensemble
  items={orders}
  loading={isLoading}
  stubCount={5}
  exitDuration={150}
  renderItem={(order, i) => <OrderRow key={order.id} order={order} />}
/>
```

The Gigbag ratchet remembers the largest-ever height. When shimmer rows fade out and real items mount, the container never shrinks below its high-water mark. No jump.

#### Ensemble props

| Prop | Type | Description |
|------|------|-------------|
| `items` | `T[]` | Data items to render |
| `loading` | `boolean` | Show shimmer stubs when true |
| `renderItem` | `(item: T, index: number) => ReactNode` | Render function for each item |
| `stubCount` | `number` | Number of shimmer placeholder rows |
| `exitDuration` | `number` | Exit animation duration in ms (match `--concertina-close-duration`) |
| `as` | `ElementType` | HTML element to render. Default `"div"` |

> `StableCollection` is an alias for `Ensemble`.

---

## The stability contract

Nothing moves unless you want it to. Three strategies enforce this:

**Inert Ghost** (Hum): children render inside the shimmer but are marked `inert`. The ghost provides intrinsic width. CSS hides it via `.concertina-warmup-line > [inert] { visibility: hidden }`. The shimmer is exactly as wide as the content it replaces.

**Chamber** (Bellows): all Slots occupy the same CSS grid cell (`grid-area: 1/1`). The grid auto-sizes to the largest child. Inactive Slots are hidden via `[inert]` but remain in the layout flow, contributing their dimensions. The cell never shrinks.

**Ratchet** (Gigbag / Ensemble): a ResizeObserver tracks the maximum-ever size and applies it as `min-height` / `min-width`. The container can grow but never shrinks. Swap a spinner for a table; the container stays at the table's height.

---

## Zero configuration

CSS is auto-injected via `useInsertionEffect` on first render. A `<style data-concertina>` tag is added to `<head>` once, idempotently. No build plugin, no import statement, no configuration.

The injection is SSR-safe: it checks `typeof document` and no-ops on the server. For SSR/SSG, keep `import "concertina/styles.css"` in your entry point so styles exist before hydration.

---

## Lower-level tools

The components above compose these building blocks. Use them directly when you need custom behavior.

### Gigbag

Size-reserving container. Remembers its largest-ever height (or width, or both) and never shrinks. Uses `contain: layout style` to isolate internal reflow.

```tsx
import { Gigbag, Warmup } from "concertina";

<Gigbag axis="height">
  {loading ? <Warmup rows={8} columns={3} /> : <DataTable data={data} />}
</Gigbag>
```

### WarmupLine

Single shimmer line. Uses `height: 1lh`, where the CSS `lh` unit resolves to the element's computed line-height. Pass `className` to apply the same text styles as the content this shimmer stands in for.

```tsx
import { WarmupLine } from "concertina";

<span className="text-sm text-stone">
  {loading ? <WarmupLine className="text-sm text-stone" /> : `${count} items`}
</span>
```

### Warmup

Shimmer grid. Renders `rows` (x `columns`) animated bones.

| Prop | Type | Description |
|------|------|-------------|
| `rows` | `number` | Number of placeholder rows (required) |
| `columns` | `number` | Columns per row (optional) |

### Glide

Enter/exit animation wrapper. Delays unmount until the exit animation finishes.

```tsx
import { Glide } from "concertina";

<Glide show={showPanel}>
  <Panel />
</Glide>
```

### Theming

All visual properties are CSS custom properties:

```css
.concertina-warmup-line {
  --concertina-warmup-line-radius: 0.125rem;
  --concertina-warmup-line-color: #e5e7eb;
  --concertina-warmup-line-highlight: #f3f4f6;
}
.concertina-warmup {
  --concertina-warmup-gap: 0.75rem;
}
.concertina-glide {
  --concertina-glide-duration: 300ms;
}
.concertina-content {
  --concertina-open-duration: 200ms;
  --concertina-close-duration: 150ms;
}
```

---

## Advanced primitives

> These hooks are **deprecated** in favor of the components above. They remain exported for power users who need direct control.

| Hook | Use component instead |
|------|-----------------------|
| `useStableSlot` | `<Gigbag>` or `<Bellows>` |
| `useWarmupExit` | `<Ensemble>` |
| `usePresence` | `<Glide>` |
| `useTransitionLock` | `<Root>` (accordion) |
| `useSize` | `<Gigbag>` |
| `useConcertina` | `<Root>` (accordion) |

All hooks are still importable from `"concertina"`. They have `@deprecated` JSDoc tags so your editor will show strikethrough.

---

## Positional stability

### Accordion

Wraps Radix Accordion with scroll pinning and animation suppression. Lives in its own sub-path:

```tsx
import * as Accordion from "concertina/accordion";

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

`useExpanded(id)` is a per-item expansion hook. It only re-renders when this specific item's boolean flips.

### pinToScrollTop

Scrolls an element to the top of its nearest scrollable ancestor. Only touches `scrollTop` on that one container. Never cascades to the viewport. Automatically accounts for sticky headers.

---

## Picking the right tool

| Problem | Tool |
|---------|------|
| Two variants swap in one slot | Bellows + Slot |
| Line of text loading from API | Hum |
| List loading from API | Ensemble |
| Spinner replaced by loaded content | Gigbag + Warmup |
| Accordion/table shimmer rows | Stub data + WarmupLine (wrapper-once pattern) |
| Panel mounts/unmounts conditionally | Glide |
| Accordion with scroll pinning | Accordion.Root + Item + Content |

---

## Browser support

Concertina targets modern browsers. The minimum floor is set by `1lh` (CSS line-height unit):

- Chrome 109+
- Firefox 120+
- Safari 17.2+

The `inert` attribute shipped before `1lh` in every browser. No polyfills. No fallbacks. No bloat.

---

## Roadmap

- **Scroll anchoring**: maintain scroll position when content above a target changes.
- **Media reservation**: reserve space for images/video via `aspect-ratio` before load.
- **Focus stability**: trap focus to nearest surviving ancestor when DOM mutations remove the focused element.

These are proposals, not commitments. If any would unblock your project, open an issue.

## License

MIT
