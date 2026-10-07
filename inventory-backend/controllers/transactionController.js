import Transaction from "../models/Transaction.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Read-only ledger. "Remaining stock" is calculated here: a running total
// per category, oldest movement first, so it is always correct even after
// a batch is edited or deleted.
export const getTransactions = async (req, res) => {
  try {
    const rows = await Transaction.find().sort({ date: 1, createdAt: 1 }).lean();

    const totals = {};
    const withRemaining = rows.map((t) => {
      const sign = t.type === "Stock In" ? 1 : -1;
      totals[t.category] = round2((totals[t.category] ?? 0) + sign * t.quantity);
      return { ...t, remainingStock: totals[t.category] };
    });

    // Newest first for display.
    withRemaining.reverse();

    return res.status(200).json({ success: true, data: withRemaining });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching transactions",
    });
  }
};