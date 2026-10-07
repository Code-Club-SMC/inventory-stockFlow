import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/api/loginApi';

export const meKey = ['me'];

/**
 * The logged-in user + role permissions. Only runs when a token exists.
 * Short staleTime: when an admin edits a role, this picks it up soon
 * (and again when the tab is focused). The server checks permissions on
 * every request anyway; this only drives what the UI shows.
 */
export function useMe() {
    const hasToken = Boolean(localStorage.getItem('token'));
    return useQuery({
        queryKey: meKey,
        queryFn: () => fetchMe(),
        enabled: hasToken,
        staleTime: 60_000,
        retry: false,
    });
}
