import api from "./axiosClient.js"

// Resolves to { token, user } (the interceptor unwraps response.data.data).
export const loginUser = async (email, password) => {
	try {
		const data = await api.post("/auth/login", { email, password }, { skipAuth: true });
		return data;
	} catch (error) {
		console.error(error);
		throw error;
	}
}

// The logged-in user with their role and permissions.
export const fetchMe = async () => {
	try {
		return await api.get("/auth/me/");
	} catch (error) {
		console.log(error);
		throw error;
	}
}
