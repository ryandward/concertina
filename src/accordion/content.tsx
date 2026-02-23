import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as Accordion from "@radix-ui/react-accordion";

export const Content = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Accordion.Content>
>(function Content({ className, ...props }, ref) {
  const merged = className
    ? `concertina-content ${className}`
    : "concertina-content";

  return <Accordion.Content ref={ref} className={merged} {...props} />;
});
