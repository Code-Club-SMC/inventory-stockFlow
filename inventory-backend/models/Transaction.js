import mongoose from "mongoose";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// One row per stock movement. "Remaining stock" is NOT stored: it is
// calculated from these rows (running total per category) when listed.
// `price` is always PER UNIT; `totalPrice` = quantity x price.
const transactionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    category: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Stock In", "Stock Out"], required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }, // per unit
    totalPrice: { type: Number, default: 0, min: 0 },
    description: { type: String, default: "", trim: true },
    reference: { type: String, required: true, unique: true },

    // Where the movement came from.
    source: { type: String, enum: ["inventory", "invoice"], required: true },
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem" },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },

    // Stock Out only: which batches this sale took stock from, and how much.
    allocations: {
      type: [
        {
          _id: false,
          batch: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true },
          quantity: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

transactionSchema.index({ category: 1, date: 1, createdAt: 1 });
transactionSchema.index({ inventoryItem: 1 });
transactionSchema.index({ invoice: 1 });

transactionSchema.pre("validate", function () {
  if (Number.isFinite(this.quantity) && Number.isFinite(this.price)) {
    this.totalPrice = round2(this.quantity * this.price);
  }
});

export default mongoose.model("Transaction", transactionSchema);
