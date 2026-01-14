/**
 * Express App Configuration
 *
 * Sets up Express with middleware and routes.
 * No global state - uses dependency injection.
 * Supports both MySQL (production) and PostgreSQL (local development) for user auth.
 */

import express, { Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import passport from 'passport';
import { Pool } from 'pg';

import { auth, database, models } from '@acho-inc/administration';
import config from './config';
import routes from './routes';
import { errorHandler } from './middleware/error-handler.middleware';
import { createMcpRouter } from './mcp';

// Initialize Express app
const app = express();

// =============================================================================
// Middleware
// =============================================================================

app.use(compression({
  filter: (req, res) => {
    // Don't compress SSE responses - compression breaks streaming
    if (req.headers.accept === 'text/event-stream' ||
        req.path.endsWith('/stream')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
app.use(cors());

// Skip body parsing for MCP message route (SDK's handlePostMessage reads raw body stream)
app.use((req, res, next) => {
  if (req.path === '/mcp/message') {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path === '/mcp/message') {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// Disable x-powered-by header
app.disable('x-powered-by');

// =============================================================================
// Database Connections
// =============================================================================

let userDbService: ReturnType<typeof models.createUserDbService>;

if (config.userDbType === 'postgres') {
  // PostgreSQL for local development
  console.log('[App] Using PostgreSQL for user authentication');

  const pgPool = new Pool({
    connectionString: config.userDb.url,
  });

  userDbService = models.createUserDbService({
    pgPool,
    dbType: 'postgres',
    tables: {
      USER: 'users',
      DEVELOPERS: 'developers',
    },
  });

  app.locals.pgPool = pgPool;
} else {
  // MySQL for production
  console.log('[App] Using MySQL for user authentication');

  const mysqlPool = database.createMySQLPool(config.mysql);

  userDbService = models.createUserDbService({
    mysqlPool,
    tables: {
      USER: 'user',
      DEVELOPERS: 'developers',
    },
  });

  app.locals.mysqlPool = mysqlPool;
}

// Store user service in app.locals for access in routes
app.locals.userDbService = userDbService;

// =============================================================================
// Passport Authentication
// =============================================================================

const passportStrategy = auth.createPassportStrategy({
  findSaltByToken: userDbService.findSaltByToken,
  jwtSecret: config.jwt.secret,
});

passport.use(passportStrategy);
app.use(passport.initialize());

// =============================================================================
// Routes
// =============================================================================

// Health check (unauthenticated)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'aden-hive',
    timestamp: new Date().toISOString(),
    userDbType: config.userDbType,
  });
});

// API routes
app.use('/', routes);

// MCP Server routes (Model Context Protocol)
// The controlEmitter is set in index.ts after WebSocket initialization
const mcpRouter = createMcpRouter(() => app.locals.controlEmitter);
app.use('/mcp', mcpRouter);

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;
