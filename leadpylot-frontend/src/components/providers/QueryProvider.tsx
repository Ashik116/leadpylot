'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering it stale

      // Keep unused data in cache for 10 minutes

      // Disable automatic refetching behaviors that cause duplicate calls
      refetchOnWindowFocus: true,
      refetchOnMount: true, // Only refetch if data is stale
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        // Don't retry on client errors (4xx)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Don't retry on access denied or authentication errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Don't retry on not found errors
        if (error?.response?.status === 404) {
          return false;
        }
        // Retry up to 1 time for server errors (5xx) and network issues
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
