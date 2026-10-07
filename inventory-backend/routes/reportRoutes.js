import express from "express";
import { getReport } from "../controllers/reportController.js";
import requireAuth from "../middleware/requireAuth.js";
import requirePermission from "../middleware/requirePermission.js";

const router = express.Router();

router.get("/", requireAuth, requirePermission("reports", "view"), getReport);

export default router;
