import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/categories';
import { useToast } from '@/store/ToastContext';

const categoriesKey = ['categories'];

/** List of all categories. They change rarely, so keep them fresh for 10 minutes. */
export function useCategories() {
    return useQuery({
        queryKey: categoriesKey,
        // Arrow fn: React Query would otherwise pass its context object as the `status` argument.
        queryFn: () => api.fetchCategories(),
        staleTime: 10 * 60_000,
    });
}

export function useAddCategory() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.createCategory,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: categoriesKey });
            showToast('Category created successfully');
        },
        // Errors already surface as a toast via the global mutationCache handler.
    });
}

/** mutate({ id, data }) */
export function useUpdateCategory() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: ({ id, data }) => api.updateCategory(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: categoriesKey });
            // TODO: when Inventory is migrated, invalidate ['inventory'] here too.
            showToast('Category updated successfully');
        },
    });
}

export function useDeleteCategory() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.deleteCategory,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: categoriesKey });
            showToast('Category deleted', 'info');
        },
    });
}
