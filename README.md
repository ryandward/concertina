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

<p align="center"><b>169 tests</b> &middot; ~1500 lines of source &middot; 1 dependency</p>

## The problem

Layout shift happens when the browser changes the size of a box and moves everything else to compensate. A button swaps for a stepper; the text next to it reflows. A spinner becomes a table; the page jumps. An accordion opens; the thing you clicked scrolls off the screen.

The React ecosystem treats this as a state problem. Suspense, skeleton libraries, loading spinners: they model the transition between pending and loaded. They give you a nice-looking placeholder that's a completely different DOM structure from the real content, then act surprised when the swap causes a jump.

It's not a state problem. It's a **structure problem.** The box changed size because you swapped the structure inside it.

## The fix

Don't swap structures. Swap what's inside them.

Concertina gives you five high-level components: **Bellows**, **Hum**, **Frame**, **Overture**, and **Ensemble**. They handle the math so you can focus on the music. CSS is auto-injected on first render. No manual imports needed.

```bash
npm install concertina
```

```tsx
import { Bellows, Slot, Hum, Frame, Ensemble } from "concertina";
// That's it. No CSS import required.
```

Every musical name has a semantic alias. Use whichever reads better in your codebase:

| Musical | Alias | Purpose |
|---------|-------|---------|
| `Bellows` | `StableSlot` | Spatial stability container |
| `Hum` | `StableText` | Loading-aware text shimmer |
| `Ensemble` | `StableCollection` | Loading-aware list |

```tsx
// Same components, different names
import { StableSlot, Slot, StableText, StableCollection } from "concertina";
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
- **Focus handoff**: when a Slot deactivates while it holds focus, the incoming active Slot automatically reclaims focus on its wrapper. No focus stranded on `document.body`. Keyboard users get seamless transitions.
- Active Slots set `tabIndex={-1}` (programmatically focusable, excluded from Tab order).
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

#### Vamp: ambient loading for entire subtrees

When many Hum instances share the same loading state (e.g. every cell in a table), threading `loading` to each one is boilerplate. Wrap the subtree in `<Vamp>` and every nested `<Hum>` picks it up automatically.

```tsx
import { Vamp, Hum } from "concertina";

<Vamp loading={isLoading}>
  <h2><Hum className="text-xl font-bold">{user?.name}</Hum></h2>
  <p><Hum className="text-sm text-stone">{user?.email}</Hum></p>
  <p><Hum className="text-sm">{user?.bio}</Hum></p>
</Vamp>
```

No `loading` prop on any Hum. They all read from Vamp. An explicit `loading` prop on any individual Hum still overrides context.

Named after musical **vamping** — repeating a pattern while waiting for a cue.

#### Hum props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | Vamp context | Show shimmer (true) or children (false). Falls back to nearest `<Vamp>` when omitted. |
| `as` | `ElementType` | `"span"` | HTML element to render |
| `className` | `string` | | Applied to both shimmer and content states |

#### Vamp props

| Prop | Type | Description |
|------|------|-------------|
| `loading` | `boolean` | Whether the subtree is in a loading/warmup state |
| `children` | `ReactNode` | Content to wrap |

> `StableText` is an alias for `Hum`.

---

## Overture: temporal stability for arbitrary content

A card, table, or page loads from an API. You want shimmer bones during loading, a smooth fade-out when data arrives, and the container must never collapse during the swap. You don't have a flat list — you have complex, nested JSX.

Overture composes `Vamp` (ambient loading context) + `Gigbag` (size ratchet) + `useWarmupExit` (exit transition) into a single wrapper. Write one JSX tree for both states. Nested `<Hum>` instances read loading state from the Vamp context automatically.

```tsx
import { Overture, Hum } from "concertina";

<Overture loading={isLoading} exitDuration={150}>
  <h2><Hum className="text-xl font-bold">{user?.name}</Hum></h2>
  <p><Hum className="text-sm text-stone">{user?.email}</Hum></p>
  <Button><Hum>Edit Profile</Hum></Button>
