import { describe, it, expect } from "vitest";
import {
  encodeRecordBatch,
  createRecordBatchStream,
} from "../core/encode-record-batch";
import {
  BATCH_MAGIC,
  TYPE_TAG,
  asBatchSeq,
  type ColumnSchema,
} from "../core/types";

// ─── Wire-format helpers ───────────────────────────────────────────────────────

function header(buf: ArrayBuffer) {
  const v = new DataView(buf);
  return {
    magic:    v.getUint32(0, true),
    seq:      v.getUint32(4, true),
    rowCount: v.getUint32(8, true),
    colCount: v.getUint32(12, true),
  };
}

function descriptor(buf: ArrayBuffer, colIndex: number) {
  const v      = new DataView(buf);
  const offset = 16 + colIndex * 8;
  return {
    typeTag: v.getUint32(offset,     true),
    byteLen: v.getUint32(offset + 4, true),
  };
}

/** Byte offset of column data block i (after the header + all descriptors). */
function dataOffset(buf: ArrayBuffer, colIndex: number): number {
  const v        = new DataView(buf);
  const colCount = v.getUint32(12, true);
  let   offset   = 16 + colCount * 8; // skip header + all descriptors
  for (let i = 0; i < colIndex; i++) {
    offset += v.getUint32(16 + i * 8 + 4, true);
  }
  return offset;
}

function colData(buf: ArrayBuffer, colIndex: number): Uint8Array {
  const v       = new DataView(buf);
  const off     = dataOffset(buf, colIndex);
  const byteLen = v.getUint32(16 + colIndex * 8 + 4, true);
  return new Uint8Array(buf, off, byteLen);
}

function decodeListUtf8(data: Uint8Array, rowCount: number): string[][] {
  const v          = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const totalItems = v.getUint32(0, true);

  const rowOffsets = Array.from({ length: rowCount + 1 }, (_, i) =>
    v.getUint32(4 + i * 4, true),
  );

  const itemOffsetsStart = 4 + (rowCount + 1) * 4;
  const itemOffsets = Array.from({ length: totalItems + 1 }, (_, j) =>
    v.getUint32(itemOffsetsStart + j * 4, true),
  );

  const bytesStart = itemOffsetsStart + (totalItems + 1) * 4;
  const decoder    = new TextDecoder();
  const rows: string[][] = [];

  for (let r = 0; r < rowCount; r++) {
    const start = rowOffsets[r]!;
    const end   = rowOffsets[r + 1]!;
    const row: string[] = [];
    for (let j = start; j < end; j++) {
      row.push(
        decoder.decode(
          data.slice(bytesStart + itemOffsets[j]!, bytesStart + itemOffsets[j + 1]!),
        ),
      );
    }
    rows.push(row);
  }

  return rows;
}

// ─── encodeRecordBatch ────────────────────────────────────────────────────────

describe("encodeRecordBatch — header", () => {
  it("writes correct magic, seq, rowCount, colCount", () => {
    const schema: ColumnSchema[] = [{ name: "x", type: "f64", maxContentChars: 8 }];
    const rows = [{ x: 1 }, { x: 2 }];
    const buf  = encodeRecordBatch(schema, rows, asBatchSeq(7));
    const h    = header(buf);

    expect(h.magic).toBe(BATCH_MAGIC);
    expect(h.seq).toBe(7);
    expect(h.rowCount).toBe(2);
    expect(h.colCount).toBe(1);
  });

  it("defaults seq to 0 when not provided", () => {
    const schema: ColumnSchema[] = [{ name: "v", type: "i32", maxContentChars: 4 }];
    const buf = encodeRecordBatch(schema, [{ v: 1 }]);
    expect(header(buf).seq).toBe(0);
  });
});

