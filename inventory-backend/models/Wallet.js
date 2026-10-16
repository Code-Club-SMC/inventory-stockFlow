import mongoose from "mongoose";

export const MAIN_WALLET = "main";

// One wallet for the whole business. `balance` may go below zero (allowed).
const walletSchema = new mongoose.Schema(
  {
    key: { type: String, default: MAIN_WALLET, unique: true },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Wallet", walletSchema);
