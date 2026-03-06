import { faker } from "@faker-js/faker";

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  avatar: string;
  status: "active" | "churned" | "trial";
  mrr: number;
  joinDate: string;
  invoices: Invoice[];
}

// Seed for deterministic data across hot-reloads.
faker.seed(42);

const invoiceDescriptions = [
  "Monthly subscription",
  "Annual plan renewal",
  "Seat upgrade",
  "Enterprise add-on",
  "Platform fee",
  "Overage charge",
  "Professional services",
  "Onboarding fee",
];

function makeInvoices(): Invoice[] {
  const count = faker.number.int({ min: 3, max: 4 });
  return Array.from({ length: count }, () => ({
    id: `INV-${faker.string.nanoid(8)}`,
    date: faker.date
      .between({ from: "2024-01-01", to: "2025-12-31" })
      .toISOString()
      .slice(0, 10),
    amount: faker.number.int({ min: 500, max: 15000 }),
    description: faker.helpers.arrayElement(invoiceDescriptions),
  }));
}

function makeCustomer(): Customer {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id: faker.string.nanoid(10),
    name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    company: faker.company.name(),
    title: faker.person.jobTitle(),
    avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${firstName}${lastName}`,
    status: faker.helpers.arrayElement(["active", "churned", "trial"]),
    mrr: faker.number.int({ min: 0, max: 25000 }),
    joinDate: faker.date
      .between({ from: "2022-01-01", to: "2025-11-30" })
      .toISOString()
      .slice(0, 10),
    invoices: makeInvoices(),
  };
}

export const customers: Customer[] = Array.from(
  { length: 20 },
  makeCustomer,
);
