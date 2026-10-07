import { MODULES, ACTIONS } from "../validations/roleSchema.js";

/** True if the user's role grants `action` on `module`. */
export const hasPermission = (user, module, action) =>
  user?.role?.permissions?.some((p) => p.module === module && p[action] === true) ?? false;

const assertKnown = ([module, action]) => {
  // Fails at startup on a typo, instead of silently locking everyone out.
  if (!MODULES.includes(module) || !ACTIONS.includes(action)) {
    throw new Error(`requirePermission: unknown permission "${module}.${action}"`);
  }
};

/**
 * Allow the request if the user has ANY of the listed [module, action] pairs.
 * Used for lookups shared between pages, e.g. the categories list feeds
 * Inventory, Invoices and Stock Transactions.
 * Must run after requireAuth.
 */
export function requireAnyPermission(...pairs) {
  pairs.forEach(assertKnown);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Please log in to continue." });
    }
    if (pairs.some(([module, action]) => hasPermission(req.user, module, action))) {
      return next();
    }
    return res
      .status(403)
      .json({ success: false, message: "You don't have permission to do that." });
  };
}

/** requirePermission("inventory", "create") */
export default function requirePermission(module, action) {
  return requireAnyPermission([module, action]);
}
