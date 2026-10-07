import { useQuery } from '@tanstack/react-query';
import * as api from '@/api/transactions';

/** Stock ledger, newest first, each row with a calculated remainingStock. */
export function useTransactions() {
    return useQuery({
        queryKey: ['transactions'],
        queryFn: () => api.fetchTransactions(),
    });
}