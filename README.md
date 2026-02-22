<p align="center">
  <img src="https://raw.githubusercontent.com/ryandward/concertina/main/concertina.svg" width="140" alt="concertina" />
</p>

<h1 align="center">concertina</h1>

<p align="center">
  Scroll-pinned <a href="https://www.radix-ui.com/primitives/docs/components/accordion">Radix Accordion</a> panels. One hook, zero dependencies.
</p>

## Quick start

```bash
npm install concertina
```

```tsx
import { useConcertina } from "concertina";
import "concertina/styles.css";
```

Add it to your existing accordion:

```tsx
function MyAccordion({ items }) {
  const { rootProps, getItemRef } = useConcertina();

  return (
    <Accordion.Root type="single" collapsible {...rootProps}>
      {items.map((item) => (
        <Accordion.Item key={item.id} value={item.id} ref={getItemRef(item.id)}>
          <Accordion.Header>
            <Accordion.Trigger>{item.title}</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="concertina-content">
            {item.body}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
```

When you switch between items, the new one pins to the top of the scroll container. Animations are suppressed during the switch and restored after.

## Why

Radix Accordion in a scrollable container jumps around when switching items. `scrollIntoView` fixes desktop but yanks the viewport on mobile. `flushSync` with inline styles fights Radix re-renders. Layout measurement races against animations. Fixing one breaks another.

This hook coordinates all of it: animation suppression via a `data-switching` attribute, scroll adjustment via `scrollTop` (not `scrollIntoView`), and automatic cleanup after paint.

## API

### `useConcertina()`

| Property | Type | What it does |
|---|---|---|
| `rootProps` | `object` | Pass to `Accordion.Root` via `{...rootProps}`. Contains `value`, `onValueChange`, `data-switching`. |
| `getItemRef` | `(id: string) => RefCallback` | Pass to `ref` on each `Accordion.Item` |
| `value` | `string` | Currently expanded item (empty string when collapsed) |
| `onValueChange` | `(value: string) => void` | Change handler, available if you need it directly |
| `switching` | `boolean` | True during a switch between items |

### `pinToScrollTop(el)`

Also exported standalone. Scrolls `el` to the top of its nearest scrollable ancestor without touching the viewport.

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
