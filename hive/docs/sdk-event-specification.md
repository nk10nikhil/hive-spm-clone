# Aden SDK Trace Event Specification

**Version:** 2.0.0
**Last Updated:** 2026-01-08

This document defines the authoritative specification for all events transmitted between the Aden SDK and the Aden Hive control server.

---

## Table of Contents

1. [Overview](#overview)
2. [Event Types](#event-types)
3. [MetricEvent](#metricevent)
4. [ContentCapture (Layer 0)](#contentcapture-layer-0)
5. [ToolCallCapture (Layer 6)](#toolcallcapture-layer-6)
6. [ControlEvent](#controlevent)
7. [HeartbeatEvent](#heartbeatevent)
8. [ErrorEvent](#errorevent)
9. [API Endpoints](#api-endpoints)
10. [Storage Architecture](#storage-architecture)

---

## Overview

The Aden SDK captures telemetry from LLM API calls and transmits events to the Aden Hive server for:
- **Observability**: Token usage, latency, cost tracking
- **Governance**: Content capture, tool call validation
- **Control**: Budget enforcement, rate limiting, model degradation

### Providers Supported

| Provider | Value |
|----------|-------|
| OpenAI | `openai` |
| Anthropic | `anthropic` |
| Google Gemini | `gemini` |

### Transport

Events are sent via:
- **HTTP POST** to `/v1/control/events` (batch)
- **WebSocket** for real-time policy sync

---

## Event Types

| Event Type | Description | Direction |
|------------|-------------|-----------|
| `metric` | LLM call telemetry | SDK → Server |
| `control` | Control action taken | SDK → Server |
| `heartbeat` | Health status | SDK → Server |
| `error` | Error report | SDK → Server |

---

## MetricEvent

The primary event emitted after each LLM API call. Contains flat fields for consistent cross-provider analytics.

### Envelope Structure

```json
{
  "event_type": "metric",
  "timestamp": "2026-01-08T12:00:00.000Z",
  "sdk_instance_id": "uuid-v4",
  "data": { /* MetricEvent fields */ }
}
```

### MetricEvent Fields

#### Identity (OpenTelemetry-compatible)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trace_id` | string | **Yes** | Trace ID grouping related operations |
| `span_id` | string | Yes | Unique span ID for this operation |
| `parent_span_id` | string | No | Parent span for nested calls |
| `request_id` | string | No | Provider-specific request ID |
| `call_sequence` | integer | Yes | Sequence number within the trace |

#### Provider & Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | **Yes** | `openai`, `anthropic`, `gemini` |
| `model` | string | **Yes** | Model identifier (e.g., `gpt-4o`, `claude-3-opus`) |
| `stream` | boolean | Yes | Whether streaming was enabled |
| `timestamp` | string | **Yes** | ISO 8601 timestamp of request start |

#### Performance

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latency_ms` | float | Yes | Request latency in milliseconds |
| `status_code` | integer | No | HTTP status code |
| `error` | string | No | Error message if request failed |

#### Token Usage

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input_tokens` | integer | Yes | Input/prompt tokens consumed |
| `output_tokens` | integer | Yes | Output/completion tokens consumed |
| `total_tokens` | integer | Yes | Total tokens (input + output) |
| `cached_tokens` | integer | No | Tokens served from cache |
| `reasoning_tokens` | integer | No | Reasoning tokens (o1/o3 models) |

#### Rate Limits

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rate_limit_remaining_requests` | integer | No | Remaining requests in window |
| `rate_limit_remaining_tokens` | integer | No | Remaining tokens in window |
| `rate_limit_reset_requests` | float | No | Seconds until request limit resets |
| `rate_limit_reset_tokens` | float | No | Seconds until token limit resets |

#### Call Context

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_stack` | string[] | No | Stack of agent names leading to this call |
| `call_site_file` | string | No | File path of immediate caller |
| `call_site_line` | integer | No | Line number |
| `call_site_column` | integer | No | Column number |
| `call_site_function` | string | No | Function name |
| `call_stack` | string[] | No | Full call stack (file:line:function) |

#### Tool Usage (Summary)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool_call_count` | integer | No | Number of tool calls made |
| `tool_names` | string | No | Tool names (comma-separated) |

#### Provider-specific

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service_tier` | string | No | Service tier (auto, default, flex, priority) |
| `metadata` | object | No | Custom metadata attached to request |

#### Layer 0: Content Capture

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content_capture` | ContentCapture | No | Full content capture (see below) |

#### Layer 6: Tool Call Deep Inspection

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool_calls_captured` | ToolCallCapture[] | No | Detailed tool call captures |
| `tool_validation_errors_count` | integer | No | Count of validation errors |

### Example MetricEvent

```json
{
  "event_type": "metric",
  "timestamp": "2026-01-08T12:00:00.000Z",
  "sdk_instance_id": "abc123",
  "data": {
    "trace_id": "tr_abc123",
    "span_id": "sp_def456",
    "call_sequence": 1,
    "provider": "openai",
    "model": "gpt-4o",
    "stream": false,
    "latency_ms": 1234.5,
    "input_tokens": 150,
    "output_tokens": 50,
    "total_tokens": 200,
    "cached_tokens": 0,
    "agent_stack": ["main_agent", "sub_agent"],
    "tool_call_count": 2,
    "tool_names": "search,calculate",
    "metadata": {
      "user_id": "user_123",
      "session_id": "sess_456"
    },
    "content_capture": {
      "system_prompt": "You are a helpful assistant.",
      "messages": [...],
      "response_content": "Here is my response...",
      "finish_reason": "stop"
    }
  }
}
```

---

## ContentCapture (Layer 0)

Full content capture for request and response. Enables governance, debugging, and compliance.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `system_prompt` | string \| ContentReference | System prompt |
| `messages` | MessageCapture[] \| ContentReference | Message history |
| `tools` | ToolSchemaCapture[] \| ContentReference | Tools schema |
| `params` | RequestParamsCapture | Request parameters |
| `response_content` | string \| ContentReference | Response text |
| `finish_reason` | string | Why response ended: `stop`, `length`, `tool_calls`, `content_filter` |
| `choice_count` | integer | Number of choices (for n > 1) |
| `has_images` | boolean | Whether request contained images |
| `image_urls` | string[] | Image URLs (never base64) |

### ContentReference

When content exceeds `max_content_bytes`, it's stored separately and referenced:

```json
{
  "content_id": "uuid-v4",
  "content_hash": "sha256-hex",
  "byte_size": 12345,
  "truncated_preview": "First 100 chars..."
}
```

### MessageCapture

```json
{
  "role": "user|assistant|system|tool",
  "content": "string or ContentReference",
  "name": "optional name",
  "tool_call_id": "for tool results"
}
```

### ToolSchemaCapture

```json
{
  "name": "function_name",
  "description": "Tool description",
  "parameters_schema": { /* JSON Schema */ }
}
```

### RequestParamsCapture

```json
{
  "temperature": 0.7,
  "max_tokens": 1000,
  "top_p": 1.0,
  "frequency_penalty": 0,
  "presence_penalty": 0,
  "stop": ["STOP"],
  "seed": 12345,
  "top_k": 40
}
```

---

## ToolCallCapture (Layer 6)

Detailed tool call capture with validation results.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Tool call ID for correlation |
| `name` | string | Tool/function name |
| `arguments` | object \| ContentReference | Parsed arguments |
| `arguments_raw` | string \| ContentReference | Raw JSON string |
| `validation_errors` | ValidationError[] | Schema validation errors |
| `is_valid` | boolean | Whether arguments passed validation |
| `index` | integer | Position in tool_calls array |

### ValidationError

```json
{
  "path": "properties.name",
  "message": "Required property missing",
  "expected_type": "string",
  "actual_type": "undefined"
}
```

---

## ControlEvent

Emitted when a control action is taken on a request.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | string | Yes | Always `"control"` |
| `timestamp` | string | Yes | ISO 8601 timestamp |
| `sdk_instance_id` | string | Yes | SDK instance identifier |
| `trace_id` | string | Yes | Associated trace ID |
| `span_id` | string | Yes | Associated span ID |
| `provider` | string | Yes | Provider name |
| `original_model` | string | Yes | Originally requested model |
| `action` | string | Yes | Action taken (see below) |
| `reason` | string | No | Human-readable reason |
| `degraded_to` | string | No | Model switched to (if degraded) |
| `throttle_delay_ms` | integer | No | Delay applied (if throttled) |
| `estimated_cost` | float | No | Estimated cost that triggered decision |
| `policy_id` | string | Yes | Policy ID (default: `"default"`) |
| `budget_id` | string | No | Budget that triggered action |
| `context_id` | string | No | Context ID (user, session, etc.) |

### Control Actions

| Action | Description |
|--------|-------------|
| `allow` | Request proceeds normally |
| `block` | Request is rejected |
| `throttle` | Request is delayed before proceeding |
| `degrade` | Request uses a cheaper/fallback model |
| `alert` | Request proceeds but triggers alert |

### Example ControlEvent

```json
{
  "event_type": "control",
  "timestamp": "2026-01-08T12:00:00.000Z",
  "sdk_instance_id": "abc123",
  "trace_id": "tr_abc123",
  "span_id": "sp_def456",
  "provider": "openai",
  "original_model": "gpt-4o",
  "action": "degrade",
  "reason": "Budget limit exceeded",
  "degraded_to": "gpt-4o-mini",
  "estimated_cost": 0.05,
  "policy_id": "default",
  "budget_id": "budget_monthly"
}
```

---

## HeartbeatEvent

Periodic health check sent by the SDK.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | string | Yes | Always `"heartbeat"` |
| `timestamp` | string | Yes | ISO 8601 timestamp |
| `sdk_instance_id` | string | Yes | SDK instance identifier |
| `status` | string | Yes | `healthy`, `degraded`, `reconnecting` |
| `requests_since_last` | integer | Yes | Requests since last heartbeat |
| `errors_since_last` | integer | Yes | Errors since last heartbeat |
| `policy_cache_age_seconds` | integer | Yes | Policy cache age |
| `websocket_connected` | boolean | Yes | WebSocket connection status |
| `sdk_version` | string | Yes | SDK version |

---

## ErrorEvent

Emitted when an error occurs in the SDK.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | string | Yes | Always `"error"` |
| `timestamp` | string | Yes | ISO 8601 timestamp |
| `sdk_instance_id` | string | Yes | SDK instance identifier |
| `message` | string | Yes | Error message |
| `code` | string | No | Error code |
| `stack` | string | No | Stack trace |
| `trace_id` | string | No | Related trace ID |

---

## API Endpoints

### POST /v1/control/events

Submit events batch.

**Request:**
```json
{
  "events": [
    { "event_type": "metric", "timestamp": "...", "data": {...} },
    { "event_type": "control", "timestamp": "...", ... }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 2
}
```

### POST /v1/control/content

Store large content items (MongoDB - for SDK content references).

**Request:**
```json
{
  "items": [
    {
      "content_id": "uuid",
      "content_hash": "sha256-hex",
      "content": "full content string",
      "byte_size": 12345
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "stored": 1
}
```

### GET /v1/control/content/:contentId

Retrieve stored content by ID (MongoDB).

**Response:**
```json
{
  "content_id": "uuid",
  "content_hash": "sha256-hex",
  "content": "full content string",
  "byte_size": 12345
}
```

### GET /v1/control/events/:traceId/:callSequence/content

Retrieve content for a specific event from TSDB warm/cold storage.

**Response:**
```json
{
  "trace_id": "tr_abc123",
  "call_sequence": 1,
  "content_items": [
    {
      "content_type": "system_prompt",
      "content_hash": "sha256-hex",
      "byte_size": 256,
      "truncated_preview": "You are a helpful...",
      "content": "You are a helpful assistant..."
    },
    {
      "content_type": "messages",
      "content_hash": "sha256-hex",
      "byte_size": 4096,
      "message_count": 5,
      "truncated_preview": "[{\"role\":\"user\"...",
      "content": "[{\"role\":\"user\",\"content\":\"Hello\"}...]"
    },
    {
      "content_type": "response",
      "content_hash": "sha256-hex",
      "byte_size": 512,
      "truncated_preview": "Here is my response...",
      "content": "Here is my response to your question..."
    }
  ],
  "count": 3
}
```

### GET /v1/control/content/hash/:contentHash

Retrieve content from cold storage by SHA-256 hash.

**Response:**
```json
{
  "content_hash": "sha256-hex",
  "content": "full content string",
  "byte_size": 12345
}
```

### GET /v1/control/policy

Fetch current control policy.

### POST /v1/control/budget/validate

Server-side budget validation (hybrid enforcement).

---

## Storage Architecture

The storage system uses a **hot/warm/cold** architecture optimized for time-series analytics with content deduplication.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SDK Event Ingestion                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Event Normalization & Content Extraction          │
│                                                                     │
│  • Extract content_capture fields                                   │
│  • Hash content with SHA-256                                        │
│  • Create lightweight content flags for hot table                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │  HOT TABLE   │ │  WARM TABLE  │ │  COLD TABLE  │
           │  llm_events  │ │llm_event_    │ │llm_content_  │
           │              │ │   content    │ │    store     │
           │ Metrics only │ │Content refs  │ │ Deduplicated │
           │ Fast queries │ │ per event    │ │   content    │
           └──────────────┘ └──────────────┘ └──────────────┘
```

### Design Principles

1. **Hot/Cold Separation**: Metrics stay in the hot table for fast time-series queries; content is stored separately
2. **Content Deduplication**: Identical content (same SHA-256 hash) is stored once, regardless of how many events reference it
3. **Reference Counting**: Cold storage tracks how many events reference each piece of content
4. **Preview Without Fetch**: Warm table stores truncated previews for quick scanning without fetching full content

### TSDB Hot Table: `llm_events`

Stores metric events for fast time-series analytics. **Content is NOT stored here** (only lightweight flags).

| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | timestamptz | Event timestamp (partition key) |
| `ingest_date` | date | Ingestion date |
| `team_id` | text | Team identifier |
| `user_id` | text | User identifier |
| `trace_id` | text | Trace ID |
| `span_id` | text | Span ID |
| `parent_span_id` | text | Parent span ID |
| `request_id` | text | Provider request ID |
| `provider` | text | Provider name |
| `call_sequence` | integer | Sequence within trace |
| `model` | text | Model identifier |
| `stream` | boolean | Streaming flag |
| `agent` | text | Primary agent name |
| `agent_stack` | jsonb | Full agent stack |
| `latency_ms` | double precision | Latency in ms |
| `usage_input_tokens` | double precision | Input tokens |
| `usage_output_tokens` | double precision | Output tokens |
| `usage_total_tokens` | double precision | Total tokens |
| `usage_cached_tokens` | double precision | Cached tokens |
| `usage_reasoning_tokens` | double precision | Reasoning tokens |
| `cost_total` | numeric | Calculated cost |
| `metadata` | jsonb | Custom metadata |
| `call_site` | jsonb | Call site info |
| `has_content` | boolean | Whether content was captured |
| `finish_reason` | text | Response finish reason |
| `tool_call_count` | integer | Number of tool calls |
| `created_at` | timestamptz | Record creation time |

**Primary Key:** `(timestamp, trace_id, call_sequence)`

**Indexes:**
- `idx_llm_events_ts` - timestamp DESC
- `idx_llm_events_team_ts` - team_id, timestamp DESC
- `idx_llm_events_model` - model
- `idx_llm_events_agent` - agent
- `idx_llm_events_trace` - trace_id

### TSDB Warm Table: `llm_event_content`

Links events to deduplicated content in cold storage. One row per content type per event.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial | Auto-increment ID |
| `timestamp` | timestamptz | Event timestamp |
| `trace_id` | text | Trace ID |
| `call_sequence` | integer | Sequence within trace |
| `team_id` | text | Team identifier |
| `content_type` | text | Type: `system_prompt`, `messages`, `response`, `tools`, `params` |
| `content_hash` | text | SHA-256 hash (FK to cold store) |
| `byte_size` | integer | Content size in bytes |
| `message_count` | integer | Number of messages (for `messages` type) |
| `truncated_preview` | text | First 200 chars for quick preview |
| `created_at` | timestamptz | Record creation time |

**Primary Key:** `(id)`

**Indexes:**
- `idx_llm_event_content_event` - trace_id, call_sequence, timestamp
- `idx_llm_event_content_type` - team_id, content_type, timestamp DESC
- `idx_llm_event_content_hash` - content_hash

### TSDB Cold Table: `llm_content_store`

Content-addressable storage with SHA-256 hashes. Deduplicated across all events.

| Column | Type | Description |
|--------|------|-------------|
| `content_hash` | text | SHA-256 hash of content (PK) |
| `team_id` | text | Team identifier (PK) |
| `content` | text | Full content string |
| `byte_size` | integer | Content size in bytes |
| `ref_count` | integer | Number of events referencing this content |
| `first_seen_at` | timestamptz | When content was first stored |
| `last_seen_at` | timestamptz | When content was last referenced |

**Primary Key:** `(content_hash, team_id)`

**Indexes:**
- `idx_llm_content_store_refs` - team_id, ref_count, last_seen_at (for cleanup)

### MongoDB: `aden_control_content`

Stores large content items from SDK's content reference system (separate from TSDB storage).

| Field | Type | Description |
|-------|------|-------------|
| `content_id` | string | Unique content identifier |
| `team_id` | string | Team identifier |
| `content_hash` | string | SHA-256 hash |
| `content` | string | Full content |
| `byte_size` | number | Content size in bytes |
| `created_at` | string | Creation timestamp |
| `updated_at` | string | Last update timestamp |

**Index:** `{ content_id: 1, team_id: 1 }` (unique)

### MongoDB: `aden_control_policies`

Stores control policies for teams.

---

## Content Types

The warm table stores references to different content types:

| Type | Description | Example |
|------|-------------|---------|
| `system_prompt` | System/developer message | "You are a helpful assistant..." |
| `messages` | Full conversation history | JSON array of messages |
| `response` | Model's response content | "Here is my response..." |
| `tools` | Tool/function schemas | JSON array of tool definitions |
| `params` | Request parameters | `{"temperature": 0.7, "max_tokens": 1000}` |

---

## Deduplication Example

When the same system prompt is used across multiple requests:

```
Request 1: system_prompt = "You are a helpful assistant."
  → Hash: abc123...
  → Cold store: INSERT (ref_count = 1)
  → Warm store: INSERT reference for event 1

Request 2: system_prompt = "You are a helpful assistant." (same)
  → Hash: abc123... (same hash)
  → Cold store: UPDATE ref_count = 2
  → Warm store: INSERT reference for event 2

Request 3: system_prompt = "You are a code reviewer."
  → Hash: def456... (different)
  → Cold store: INSERT (ref_count = 1)
  → Warm store: INSERT reference for event 3
```

This means the first system prompt is stored **once** but referenced by two events.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-01-08 | Hot/warm/cold storage architecture; content deduplication |
| 1.0.0 | 2026-01-08 | Initial specification |