describe("encodeRecordBatch — f64 column", () => {
  it("encodes values as Float64Array", () => {
    const schema: ColumnSchema[] = [{ name: "n", type: "f64", maxContentChars: 8 }];
    const buf  = encodeRecordBatch(schema, [{ n: 1.5 }, { n: -2.25 }, { n: 0 }]);
    const desc = descriptor(buf, 0);

    expect(desc.typeTag).toBe(TYPE_TAG.f64);
    expect(desc.byteLen).toBe(3 * 8); // 3 rows × 8 bytes

    const data = colData(buf, 0);
    const f64  = new Float64Array(data.buffer, data.byteOffset, 3);
    expect(f64[0]).toBeCloseTo(1.5);
    expect(f64[1]).toBeCloseTo(-2.25);
    expect(f64[2]).toBe(0);
  });

  it("falls back to 0 for null/undefined", () => {
    const schema: ColumnSchema[] = [{ name: "n", type: "f64", maxContentChars: 4 }];
    const buf  = encodeRecordBatch(schema, [{ n: null }, { n: undefined }]);
    const data = colData(buf, 0);
    const f64  = new Float64Array(data.buffer, data.byteOffset, 2);
    expect(f64[0]).toBe(0);
    expect(f64[1]).toBe(0);
  });
});

describe("encodeRecordBatch — i32 column", () => {
  it("encodes values as Int32Array, truncates fractional", () => {
    const schema: ColumnSchema[] = [{ name: "n", type: "i32", maxContentChars: 4 }];
    const buf  = encodeRecordBatch(schema, [{ n: 42 }, { n: -7 }, { n: 3.9 }]);
    const desc = descriptor(buf, 0);

    expect(desc.typeTag).toBe(TYPE_TAG.i32);
    expect(desc.byteLen).toBe(3 * 4);

    const data = colData(buf, 0);
    const i32  = new Int32Array(data.buffer, data.byteOffset, 3);
    expect(i32[0]).toBe(42);
    expect(i32[1]).toBe(-7);
    expect(i32[2]).toBe(3); // truncated
  });
});

describe("encodeRecordBatch — u32 column", () => {
  it("encodes values as Uint32Array", () => {
    const schema: ColumnSchema[] = [{ name: "n", type: "u32", maxContentChars: 4 }];
    const buf  = encodeRecordBatch(schema, [{ n: 0 }, { n: 4294967295 }]);
    const desc = descriptor(buf, 0);

    expect(desc.typeTag).toBe(TYPE_TAG.u32);
    expect(desc.byteLen).toBe(2 * 4);

    const data = colData(buf, 0);
    const u32  = new Uint32Array(data.buffer, data.byteOffset, 2);
    expect(u32[0]).toBe(0);
    expect(u32[1]).toBe(4294967295);
  });
});

describe("encodeRecordBatch — bool column", () => {
  it("encodes truthy/falsy as 1/0", () => {
    const schema: ColumnSchema[] = [{ name: "b", type: "bool", maxContentChars: 1 }];
    const buf  = encodeRecordBatch(schema, [{ b: true }, { b: false }, { b: 0 }, { b: "yes" }]);
    const desc = descriptor(buf, 0);

    expect(desc.typeTag).toBe(TYPE_TAG.bool);
    expect(desc.byteLen).toBe(4);

    const data = colData(buf, 0);
    expect(data[0]).toBe(1);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
    expect(data[3]).toBe(1);
  });
});

describe("encodeRecordBatch — timestamp_ms column", () => {
  it("uses the same Float64Array encoding as f64", () => {
    const schema: ColumnSchema[] = [{ name: "ts", type: "timestamp_ms", maxContentChars: 13 }];
    const ts   = 1700000000000;
    const buf  = encodeRecordBatch(schema, [{ ts }]);
    const desc = descriptor(buf, 0);

    expect(desc.typeTag).toBe(TYPE_TAG.timestamp_ms);

    const data = colData(buf, 0);
    const f64  = new Float64Array(data.buffer, data.byteOffset, 1);
    expect(f64[0]).toBe(ts);
  });
});

