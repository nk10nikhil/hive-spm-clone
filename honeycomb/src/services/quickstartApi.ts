import { hiveClient } from './api'
import type {
  QuickstartOptions,
  GenerateQuickstartResponse,
  GenerateQuickstartPayload,
} from '@/types/quickstart'

/**
 * Fetch available SDK options (languages, frameworks, vendors)
 */
export const getQuickstartOptions = () =>
  hiveClient.get<QuickstartOptions>('/quickstart/options')

/**
 * Generate SDK quickstart documentation
 */
export const generateQuickstart = (payload: GenerateQuickstartPayload) =>
  hiveClient.post<GenerateQuickstartResponse>('/quickstart/generate', payload)
