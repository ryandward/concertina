import {
  forwardRef,
  useRef,
  useSyncExternalStore,
  useCallback,
  type ComponentPropsWithoutRef,
} from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ConcertinaStore, ConcertinaContext } from "./store";
import { useScrollPin } from "../primitives/use-scroll-pin";
import { useTransitionLock } from "../primitives/use-transition-lock";

type AccordionSingleProps = ComponentPropsWithoutRef<typeof Accordion.Root> & {
  type?: "single";
  collapsible?: boolean;
};

export const Root = forwardRef<HTMLDivElement, Omit<AccordionSingleProps, "type">>(
  function Root({ collapsible = true, children, ...props }, forwardedRef) {
    const storeRef = useRef<ConcertinaStore | null>(null);
    if (!storeRef.current) {
      storeRef.current = new ConcertinaStore();
    }
    const store = storeRef.current;

    const value = useSyncExternalStore(
      store.subscribe,
      store.getValue,
      store.getValue
    );

    const { locked, lock } = useTransitionLock();

    const onValueChange = useCallback(
      (newValue: string) => {
        const isSwitching = !!store.getValue() && store.getValue() !== newValue && !!newValue;
        if (isSwitching) lock();
        store.setValue(newValue);
      },
      [store, lock]
    );

    // Scroll after React + Radix have committed the DOM
    useScrollPin(
      () => (value ? store.getItemRef(value) : null),
      [value, store]
    );

    return (
      <ConcertinaContext.Provider value={store}>
        <Accordion.Root
          ref={forwardedRef}
          type="single"
          collapsible={collapsible}
          value={value}
          onValueChange={onValueChange}
          data-switching={locked || undefined}
          {...props}
        >
          {children}
        </Accordion.Root>
      </ConcertinaContext.Provider>
    );
  }
);
