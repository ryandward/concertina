import { forwardRef, useInsertionEffect, type ComponentPropsWithoutRef } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { injectStyles } from "../internal/inject-styles";

export const Content = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Accordion.Content>
>(function Content({ className, ...props }, ref) {
  useInsertionEffect(injectStyles, []);
  const merged = className
    ? `concertina-content ${className}`
    : "concertina-content";

  return <Accordion.Content ref={ref} className={merged} {...props} />;
});
