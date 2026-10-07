import express from "express";
import { getTransactions } from "../controllers/transactionController.js";
import requireAuth from "../middleware/requireAuth.js";
import requirePermission from "../middleware/requirePermission.js";

const router = express.Router();

// Read-only: transactions are created by inventory and invoices, never by hand.
router.get("/", requireAuth, requirePermission("transactions", "view"), getTransactions);

export default router;
