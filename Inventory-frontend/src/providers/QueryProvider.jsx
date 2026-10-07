import { useState } from 'react';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useToast } from '@/store/ToastContext';

export default function QueryProvider({ children }) {
    const { showToast } = useToast(); // stable reference (useCallback with [] deps)

    // Lazy useState: the client is created exactly once, never on re-render.
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000 ,
                        retry: (failureCount, error) => {
                            // Never retry 4xx: a 400/404 will not fix itself.
                            if (error?.status >= 400 && error?.status < 500) return false;
                            return failureCount < 1;
                        },
                    },
                    // Retrying "create invoice" could duplicate it.
                    mutations: { retry: false },
                },
                queryCache: new QueryCache({
                    onError: (error) => showToast(error.message || 'Failed to load data', 'error'),
                }),
                // One place for every failed mutation. Success toasts live in each hook.
                mutationCache: new MutationCache({
                    onError: (error) => showToast(error.message || 'Something went wrong', 'error'),
                }),
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
