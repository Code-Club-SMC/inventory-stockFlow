import InventoryItem from "../models/InventoryItem.js";
import Transaction from "../models/Transaction.js";
import { nextReference } from "./reference.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Stock below this is treated as empty (2-decimal quantities, float dust).
const MIN_STOCK = 0.01;

// "Zamzam" and "zamzam" are the same category.
const CASE_INSENSITIVE = { locale: "en", strength: 2 };

/** Thrown inside a database transaction to abort it with a readable message. */
export class StockError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = "StockError";
    this.status = status;
  }
}

/**
 * Take `quantity` of `category` from the oldest batches first, only from
 * batches dated on or before `date`. Must run inside a transaction.
 * Returns { ok: true, category, allocations: [{ batch, quantity }] }
 *      or { ok: false, available }.
 */
async function takeStock({ category, quantity, date, session }) {
  const batches = await InventoryItem.find({
    category,
    date: { $lte: date },
    currentStock: { $gte: MIN_STOCK },
  })
    .sort({ date: 1, createdAt: 1 })
    .collation(CASE_INSENSITIVE)
    .session(session);

  const available = round2(batches.reduce((sum, b) => sum + b.currentStock, 0));
  if (available < quantity) return { ok: false, available };

  const allocations = [];
  let left = quantity;

  for (const batch of batches) {
    if (left <= 0) break;
    const take = round2(Math.min(batch.currentStock, left));

    // Only succeeds if the batch still has that much (guards against overselling).
    const result = await InventoryItem.updateOne(
      { _id: batch._id, currentStock: { $gte: take } },
      { $inc: { currentStock: -take } },
      { session }
    );
    if (result.modifiedCount !== 1) {
      throw new StockError("Stock changed while saving. Please try again.");
    }

    allocations.push({ batch: batch._id, quantity: take });
    left = round2(left - take);
  }

  if (left > 0) return { ok: false, available };
  return { ok: true, category: batches[0].category, allocations };
}

/**
 * Reduce stock for every item of an invoice and write one "Stock Out"
 * ledger row per item. Throws StockError if any item lacks stock.
 */
export async function applyInvoiceStock(invoice, session) {
  for (const item of invoice.items) {
    const result = await takeStock({
      category: item.product,
      quantity: item.quantity,
      date: invoice.date,
      session,
    });

    if (!result.ok) {
      throw new StockError(
        `Not enough stock for ${item.product}. Available: ${result.available}.`
      );
    }

    const reference = await nextReference("SO", invoice.date, session);

    await Transaction.create(
      [
        {
          date: invoice.date,
          category: result.category, // stored spelling, keeps remaining stock in one group
          type: "Stock Out",
          quantity: item.quantity,
          price: item.unitPrice, // per unit, same meaning as stock-in
          description: `Invoice ${invoice.invoiceNumber}`,
          reference,
          source: "invoice",
          invoice: invoice._id,
          allocations: result.allocations,
        },
      ],
      { session }
    );
  }
}

/**
 * Give an invoice's stock back to the exact batches it came from and
 * remove its "Stock Out" rows.
 */
export async function releaseInvoiceStock(invoiceId, session) {
  const rows = await Transaction.find({ invoice: invoiceId, type: "Stock Out" }).session(
    session
  );

  for (const row of rows) {
    for (const a of row.allocations) {
      await InventoryItem.updateOne(
        { _id: a.batch },
        { $inc: { currentStock: a.quantity } },
        { session }
      );
    }
  }

  await Transaction.deleteMany({ invoice: invoiceId }, { session });
}