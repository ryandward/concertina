/**
 * Compile-time type tests for RowProxy generic inference.
 *
 * Uses type aliases + Exact/Assert helpers — if this file compiles, all
 * assertions hold. The vitest it() blocks are structural wrappers.
 */

import { describe, it } from "vitest";
import type { RowProxy } from "../core/virtual-chamber";
import type { ColumnSchema, ColumnTypeMap } from "../core/types";

const schema = [
  { name: "id",    type: "utf8",         maxContentChars: 10 },
  { name: "count", type: "u32",          maxContentChars: 5 },
  { name: "score", type: "f64",          maxContentChars: 8 },
  { name: "flag",  type: "bool",         maxContentChars: 5 },
  { name: "ts",    type: "timestamp_ms", maxContentChars: 20 },
  { name: "tags",  type: "list_utf8",    maxContentChars: 30 },
  { name: "rank",  type: "i32",          maxContentChars: 5 },
] as const satisfies readonly ColumnSchema[];

type S = typeof schema;
type Typed = RowProxy<S>;

// Exact equality check at the type level.
type Exact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
type Assert<_T extends true> = void;

// Resolves what get(K) returns for a specific column — same expression
// as the RowProxy interface, tested independently of the generic method syntax.
type GetReturn<K extends S[number]["name"]> =
  ColumnTypeMap[Extract<S[number], { readonly name: K }>["type"]] | null;

describe("RowProxy type inference (compile-time)", () => {
  it("narrows utf8 → string | null", () => {
    type _R = Assert<Exact<GetReturn<"id">, string | null>>;
  });

  it("narrows u32 → number | null", () => {
    type _R = Assert<Exact<GetReturn<"count">, number | null>>;
  });

  it("narrows f64 → number | null", () => {
    type _R = Assert<Exact<GetReturn<"score">, number | null>>;
  });

  it("narrows bool → boolean | null", () => {
    type _R = Assert<Exact<GetReturn<"flag">, boolean | null>>;
  });

  it("narrows timestamp_ms → number | null", () => {
    type _R = Assert<Exact<GetReturn<"ts">, number | null>>;
  });

  it("narrows list_utf8 → string[] | null", () => {
    type _R = Assert<Exact<GetReturn<"tags">, string[] | null>>;
  });

  it("narrows i32 → number | null", () => {
    type _R = Assert<Exact<GetReturn<"rank">, number | null>>;
  });

  it("restricts column names to known keys", () => {
    // Parameters<Typed["get"]>[0] resolves to the K constraint
    type Keys = Parameters<Typed["get"]>[0];
    type _R = Assert<Exact<Keys, "id" | "count" | "score" | "flag" | "ts" | "tags" | "rank">>;
  });

  it("rejects unknown column names", () => {
    // @ts-expect-error — "typo" doesn't extend S[number]["name"]
    type _Bad = GetReturn<"typo">;
  });

  it("defaults to full union when schema is untyped", () => {
    type Untyped = RowProxy;
    type _KeyCheck = Assert<Exact<Parameters<Untyped["get"]>[0], string>>;
    type _RetCheck = Assert<Exact<
      ReturnType<Untyped["get"]>,
      string | number | boolean | string[] | null
    >>;
  });
});
