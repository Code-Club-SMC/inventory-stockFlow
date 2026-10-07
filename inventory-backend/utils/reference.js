import { Counter } from "../models/Counter.js";

/**
 * Next sequential reference, e.g. PO-2026-001 / SO-2026-014.
 * Pass the same `session` as the surrounding transaction, so an aborted
 * transaction does not burn a number.
 */
export async function nextReference(prefix, date, session) {
  const year = String(date).slice(0, 4);
  const counter = await Counter.findByIdAndUpdate(
    `${prefix}-${year}`,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session }
  );
  return `${prefix}-${year}-${String(counter.seq).padStart(3, "0")}`;
}