</Overture>
```

During loading, every Hum renders a shimmer sized to its ghost children. When loading finishes, the shimmers fade out, real content appears, and the Gigbag ratchet prevents any height collapse.

#### Overture props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | | Show shimmer (true) or content (false) |
| `exitDuration` | `number` | | Exit animation duration in ms (match `--concertina-close-duration`) |
| `as` | `ElementType` | `"div"` | HTML element to render |

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

## Frame: temporal stability for media

An image loads from a CDN. The container has no height until the image arrives. Everything below it jumps. Images are the #1 cause of CLS.

Frame reserves space via CSS `aspect-ratio` and shows a shimmer placeholder until the media loads. The bounding box is identical in both states — zero shift.

```tsx
import { Frame } from "concertina";

function Avatar({ src, alt }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Frame aspectRatio={1} loading={!loaded} className="rounded-full w-12">
      <img src={src} alt={alt} onLoad={() => setLoaded(true)} />
    </Frame>
  );
}
```

Frame reads from `<Vamp>` context automatically — no `loading` prop needed when a Vamp ancestor exists. Explicit `loading` always overrides context.

Images and videos inside a Frame get `width: 100%; height: 100%; object-fit: cover` via CSS, filling the aspect-ratio box without distortion.

#### Frame props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aspectRatio` | `number` | | CSS aspect-ratio value (e.g. `16/9`, `1`, `4/3`) |
| `loading` | `boolean` | Vamp context | Show shimmer (true) or children (false) |
| `as` | `ElementType` | `"div"` | HTML element to render |
| `className` | `string` | | Applied to both shimmer and content states |

---

## The stability contract

Nothing moves unless you want it to. Four strategies enforce this:

**Inert Ghost** (Hum): children render inside the shimmer but are marked `inert`. The ghost provides intrinsic width. CSS hides it via `.concertina-warmup-line > [inert] { visibility: hidden }`. The shimmer is exactly as wide as the content it replaces.

**Chamber** (Bellows): all Slots occupy the same CSS grid cell (`grid-area: 1/1`). The grid auto-sizes to the largest child. Inactive Slots are hidden via `[inert]` but remain in the layout flow, contributing their dimensions. The cell never shrinks.

**Aspect-Ratio Lock** (Frame): the container's dimensions are defined by `aspect-ratio` before any content loads. A shimmer fills the box during loading. When the image/video arrives, it fills the same box via `object-fit: cover`. The bounding box never changes.

**Ratchet** (Gigbag / Ensemble): a ResizeObserver tracks the maximum-ever size and applies it as `min-height` / `min-width`. The container can grow but never shrinks. Swap a spinner for a table; the container stays at the table's height.

---

## Zero configuration

CSS is auto-injected via `useInsertionEffect` on first render. A `<style data-concertina>` tag is added to `<head>` once, idempotently. No build plugin, no import statement, no configuration.

The injection is SSR-safe: it checks `typeof document` and no-ops on the server. For SSR/SSG, keep `import "concertina/styles.css"` in your entry point so styles exist before hydration.

**CSP nonce**: if your app uses a strict Content-Security-Policy, add a `<meta>` tag with the nonce before any concertina component mounts:

```html
<meta name="concertina-nonce" content="<%= nonce %>" />
```

The injected `<style>` tag will carry the nonce attribute, satisfying the CSP check.

**Opt-out**: to disable auto-injection entirely (e.g. you serve `concertina/styles.css` from a CDN), add:

```html
<meta name="concertina-disable-injection" />
```

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
| Many Hum instances share one loading state | Vamp + Hum |
| Card/table/page loading from API | Overture + Hum |
| List loading from API | Ensemble |
| Spinner replaced by loaded content | Gigbag + Warmup |
| Accordion/table shimmer rows | Stub data + WarmupLine (wrapper-once pattern) |
| Image/video loading causes layout shift | Frame |
| Panel mounts/unmounts conditionally | Glide |
| Accordion with scroll pinning | Accordion.Root + Item + Content |
| Large dataset from React Query / SWR | `useArrayIngest` + `VirtualChamber` |

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
- ~~**Media reservation**~~: shipped in v1.5.0. `<Frame>` reserves space via `aspect-ratio` with a shimmer placeholder until media loads.
- ~~**Focus stability**~~: shipped in v1.2.0. Bellows automatically hands focus to the incoming Slot when the focused Slot deactivates.

