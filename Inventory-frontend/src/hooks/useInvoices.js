import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/invoices';
import { useToast } from '@/store/ToastContext';

const invoicesKey = ['invoices'];
const invoiceKey = (id) => ['invoices', id];
// Creating, editing or deleting an invoice moves stock, so these refresh too.
// ['inventory'] also covers ['inventory', 'summary'].
const inventoryKey = ['inventory'];
const transactionsKey = ['transactions'];

/** List of all invoices. */
export function useInvoices() {
    return useQuery({
        queryKey: invoicesKey,
        // Arrow fn: React Query would otherwise pass its context object as the `status` argument.
        queryFn: () => api.fetchInvoices(),
    });
}

// /** Single invoice by id. Only fetches when `id` is truthy. */
// export function useInvoice(id) {
//     return useQuery({
//         queryKey: invoiceKey(id),
//         queryFn: () => api.fetchInvoice(id),
//         enabled: Boolean(id),
//     });
// }

function useRefreshStock() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: inventoryKey });
        qc.invalidateQueries({ queryKey: transactionsKey });
    };
}

export function useAddInvoice() {
    const qc = useQueryClient();
    const refreshStock = useRefreshStock();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.createInvoice,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: invoicesKey });
            refreshStock();
            showToast('Invoice created successfully');
        },
        // Errors already surface as a toast via the global mutationCache handler.
    });
}

export function useUpdateInvoice() {
    const qc = useQueryClient();
    const refreshStock = useRefreshStock();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: ({ id, data }) => api.updateInvoice(id, data),
        onSuccess: (_result, { id }) => {
            qc.invalidateQueries({ queryKey: invoicesKey });
            qc.invalidateQueries({ queryKey: invoiceKey(id) });
            refreshStock();
            showToast('Invoice updated successfully');
        },
    });
}

export function useDeleteInvoice() {
    const qc = useQueryClient();
    const refreshStock = useRefreshStock();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.deleteInvoice,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: invoicesKey });
            refreshStock();
            showToast('Invoice deleted', 'info');
        },
    });
}

/** Record a payment against an invoice: mutate({ id, data }). Payments don't move stock. */
export function useAddPayment() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: ({ id, data }) => api.addInvoicePayment(id, data),
        onSuccess: (_result, { id }) => {
            qc.invalidateQueries({ queryKey: invoicesKey });
            qc.invalidateQueries({ queryKey: invoiceKey(id) });
            showToast('Payment recorded successfully');
        },
    });
}

/** Undo a payment: mutate({ id, paymentId, body }). body = { dueDate } only when needed. */
export function useRemovePayment() {
    const qc = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: ({ id, paymentId, body }) => api.removeInvoicePayment(id, paymentId, body),
        onSuccess: (_result, { id }) => {
            qc.invalidateQueries({ queryKey: invoicesKey });
            qc.invalidateQueries({ queryKey: invoiceKey(id) });
            showToast('Payment removed', 'info');
        },
    });
}