describe("encodeRecordBatch — utf8 column", () => {
  it("writes offset table then UTF-8 bytes", () => {
    const schema: ColumnSchema[] = [{ name: "s", type: "utf8", maxContentChars: 16 }];
    const buf  = encodeRecordBatch(schema, [{ s: "hello" }, { s: "world!" }]);
    const desc = descriptor(buf, 0);

    expect(desc.typeTag).toBe(TYPE_TAG.utf8);

    // offsets: (2+1)*4 = 12 bytes  |  bytes: 5+6 = 11
    expect(desc.byteLen).toBe((2 + 1) * 4 + 5 + 6);

    const data     = colData(buf, 0);
    const offsets  = new Uint32Array(data.buffer, data.byteOffset, 3);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(5);  // "hello"
    expect(offsets[2]).toBe(11); // "world!"

    const bytes   = data.slice(3 * 4);
    const decoder = new TextDecoder();
    expect(decoder.decode(bytes.slice(offsets[0]!, offsets[1]!))).toBe("hello");
    expect(decoder.decode(bytes.slice(offsets[1]!, offsets[2]!))).toBe("world!");
  });

  it("null/undefined encodes as empty string", () => {
    const schema: ColumnSchema[] = [{ name: "s", type: "utf8", maxContentChars: 8 }];
    const buf     = encodeRecordBatch(schema, [{ s: null }, { s: undefined }]);
    const data    = colData(buf, 0);
    const offsets = new Uint32Array(data.buffer, data.byteOffset, 3);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(0);
    expect(offsets[2]).toBe(0);
  });
});

describe("encodeRecordBatch — list_utf8 column", () => {
  it("encodes nested string arrays with three-level index", () => {
    const schema: ColumnSchema[] = [{ name: "tags", type: "list_utf8", maxContentChars: 40 }];
    const rows = [
      { tags: ["alpha", "beta"] },
      { tags: ["gamma"] },
      { tags: [] },
    ];
    const buf  = encodeRecordBatch(schema, rows);
    const desc = descriptor(buf, 0);

    expect(desc.typeTag).toBe(TYPE_TAG.list_utf8);

    // totalItems = 3, totalBytes = 5+4+5 = 14
    // byteLen = 4 (header) + (3+1)*4 (rowOffsets) + (3+1)*4 (itemOffsets) + 14 (bytes)
    //         = 4 + 16 + 16 + 14 = 50
    expect(desc.byteLen).toBe(4 + (3 + 1) * 4 + (3 + 1) * 4 + 14);

    const data   = colData(buf, 0);
    const decoded = decodeListUtf8(data, 3);

    expect(decoded[0]).toEqual(["alpha", "beta"]);
    expect(decoded[1]).toEqual(["gamma"]);
    expect(decoded[2]).toEqual([]);
  });

  it("handles all-empty rows without error", () => {
    const schema: ColumnSchema[] = [{ name: "t", type: "list_utf8", maxContentChars: 20 }];
    const buf    = encodeRecordBatch(schema, [{ t: [] }, { t: [] }]);
    const data   = colData(buf, 0);
    const decoded = decodeListUtf8(data, 2);
    expect(decoded).toEqual([[], []]);
  });

  it("handles non-array values by treating them as empty", () => {
    const schema: ColumnSchema[] = [{ name: "t", type: "list_utf8", maxContentChars: 10 }];
    const buf    = encodeRecordBatch(schema, [{ t: null }, { t: undefined }, { t: "oops" }]);
    const data   = colData(buf, 0);
    const decoded = decodeListUtf8(data, 3);
    expect(decoded).toEqual([[], [], []]);
  });

  it("encodes parallel columns with identical row counts (organisms pattern)", () => {
    const schema: ColumnSchema[] = [
      { name: "organism_ids",   type: "list_utf8", maxContentChars: 36 },
      { name: "organism_names", type: "list_utf8", maxContentChars: 80 },
    ];
    const rows = [
      { organism_ids: ["id-1", "id-2"], organism_names: ["E. coli", "S. aureus"] },
      { organism_ids: ["id-3"],         organism_names: ["B. subtilis"] },
    ];
    const buf = encodeRecordBatch(schema, rows);
    expect(header(buf).colCount).toBe(2);

    const ids   = decodeListUtf8(colData(buf, 0), 2);
    const names = decodeListUtf8(colData(buf, 1), 2);

    expect(ids[0]).toEqual(["id-1", "id-2"]);
    expect(ids[1]).toEqual(["id-3"]);
    expect(names[0]).toEqual(["E. coli", "S. aureus"]);
    expect(names[1]).toEqual(["B. subtilis"]);

    // Verify parallel structure: same item count per row
    expect(ids[0]!.length).toBe(names[0]!.length);
    expect(ids[1]!.length).toBe(names[1]!.length);
  });

  it("handles unicode strings correctly", () => {
    const schema: ColumnSchema[] = [{ name: "u", type: "list_utf8", maxContentChars: 30 }];
    const rows = [{ u: ["日本語", "中文", "한국어"] }];
    const buf  = encodeRecordBatch(schema, rows);
    const data  = colData(buf, 0);
    const decoded = decodeListUtf8(data, 1);
    expect(decoded[0]).toEqual(["日本語", "中文", "한국어"]);
  });
});

