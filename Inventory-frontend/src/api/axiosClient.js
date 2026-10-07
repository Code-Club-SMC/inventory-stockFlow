import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Request interceptor: attach the token stored in localStorage.
api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('token');

		if (token && !config.skipAuth) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		return config;
	},
	(error) => Promise.reject(error),
);

// Turns any axios error into one short, user-readable sentence.
// Technical details stay in the server console, not in the toast.
const getFriendlyMessage = (error) => {
	// Server never answered (down, offline, CORS, timeout).
	if (!error.response) {
		return "Can't reach the server. Check your connection.";
	}

	const { status, data } = error.response;

	// Server-side failures: never show server wording to the user.
	if (status >= 500) {
		return 'Something went wrong. Please try again.';
	}

	// 4xx: our controllers send readable messages, use them.
	if (typeof data?.message === 'string' && data.message) {
		return data.message;
	}

	if (status === 401) return 'Your session has expired. Please log in again.';
	if (status === 403) return "You don't have permission to do that.";
	if (status === 404) return "We couldn't find what you were looking for.";

	return 'Request failed. Please try again.';
};

// Response interceptor: return data and handle unauthorized responses.
api.interceptors.response.use(
	(response) => response?.data?.data,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem('token');
			// Session ended: go to the login page (not for a wrong-password login attempt).
			if (!error.config?.skipAuth && window.location.pathname !== '/login') {
				window.location.assign('/login');
			}
		}

		// Lets the retry rule in QueryProvider (error.status) work on every axios version.
		error.status ??= error.response?.status;

		// The global toast reads error.message.
		error.message = getFriendlyMessage(error);

		return Promise.reject(error);
	},
);

export default api;
