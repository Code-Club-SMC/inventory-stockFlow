import Wallet, { MAIN_WALLET } from "../models/Wallet.js";
import WalletEntry from "../models/WalletEntry.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Move money in or out of the wallet and write the ledger row.
 * Always pass the `session` of the surrounding transaction, so the money
 * movement and the stock / invoice change are saved together or not at all.
 * A negative balance is allowed. An amount of 0 does nothing.
 */
export async function recordWalletEntry({
  session,
  direction, // "in" | "out"
  type,
  amount,
  date,
  description = "",
  reference = "",
  inventoryItem,
  invoice,
  paymentId = "",
  method = "",
  createdBy,
}) {
  const value = round2(amount);
  if (!(value > 0)) return null;

  const wallet = await Wallet.findOneAndUpdate(
    { key: MAIN_WALLET },
    { $inc: { balance: direction === "in" ? value : -value } },
    { upsert: true, returnDocument: "after", session }
  );

  const [entry] = await WalletEntry.create(
    [
      {
        date,
        type,
        direction,
        amount: value,
        balanceAfter: round2(wallet.balance),
        description,
        reference,
        inventoryItem,
        invoice,
        paymentId,
        method,
        createdBy,
      },
    ],
    { session }
  );

  return entry;
}
