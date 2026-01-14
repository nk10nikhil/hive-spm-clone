/**
 * Internal API client for MCP tools
 *
 * This client makes direct calls to the control and tsdb services
 * rather than HTTP calls, since we're running inside the same process.
 */
import controlService from "../../services/control/control_service";
import * as tsdbService from "../../services/tsdb/tsdb_service";
import { buildAnalytics } from "../../services/tsdb/analytics_service";
import { getTeamPool, buildSchemaName } from "../../services/tsdb/team_context";
import type { PoolClient } from "pg";

export interface ApiContext {
  teamId: string;
  userId?: string;
}

export interface BudgetRule {
  id: string;
  name?: string;
  type?: string;
  tags?: string[];
  limit?: number;
  spent?: number;
  limitAction?: string;
  degradeToModel?: string;
  degradeToProvider?: string;
  alerts?: Array<{ threshold: number; enabled: boolean }>;
  notifications?: {
    inApp: boolean;
    email: boolean;
    emailRecipients: string[];
    webhook: boolean;
  };
}

export interface ValidationContext {
  agent?: string;
  tenant_id?: string;
  customer_id?: string;
  feature?: string;
  tags?: string[];
}

/**
 * Create an API client bound to a specific team context
 */
export function createApiClient(context: ApiContext) {
  const userContext = {
    user_id: context.userId || "mcp-agent",
    team_id: context.teamId,
  };

  return {
    // ==================== Budget Operations ====================
    budget: {
      /**
       * Get budget status by ID
       */
      async getStatus(budgetId: string) {
        return controlService.getBudgetStatus(budgetId);
      },

      /**
       * Reset budget spend to zero
       */
      async reset(budgetId: string) {
        await controlService.resetBudget(budgetId);
        return { success: true, id: budgetId };
      },

      /**
       * Validate a request against budgets
       */
      async validate(params: {
        budgetId?: string;
        estimatedCost: number;
        context?: ValidationContext;
        localSpend?: number;
      }) {
        // Get the policy to validate against
        const policy = await controlService.getPolicy(
          context.teamId,
          null,
          userContext
        );

        if (!policy) {
          return {
            allowed: true,
            action: "allow",
            reason: "No policy found",
            budgets_checked: [],
          };
        }

        // Multi-budget validation using context
        if (params.context && typeof params.context === "object") {
          const matchingBudgets = controlService.findMatchingBudgetsForContext(
            policy.budgets || [],
            params.context
          );

          if (matchingBudgets.length === 0) {
            return {
              allowed: true,
              action: "allow",
              reason: "No budgets match the provided context",
              authoritative_spend: 0,
              budget_limit: 0,
              usage_percent: 0,
              projected_percent: 0,
              budgets_checked: [],
            };
          }

          return controlService.validateMultipleBudgets(
            matchingBudgets,
            params.estimatedCost,
            params.localSpend
          );
        }

        // Single budget validation
        if (params.budgetId) {
          const budget = policy.budgets?.find(
            (b: { id: string }) => b.id === params.budgetId
          );
          if (!budget) {
            return {
              allowed: true,
              action: "allow",
              reason: "Budget not found in policy",
              budgets_checked: [],
            };
          }

          return controlService.validateMultipleBudgets(
            [budget],
            params.estimatedCost,
            params.localSpend
          );
        }

        return {
          allowed: true,
          action: "allow",
          reason: "No budget_id or context provided",
          budgets_checked: [],
        };
      },
    },

    // ==================== Policy Operations ====================
    policy: {
      /**
       * Get all policies for the team
       */
      async list(pagination?: { limit?: number; offset?: number }) {
        return controlService.getPoliciesByTeam(context.teamId, {
          limit: pagination?.limit || 100,
          offset: pagination?.offset || 0,
        });
      },

      /**
       * Get a specific policy
       */
      async get(policyId: string | null) {
        const resolvedId =
          policyId === "default" || !policyId ? null : policyId;
        return controlService.getPolicy(context.teamId, resolvedId, userContext);
      },

      /**
       * Create a new policy
       */
      async create(name: string) {
        return controlService.updatePolicy(
          context.teamId,
          null,
          { name },
          userContext
        );
      },

      /**
       * Update a policy
       */
      async update(
        policyId: string | null,
        updates: {
          name?: string;
          budgets?: unknown[];
          throttles?: unknown[];
          blocks?: unknown[];
          degradations?: unknown[];
        }
      ) {
        const resolvedId =
          policyId === "default" || !policyId ? null : policyId;
        return controlService.updatePolicy(
          context.teamId,
          resolvedId,
          updates as Record<string, unknown>,
          userContext
        );
      },

      /**
       * Clear all rules from a policy
       */
      async clear(policyId: string | null) {
        const resolvedId =
          policyId === "default" || !policyId ? null : policyId;
        return controlService.clearPolicy(
          context.teamId,
          resolvedId,
          userContext
        );
      },

      /**
       * Delete a policy
       */
      async delete(policyId: string) {
        return controlService.deletePolicy(
          context.teamId,
          policyId,
          userContext
        );
      },

      /**
       * Add a budget rule to a policy
       */
      async addBudgetRule(policyId: string | null, rule: BudgetRule) {
        const resolvedId =
          policyId === "default" || !policyId ? null : policyId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return controlService.addBudgetRule(
          context.teamId,
          resolvedId,
          rule as any,
          userContext
        );
      },
    },

    // ==================== Analytics Operations ====================
    analytics: {
      /**
       * Get wide analytics (daily resolution)
       */
      async getWide(window: string = "this_month") {
        const pool = await getTeamPool(context.teamId);
        const schema = buildSchemaName(context.teamId);
        const client = await pool.connect();

        try {
          await client.query(`SET search_path TO ${schema}, public`);
          await tsdbService.ensureSchema(client);

          return buildAnalytics({
            windowLabel: window,
            client,
            resolution: "day",
          });
        } finally {
          client.release();
        }
      },

      /**
       * Get narrow analytics (hourly resolution for today)
       */
      async getNarrow() {
        const pool = await getTeamPool(context.teamId);
        const schema = buildSchemaName(context.teamId);
        const client = await pool.connect();

        try {
          await client.query(`SET search_path TO ${schema}, public`);
          await tsdbService.ensureSchema(client);

          return buildAnalytics({
            windowLabel: "today",
            client,
            resolution: "hour",
          });
        } finally {
          client.release();
        }
      },

      /**
       * Get actionable insights
       */
      async getInsights(days: number = 30) {
        const pool = await getTeamPool(context.teamId);
        const schema = buildSchemaName(context.teamId);
        const client = await pool.connect();

        try {
          await client.query(`SET search_path TO ${schema}, public`);
          await tsdbService.ensureSchema(client);

          // Use the insights generation logic from tsdb controller
          // This is a simplified version - full implementation would mirror the controller
          return this._generateInsights(client, days);
        } finally {
          client.release();
        }
      },

      /**
       * Get summary metrics with period-over-period change
       */
      async getMetrics(days: number = 30) {
        const pool = await getTeamPool(context.teamId);
        const schema = buildSchemaName(context.teamId);
        const client = await pool.connect();

        try {
          await client.query(`SET search_path TO ${schema}, public`);
          await tsdbService.ensureSchema(client);

          return this._generateMetrics(client, days);
        } finally {
          client.release();
        }
      },

      /**
       * Get logs (raw or aggregated)
       */
      async getLogs(params: {
        start: string;
        end: string;
        groupBy?: string;
        limit?: number;
        offset?: number;
      }) {
        const pool = await getTeamPool(context.teamId);
        const schema = buildSchemaName(context.teamId);
        const client = await pool.connect();

        try {
          await client.query(`SET search_path TO ${schema}, public`);
          await tsdbService.ensureSchema(client);

          return this._getLogs(client, params);
        } finally {
          client.release();
        }
      },

      // Internal helper methods
      async _generateInsights(client: PoolClient, days: number) {
        // Simplified insights generation
        const now = new Date();
        const periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - days);

        const { rows } = await client.query(
          `
          SELECT
            COUNT(*) as total_requests,
            COALESCE(SUM(cost_total), 0) as total_cost,
            COALESCE(AVG(latency_ms), 0) as avg_latency
          FROM llm_events
          WHERE "timestamp" >= $1 AND "timestamp" <= $2
        `,
          [periodStart.toISOString(), now.toISOString()]
        );

        const stats = rows[0];
        const insights = [];

        // Basic usage summary insight
        insights.push({
          id: "usage_snapshot",
          severity: "summary",
          title: "Period usage summary",
          description: `${parseInt(stats.total_requests).toLocaleString()} requests totaling $${parseFloat(stats.total_cost).toFixed(2)} over the last ${days} days.`,
          metric: {
            total_requests: parseInt(stats.total_requests),
            total_cost: parseFloat(stats.total_cost),
          },
        });

        return {
          period: { days, start: periodStart.toISOString(), end: now.toISOString() },
          insights,
          summary: {
            total: insights.length,
            critical: insights.filter((i) => i.severity === "critical").length,
            warning: insights.filter((i) => i.severity === "warning").length,
            info: insights.filter((i) => i.severity === "info").length,
          },
        };
      },

      async _generateMetrics(client: PoolClient, days: number) {
        const now = new Date();
        const currentStart = new Date(now);
        currentStart.setDate(currentStart.getDate() - days);

        const { rows } = await client.query(
          `
          SELECT
            COUNT(*) as total_requests,
            COUNT(DISTINCT trace_id) as unique_traces,
            COALESCE(SUM(usage_input_tokens), 0) as total_input_tokens,
            COALESCE(SUM(usage_output_tokens), 0) as total_output_tokens,
            COALESCE(SUM(cost_total), 0) as total_cost,
            COALESCE(AVG(latency_ms), 0) as avg_latency_ms
          FROM llm_events
          WHERE "timestamp" >= $1 AND "timestamp" <= $2
        `,
          [currentStart.toISOString(), now.toISOString()]
        );

        const stats = rows[0];

        return {
          period: { days, start: currentStart.toISOString(), end: now.toISOString() },
          volume: {
            total_requests: parseInt(stats.total_requests),
            unique_traces: parseInt(stats.unique_traces),
          },
          tokens: {
            total_input_tokens: parseInt(stats.total_input_tokens),
            total_output_tokens: parseInt(stats.total_output_tokens),
          },
          cost: {
            total_cost: parseFloat(stats.total_cost),
          },
          performance: {
            avg_latency_ms: parseFloat(stats.avg_latency_ms),
          },
        };
      },

      async _getLogs(
        client: PoolClient,
        params: {
          start: string;
          end: string;
          groupBy?: string;
          limit?: number;
          offset?: number;
        }
      ) {
        const { start, end, groupBy, limit = 500, offset = 0 } = params;

        if (groupBy) {
          const validFields = ["model", "agent", "provider"];
          const groupFields = groupBy
            .split(",")
            .map((f) => f.trim())
            .filter((f) => validFields.includes(f));

          if (groupFields.length > 0) {
            const selectFields = groupFields.join(", ");
            const { rows } = await client.query(
              `
              SELECT
                ${selectFields},
                COUNT(*) as request_count,
                COALESCE(SUM(cost_total), 0) as total_cost
              FROM llm_events
              WHERE "timestamp" >= $1 AND "timestamp" <= $2
              GROUP BY ${selectFields}
              ORDER BY total_cost DESC
              LIMIT $3 OFFSET $4
            `,
              [start, end, limit, offset]
            );

            return {
              window: { start, end },
              group_by: groupFields,
              count: rows.length,
              aggregations: rows,
            };
          }
        }

        // Raw logs
        const { rows } = await client.query(
          `
          SELECT *
          FROM llm_events
          WHERE "timestamp" >= $1 AND "timestamp" <= $2
          ORDER BY "timestamp" DESC
          LIMIT $3 OFFSET $4
        `,
          [start, end, limit, offset]
        );

        return {
          window: { start, end },
          count: rows.length,
          rows,
        };
      },
    },

    // ==================== Agent Status Operations ====================
    agents: {
      /**
       * Get connected agent instances
       * This requires access to the controlEmitter which is set on the Express app
       */
      getList(controlEmitter?: {
        getConnectedCount: (teamId: string) => number;
        getConnectedInstances: (teamId: string) => unknown[];
      }) {
        if (!controlEmitter) {
          return {
            active: false,
            count: 0,
            instances: [],
            timestamp: new Date().toISOString(),
            error: "WebSocket not initialized",
          };
        }

        const count = controlEmitter.getConnectedCount(context.teamId);
        const instances = controlEmitter.getConnectedInstances(context.teamId);

        return {
          active: count > 0,
          count,
          instances,
          timestamp: new Date().toISOString(),
        };
      },

      /**
       * Get agent fleet summary
       */
      getSummary(controlEmitter?: {
        getConnectedCount: (teamId: string) => number;
        getConnectedInstances: (teamId: string) => Array<{
          instance_id: string;
          agent?: string;
          last_heartbeat: string;
        }>;
      }) {
        if (!controlEmitter) {
          return {
            total_active: 0,
            healthy: 0,
            unhealthy: 0,
            stale_connections: 0,
            by_agent_name: {},
            timestamp: new Date().toISOString(),
            error: "WebSocket not initialized",
          };
        }

        const instances = controlEmitter.getConnectedInstances(context.teamId);
        const now = Date.now();
        const STALE_THRESHOLD_MS = 60000; // 60 seconds

        let healthy = 0;
        let unhealthy = 0;
        const byAgentName: Record<
          string,
          { count: number; healthy: number; unhealthy: number }
        > = {};

        for (const instance of instances) {
          const lastHeartbeat = new Date(instance.last_heartbeat).getTime();
          const isHealthy = now - lastHeartbeat < STALE_THRESHOLD_MS;

          if (isHealthy) {
            healthy++;
          } else {
            unhealthy++;
          }

          const agentName = instance.agent || "unknown";
          if (!byAgentName[agentName]) {
            byAgentName[agentName] = { count: 0, healthy: 0, unhealthy: 0 };
          }
          byAgentName[agentName].count++;
          if (isHealthy) {
            byAgentName[agentName].healthy++;
          } else {
            byAgentName[agentName].unhealthy++;
          }
        }

        return {
          total_active: instances.length,
          healthy,
          unhealthy,
          stale_connections: unhealthy,
          by_agent_name: byAgentName,
          timestamp: new Date().toISOString(),
        };
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
