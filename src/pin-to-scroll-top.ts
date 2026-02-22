/**
 * Scroll `el` to the top of its nearest scrollable ancestor,
 * clearing any sticky headers. Only adjusts one container's
 * scrollTop. Never cascades to the viewport, which matters on
 * mobile where scrollIntoView pulls the whole page.
 */
export function pinToScrollTop(el: HTMLElement | null): void {
  if (!el) return;
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") {
      const box = parent.getBoundingClientRect();
      const target = el.getBoundingClientRect();
      // Check children + grandchildren for sticky headers and offset past them.
      // Uses element height (not position) so the offset is correct regardless
      // of current scroll state.
      let stickyOffset = 0;
      const measure = (node: Element) => {
        const s = getComputedStyle(node);
        if (s.position === "sticky") {
          stickyOffset = Math.max(
            stickyOffset,
            (parseFloat(s.top) || 0) + node.getBoundingClientRect().height
          );
        }
      };
      for (const child of parent.children) {
        measure(child);
        for (const gc of child.children) measure(gc);
      }
      parent.scrollTop += target.top - box.top - stickyOffset;
      return;
    }
    parent = parent.parentElement;
  }
}
