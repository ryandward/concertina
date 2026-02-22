import {
  forwardRef,
  useRef,
  useLayoutEffect,
  useEffect,
  useSyncExternalStore,
  useCallback,
  type ComponentPropsWithoutRef,
} from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ConcertinaStore, ConcertinaContext } from "./store";
import { pinToScrollTop } from "./pin-to-scroll-top";

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

    const switching = useSyncExternalStore(
      store.subscribe,
      store.getSwitching,
      store.getSwitching
    );

    const onValueChange = useCallback(
      (newValue: string) => store.setValue(newValue),
      [store]
    );

    // Scroll after React + Radix have committed the DOM
    useLayoutEffect(() => {
      if (!value) return;
      pinToScrollTop(store.getItemRef(value));
    }, [value, store]);

    // Clear switching flag after paint so future animations work
    useEffect(() => {
      if (switching) store.clearSwitching();
    }, [switching, store]);

    return (
      <ConcertinaContext.Provider value={store}>
        <Accordion.Root
          ref={forwardedRef}
          type="single"
          collapsible={collapsible}
          value={value}
          onValueChange={onValueChange}
          data-switching={switching || undefined}
          {...props}
        >
          {children}
        </Accordion.Root>
      </ConcertinaContext.Provider>
    );
  }
);
