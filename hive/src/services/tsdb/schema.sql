-- TSDB schema for team-scoped hypertable (Timescale)
-- Architecture: Hot (metrics) / Warm (content refs) / Cold (content store)

-- =============================================================================
-- Enable TimescaleDB extension (required for hypertables and continuous aggregates)
-- This is safe to run multiple times - CREATE EXTENSION IF NOT EXISTS is idempotent
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- =============================================================================
-- HOT TABLE: llm_events (metrics only - fast time-series queries)
-- =============================================================================
CREATE TABLE IF NOT EXISTS llm_events (
  "timestamp" timestamptz NOT NULL,
  ingest_date date,
  team_id text NOT NULL,
  user_id text,
  trace_id text NOT NULL,
  span_id text,
  parent_span_id text,
  request_id text,
  provider text,
  call_sequence integer NOT NULL,
  model text,
  stream boolean DEFAULT false,
  agent text,
  agent_name text,
  agent_stack jsonb,
  call_site jsonb,
  metadata jsonb,
  latency_ms double precision,
  usage_input_tokens double precision,
  usage_output_tokens double precision,
  usage_total_tokens double precision,
  usage_cached_tokens double precision,
  usage_reasoning_tokens double precision,
  usage_accepted_prediction_tokens double precision,
  usage_rejected_prediction_tokens double precision,
  cost_total numeric,
  -- Content flags (lightweight references instead of full content)
  has_content boolean DEFAULT false,
  finish_reason text,
  tool_call_count integer DEFAULT 0,
  -- Deprecated: content_capture jsonb (migrated to warm storage)
  content_capture jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT llm_events_pk PRIMARY KEY ("timestamp", trace_id, call_sequence)
);

-- =============================================================================
-- WARM TABLE: llm_event_content (content references per event)
-- Links events to deduplicated content in the cold store
-- =============================================================================
CREATE TABLE IF NOT EXISTS llm_event_content (
  id bigserial,
  "timestamp" timestamptz NOT NULL,
  trace_id text NOT NULL,
  call_sequence integer NOT NULL,
  team_id text NOT NULL,
  -- Content type: 'system_prompt', 'messages', 'response', 'tools', 'params'
  content_type text NOT NULL,
  -- Reference to cold storage (content-addressable)
  content_hash text NOT NULL,
  -- Quick access metadata (no need to fetch from cold store)
  byte_size integer NOT NULL DEFAULT 0,
  message_count integer,           -- For messages type
  truncated_preview text,          -- First 200 chars for quick preview
  created_at timestamptz DEFAULT now(),
  CONSTRAINT llm_event_content_pk PRIMARY KEY (id)
);

-- Index for joining back to events
CREATE INDEX IF NOT EXISTS idx_llm_event_content_event
  ON llm_event_content (trace_id, call_sequence, "timestamp");

-- Index for content type queries
CREATE INDEX IF NOT EXISTS idx_llm_event_content_type
  ON llm_event_content (team_id, content_type, "timestamp" DESC);

-- Index for content hash lookups (finding which events use a content)
CREATE INDEX IF NOT EXISTS idx_llm_event_content_hash
  ON llm_event_content (content_hash);

-- =============================================================================
-- COLD TABLE: llm_content_store (deduplicated content storage)
-- Content-addressable storage with SHA-256 hashes
-- =============================================================================
CREATE TABLE IF NOT EXISTS llm_content_store (
  content_hash text NOT NULL,
  team_id text NOT NULL,
  content text NOT NULL,
  byte_size integer NOT NULL,
  ref_count integer DEFAULT 1,     -- Number of events referencing this content
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  CONSTRAINT llm_content_store_pk PRIMARY KEY (content_hash, team_id)
);

-- Index for cleanup queries (find orphaned content)
CREATE INDEX IF NOT EXISTS idx_llm_content_store_refs
  ON llm_content_store (team_id, ref_count, last_seen_at);

-- =============================================================================
-- MIGRATION: Add new columns to existing llm_events tables
-- =============================================================================
ALTER TABLE llm_events ADD COLUMN IF NOT EXISTS has_content boolean DEFAULT false;
ALTER TABLE llm_events ADD COLUMN IF NOT EXISTS finish_reason text;
ALTER TABLE llm_events ADD COLUMN IF NOT EXISTS tool_call_count integer DEFAULT 0;

