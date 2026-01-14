// =============================================================================
// Quickstart Options Types
// =============================================================================

/**
 * SDK language option
 */
export interface SdkLanguage {
  id: string
  name: string
}

/**
 * Agent framework option with language support flags
 */
export interface AgentFramework {
  id: string
  name: string
  description: string
  pythonSupport: boolean
  typescriptSupport: boolean
}

/**
 * LLM vendor option
 */
export interface LlmVendor {
  id: string
  name: string
}

/**
 * Response from GET /quickstart/options
 */
export interface QuickstartOptions {
  llmVendors: LlmVendor[]
  sdkLanguages: SdkLanguage[]
  agentFrameworks: AgentFramework[]
}

// =============================================================================
// Quickstart Generation Types
// =============================================================================

/**
 * Request payload for POST /quickstart/generate
 */
export interface GenerateQuickstartPayload {
  agentFramework: string
  sdkLanguage: string
  devTokenId?: string
}

/**
 * Response from POST /quickstart/generate
 */
export interface GenerateQuickstartResponse {
  markdown: string
  metadata: {
    agentFramework: string
    tokenName: string
    generatedAt: string
  }
}
