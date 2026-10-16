import mongoose from "mongoose";
import Wallet, { MAIN_WALLET } from "../models/Wallet.js";
import WalletEntry from "../models/WalletEntry.js";
import { recordWalletEntry } from "../utils/wallet.js";

const round2 = (n) => Math.round(((n ?? 0) + Number.EPSILON) * 100) / 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 500;

const send = (res, status, message) =>
  res.status(status).json({ success: false, message });

// GET /wallet?from=&to=&direction=in|out
// balance = now. moneyIn / moneyOut = totals for the period (ignoring the tab).
export const getWallet = async (req, res) => {
  try {
    const { from = "", to = "", direction = "" } = req.query;

    if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
      return send(res, 400, "Enter valid dates.");
    }
    if (from && to && from > to) {
      return send(res, 400, "The start date can't be after the end date.");
    }
    if (direction && !["in", "out"].includes(direction)) {
      return send(res, 400, "Invalid filter.");
    }

    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    const dateMatch = from || to ? { date: range } : {};

    const [wallet, totals, entries] = await Promise.all([
      Wallet.findOne({ key: MAIN_WALLET }).lean(),
      WalletEntry.aggregate([
        { $match: dateMatch },
        { $group: { _id: "$direction", total: { $sum: "$amount" } } },
      ]),
      WalletEntry.find({ ...dateMatch, ...(direction ? { direction } : {}) })
        .sort({ createdAt: -1, _id: -1 })
        .limit(MAX_ROWS)
        .lean(),
    ]);

    const totalOf = (dir) => round2(totals.find((t) => t._id === dir)?.total);

    return res.status(200).json({
      success: true,
      data: {
        balance: round2(wallet?.balance),
        moneyIn: totalOf("in"),
        moneyOut: totalOf("out"),
        entries,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return send(res, 500, "Something went wrong while loading the wallet");
  }
};

// Shared by add-funds and withdraw.
const makeManualEntry = ({ direction, type, defaultNote }) => async (req, res) => {
  const { amount, date, note } = req.body;

  try {
    const session = await mongoose.startSession();
    let entry = null;

    try {
      await session.withTransaction(async () => {
        entry = await recordWalletEntry({
          session,
          direction,
          type,
          amount,
          date,
          description: note || defaultNote,
          createdBy: req.user?._id,
        });
      });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error(`Error recording ${type}:`, error);
    return send(res, 500, "Something went wrong while saving the entry");
  }
};

// POST /wallet/add-funds
export const addFunds = makeManualEntry({
  direction: "in",
  type: "Add Funds",
  defaultNote: "Funds added",
});

// POST /wallet/withdraw  (a negative balance is allowed)
export const withdraw = makeManualEntry({
  direction: "out",
  type: "Withdrawal",
  defaultNote: "Withdrawal",
});
