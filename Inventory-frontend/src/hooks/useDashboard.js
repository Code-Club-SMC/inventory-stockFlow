import { useQuery } from '@tanstack/react-query';
import * as api from '@/api/dashboard';

/** Everything the Dashboard shows, in one request. */
export function useDashboard() {
    return useQuery({
        queryKey: ['dashboard'],
        queryFn: () => api.fetchDashboard(),
    });
}
