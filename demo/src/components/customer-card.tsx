import { ChevronDown } from "lucide-react";
import { Glide } from "concertina";
import { useConcertinaMode } from "@/context/concertina-mode";
import { cn } from "@/lib/utils";
import { CustomerProfile } from "@/components/customer-profile";
import type { Customer } from "@/data/customers";

interface CustomerCardProps {
  customer: Customer;
  expanded: boolean;
  onToggleExpand: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  churned: "bg-red-50 text-red-700",
  trial: "bg-amber-50 text-amber-700",
};

export function CustomerCard({
  customer,
  expanded,
  onToggleExpand,
}: CustomerCardProps) {
  const { enabled } = useConcertinaMode();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Collapsed header — always visible */}
      <div className="flex items-center gap-4 p-5">
        <img
          src={customer.avatar}
          alt={customer.name}
          width={48}
          height={48}
          onClick={onToggleExpand}
          className="size-12 rounded-full bg-muted flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-brand/30 transition-shadow"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-card-foreground truncate">
            {customer.name}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {customer.title} at {customer.company}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0 flex-wrap justify-end">
          <span
            className={cn(
              "text-[11px] font-medium uppercase tracking-wider rounded-full px-2.5 py-0.5 hidden sm:inline-flex",
              statusColors[customer.status],
            )}
          >
            {customer.status}
          </span>
          <span className="text-sm font-medium tabular-nums text-card-foreground hidden sm:inline">
            ${customer.mrr.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-full p-1.5 text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={cn(
                "size-5 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {/* Expanded area */}
      {enabled ? (
        <Glide show={expanded}>
          <div className="border-t border-border">
            <CustomerProfile customer={customer} mode="stable" />
          </div>
        </Glide>
      ) : (
        expanded && (
          <div className="border-t border-border">
            <CustomerProfile customer={customer} mode="naive" />
          </div>
        )
      )}
    </div>
  );
}
