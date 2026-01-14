-- Initialize TimescaleDB extension
-- This must run BEFORE schema.sql to enable hypertables and continuous aggregates

-- Create TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'TimescaleDB extension initialized successfully';
END$$;
