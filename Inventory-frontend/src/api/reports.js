import api from "./axiosClient.js"

// from / to are optional YYYY-MM-DD strings (inclusive).
export async function fetchReport({ from, to } = {}) {
	try {
		return await api.get("/reports/", {
			params: { from: from || undefined, to: to || undefined },
		})
	} catch (error) {
		console.log(error)
		throw error
	}
}
