import { z } from "zod";
import { getTodayISO } from "./invoice.js";

const toNumber = (v) =>
  v === "" || v === null || v === undefined ? undefined : Number(v);

const maxTwoDecimals = (n) => /^\d+(\.\d{1,2})?$/.test(String(n));

const isRealDate = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const amount = z.preprocess(
  toNumber,
  z
    .number({ message: "Enter a valid amount." })
    .positive("Amount must be greater than 0.")
    .refine(maxTwoDecimals, "Use at most 2 decimal places.")
);

const date = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine(isRealDate, "Enter a valid date.")
  .refine((d) => d <= getTodayISO(), "The date can't be in the future.");

/** Add Funds: the owner puts money in. Note is optional. */
export const addFundsSchema = z.object({
  amount,
  date,
  note: z.string().trim().max(200, "Keep the note under 200 characters.").default(""),
});

/** Withdraw: the owner takes money out. A short note is required. */
export const withdrawSchema = z.object({
  amount,
  date,
  note: z
    .string()
    .trim()
    .min(1, "Add a short note.")
    .max(200, "Keep the note under 200 characters."),
});
