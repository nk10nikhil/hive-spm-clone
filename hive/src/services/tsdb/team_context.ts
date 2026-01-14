import { Pool, PoolConfig, PoolClient } from "pg";
import jwt from "jsonwebtoken";

// Cache pools per team schema
const poolCache = new Map<string, Pool>();

interface TokenPayload {
  team_id?: string;
  team?: string;
  teamId?: string;
  current_team_id?: string;
  user_id?: string;
  sub?: string;
  user?: string;
  userId?: string;
  [key: string]: unknown;
}

interface ParsedToken {
  team_id: string;
  user_id: string | null;
  token: string;
  payload: TokenPayload;
}

/**
 * Parse JWT to extract team_id and user_id.
 * - Supports Authorization header formats: "Bearer <token>" or "jwt <token>" or raw token.
 * - team_id: payload.team_id || payload.team || payload.teamId
 * - user_id: payload.user_id || payload.sub || payload.user || payload.userId
 */
const parseToken = (authHeader: string | undefined): ParsedToken | null => {
  if (!authHeader) return null;
  const parts = authHeader.trim().split(" ");
  const token = parts.length === 2 ? parts[1] : parts[0];
  if (!token) return null;

  // Token is already verified by passport middleware; decode only to extract team/user fields.
  const payload = jwt.decode(token) as TokenPayload | null;
  if (!payload || typeof payload !== "object") return null;

  const team_id = payload.team_id || payload.team || payload.teamId || payload.current_team_id;
  const user_id = payload.user_id || payload.sub || payload.user || payload.userId || null;
  if (!team_id) return null;

  return { team_id, user_id: user_id as string | null, token, payload };
};

const buildSchemaName = (team_id: string | number): string => {
  return `team_${team_id}`.replace(/[^a-zA-Z0-9_]/g, "_");
};

declare const _GLOBAL_CONST: { ACHO_PG_CONFIG?: { USER: string; HOST: string; DATABASE: string; PASSWORD: string; PORT: number } };

const basePoolConfig = (): Partial<PoolConfig> => {
  const connStr = (process.env.TSDB_PG_URL || "").replace(/\s+/g, "");
  if (connStr) {
    // Only enable SSL for non-local connections or when explicitly requested
    const isLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1") || connStr.includes("timescaledb");
    const sslRequested = connStr.includes("sslmode=require") || process.env.TSDB_SSL === "true";
    const ssl = !isLocal || sslRequested ? { rejectUnauthorized: false } : false;
    return { connectionString: connStr, ssl };
  }
  if (typeof _GLOBAL_CONST !== "undefined" && _GLOBAL_CONST.ACHO_PG_CONFIG) {
    const cfg = _GLOBAL_CONST.ACHO_PG_CONFIG;
    return {
      user: cfg.USER,
      host: cfg.HOST,
      database: cfg.DATABASE,
      password: cfg.PASSWORD,
      port: cfg.PORT,
    };
  }
  return {};
};

const getTeamPool = async (team_id: string | number, overrideConfig?: Partial<PoolConfig>): Promise<Pool> => {
  const schema = buildSchemaName(team_id);
  if (poolCache.has(schema)) return poolCache.get(schema)!;

  const pool = new Pool({
    ...basePoolConfig(),
    ...(overrideConfig || {}),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Handle pool-level errors to prevent unhandled rejections
  pool.on("error", (err) => {
    console.error(`[team_context] Pool error for schema ${schema}:`, err.message);
    // Remove from cache to force fresh pool on next request
    poolCache.delete(schema);
  });

  // Ensure schema exists and set search_path per connection
  pool.on("connect", (client: PoolClient) => {
    // Fire-and-forget with error handling - don't await in event handler
    client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
      .then(() => client.query(`SET search_path TO ${schema}, public`))
      .catch((err: Error) => {
        console.error(`[team_context] Schema setup error for ${schema}:`, err.message);
      });
  });

  poolCache.set(schema, pool);
  return pool;
};

export {
  parseToken,
  buildSchemaName,
  getTeamPool,
};
