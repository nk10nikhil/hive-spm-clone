/**
 * MCP response formatting helpers
 */

export interface MCPResponse {
  [key: string]: unknown;
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Create a successful MCP response
 */
export function createSuccessResponse(data: unknown): MCPResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Create an error MCP response
 */
export function createErrorResponse(
  error: string,
  details?: unknown
): MCPResponse {
  const errorData = {
    error,
    ...(details && { details }),
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(errorData, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Handle tool errors consistently
 */
export function handleToolError(error: unknown, toolName: string): MCPResponse {
  console.error(`[MCP] Error in ${toolName}:`, error);

  if (error instanceof Error) {
    return createErrorResponse(error.message, {
      tool: toolName,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }

  return createErrorResponse("Unknown error occurred", { tool: toolName });
}
