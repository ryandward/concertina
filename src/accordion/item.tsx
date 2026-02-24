import {
  forwardRef,
  useContext,
  useMemo,
  type ComponentPropsWithoutRef,
} from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ConcertinaContext } from "./store";
import { mergeRefs } from "../internal/merge-refs";

export const Item = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Accordion.Item>
>(function Item({ value, ...props }, forwardedRef) {
  const store = useContext(ConcertinaContext);

  const mergedRef = useMemo(
    () => mergeRefs(forwardedRef, (el) => store?.setItemRef(value, el)),
    [forwardedRef, store, value]
  );

  return <Accordion.Item ref={mergedRef} value={value} {...props} />;
});
