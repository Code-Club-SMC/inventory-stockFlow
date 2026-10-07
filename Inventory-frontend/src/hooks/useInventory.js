import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/inventory';
import { useToast } from '@/store/ToastContext';

const inventoryKey = ['inventory'];
// Sits under ['inventory'], so invalidating inventoryKey refreshes it too.
const summaryKey = ['inventory', 'summary'];
// Every stock change writes a ledger row, so the transactions list must refresh.
const transactionsKey = ['transactions'];
// Dashboard and Reports are built from stock, so they refresh too.
const dashboardKey = ['dashboard'];
const reportsKey = ['reports'];

/** List of all stock entries. Stock changes from several places, so keep the default 30s. */
export function useInventory() {
    return useQuery({
        queryKey: inventoryKey,
        queryFn: () => api.fetchInventory(),
    });
}

/** Totals per category. */
export function useStockSummary(enabled = true) {
    return useQuery({
        queryKey: summaryKey,
        queryFn: () => api.fetchStockSummary(),
        enabled,
    });
}

function useRefreshStock() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: inventoryKey });
        qc.invalidateQueries({ queryKey: transactionsKey });
        qc.invalidateQueries({ queryKey: dashboardKey });
        qc.invalidateQueries({ queryKey: reportsKey });
    };
}

export function useAddInventoryItem() {
    const refresh = useRefreshStock();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.createInventoryItem,
        onSuccess: () => {
            refresh();
            showToast('Stock added successfully');
        },
        // Errors already surface as a toast via the global mutationCache handler.
    });
}

/** mutate({ id, data }) */
export function useUpdateInventoryItem() {
    const refresh = useRefreshStock();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: ({ id, data }) => api.updateInventoryItem(id, data),
        onSuccess: () => {
            refresh();
            showToast('Stock updated successfully');
        },
    });
}

export function useDeleteInventoryItem() {
    const refresh = useRefreshStock();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.deleteInventoryItem,
        onSuccess: () => {
            refresh();
            showToast('Stock entry deleted', 'info');
        },
    });
}
