import express from "express";
import { getDashboard } from "../controllers/dashboardController.js";
import requireAuth from "../middleware/requireAuth.js";
import requirePermission from "../middleware/requirePermission.js";

const router = express.Router();

router.get("/", requireAuth, requirePermission("dashboard", "view"), getDashboard);

export default router;
