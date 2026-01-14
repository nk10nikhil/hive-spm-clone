Quick reference for integrating Aden LLM observability & cost control into TypeScript/JavaScript agents.

## Prerequisites

`.env` file should contain:

```
OPENAI_API_KEY=sk-xxx          {{envVarComment}}
ADEN_API_URL={{serverUrl}}
ADEN_API_KEY={{apiKey}}
```

## Installation

```bash
npm install aden-ts dotenv

# Install the LLM SDKs you use
npm install openai                  # For OpenAI
npm install @anthropic-ai/sdk       # For Anthropic
npm install @google/generative-ai   # For Google Gemini
```

## Basic Setup

### 1. Import Aden and SDK (at top of file)

```typescript
import "dotenv/config";
import OpenAI from "openai";
import {
  instrument,
  uninstrument,
  createConsoleEmitter,
  RequestCancelledError,
} from "aden-ts";
import type { BeforeRequestContext, BeforeRequestResult } from "aden-ts";
```

### 2. Define Before Request Callback (optional)

```typescript
// Custom logic before each LLM request
// Budget enforcement is handled server-side by the control agent
function beforeRequest(
  _params: Record<string, unknown>,
  context: BeforeRequestContext
): BeforeRequestResult {
  console.log(`[Aden] Request to model: ${context.model}`);
  return { action: "proceed" };
}
```

### 3. Initialize Aden (at startup, BEFORE using SDK)

```typescript
await instrument({
  apiKey: process.env.ADEN_API_KEY,
  serverUrl: process.env.ADEN_API_URL,
  emitMetric: createConsoleEmitter({ pretty: true }),
  onAlert: (alert: { level: string; message: string }) =>
    console.log(`[Aden ${alert.level}] ${alert.message}`),
  beforeRequest,
  sdks: { OpenAI },
});
```

### 4. Handle Budget Errors in Your Agent

```typescript
async function runAgent(userInput: string): Promise<string> {
  try {
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: userInput }],
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (e) {
    if (e instanceof RequestCancelledError) {
      return `Sorry, your budget has been exhausted. ${e.message}`;
    }
    throw e;
  }
}
```

### 5. Cleanup (on exit)

```typescript
await uninstrument();
```

## Complete Template (Direct SDK Usage)

```typescript
/**
 * Agent with Aden instrumentation - Direct SDK usage
 */
import "dotenv/config";
import OpenAI from "openai";
import {
  instrument,
  uninstrument,
  createConsoleEmitter,
  RequestCancelledError,
} from "aden-ts";
import type { BeforeRequestContext, BeforeRequestResult } from "aden-ts";

// Before request callback (optional)
function beforeRequest(
  _params: Record<string, unknown>,
  context: BeforeRequestContext
): BeforeRequestResult {
  console.log(`[Aden] Request to model: ${context.model}`);
  return { action: "proceed" };
}

// Initialize Aden FIRST
await instrument({
  apiKey: process.env.ADEN_API_KEY,
  serverUrl: process.env.ADEN_API_URL,
  emitMetric: createConsoleEmitter({ pretty: true }),
  onAlert: (alert: { level: string; message: string }) =>
    console.log(`[Aden ${alert.level}] ${alert.message}`),
  beforeRequest,
  sdks: { OpenAI },
});

// === YOUR AGENT CODE HERE ===

async function runAgent(userInput: string): Promise<string> {
  try {
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: userInput }],
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (e) {
    if (e instanceof RequestCancelledError) {
      return `Sorry, your budget has been exhausted. ${e.message}`;
    }
    throw e;
  }
}

// Main entry point
async function main() {
  try {
    const result = await runAgent("Hello, world!");
    console.log(result);
  } finally {
    await uninstrument();
  }
}

main();
```

## LangChain / LangGraph Integration

When using LangChain or LangGraph, you **MUST** use dynamic imports to ensure instrumentation is applied before LangChain loads the SDK.

### Critical: SDK Version Matching

LangChain bundles its own SDK dependencies. To ensure instrumentation works, your SDK version must match LangChain's:

