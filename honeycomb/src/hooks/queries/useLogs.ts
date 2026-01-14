import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { getLogs } from '@/services/agentControlApi'
import type { RawJsonData } from '@/types/agentControl'

// =============================================================================
// Types
// =============================================================================

interface LogsResponse {
  rows?: unknown[]
  [key: string]: unknown
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Basic logs fetch - single page
 */
export function useLogs(
  start: string,
  end: string,
  limit = 500,
  enabled = true
) {
  return useQuery({
    queryKey: ['logs', start, end, limit],
    queryFn: () => getLogs(start, end, limit, 0),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Infinite scroll logs - for paginated loading
 */
export function useLogsInfinite(
  start: string,
  end: string,
  pageSize = 500,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: ['logs', 'infinite', start, end],
    queryFn: ({ pageParam }) =>
      getLogs(start, end, pageSize, pageParam) as Promise<LogsResponse>,
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer rows than pageSize, there's no more data
      const rowCount = lastPage.rows?.length ?? 0
      if (rowCount < pageSize) {
        return undefined
      }
      // Return the next offset
      return allPages.length * pageSize
    },
    initialPageParam: 0,
    enabled,
    staleTime: 1 * 60 * 1000,
  })
}
