# Aden-py LiveKit Integration Guide

Quick reference for integrating Aden LLM observability & cost control into LiveKit voice agents.

## Prerequisites

`.env` file should contain:
```
OPENAI_API_KEY=sk-xxx
ADEN_API_URL={{serverUrl}}
ADEN_API_KEY={{apiKey}}
```

## Installation

```bash
pip install 'aden-py[livekit]' python-dotenv
```

## Setup (4 Steps)

### 1. Import and Load Environment

```python
import os
from dotenv import load_dotenv
load_dotenv()

from aden import (
    instrument,
    MeterOptions,
    create_console_emitter,
    BeforeRequestResult,
    RequestCancelledError,
)
```

### 2. Define Budget Check Callback

```python
def budget_check(params, context):
    """Enforce budget limits before each LLM request."""
    budget_info = getattr(context, 'budget', None)

    if budget_info and budget_info.get('exhausted', False):
        return BeforeRequestResult.cancel("Budget exhausted")

    if budget_info and budget_info.get('percent_used', 0) >= 95:
        return BeforeRequestResult.throttle(delay_ms=2000)

    if budget_info and budget_info.get('percent_used', 0) >= 80:
        return BeforeRequestResult.degrade(to_model="gpt-4o-mini", reason="Approaching limit")

    return BeforeRequestResult.proceed()
```

### 3. Create Worker Prewarm Function

**IMPORTANT:** LiveKit uses multiprocessing. Instrumentation must happen in each worker process, not the main process.

```python
def initialize_aden_in_worker(proc):
    """Initialize Aden instrumentation in each worker process."""
    instrument(MeterOptions(
        api_key=os.environ.get("ADEN_API_KEY"),
        server_url=os.environ.get("ADEN_API_URL"),
        emit_metric=create_console_emitter(pretty=True),
        on_alert=lambda alert: print(f"[Aden {alert.level}] {alert.message}"),
        before_request=budget_check,
    ))
```

### 4. Pass Prewarm Function to WorkerOptions

```python
if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="my-agent",
        prewarm_fnc=initialize_aden_in_worker,  # <-- This is the key!
    ))
```

## Complete Template

```python
"""LiveKit Voice Agent with Aden instrumentation"""
import os
from dotenv import load_dotenv
load_dotenv()

from livekit import agents
from livekit.plugins import openai

from aden import (
    instrument, MeterOptions, create_console_emitter,
    BeforeRequestResult, RequestCancelledError,
)

# Budget enforcement callback
def budget_check(params, context):
    budget_info = getattr(context, 'budget', None)
    if budget_info and budget_info.get('exhausted', False):
        return BeforeRequestResult.cancel("Budget exhausted")
    if budget_info and budget_info.get('percent_used', 0) >= 95:
        return BeforeRequestResult.throttle(delay_ms=2000)
    if budget_info and budget_info.get('percent_used', 0) >= 80:
        return BeforeRequestResult.degrade(to_model="gpt-4o-mini", reason="Approaching limit")
    return BeforeRequestResult.proceed()

# Worker initialization - runs in each spawned process
def initialize_aden_in_worker(proc):
    instrument(MeterOptions(
        api_key=os.environ.get("ADEN_API_KEY"),
        server_url=os.environ.get("ADEN_API_URL"),
        emit_metric=create_console_emitter(pretty=True),
        on_alert=lambda alert: print(f"[Aden {alert.level}] {alert.message}"),
        before_request=budget_check,
    ))

async def entrypoint(ctx: agents.JobContext):
    # Your agent logic here
    session = agents.AgentSession(
        llm=openai.LLM(model="gpt-4o-mini"),
        # ...
    )
    await session.start(ctx.room)

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="my-agent",
        prewarm_fnc=initialize_aden_in_worker,
    ))
```

## Budget Actions Reference

| Action | When | Behavior |
|--------|------|----------|
| `BeforeRequestResult.proceed()` | Within budget | Request continues normally |
| `BeforeRequestResult.cancel(msg)` | Budget exhausted | Raises `RequestCancelledError` |
| `BeforeRequestResult.throttle(delay_ms=N)` | Near limit (95%+) | Delays request by N ms |
| `BeforeRequestResult.degrade(to_model, reason)` | Approaching limit (80%+) | Switches to cheaper model |

## Key Points

- **Use `prewarm_fnc`** - LiveKit spawns worker processes; instrumentation must happen in each worker
- **Don't instrument in main process** - It won't affect the worker processes where LLM calls happen
- `emit_metric` is **required** - use `create_console_emitter(pretty=True)` for dev
- Control agent connects automatically when `api_key` + `server_url` are provided

## Troubleshooting

**No metrics showing?**
- Ensure `prewarm_fnc` is set in `WorkerOptions`
- Check that `ADEN_API_KEY` and `ADEN_API_URL` are in your `.env`
- Verify you're using `aden-py[livekit]` (with the livekit extra)

**Metrics in test but not in agent?**
- LiveKit uses multiprocessing - the main process instrumentation doesn't carry over
- The `prewarm_fnc` runs in each worker before your `entrypoint` is called