-- Ensure primary key includes timestamp if table already existed without it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'llm_events'
      AND c.contype = 'p'
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ck.attnum
        WHERE a.attname = 'timestamp'
      )
  ) THEN
    ALTER TABLE llm_events DROP CONSTRAINT IF EXISTS llm_events_pk;
    ALTER TABLE llm_events ADD CONSTRAINT llm_events_pk PRIMARY KEY ("timestamp", trace_id, call_sequence);
  END IF;
END$$;

-- Promote to hypertable when Timescale is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM public.create_hypertable('llm_events', 'timestamp', if_not_exists => TRUE);
  END IF;
END$$;

-- Ensure metadata column exists for flexible fields
ALTER TABLE llm_events
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Ensure content_capture column exists (for Layer 0 content capture)
ALTER TABLE llm_events
  ADD COLUMN IF NOT EXISTS content_capture jsonb;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_llm_events_ts ON llm_events ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_llm_events_team_ts ON llm_events (team_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_llm_events_model ON llm_events (model);
CREATE INDEX IF NOT EXISTS idx_llm_events_agent ON llm_events (agent);
CREATE INDEX IF NOT EXISTS idx_llm_events_trace ON llm_events (trace_id);

-- Continuous aggregate: daily rollup for analytics-wide
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    CREATE MATERIALIZED VIEW IF NOT EXISTS llm_events_daily_ca
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket('1 day', "timestamp") AS bucket,
      COUNT(*) AS requests,
      SUM(cost_total) AS cost_total,
      SUM(usage_input_tokens) AS input_tokens,
      SUM(usage_output_tokens) AS output_tokens,
      SUM(COALESCE(usage_total_tokens, COALESCE(usage_input_tokens, 0) + COALESCE(usage_output_tokens, 0))) AS total_tokens,
      SUM(usage_cached_tokens) AS cached_tokens
    FROM llm_events
    GROUP BY 1
    WITH NO DATA;

    -- Initial refresh to populate the CA immediately
    CALL refresh_continuous_aggregate('llm_events_daily_ca', NULL, NOW());
  END IF;
EXCEPTION
  WHEN others THEN NULL; -- Ignore errors if CA already exists or refresh fails
END$$;

-- Index on CA for fast range scans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'llm_events_daily_ca') THEN
    CREATE INDEX IF NOT EXISTS idx_llm_events_daily_ca_bucket ON llm_events_daily_ca (bucket DESC);
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END$$;

-- Continuous aggregate: daily rollup by model for fast model-grouped queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    CREATE MATERIALIZED VIEW IF NOT EXISTS llm_events_daily_by_model_ca
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket('1 day', "timestamp") AS bucket,
      model,
      provider,
      COUNT(*) AS requests,
      SUM(cost_total) AS cost_total,
      SUM(usage_input_tokens) AS input_tokens,
      SUM(usage_output_tokens) AS output_tokens,
      SUM(COALESCE(usage_total_tokens, COALESCE(usage_input_tokens, 0) + COALESCE(usage_output_tokens, 0))) AS total_tokens,
      SUM(usage_cached_tokens) AS cached_tokens,
      AVG(latency_ms) AS avg_latency_ms
    FROM llm_events
    GROUP BY 1, 2, 3
    WITH NO DATA;

    -- Initial refresh to populate the CA immediately
    CALL refresh_continuous_aggregate('llm_events_daily_by_model_ca', NULL, NOW());
  END IF;
EXCEPTION
  WHEN others THEN NULL; -- Ignore errors if CA already exists or refresh fails
END$$;

-- Index on model CA for fast range scans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'llm_events_daily_by_model_ca') THEN
    CREATE INDEX IF NOT EXISTS idx_llm_events_daily_by_model_ca_bucket ON llm_events_daily_by_model_ca (bucket DESC);
    CREATE INDEX IF NOT EXISTS idx_llm_events_daily_by_model_ca_model ON llm_events_daily_by_model_ca (model);
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END$$;