These are proposals, not commitments. If any would unblock your project, open an issue.

---

## Core Stability Engine (`concertina/core`)

The Core Stability Engine is a high-performance sub-package for virtualizing large datasets. It runs all data work inside a dedicated Web Worker. The main thread receives only the rows currently visible on screen, as a single transferred `ArrayBuffer`. No data is ever copied; no JSON is ever parsed on the main thread.

```tsx
import {
  useStabilityOrchestrator,
  useArrayIngest,
  VirtualChamber,
} from "concertina/core";
import type { RowProxy, ColumnSchema } from "concertina/core";
```

### Ingestion — just pass your array

`useArrayIngest` bridges the gap between your data-fetching library and the engine's binary pipeline. Pass a plain `T[]` and the hook handles everything else: chunking, binary encoding, worker dispatch, backpressure, and cleanup.

```tsx
import { useStabilityOrchestrator, useArrayIngest, VirtualChamber } from "concertina/core";
import type { ColumnSchema, RowProxy, RowIndex } from "concertina/core";
import { useQuery } from "@tanstack/react-query";

const schema = [
  { name: "gene",  type: "utf8", maxContentChars: 12 },
  { name: "score", type: "f64",  maxContentChars: 8 },
  { name: "tags",  type: "list_utf8", maxContentChars: 30 },
] as const satisfies readonly ColumnSchema[];

function GeneTable() {
  const { data } = useQuery({ queryKey: ["genes"], queryFn: fetchGenes });
  const orchestrator = useStabilityOrchestrator({ schema: [...schema] });

  // That's it. Chunking, encoding, worker dispatch — all transparent.
  useArrayIngest(orchestrator, schema, data);

  return (
    <VirtualChamber<typeof schema>
      store={orchestrator.store}
      containerRef={orchestrator.containerRef}
      renderRow={(row: RowProxy<typeof schema>, i: RowIndex) => (
        <div key={i}>
          {row.get("gene")}  {/* string | null — autocomplete, no cast */}
          {row.get("score")} {/* number | null */}
        </div>
      )}
    />
  );
}
```

**What happens under the hood:**

1. `useArrayIngest` creates a pull-based `ReadableStream` from your array.
2. Each `pull()` encodes one chunk (default 1 000 rows) into the binary wire format.
3. The orchestrator's pump sends one chunk to the worker and awaits `INGEST_ACK` before pulling the next — O(1) IPC queue depth regardless of dataset size.
4. The `INGEST_ACK` round-trip (`postMessage` → worker commit → `onmessage`) is inherently async, so the main thread yields between every chunk. No `setTimeout` hacks.
5. When `data` changes (new reference), the effect cleanup aborts the previous stream and starts fresh. When `data` is `null`/`undefined`, no ingestion runs — compatible with loading states.

Any data source works. React Query, SWR, Apollo, `useSuspenseQuery`, a plain `fetch` + `useState` — if it gives you a `T[]`, `useArrayIngest` takes it from there.

For streaming or custom binary sources, `createRecordBatchStream` and `encodeRecordBatch` are still exported for direct use.

#### Concertina vs. Strand

Concertina's Core Engine is designed for maximum ergonomics and drop-in compatibility with standard React apps. If you are building a highly specialized application (genomics, heavy data-viz) and are willing to configure strict cross-origin isolation headers (`COOP`/`COEP`) for true zero-copy `SharedArrayBuffer` streaming, check out [Strand](https://github.com/ryandward/strand). Full architecture comparison: [strand-vs-concertina.md](https://github.com/ryandward/strand/blob/main/docs/strand-vs-concertina.md).

### Type-safe RowProxy

