import { useQuery, useMutation } from '@tanstack/react-query'
import { getQuickstartOptions, generateQuickstart } from '@/services/quickstartApi'
import type { GenerateQuickstartPayload } from '@/types/quickstart'

/**
 * Fetch quickstart options (languages, frameworks)
 */
export function useQuickstartOptions() {
  return useQuery({
    queryKey: ['quickstart', 'options'],
    queryFn: getQuickstartOptions,
    staleTime: 30 * 60 * 1000, // 30 minutes - options rarely change
  })
}

/**
 * Generate quickstart documentation.
 * Using mutation since it's a POST that generates unique content.
 */
export function useGenerateQuickstart() {
  return useMutation({
    mutationFn: (payload: GenerateQuickstartPayload) => generateQuickstart(payload),
  })
}
