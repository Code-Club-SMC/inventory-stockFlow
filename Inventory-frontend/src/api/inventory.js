import api from "./axiosClient.js"

// category is optional: exact category name
export async function fetchInventory(category) {
	try {
		return await api.get("/inventory/", { params: category ? { category } : {} })
	} catch (error) {
		console.log(error)
		throw error
	}
}

// Totals per category: [{ category, currentStock, quantity, unit }]
export async function fetchStockSummary() {
	try {
		return await api.get("/inventory/summary/by-category")
	} catch (error) {
		console.log(error)
		throw error
	}
}

// item = { category, quantity, unit, stockInPrice, date, description }
export async function createInventoryItem(item) {
	try {
		return await api.post("/inventory/", item)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function updateInventoryItem(id, item) {
	try {
		return await api.put(`/inventory/${id}/`, item)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function deleteInventoryItem(id) {
	try {
		return await api.delete(`/inventory/${id}/`)
	} catch (error) {
		console.log(error)
		throw error
	}
}
