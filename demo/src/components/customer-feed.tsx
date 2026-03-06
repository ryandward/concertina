import { useState } from "react";
import { Gigbag } from "concertina";
import { useConcertinaMode } from "@/context/concertina-mode";
import { customers } from "@/data/customers";
import { CustomerCard } from "@/components/customer-card";

export function CustomerFeed() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { enabled } = useConcertinaMode();

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const cardList = customers.map((customer) => (
    <CustomerCard
      key={customer.id}
      customer={customer}
      expanded={expandedId === customer.id}
      onToggleExpand={() => handleToggle(customer.id)}
    />
  ));

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Customer Directory
          </h2>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
            {customers.length} accounts
          </span>
        </div>

        {/* Card list */}
        {enabled ? (
          <Gigbag axis="height">
            <div className="space-y-3 mt-8">{cardList}</div>
          </Gigbag>
        ) : (
          <div className="space-y-3 mt-8">{cardList}</div>
        )}
      </div>
    </section>
  );
}
