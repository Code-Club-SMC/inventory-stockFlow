
import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import invoicesRoutes from './routes/invoicesRoutes.js'
import roleRoutes from './routes/roleRoutes.js'
import userRoutes from './routes/userRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const app = express();
const PORT = process.env.PORT;
connectDB()
app.use(cors());
app.use(express.json());

app.use("/api/auth",authRoutes)
app.use("/api/invoices",invoicesRoutes)
app.use("/api/roles",roleRoutes)
app.use("/api/users",userRoutes)
app.use("/api/categories",categoryRoutes)
app.use("/api/inventory",inventoryRoutes)
app.use("/api/transactions", transactionRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/reports", reportRoutes)
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
