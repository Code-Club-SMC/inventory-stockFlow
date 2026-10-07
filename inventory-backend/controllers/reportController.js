import { Invoice } from "../models/Invoice.js";
import {
  round2,
  getStockByCategory,
  getMovementTotals,
  getInvoiceTotals,
} from "../utils/analytics.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SALES_ROWS = 1000;

// GET /reports?from=YYYY-MM-DD&to=YYYY-MM-DD   (both optional, inclusive)
export const getReport = async (req, res) => {
  try {
    const { from = "", to = "" } = req.query;

    if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
      return res.status(400).json({ success: false, message: "Enter valid dates." });
    }
    if (from && to && from > to) {
      return res
        .status(400)
        .json({ success: false, message: "The start date can't be after the end date." });
    }

    // Dates are stored as YYYY-MM-DD strings, so string comparison works.
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    const dateMatch = from || to ? { date: range } : {};

    const [stockByCategory, movements, invoiceTotals, revenueRows, salesRows] =
      await Promise.all([
        getStockByCategory(),
        getMovementTotals(dateMatch),
        getInvoiceTotals(dateMatch),
        Invoice.aggregate([
          { $match: dateMatch },
          { $unwind: "$items" },
          {
            $group: {
              _id: { $toLower: "$items.product" },
              category: { $first: "$items.product" },
              revenue: { $sum: "$items.total" },
              quantity: { $sum: "$items.quantity" },
            },
          },
          { $project: { _id: 0, category: 1, revenue: 1, quantity: 1 } },
          { $sort: { category: 1 } },
        ]),
        Invoice.aggregate([
          { $match: dateMatch },
          { $unwind: "$items" },
          { $sort: { date: -1, createdAt: -1 } },
          { $limit: MAX_SALES_ROWS },
          {
            $project: {
              _id: { $concat: [{ $toString: "$_id" }, "-", { $toString: "$items._id" }] },
              invoiceNumber: 1,
              date: 1,
              customer: 1,
              product: "$items.product",
              quantity: "$items.quantity",
              unitPrice: "$items.unitPrice",
              total: "$items.total",
            },
          },
        ]),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        range: { from, to },
        summary: {
          stockReceived: movements.stockIn,
          stockSold: movements.stockOut,
          revenue: invoiceTotals.revenue, // billed
          outstanding: invoiceTotals.outstanding,
          invoiceCount: invoiceTotals.count,
          currentStock: round2(stockByCategory.reduce((s, c) => s + c.currentStock, 0)),
          productCount: stockByCategory.length,
        },
        revenueByCategory: revenueRows.map((r) => ({ ...r, revenue: round2(r.revenue) })),
        stockByCategory,
        sales: salesRows,
      },
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading the report",
    });
  }
};
