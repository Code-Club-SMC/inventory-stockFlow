import InventoryItem from "../models/InventoryItem.js";
import Transaction from "../models/Transaction.js";
import { Invoice } from "../models/Invoice.js";

export const round2 = (n) => Math.round(((n ?? 0) + Number.EPSILON) * 100) / 100;

/** Current stock per category: [{ category, currentStock, unit }]. */
export async function getStockByCategory() {
  const rows = await InventoryItem.aggregate([
    {
      $group: {
        _id: "$category",
        currentStock: { $sum: "$currentStock" },
        unit: { $first: "$unit" },
      },
    },
    { $project: { _id: 0, category: "$_id", currentStock: 1, unit: 1 } },
    { $sort: { category: 1 } },
  ]);
  return rows.map((r) => ({ ...r, currentStock: round2(r.currentStock) }));
}

/** Stock In / Stock Out totals, optionally limited by a transaction filter. */
export async function getMovementTotals(match = {}) {
  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: "$type", quantity: { $sum: "$quantity" }, count: { $sum: 1 } } },
  ]);
  const pick = (type) => {
    const r = rows.find((x) => x._id === type);
    return { quantity: round2(r?.quantity), count: r?.count ?? 0 };
  };
  return { stockIn: pick("Stock In"), stockOut: pick("Stock Out") };
}

/** Billed revenue, unpaid balance and invoice count for a filter on invoices. */
export async function getInvoiceTotals(match = {}) {
  const [row] = await Invoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$total" },
        outstanding: { $sum: "$balance" },
        count: { $sum: 1 },
      },
    },
  ]);
  return {
    revenue: round2(row?.revenue),
    outstanding: round2(row?.outstanding),
    count: row?.count ?? 0,
  };
}
