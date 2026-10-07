import api from "./axiosClient.js"

export async function createInvoice(invoice) {
	try {
		return await api.post("/invoices/", invoice)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function deleteInvoice(id) {
	try {
		return await api.delete(`/invoices/${id}/`)
	} catch (error) {
		console.log(error)
		throw error
	}
}

export async function updateInvoice(id, invoice) {
	try {
		return await api.put(`/invoices/${id}/`, invoice)
	} catch (error) {
		console.log(error)
		throw error
	}
}

// status is optional: "Paid" | "Pending" | "Partial" | "Overdue"
export async function fetchInvoices(status) {
	try {
		return await api.get("/invoices/", { params: status ? { status } : {} })
	} catch (error) {
		console.log(error)
		throw error
	}
}

// payment = { amount, date, method, transactionNumber, chequeNumber, nextDueDate }
export async function addInvoicePayment(id, payment) {
	try {
		return await api.post(`/invoices/${id}/payments/`, payment)
	} catch (error) {
		console.log(error)
		throw error
	}
}

// body is optional: { dueDate } (needed only if the invoice becomes unpaid without one)
export async function removeInvoicePayment(id, paymentId, body = {}) {
	try {
		return await api.delete(`/invoices/${id}/payments/${paymentId}/`, { data: body })
	} catch (error) {
		console.log(error)
		throw error
	}
}