`RowProxy.get()` is fully generic. Define your schema with `as const` and every `get()` call infers the exact return type — autocomplete on column names, no manual casts:

```ts
const schema = [
  { name: "id",    type: "utf8", maxContentChars: 10 },
  { name: "count", type: "u32",  maxContentChars: 5 },
  { name: "tags",  type: "list_utf8", maxContentChars: 30 },
] as const satisfies readonly ColumnSchema[];

// In your renderRow callback, type the row parameter:
const renderRow = (row: RowProxy<typeof schema>, rowIndex: RowIndex) => {
  const id    = row.get("id");    // string | null
  const count = row.get("count"); // number | null
  const tags  = row.get("tags");  // string[] | null
  const bad   = row.get("typo");  // TS error: "typo" not in schema
};
```

Without `as const`, `RowProxy` falls back to the full union (`string | number | boolean | string[] | null`) — existing untyped code continues to work unchanged.

### Architecture

```
Main thread                     DataWorker (off-thread)
──────────────────────          ──────────────────────────────────
useStabilityOrchestrator        Columnar storage
  │                               NumericColumn (f64/i32/u32/bool)
  ├─ ingest(stream)               Utf8Column (offset + bytes)
  │    └─ pump: one batch ─INGEST─▶  ListUtf8Column (3-level index)
  │         await INGEST_ACK ◀──────── commit → INGEST_ACK
  │         next batch → ...
  │
  ├─ scroll → SET_WINDOW ──────▶ packWindowBuffer()
  │                              └─ single ArrayBuffer ─WINDOW_UPDATE─▶
  │                                                   ◀─ transferred
  ├─ rAF → FRAME_ACK ──────────▶ BackpressureController
  │
  └─ VirtualChamber
       buildAccessors(buffer)   ← reads transferred ArrayBuffer, zero-copy
       buildRowProxy(accessors) ← column → scalar or string[]
       pool nodes: constant DOM count, recycled by CSS transform
```

### Binary wire format

All multi-byte values are little-endian. Every INGEST payload and every WINDOW_UPDATE payload uses this layout:

```
Header (16 bytes):
  [0]  u32  magic      = 0xac1dc0de
  [4]  u32  seq        monotonic batch sequence number
  [8]  u32  rowCount
 [12]  u32  colCount

Column Descriptors (colCount × 8 bytes):
  [+0] u32  typeTag    (0=f64, 1=i32, 2=u32, 3=bool, 4=timestamp_ms, 5=utf8, 6=list_utf8)
  [+4] u32  byteLen    byte length of this column's data block

Column Data Blocks (variable, one per column):

  f64 / timestamp_ms  rowCount × 8 bytes  (Float64Array, little-endian)
  i32                 rowCount × 4 bytes  (Int32Array)
  u32                 rowCount × 4 bytes  (Uint32Array)
  bool                rowCount × 1 byte   (Uint8Array, 0 or 1)

  utf8                (rowCount+1) × 4 bytes  Uint32 offsets (row i → bytes[offsets[i]..offsets[i+1]])
                      Σ(string lengths) bytes  Uint8 data

  list_utf8           4 bytes              u32 totalItems
                      (rowCount+1) × 4     Uint32 rowOffsets
                        row i → items[rowOffsets[i]..rowOffsets[i+1])
                      (totalItems+1) × 4   Uint32 itemOffsets
                        item j → bytes[itemOffsets[j]..itemOffsets[j+1])
                      Σ(item byte lengths)  Uint8 bytes (UTF-8)
```

`list_utf8` is a three-level nested index. The decoder in `VirtualChamber` walks:
1. `rowOffsets[localRow]..rowOffsets[localRow+1]` → item range for this row
2. `itemOffsets[j]..itemOffsets[j+1]` → byte range for item j
3. `TextDecoder.decode(bytes.subarray(...))` → string

`RowProxy.get()` returns `string[]` for `list_utf8` columns — no `JSON.parse` on the main thread.

### INGEST_ACK backpressure protocol

