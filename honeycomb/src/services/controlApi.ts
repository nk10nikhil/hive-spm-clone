import { hiveClient } from './api'
import type { AgentStatus, AgentsResponse } from '@/types/agentControl'

// =============================================================================
// Agent Status Endpoints
// =============================================================================

/**
 * Get current agent connection status (real-time check)
 * Returns the current status of connected agent instances
 */
export function getAgentStatus(): Promise<AgentStatus> {
  return hiveClient.get('/v1/control/agent-status')
}

/**
 * Get all agents with their historical data and availability status
 * @param since - Optional ISO date string to filter events from
 * @param limit - Max number of agents to return (default: 100)
 */
export function getAgents(since?: string, limit?: number): Promise<AgentsResponse> {
  const params = new URLSearchParams()
  if (since) params.set('since', since)
  if (limit) params.set('limit', limit.toString())
  const query = params.toString() ? `?${params.toString()}` : ''
  return hiveClient.get(`/v1/control/agents${query}`)
}
