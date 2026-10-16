import Transaction from "../models/Transaction.js";
import { Invoice } from "../models/Invoice.js";
import Wallet, { MAIN_WALLET } from "../models/Wallet.js";
import { hasPermission } from "../middleware/requirePermission.js";
import { LOW_STOCK_LIMIT } from "../validations/inventorySchema.js";
import {
  round2,
  getStockByCategory,
  getMovementTotals,
  getInvoiceTotals,
} from "../utils/analytics.js";

// GET /dashboard: everything the Dashboard page shows, in one call.
export const getDashboard = async (req, res) => {
  try {
    const [stockByCategory, movements, invoiceTotals, recentInvoices, recentTransactions] =
      await Promise.all([
        getStockByCategory(),
        getMovementTotals(),
        getInvoiceTotals(),
        Invoice.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select("invoiceNumber customer date total balance status")
          .lean(),
        Transaction.find()
          .sort({ date: -1, createdAt: -1 })
          .limit(5)
          .select("date category type quantity reference")
          .lean(),
      ]);

    // The balance is only included for roles that can view the wallet.
    const wallet = hasPermission(req.user, "wallet", "view")
      ? await Wallet.findOne({ key: MAIN_WALLET }).lean()
      : undefined;
    const walletBalance = wallet === undefined ? null : round2(wallet?.balance);

    const currentStock = round2(
      stockByCategory.reduce((sum, c) => sum + c.currentStock, 0)
    );

    return res.status(200).json({
      success: true,
      data: {
        totals: {
          stockReceived: movements.stockIn.quantity,
          stockSold: movements.stockOut.quantity,
          currentStock,
          totalRevenue: invoiceTotals.revenue, // billed
          outstandingBalance: invoiceTotals.outstanding,
          walletBalance, // null when the role can't view the wallet
        },
        stockByCategory,
        lowStock: stockByCategory.filter((c) => c.currentStock < LOW_STOCK_LIMIT),
        recentInvoices,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading the dashboard",
    });
  }
};