Without flow control, a 1M-row dataset would queue all batches in the IPC channel simultaneously (~300 MB). The INGEST_ACK loop bounds this to one batch in flight at a time:

```
Main thread pump                    DataWorker
─────────────────                   ──────────
read batch N from stream
register ackResolvers[N] = {resolve, reject}
postMessage(INGEST, [buffer], N)  →  parseBatch()
                                     commit to columnar storage
                                     emit INGEST_ACK(N)
resolve(ackResolvers[N])         ←
read batch N+1 from stream
...
```

**IPC queue depth: O(1) regardless of dataset size.**

If the worker crashes (`onerror`), all pending `ackResolvers` are rejected immediately — the pump unblocks, and `store.setStatus("error")` is set. The pump does not zombie-wait.

### Supported column types

| Schema type    | JS input value | RowProxy return type |
|----------------|----------------|----------------------|
| `f64`          | `number`       | `number`             |
| `i32`          | `number`       | `number`             |
| `u32`          | `number`       | `number`             |
| `bool`         | `boolean`      | `boolean`            |
| `timestamp_ms` | `number` (epoch ms) | `number`        |
| `utf8`         | `string`       | `string`             |
| `list_utf8`    | `string[]`     | `string[]`           |

### Parallel list columns

For structs that require both an `id` and a `label` (e.g. `{ id: string; displayName: string }`), encode as two parallel `list_utf8` columns and zip them in `renderRow`:

```tsx
// Schema
{ name: "organism_ids",   type: "list_utf8", maxContentChars: 36 },
{ name: "organism_names", type: "list_utf8", maxContentChars: 80 },

// fileToRow
organism_ids:   f.organisms.map(o => o.id),
organism_names: f.organisms.map(o => o.displayName),

// renderRow — O(k) zip, no JSON.parse, no casts needed with typed schema
const ids   = proxy.get("organism_ids");   // string[] | null
const names = proxy.get("organism_names"); // string[] | null
const orgs  = (ids ?? []).map((id, i) => ({ id, displayName: names?.[i] ?? "" }));
```

The DataWorker enforces that parallel columns maintain identical row counts after every batch commit. A count mismatch emits `INGEST_ERROR` and the pump is still ACK'd (so it does not stall), but the store transitions to the error state.

### Zero-Measurement layout

Column pixel widths are computed entirely in the worker from schema metadata — no DOM measurement ever happens:

```
computedWidth = fixedWidth ?? (maxContentChars × charWidthHint + CELL_H_PADDING × 2)
```

`CELL_H_PADDING` is 16 px. A 14 px monospace font uses `charWidthHint: 8`. Widths are resolved once at `INIT` and re-sent with every `WINDOW_UPDATE`.

### DOM-traced pitch

The worker computes a `rowHeight` from `rowHeightHint` at `INIT` time, but real rows may be taller due to padding, borders, or font metrics that differ from the hint. **Pitch** lets the main thread override the worker's row height with a DOM-measured value.

```tsx
// Measure actual row height from the DOM (e.g. from a ghost/warmup row)
const [measuredPitch, setMeasuredPitch] = useState(0);
const ghostRef = useCallback((el) => {
  if (el) setMeasuredPitch(el.getBoundingClientRect().height);
}, []);

// Push to the store — VirtualChamber and scroll handler read it automatically
useEffect(() => {
  if (measuredPitch > 0) store.setPitch(measuredPitch);
}, [measuredPitch, store]);
```

When `pitch > 0`, VirtualChamber uses it instead of `layout.rowHeight` for:
- **Spacer height**: `totalRows × pitch` (scrollbar range)
- **Pool node height**: each pool `<div>` gets `height: pitch`
- **translateY**: row positioning uses `rowIndex × pitch`
- **Scroll handler**: `SET_WINDOW` start row = `Math.floor(scrollTop / pitch)`
- **scrollToRow**: programmatic scroll uses `row × pitch`

When `pitch` is `0` (the default), all math falls back to the worker's `layout.rowHeight`. This means existing code that doesn't call `setPitch` continues to work unchanged.

---

## License

MIT
