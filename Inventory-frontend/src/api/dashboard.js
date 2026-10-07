import api from "./axiosClient.js"

// Totals, stock per category, low stock, latest invoices and transactions.
export async function fetchDashboard() {
	try {
		return await api.get("/dashboard/")
	} catch (error) {
		console.log(error)
		throw error
	}
}
