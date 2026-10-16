import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as api from '@/api/wallet';
import { useToast } from '@/store/ToastContext';

const walletKey = ['wallet'];
const dashboardKey = ['dashboard']; // the Dashboard shows the balance

/** Balance, money in/out for the period, and the history. Empty from/to = all time. */
export function useWallet(from, to) {
    return useQuery({
        queryKey: ['wallet', from, to],
        queryFn: () => api.fetchWallet({ from, to }),
        // Keep showing the old numbers while another period loads (no flicker).
        placeholderData: keepPreviousData,
    });
}

function useRefreshWallet() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: walletKey });
        qc.invalidateQueries({ queryKey: dashboardKey });
    };
}

export function useAddFunds() {
    const refresh = useRefreshWallet();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.addFunds,
        onSuccess: () => {
            refresh();
            showToast('Funds added successfully');
        },
        // Errors already surface as a toast via the global mutationCache handler.
    });
}

export function useWithdrawFunds() {
    const refresh = useRefreshWallet();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: api.withdrawFunds,
        onSuccess: () => {
            refresh();
            showToast('Withdrawal recorded', 'info');
        },
    });
}
