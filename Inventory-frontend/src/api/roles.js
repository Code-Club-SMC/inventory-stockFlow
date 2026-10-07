import api from "./axiosClient.js"

export async function fetchRoles() {
	try {
		return await api.get("/roles/")
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function createRole(role) {
	try {
		return await api.post("/roles/", role)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function updateRole(id, role) {
	try {
		return await api.put(`/roles/${id}/`, role)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function deleteRole(id) {
	try {
		return await api.delete(`/roles/${id}/`)
	} catch (error) {
		console.log(error)
		throw error
	}
}
