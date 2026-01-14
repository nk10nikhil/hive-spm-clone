/**
 * Aden Hive MCP Server
 *
 * Model Context Protocol server for LLM governance.
 * Exposes 19 tools:
 *
 * Budget Tools (6):
 *   - hive_budget_get, hive_budget_reset, hive_budget_validate
 *   - hive_budget_rule_create, hive_budget_rule_update, hive_budget_rule_delete
 *
 * Agent Status Tools (3):
 *   - hive_agents_list, hive_agent_health_check, hive_agents_summary
 *
 * Analytics Tools (5):
 *   - hive_analytics_wide, hive_analytics_narrow, hive_insights
 *   - hive_metrics, hive_logs
 *
 * Policy Tools (5):
 *   - hive_policies_list, hive_policy_get, hive_policy_create
 *   - hive_policy_update, hive_policy_clear
 *
 * Usage:
 *   import { createMcpRouter } from './mcp';
 *   app.use('/mcp', createMcpRouter(getControlEmitter));
 */

// Server creation
export { createHiveMcpServer, TOOL_CATALOG } from "./server";
export type { HiveMcpServerOptions } from "./server";

// HTTP transport
export {
  createMcpRouter,
  getActiveMcpSessionCount,
  getTeamMcpSessions,
} from "./transport/http";

// API client for direct usage
export { createApiClient } from "./utils/api-client";
export type { ApiClient, ApiContext } from "./utils/api-client";

// Response helpers
export {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from "./utils/response-helpers";

// Schema helpers
export {
  idSchema,
  dateSchema,
  dateTimeSchema,
  amountSchema,
  budgetTypeSchema,
  limitActionSchema,
  analyticsWindowSchema,
  validationContextSchema,
  budgetAlertSchema,
  budgetNotificationsSchema,
  paginationSchema,
} from "./utils/schema-helpers";
