import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/users';
import { useToast } from '@/store/ToastContext';

const usersKey = ['users'];

/** List of all users (role is populated with its name). */
export function useUsers() {
    return useQuery({
        queryKey: usersKey,
        queryFn: () => api.fetchUsers(),
    });
}

export function useAddUser() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.createUser,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: usersKey });
            showToast('User created successfully');
        },
        // Errors already surface as a toast via the global mutationCache handler.
    });
}

/** mutate({ id, data }) */
export function useUpdateUser() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: ({ id, data }) => api.updateUser(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: usersKey });
            showToast('User updated successfully');
        },
    });
}

export function useDeleteUser() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.deleteUser,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: usersKey });
            showToast('User deleted', 'info');
        },
    });
}
