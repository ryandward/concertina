import { useState, useEffect } from "react";
import { Bellows, Slot, Overture, Hum, Frame } from "concertina";
import { cn } from "@/lib/utils";
import type { Customer } from "@/data/customers";

interface CustomerProfileProps {
  customer: Customer;
  mode: "naive" | "stable";
}

export function CustomerProfile({ customer, mode }: CustomerProfileProps) {
  if (mode === "naive") {
    return <NaiveProfile customer={customer} />;
  }
  return <StableProfile customer={customer} />;
}

/* -------------------------------------------------------------------------- */
/*  mode="naive" — intentionally janky                                        */
/* -------------------------------------------------------------------------- */

function NaiveProfile({ customer }: { customer: Customer }) {
  const [loading, setLoading] = useState(true);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "invoices">("profile");

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // Avatar loads 400ms AFTER the "data" loads — text appears, then avatar pops in
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      setAvatarSrc(customer.avatar);
    }, 400);
    return () => clearTimeout(t);
  }, [loading, customer.avatar]);

  if (loading) {
    return (
      <div className="p-5 pt-4 flex items-center justify-center">
        <svg
          className="animate-spin size-8 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="p-5 pt-4">
      {/* Top section */}
      <div className="flex gap-5">
        {/* Avatar — no width/height, no container sizing. Pops in and pushes text. */}
        {avatarSrc && (
          <img
            src={avatarSrc}
            alt={customer.name}
            className="rounded-full"
          />
        )}
        <div className="min-w-0">
          <p className="text-xl font-semibold">{customer.name}</p>
          <p className="text-sm text-muted-foreground">{customer.title}</p>
          <p className="text-sm text-muted-foreground">{customer.company}</p>
          <p className="text-sm text-brand">{customer.email}</p>
        </div>
      </div>

      {/* Tabs — unmount/remount on switch */}
      <div className="mt-5">
        <div className="flex gap-4 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={cn(
              "pb-2 text-sm font-medium transition-colors",
              activeTab === "profile"
                ? "border-b-2 border-brand text-brand"
                : "text-muted-foreground hover:text-card-foreground",
            )}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={cn(
              "pb-2 text-sm font-medium transition-colors",
              activeTab === "invoices"
                ? "border-b-2 border-brand text-brand"
                : "text-muted-foreground hover:text-card-foreground",
            )}
          >
            Invoices
          </button>
        </div>

        <div className="mt-4">
          {activeTab === "profile" ? (
            <ProfileContent customer={customer} />
          ) : (
            <InvoiceContent customer={customer} />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  mode="stable" — concertina magic                                          */
/* -------------------------------------------------------------------------- */

function StableProfile({ customer }: { customer: Customer }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "invoices">("profile");

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <Overture loading={loading} exitDuration={150}>
      <div className="p-5 pt-4">
        {/* Top section */}
        <div className="flex gap-5">
          <Frame
            aspectRatio={1}
            className="size-24 rounded-full overflow-hidden flex-shrink-0"
          >
            <img
              src={customer.avatar}
              alt={customer.name}
              className="size-full object-cover rounded-full"
            />
          </Frame>
          <div className="min-w-0">
            <p className="text-xl font-semibold">
              <Hum>{customer.name}</Hum>
            </p>
            <p className="text-sm text-muted-foreground">
              <Hum>{customer.title}</Hum>
            </p>
            <p className="text-sm text-muted-foreground">
              <Hum>{customer.company}</Hum>
            </p>
            <p className="text-sm text-brand">
              <Hum>{customer.email}</Hum>
            </p>
          </div>
        </div>

        {/* Tabs — both stay mounted via Bellows/Slot */}
        <div className="mt-5">
          <div className="flex gap-4 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={cn(
                "pb-2 text-sm font-medium transition-colors",
                activeTab === "profile"
                  ? "border-b-2 border-brand text-brand"
                  : "text-muted-foreground hover:text-card-foreground",
              )}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={cn(
                "pb-2 text-sm font-medium transition-colors",
                activeTab === "invoices"
                  ? "border-b-2 border-brand text-brand"
                  : "text-muted-foreground hover:text-card-foreground",
              )}
            >
              Invoices
            </button>
          </div>

          <div className="mt-4">
            <Bellows activeNote={activeTab}>
              <Slot note="profile">
                <ProfileContent customer={customer} />
              </Slot>
              <Slot note="invoices">
                <InvoiceContent customer={customer} />
              </Slot>
            </Bellows>
          </div>
        </div>
      </div>
    </Overture>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared tab content                                                         */
/* -------------------------------------------------------------------------- */

function ProfileContent({ customer }: { customer: Customer }) {
  const statusColors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    churned: "bg-red-50 text-red-700",
    trial: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
      <div>
        <p className="text-muted-foreground">Status</p>
        <p className="mt-0.5">
          <span
            className={cn(
              "text-[11px] font-medium uppercase tracking-wider rounded-full px-2.5 py-0.5",
              statusColors[customer.status],
            )}
          >
            {customer.status}
          </span>
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">MRR</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums">
          ${customer.mrr.toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Join Date</p>
        <p className="mt-0.5 font-medium">{customer.joinDate}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Email</p>
        <p className="mt-0.5 font-medium truncate">{customer.email}</p>
      </div>
    </div>
  );
}

function InvoiceContent({ customer }: { customer: Customer }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th className="pb-2 text-left font-medium">Date</th>
          <th className="pb-2 text-left font-medium">Description</th>
          <th className="pb-2 text-right font-medium">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {customer.invoices.map((inv) => (
          <tr key={inv.id}>
            <td className="py-2 tabular-nums">{inv.date}</td>
            <td className="py-2">{inv.description}</td>
            <td className="py-2 text-right tabular-nums">
              ${inv.amount.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
