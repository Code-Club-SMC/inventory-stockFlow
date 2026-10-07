import api from './axiosClient.js';

export const fetchUsers = async () => {
	try {
		return (await api.get('/users'));
	} catch (error) {
        console.error(error);

		throw error;
	}
};

export const createUser = async (data) => {
	try {
		return (await api.post('/users', data));
	} catch (error) {
        console.error(error);
		throw error;
	}
};

export const updateUser = async (id, data) => {
	try {
		return (await api.put(`/users/${id}`, data));
	} catch (error) {
        console.error(error);
		throw error;
	}
};

export const deleteUser = async (id) => {
	try {
		return (await api.delete(`/users/${id}`));
	} catch (error) {
        console.error(error);
		throw error;
	}
};
