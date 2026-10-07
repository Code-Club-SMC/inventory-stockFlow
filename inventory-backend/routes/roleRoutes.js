import express from "express";
import { validate } from "../middleware/validate.js";
import { roleFormSchema } from "../validations/roleSchema.js";
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";
import requireAuth from "../middleware/requireAuth.js";
import requirePermission, { requireAnyPermission } from "../middleware/requirePermission.js";

const router = express.Router();

// The User form needs the roles list for its dropdown, so people who can
// create or edit users may read it too.
router.get(
  "/",
  requireAuth,
  requireAnyPermission(["roles", "view"], ["users", "create"], ["users", "edit"]),
  getRoles
);
router.get("/:id", requireAuth, requirePermission("roles", "view"), getRole);
router.post("/", requireAuth, requirePermission("roles", "create"), validate(roleFormSchema), createRole);
router.put("/:id", requireAuth, requirePermission("roles", "edit"), validate(roleFormSchema), updateRole);
router.delete("/:id", requireAuth, requirePermission("roles", "delete"), deleteRole);

export default router;
