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

## Complete Template

```typescript
/**
 * Agent with Aden instrumentation
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

## Documentation

Full docs: [https://www.npmjs.com/package/aden-ts](https://www.npmjs.com/package/aden-ts)
