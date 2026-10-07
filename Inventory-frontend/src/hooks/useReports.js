import { useQuery, keepPreviousData } from '@tanstack/react-query';
import * as api from '@/api/reports';

/** Report for a date range (YYYY-MM-DD, inclusive). Empty from/to = open-ended. */
export function useReports(from, to, enabled = true) {
    return useQuery({
        queryKey: ['reports', from, to],
        queryFn: () => api.fetchReport({ from, to }),
        enabled,
        // Keep showing the old numbers while a new range loads (no flicker).
        placeholderData: keepPreviousData,
    });
}
