import { z } from "zod";

export const CATEGORY_STATUSES = ["Active", "Inactive"];

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters.")
    .max(50, "Category name must be under 50 characters."),
  description: z
    .string()
    .trim()
    .max(200, "Keep the description under 200 characters.")
    .default(""),
  status: z.enum(CATEGORY_STATUSES, {
    message: "Status must be Active or Inactive.",
  }).default("Active"),
});
