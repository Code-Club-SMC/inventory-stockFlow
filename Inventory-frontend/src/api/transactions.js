import api from "./axiosClient.js"

export async function fetchTransactions() {
	try {
		return await api.get("/transactions/")
	} catch (error) {
		console.log(error)
		throw error
	}
}