import { Hero } from "@/components/hero";
import { CustomerFeed } from "@/components/customer-feed";

export function App() {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <CustomerFeed />
      <footer className="border-t border-border bg-muted/50 py-12 text-center text-sm text-muted-foreground">
        Built with{" "}
        <a
          href="https://github.com/ryandward/concertina"
          className="font-medium text-brand hover:text-brand-hover transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          concertina
        </a>{" "}
        — the React toolkit for layout stability.
      </footer>
    </div>
  );
}