-- Continuous aggregate: daily rollup by agent for fast agent-grouped queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    CREATE MATERIALIZED VIEW IF NOT EXISTS llm_events_daily_by_agent_ca
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket('1 day', "timestamp") AS bucket,
      agent,
      COUNT(*) AS requests,
      SUM(cost_total) AS cost_total,
      SUM(usage_input_tokens) AS input_tokens,
      SUM(usage_output_tokens) AS output_tokens,
      SUM(COALESCE(usage_total_tokens, COALESCE(usage_input_tokens, 0) + COALESCE(usage_output_tokens, 0))) AS total_tokens,
      SUM(usage_cached_tokens) AS cached_tokens,
      AVG(latency_ms) AS avg_latency_ms
    FROM llm_events
    GROUP BY 1, 2
    WITH NO DATA;

    -- Initial refresh to populate the CA immediately
    CALL refresh_continuous_aggregate('llm_events_daily_by_agent_ca', NULL, NOW());
  END IF;
EXCEPTION
  WHEN others THEN NULL; -- Ignore errors if CA already exists or refresh fails
END$$;

-- Index on agent CA for fast range scans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'llm_events_daily_by_agent_ca') THEN
    CREATE INDEX IF NOT EXISTS idx_llm_events_daily_by_agent_ca_bucket ON llm_events_daily_by_agent_ca (bucket DESC);
    CREATE INDEX IF NOT EXISTS idx_llm_events_daily_by_agent_ca_agent ON llm_events_daily_by_agent_ca (agent);
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END$$;

-- Refresh policies: keep recent buckets fresh
-- Note: Using timescaledb_information.jobs (not the deprecated policy_refresh_continuous_aggregate view)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')
     AND EXISTS (
       SELECT 1
       FROM timescaledb_information.continuous_aggregates
       WHERE view_name = 'llm_events_daily_ca'
         AND view_schema = current_schema()
     )
  THEN
    -- Add refresh policy if none exists for this CA
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.jobs
      WHERE proc_name = 'policy_refresh_continuous_aggregate'
        AND hypertable_schema = current_schema()
        AND hypertable_name = 'llm_events_daily_ca'
    ) THEN
      PERFORM add_continuous_aggregate_policy(
        'llm_events_daily_ca',
        start_offset => interval '30 days',
        end_offset => interval '1 hour',
        schedule_interval => interval '15 minutes'
      );
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
END$$;

-- Refresh policies for llm_events_daily_by_model_ca
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')
     AND EXISTS (
       SELECT 1
       FROM timescaledb_information.continuous_aggregates
       WHERE view_name = 'llm_events_daily_by_model_ca'
         AND view_schema = current_schema()
     )
  THEN
    -- Add refresh policy if none exists for this CA
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.jobs
      WHERE proc_name = 'policy_refresh_continuous_aggregate'
        AND hypertable_schema = current_schema()
        AND hypertable_name = 'llm_events_daily_by_model_ca'
    ) THEN
      PERFORM add_continuous_aggregate_policy(
        'llm_events_daily_by_model_ca',
        start_offset => interval '30 days',
        end_offset => interval '1 hour',
        schedule_interval => interval '15 minutes'
      );
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
END$$;

-- Refresh policies for llm_events_daily_by_agent_ca
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')
     AND EXISTS (
       SELECT 1
       FROM timescaledb_information.continuous_aggregates
       WHERE view_name = 'llm_events_daily_by_agent_ca'
         AND view_schema = current_schema()
     )
  THEN
    -- Add refresh policy if none exists for this CA
    IF NOT EXISTS (
      SELECT 1 FROM timescaledb_information.jobs
      WHERE proc_name = 'policy_refresh_continuous_aggregate'
        AND hypertable_schema = current_schema()
        AND hypertable_name = 'llm_events_daily_by_agent_ca'
    ) THEN
      PERFORM add_continuous_aggregate_policy(
        'llm_events_daily_by_agent_ca',
        start_offset => interval '30 days',
        end_offset => interval '1 hour',
        schedule_interval => interval '15 minutes'
      );
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
END$$;
