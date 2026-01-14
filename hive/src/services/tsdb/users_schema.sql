-- User Authentication Schema for PostgreSQL (Local Development)
-- This schema mirrors the MySQL user tables for local development
-- Run this on your local PostgreSQL/TimescaleDB instance

-- =============================================================================
-- USERS TABLE: Core user accounts
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  name VARCHAR(255),
  firstname VARCHAR(255),
  lastname VARCHAR(255),
  -- JWT authentication (TEXT for long JWT tokens)
  token TEXT UNIQUE,
  salt TEXT,
  -- Team association
  current_team_id INTEGER,
  -- Account status
  status VARCHAR(50) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  -- Metadata
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_token ON users (token);
CREATE INDEX IF NOT EXISTS idx_users_team ON users (current_team_id);

-- =============================================================================
-- DEVELOPERS TABLE: API tokens for programmatic access
-- =============================================================================
CREATE TABLE IF NOT EXISTS developers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  label VARCHAR(255),
  -- System tokens are managed by the platform, not users
  "system" BOOLEAN DEFAULT false,
  -- Permissions and scope
  scopes JSONB DEFAULT '[]',
  -- Rate limiting
  rate_limit INTEGER DEFAULT 1000,
  -- Timestamps
  create_time BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Status
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ
);

-- Indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_developers_token ON developers (token);
CREATE INDEX IF NOT EXISTS idx_developers_user ON developers (user_id);
CREATE INDEX IF NOT EXISTS idx_developers_team ON developers (team_id);
CREATE INDEX IF NOT EXISTS idx_developers_user_team ON developers (user_id, team_id);

-- =============================================================================
-- TEAMS TABLE: Team/Organization accounts
-- =============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  -- Billing and subscription
  plan VARCHAR(50) DEFAULT 'free',
  billing_email VARCHAR(255),
  -- Settings
  settings JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TEAM_MEMBERS TABLE: User-Team associations
-- =============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);

-- =============================================================================
-- SEED DATA: Default development user and team
-- =============================================================================

-- Create a default team
INSERT INTO teams (id, name, slug, plan)
VALUES (1, 'Development Team', 'dev-team', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- Create a default development user
-- Email: dev@honeycomb.local
-- Password: honeycomb123
INSERT INTO users (id, email, password, name, firstname, lastname, token, salt, current_team_id, status, email_verified)
VALUES (
  1,
  'dev@honeycomb.local',
  '$2b$10$BgXnS6Cg7HwimTzBtsnh0.j8s8.ypWFooW9A.7YbNIC4e94HIFxYu',
  'Development User',
  'Dev',
  'User',
  'dev-token-12345',
  'dev-salt-secret-key',
  1,
  'active',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Create a default API token for the development user
INSERT INTO developers (id, user_id, team_id, token, label, "system")
VALUES (
  1,
  1,
  1,
  'hive_dev_token_abc123xyz',
  'Development API Token',
  false
)
ON CONFLICT (id) DO NOTHING;

-- Add user to team
INSERT INTO team_members (user_id, team_id, role)
VALUES (1, 1, 'admin')
ON CONFLICT (user_id, team_id) DO NOTHING;

-- Reset sequences to avoid conflicts
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('teams_id_seq', COALESCE((SELECT MAX(id) FROM teams), 1));
SELECT setval('developers_id_seq', COALESCE((SELECT MAX(id) FROM developers), 1));
SELECT setval('team_members_id_seq', COALESCE((SELECT MAX(id) FROM team_members), 1));