describe("encodeRecordBatch — multi-column batch", () => {
  it("packs mixed column types in schema order", () => {
    const schema: ColumnSchema[] = [
      { name: "id",   type: "utf8",      maxContentChars: 8 },
      { name: "val",  type: "f64",       maxContentChars: 6 },
      { name: "tags", type: "list_utf8", maxContentChars: 20 },
    ];
    const rows = [
      { id: "row-0", val: 3.14, tags: ["a", "b"] },
      { id: "row-1", val: 2.71, tags: ["c"] },
    ];

    const buf  = encodeRecordBatch(schema, rows, asBatchSeq(42));
    const h    = header(buf);

    expect(h.magic).toBe(BATCH_MAGIC);
    expect(h.seq).toBe(42);
    expect(h.rowCount).toBe(2);
    expect(h.colCount).toBe(3);

    expect(descriptor(buf, 0).typeTag).toBe(TYPE_TAG.utf8);
    expect(descriptor(buf, 1).typeTag).toBe(TYPE_TAG.f64);
    expect(descriptor(buf, 2).typeTag).toBe(TYPE_TAG.list_utf8);

    // Spot-check data correctness — copy to aligned buffer before typed-array view
    const f64raw = colData(buf, 1);
    const f64copy = f64raw.buffer.slice(f64raw.byteOffset, f64raw.byteOffset + f64raw.byteLength);
    const f64col = new Float64Array(f64copy);
    expect(f64col[0]).toBeCloseTo(3.14);

    const decoded = decodeListUtf8(colData(buf, 2), 2);
    expect(decoded[0]).toEqual(["a", "b"]);
  });
});

describe("encodeRecordBatch — empty batch", () => {
  it("handles zero rows without error", () => {
    const schema: ColumnSchema[] = [
      { name: "x", type: "f64",      maxContentChars: 4 },
      { name: "y", type: "list_utf8", maxContentChars: 10 },
    ];
    const buf = encodeRecordBatch(schema, []);
    const h   = header(buf);

    expect(h.rowCount).toBe(0);
    expect(h.colCount).toBe(2);
    expect(descriptor(buf, 0).byteLen).toBe(0); // 0 rows × 8 bytes
  });
});

// ─── createRecordBatchStream ──────────────────────────────────────────────────

describe("createRecordBatchStream", () => {
  const schema: ColumnSchema[] = [{ name: "n", type: "i32", maxContentChars: 4 }];

  it("yields one ArrayBuffer per batch with monotonic seq numbers", async () => {
    async function* gen() {
      yield [{ n: 1 }, { n: 2 }];
      yield [{ n: 3 }];
    }

    const stream  = createRecordBatchStream(schema, gen());
    const reader  = stream.getReader();
    const chunks: ArrayBuffer[] = [];

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    expect(chunks).toHaveLength(2);
    expect(header(chunks[0]!).seq).toBe(0);
    expect(header(chunks[0]!).rowCount).toBe(2);
    expect(header(chunks[1]!).seq).toBe(1);
    expect(header(chunks[1]!).rowCount).toBe(1);
  });

  it("closes the stream when the generator is exhausted", async () => {
    async function* gen() {
      yield [{ n: 42 }];
    }

    const stream = createRecordBatchStream(schema, gen());
    const reader = stream.getReader();

    const r1 = await reader.read();
    expect(r1.done).toBe(false);

    const r2 = await reader.read();
    expect(r2.done).toBe(true);
  });

  it("forwards generator errors to the stream", async () => {
    async function* gen(): AsyncGenerator<{ n: number }[]> {
      throw new Error("boom");
      yield [];
    }

    const stream = createRecordBatchStream(schema, gen());
    const reader = stream.getReader();

    await expect(reader.read()).rejects.toThrow("boom");
  });
});
