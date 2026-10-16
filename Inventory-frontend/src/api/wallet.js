import api from "./axiosClient.js"

// from / to are optional YYYY-MM-DD strings (inclusive).
// Resolves to { balance, moneyIn, moneyOut, entries }.
export async function fetchWallet({ from, to } = {}) {
	try {
		return await api.get("/wallet/", {
			params: { from: from || undefined, to: to || undefined },
		})
	} catch (error) {
		console.log(error)
		throw error
	}
}

// data = { amount, date, note }
export async function addFunds(data) {
	try {
		return await api.post("/wallet/add-funds", data)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function withdrawFunds(data) {
	try {
		return await api.post("/wallet/withdraw", data)
	} catch (error) {
		console.log(error)
		throw error
	}
}
