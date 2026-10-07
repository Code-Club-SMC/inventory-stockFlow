import { z } from "zod";

// Keep this in sync with the sidebar keys and the route guards.
export const MODULES = [
  "dashboard",
  "categories",
  "inventory",
  "transactions",
  "invoices",
  "reports",
  "roles", // controls access to the Roles & Permissions screen itself
  "users",
  // "settings",
];

// View-only modules: no create / edit / delete, ever.
export const VIEW_ONLY_MODULES = ["dashboard", "transactions", "reports"];

export const ACTIONS = ["view", "create", "edit", "delete"];

export const MODULE_LABELS = {
  dashboard: "Dashboard",
  categories: "Categories",
  inventory: "Inventory",
  transactions: "Stock Transactions",
  invoices: "Invoices",
  reports: "Reports",
  roles: "Roles & Permissions",
  users: "User Management",
  settings: "Settings",
};

export const isViewOnly = (module) => VIEW_ONLY_MODULES.includes(module);

const modulePermissionSchema = z
  .object({
    module: z.enum(MODULES),
    view: z.boolean(),
    create: z.boolean(),
    edit: z.boolean(),
    delete: z.boolean(),
  })
  .superRefine((perm, ctx) => {
    const hasWrite = perm.create || perm.edit || perm.delete;

    if (isViewOnly(perm.module) && hasWrite) {
      ctx.addIssue({
        code: "custom",
        message: `"${perm.module}" is view-only: create, edit and delete are not allowed.`,
      });
    }

    if (hasWrite && !perm.view) {
      ctx.addIssue({
        code: "custom",
        message: "View must be enabled before create, edit or delete.",
      });
    }
  });

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters.")
    .max(40, "Role name must be under 40 characters."),
  description: z
    .string()
    .trim()
    .max(200, "Keep it under 200 characters.")
    .optional(),
  permissions: z
    .array(modulePermissionSchema)
    .length(MODULES.length, `Permissions must include all ${MODULES.length} modules.`)
    .superRefine((perms, ctx) => {
      const seen = new Set();
      for (const p of perms) {
        if (seen.has(p.module)) {
          ctx.addIssue({
            code: "custom",
            message: `Module "${p.module}" appears more than once.`,
          });
        }
        seen.add(p.module);
      }
    }),
});

// Builds a permissions array (all off) in fixed MODULES order. Entries for
// modules that no longer exist (for example "sales") are dropped.
export const buildDefaultPermissions = (existing = []) =>
  MODULES.map((module) => {
    const found = existing.find((p) => p.module === module);
    return (
      found || {
        module,
        view: false,
        create: false,
        edit: false,
        delete: false,
      }
    );
  });
