import mongoose from "mongoose";

export const WALLET_TYPES = [
  "Add Funds",
  "Withdrawal",
  "Stock Purchase",
  "Purchase Adjusted",
  "Purchase Refund",
  "Invoice Payment",
  "Payment Reversed",
];

// The cash ledger: one row per money movement. Rows are never edited or
// deleted; a mistake is fixed with an opposite entry.
const walletEntrySchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    type: { type: String, enum: WALLET_TYPES, required: true },
    direction: { type: String, enum: ["in", "out"], required: true },
    amount: { type: Number, required: true, min: 0.01 }, // always positive
    balanceAfter: { type: Number, required: true },
    description: { type: String, default: "", trim: true },
    reference: { type: String, default: "" }, // PO-... / INV-... (text only)

    // What caused it.
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem" },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    paymentId: { type: String, default: "" },
    method: { type: String, default: "" }, // Blank for legacy or non-payment entries
    transactionNumber: { type: String, default: "", trim: true, maxlength: 60 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

walletEntrySchema.index({ date: -1 });
walletEntrySchema.index({ createdAt: -1 });
walletEntrySchema.index({ invoice: 1 });

export default mongoose.model("WalletEntry", walletEntrySchema);
