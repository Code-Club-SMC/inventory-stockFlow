import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(60, "Name must be under 60 characters.");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address.");

// bcrypt only uses the first 72 bytes, so cap it there.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be under 72 characters.");

const role = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Please select a role.");

// ---------- Backend + form (what the server receives) ----------

export const userCreateSchema = z.object({
  name,
  email,
  password,
  role,
});

// Password is optional on update. A blank "" means "keep the current password".
export const userUpdateSchema = z.object({
  name,
  email,
  password: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    password.optional()
  ),
  role,
  isActive: z.boolean().optional(),
});

// ---------- Form only (confirmPassword is never sent to the server) ----------

export const userCreateFormSchema = userCreateSchema
  .extend({ confirmPassword: z.string() })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export const userUpdateFormSchema = userUpdateSchema
  .extend({ confirmPassword: z.string().optional() })
  .superRefine((data, ctx) => {
    if (data.password && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });
