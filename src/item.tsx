import {
  forwardRef,
  useContext,
  useCallback,
  type ComponentPropsWithoutRef,
} from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ConcertinaContext } from "./store";

export const Item = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Accordion.Item>
>(function Item({ value, ...props }, forwardedRef) {
  const store = useContext(ConcertinaContext);

  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      // Forward ref
      if (typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (forwardedRef) {
        forwardedRef.current = el;
      }
      // Register with store for scroll pinning
      store?.setItemRef(value, el);
    },
    [forwardedRef, store, value]
  );

  return <Accordion.Item ref={mergedRef} value={value} {...props} />;
});
