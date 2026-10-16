import express from "express";
import { validate } from "../middleware/validate.js";
import { addFundsSchema, withdrawSchema } from "../validations/walletSchema.js";
import { getWallet, addFunds, withdraw } from "../controllers/walletController.js";
import requireAuth from "../middleware/requireAuth.js";
import requirePermission from "../middleware/requirePermission.js";

const router = express.Router();

// History rows are never edited or deleted, so there is no PUT or DELETE.
router.get("/", requireAuth, requirePermission("wallet", "view"), getWallet);
router.post("/add-funds", requireAuth, requirePermission("wallet", "create"), validate(addFundsSchema), addFunds);
router.post("/withdraw", requireAuth, requirePermission("wallet", "create"), validate(withdrawSchema), withdraw);

export default router;
