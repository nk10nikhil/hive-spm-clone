/**
 * Zod schema helpers for MCP tools
 */
import { z } from "zod";

// Basic types
export const idSchema = z.string().min(1).describe("Unique identifier");
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Date in YYYY-MM-DD format");
export const dateTimeSchema = z
  .string()
  .datetime()
  .describe("ISO 8601 datetime string");
export const amountSchema = z.number().describe("Monetary amount in USD");

// Budget types
export const budgetTypeSchema = z
  .enum(["global", "agent", "tenant", "customer", "feature", "tag"])
  .describe("Type of budget scope");

export const limitActionSchema = z
  .enum(["kill", "throttle", "degrade"])
  .describe("Action when budget limit exceeded");

// Pagination
export const paginationSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(1000)
    .default(100)
    .describe("Max items to return"),
  offset: z.number().min(0).default(0).describe("Number of items to skip"),
});

// Analytics window
export const analyticsWindowSchema = z
  .enum(["all_time", "this_month", "this_week", "last_2_weeks", "today"])
  .default("this_month")
  .describe("Time window for analytics data");

// Budget validation context
export const validationContextSchema = z
  .object({
    agent: z.string().optional().describe("Agent name for agent-type budgets"),
    tenant_id: z
      .string()
      .optional()
      .describe("Tenant ID for tenant-type budgets"),
    customer_id: z
      .string()
      .optional()
      .describe("Customer ID for customer-type budgets"),
    feature: z.string().optional().describe("Feature name for feature-type budgets"),
    tags: z.array(z.string()).optional().describe("Tags for tag-type budgets"),
  })
  .describe("Context for multi-budget matching");

// Budget alert configuration
export const budgetAlertSchema = z.object({
  threshold: z
    .number()
    .min(0)
    .max(100)
    .describe("Alert threshold as percentage of limit"),
  enabled: z.boolean().describe("Whether alert is enabled"),
});

// Budget notifications configuration
export const budgetNotificationsSchema = z.object({
  inApp: z.boolean().default(true).describe("Enable in-app notifications"),
  email: z.boolean().default(false).describe("Enable email notifications"),
  emailRecipients: z
    .array(z.string().email())
    .default([])
    .describe("Email recipients"),
  webhook: z.boolean().default(false).describe("Enable webhook notifications"),
});
