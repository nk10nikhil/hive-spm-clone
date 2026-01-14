Quick reference for integrating Aden LLM observability & cost control into Python agents.

## Prerequisites

`.env` file should contain:

```
OPENAI_API_KEY=sk-xxx          {{envVarComment}}
ADEN_API_URL={{serverUrl}}
ADEN_API_KEY={{apiKey}}

```

## Installation

```bash
pip install aden-py python-dotenv

```

## Basic Setup (3 Steps)

### 1. Import and Load Environment

```python
import os
from dotenv import load_dotenv
load_dotenv()

from aden import (
    instrument,
    uninstrument,
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

### 3. Initialize Aden (at startup)

```python
instrument(MeterOptions(
    api_key=os.environ.get("ADEN_API_KEY"),
    server_url=os.environ.get("ADEN_API_URL"),
    emit_metric=create_console_emitter(pretty=True),
    on_alert=lambda alert: print(f"[Aden {alert.level}] {alert.message}"),
    before_request=budget_check,
))

```

### 4. Handle Budget Errors in Your Agent

```python
def run_agent(user_input: str):
    try:
        # Your agent logic here
        result = graph.invoke({"messages": [{"role": "user", "content": user_input}]})
        return result["messages"][-1].content
    except RequestCancelledError as e:
        return f"Sorry, you have used up your allowance. {e}"

```

### 5. Cleanup (on exit)

```python
uninstrument()

```

## Complete Template

```python
"""Agent with Aden instrumentation"""
import os
from dotenv import load_dotenv
load_dotenv()

from aden import (
    instrument, uninstrument, MeterOptions,
    create_console_emitter, BeforeRequestResult, RequestCancelledError,
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

# Initialize Aden
instrument(MeterOptions(
    api_key=os.environ.get("ADEN_API_KEY"),
    server_url=os.environ.get("ADEN_API_URL"),
    emit_metric=create_console_emitter(pretty=True),
    on_alert=lambda alert: print(f"[Aden {alert.level}] {alert.message}"),
    before_request=budget_check,
))

# === YOUR AGENT CODE HERE ===

def run_agent(user_input: str):
    try:
        # Your LLM calls here
        pass
    except RequestCancelledError as e:
        return f"Sorry, you have used up your allowance. {e}"

if __name__ == "__main__":
    try:
        # Your main loop
        pass
    finally:
        uninstrument()

```

## Budget Actions Reference

| Action | When | Behavior |
| --- | --- | --- |
| `BeforeRequestResult.proceed()` | Within budget | Request continues normally |
| `BeforeRequestResult.cancel(msg)` | Budget exhausted | Raises `RequestCancelledError` |
| `BeforeRequestResult.throttle(delay_ms=N)` | Near limit | Delays request by N ms |
| `BeforeRequestResult.degrade(to_model, reason)` | Approaching limit | Switches to cheaper model |

## Key Points

- `emit_metric` is **required** - use `create_console_emitter(pretty=True)` for dev
- `before_request` callback enables budget enforcement
- Always wrap agent calls in `try/except RequestCancelledError`
- Call `uninstrument()` on exit to flush remaining metrics
- Control agent connects automatically when `api_key` + `server_url` are provided

## Documentation

Full docs: [https://pypi.org/project/aden-py](https://pypi.org/project/aden-py/)
