import express from "express";
import { validate } from "../middleware/validate.js";
import { categoryFormSchema } from "../validations/categorySchema.js";
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import requireAuth from "../middleware/requireAuth.js";
import requirePermission, { requireAnyPermission } from "../middleware/requirePermission.js";

const router = express.Router();

// Other pages read the category list for their dropdowns and filters.
const canReadCategories = requireAnyPermission(
  ["categories", "view"],
  ["inventory", "view"],
  ["invoices", "view"],
  ["transactions", "view"]
);

router.get("/", requireAuth, canReadCategories, getCategories);
router.get("/:id", requireAuth, canReadCategories, getCategory);
router.post("/", requireAuth, requirePermission("categories", "create"), validate(categoryFormSchema), createCategory);
router.put("/:id", requireAuth, requirePermission("categories", "edit"), validate(categoryFormSchema), updateCategory);
router.delete("/:id", requireAuth, requirePermission("categories", "delete"), deleteCategory);

export default router;
