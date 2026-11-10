import mongoose from "mongoose";
import { PAYMENT_METHODS } from "../validations/invoice.js";

const inventorySchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    stockInPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    date: { type: String, required: true }, // YYYY-MM-DD
    description: { type: String, default: "", trim: true },
    paymentMethod: { type: String, enum: ["", ...PAYMENT_METHODS], default: "" },
    transactionNumber: { type: String, default: "", trim: true, maxlength: 60 },
    currentStock: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
inventorySchema.pre("validate", function () {
  if (this.quantity != null && this.stockInPrice != null) {
this.totalPrice = round2(this.quantity * this.stockInPrice);
  }
});

inventorySchema.index({ category: 1, date: 1 });

export default mongoose.model("InventoryItem", inventorySchema);

