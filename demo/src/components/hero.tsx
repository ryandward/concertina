import { ChevronDown } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-28 lg:py-40">
      {/* Radial gradient background */}
      <div
        className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,var(--color-hero-from)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 text-center">
        {/* Pill badge */}
        <span className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          React Layout Stability
        </span>

        {/* Headline */}
        <h1 className="mt-6 text-5xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-6xl">
          Layout shift isn&rsquo;t a state problem. It&rsquo;s a structural
          problem.
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
          Toggle the switch below and scroll through the customer feed. Expand a
          card. Watch what happens.
        </p>

        {/* Mode toggle */}
        <div className="mt-10">
          <ModeToggle />
        </div>

        {/* Scroll indicator */}
        <div className="mt-12">
          <ChevronDown className="mx-auto size-5 animate-bounce text-muted-foreground/40" />
        </div>
      </div>
    </section>
  );
}
