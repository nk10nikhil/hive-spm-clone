/**
 * Aden Hive MCP Server
 *
 * MCP server with tools for:
 * - Cost control (budget management)
 * - Agent status (fleet monitoring)
 * - Analytics (insights, metrics, logs)
 * - Policy management
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApiClient, type ApiContext } from "./utils/api-client";
import { registerBudgetTools } from "./tools/budget";
import { registerAgentTools, type ControlEmitter } from "./tools/agents";
import { registerAnalyticsTools } from "./tools/analytics";
import { registerPolicyTools } from "./tools/policies";

export interface HiveMcpServerOptions {
  context: ApiContext;
  getControlEmitter?: () => ControlEmitter | undefined;
}

/**
 * Create and configure the Aden Hive MCP server
 */
export function createHiveMcpServer(options: HiveMcpServerOptions): McpServer {
  const { context, getControlEmitter } = options;

  // Create MCP server
  const server = new McpServer({
    name: "aden-hive",
    version: "1.0.0",
  });

  // Create API client bound to team context
  const api = createApiClient(context);

  // Register all tool categories
  registerBudgetTools(server, api);
  registerAgentTools(server, api, getControlEmitter || (() => undefined));
  registerAnalyticsTools(server, api);
  registerPolicyTools(server, api);

  console.log(
    `[MCP] Aden Hive server created with ${19} tools for team ${context.teamId}`
  );

  return server;
}

/**
 * Tool categories and counts for reference
 */
export const TOOL_CATALOG = {
  budget: {
    count: 6,
    tools: [
      "hive_budget_get",
      "hive_budget_reset",
      "hive_budget_validate",
      "hive_budget_rule_create",
      "hive_budget_rule_update",
      "hive_budget_rule_delete",
    ],
  },
  agents: {
    count: 3,
    tools: ["hive_agents_list", "hive_agent_health_check", "hive_agents_summary"],
  },
  analytics: {
    count: 5,
    tools: [
      "hive_analytics_wide",
      "hive_analytics_narrow",
      "hive_insights",
      "hive_metrics",
      "hive_logs",
    ],
  },
  policies: {
    count: 5,
    tools: [
      "hive_policies_list",
      "hive_policy_get",
      "hive_policy_create",
      "hive_policy_update",
      "hive_policy_clear",
    ],
  },
  total: 19,
};