```bash
# Check what version LangChain uses
cat node_modules/@langchain/anthropic/node_modules/@anthropic-ai/sdk/package.json | grep version

# Update your package.json to match that version
# e.g., "@anthropic-ai/sdk": "^0.65.0"

# Reinstall to dedupe
rm -rf node_modules package-lock.json && npm install

# Verify no nested SDK (should show "No such file")
ls node_modules/@langchain/anthropic/node_modules 2>/dev/null || echo "OK: SDK is shared"
```

### LangChain Template

```typescript
/**
 * LangGraph Agent with Aden instrumentation
 * Key: Use dynamic imports AFTER instrument()
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  instrument,
  uninstrument,
  createConsoleEmitter,
  RequestCancelledError,
} from "aden-ts";
import type { BeforeRequestContext, BeforeRequestResult } from "aden-ts";

function beforeRequest(
  _params: Record<string, unknown>,
  context: BeforeRequestContext
): BeforeRequestResult {
  console.log(`[Aden] Request to model: ${context.model}`);
  return { action: "proceed" };
}

async function main() {
  // 1. Initialize Aden FIRST (before any LangChain imports)
  await instrument({
    apiKey: process.env.ADEN_API_KEY,
    serverUrl: process.env.ADEN_API_URL,
    emitMetric: createConsoleEmitter({ pretty: true }),
    onAlert: (alert: { level: string; message: string }) =>
      console.log(`[Aden ${alert.level}] ${alert.message}`),
    beforeRequest,
    sdks: { Anthropic },
  });

  // 2. Dynamic imports AFTER instrumentation
  const { ChatAnthropic } = await import("@langchain/anthropic");
  const { HumanMessage } = await import("@langchain/core/messages");
  // ... other LangChain imports

  // 3. Now create your LangChain components
  const model = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0,
  });

  try {
    // Your agent logic here
    const response = await model.invoke([new HumanMessage("Hello!")]);
    console.log(response.content);
  } catch (error) {
    if (error instanceof RequestCancelledError) {
      console.log(`Budget exhausted: ${error.message}`);
    } else {
      throw error;
    }
  } finally {
    await uninstrument();
  }
}

main();
```

## BeforeRequestContext Reference

The `context` parameter in `beforeRequest` contains:

| Field | Type | Description |
| --- | --- | --- |
| `model` | string | Model being used for this request |
| `stream` | boolean | Whether this is a streaming request |
| `spanId` | string | Generated span ID (OTel standard) |
| `traceId` | string | Trace ID grouping related operations |
| `timestamp` | Date | When the request was initiated |
| `metadata` | Record<string, unknown> | Custom metadata (optional) |

## BeforeRequestResult Actions

| Action | Usage | Behavior |
| --- | --- | --- |
| `{ action: "proceed" }` | Allow request | Request continues normally |
| `{ action: "cancel", reason: "..." }` | Block request | Throws `RequestCancelledError` |
| `{ action: "throttle", delayMs: N }` | Rate limit | Delays request by N ms |
| `{ action: "degrade", toModel: "...", reason: "..." }` | Downgrade | Switches to specified model |

## Key Points

- Module name is `aden-ts` (not `aden`)
- `emitMetric` is **required** - use `createConsoleEmitter({ pretty: true })` for dev
- Budget enforcement is handled **server-side** by the control agent
- Always wrap agent calls in `try/catch` for `RequestCancelledError`
- Call `await uninstrument()` on exit to flush remaining metrics
- Control agent connects automatically when `apiKey` + `serverUrl` are provided
- **LangChain users**: Must use dynamic imports and match SDK versions

## Troubleshooting

### No metrics being captured

1. **Check SDK version match**: Run `npm ls @anthropic-ai/sdk` - should show only ONE version
2. **Use dynamic imports**: Import LangChain modules AFTER `instrument()` is called
3. **Verify instrumentation**: Look for `[aden] Instrumented: anthropic + control agent` at startup

### RequestCancelledError not thrown

Budget enforcement is server-side. Ensure:
- `ADEN_API_KEY` and `ADEN_API_URL` are set correctly
- Control agent connection is established (check startup logs)

## Documentation

Full docs: [https://www.npmjs.com/package/aden-ts](https://www.npmjs.com/package/aden-ts)
