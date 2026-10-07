import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/roles';
import { useToast } from '@/store/ToastContext';

const rolesKey = ['roles'];

/** List of all roles. Roles rarely change, so keep them fresh for 5 minutes. */
export function useRoles() {
    return useQuery({
        queryKey: rolesKey,
        queryFn: () => api.fetchRoles(),
        staleTime: 5 * 60_000,
    });
}

export function useAddRole() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.createRole,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: rolesKey });
            showToast('Role created successfully');
        },
        // Errors already surface as a toast via the global mutationCache handler.
    });
}

/** mutate({ id, data }) */
export function useUpdateRole() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: ({ id, data }) => api.updateRole(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: rolesKey });
            // An edited role changes the logged-in user's permissions and the role names in the users table.
            qc.invalidateQueries({ queryKey: ['me'] });
            qc.invalidateQueries({ queryKey: ['users'] });
            showToast('Role updated successfully');
        },
    });
}

export function useDeleteRole() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.deleteRole,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: rolesKey });
            showToast('Role deleted', 'info');
        },
    });
}
