import api from "./axiosClient.js"

// status is optional: "Active" | "Inactive"
export async function fetchCategories(status) {
	try {
		return await api.get("/categories/", { params: status ? { status } : {} })
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function createCategory(category) {
	try {
		return await api.post("/categories/", category)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function updateCategory(id, category) {
	try {
		return await api.put(`/categories/${id}/`, category)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function deleteCategory(id) {
	try {
		return await api.delete(`/categories/${id}/`)
	} catch (error) {
		console.log(error)
		throw error
	}
}
