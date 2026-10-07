import { z } from "zod";

// Stock below this amount is shown as "low" on the Inventory page.
export const LOW_STOCK_LIMIT = 50;

// Form inputs arrive as strings; "" must count as "missing".
const toNumber = (v) =>
  v === "" || v === null || v === undefined ? undefined : Number(v);

const maxTwoDecimals = (n) => /^\d+(\.\d{1,2})?$/.test(String(n));

const isRealDate = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const inventoryFormSchema = z.object({
  category: z.string().trim().min(1, "Please select a category."),

  quantity: z.preprocess(
    toNumber,
    z
      .number({ message: "Enter a valid quantity." })
      .positive("Quantity must be greater than 0.")
      .refine(maxTwoDecimals, "Quantity can have at most 2 decimals.")
  ),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required.")
    .max(20, "Unit must be under 20 characters."),

  stockInPrice: z.preprocess(
    toNumber,
    z
      .number({ message: "Enter a valid price." })
      .min(0, "Price can't be negative.")
      .refine(maxTwoDecimals, "Price can have at most 2 decimals.")
  ),

  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
    .refine(isRealDate, "Enter a valid date."),

  description: z
    .string()
    .trim()
    .max(200, "Keep the description under 200 characters.")
    .default(""),
});
