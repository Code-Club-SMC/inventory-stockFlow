import express from "express";
import { validate } from "../middleware/validate.js";
import { inventoryFormSchema } from "../validations/inventorySchema.js";
import {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getStockByCategory,
} from "../controllers/inventoryController.js";
import requireAuth from "../middleware/requireAuth.js";
import requirePermission, { requireAnyPermission } from "../middleware/requirePermission.js";

const router = express.Router();

// The invoice form shows "In stock" per product, so invoice users may read the summary.
router.get(
  "/summary/by-category",
  requireAuth,
  requireAnyPermission(["inventory", "view"], ["invoices", "view"]),
  getStockByCategory
); // must stay above "/:id"
router.get("/", requireAuth, requirePermission("inventory", "view"), getInventory);
router.get("/:id", requireAuth, requirePermission("inventory", "view"), getInventoryItem);
router.post("/", requireAuth, requirePermission("inventory", "create"), validate(inventoryFormSchema), createInventoryItem);
router.put("/:id", requireAuth, requirePermission("inventory", "edit"), validate(inventoryFormSchema), updateInventoryItem);
router.delete("/:id", requireAuth, requirePermission("inventory", "delete"), deleteInventoryItem);

export default router;
