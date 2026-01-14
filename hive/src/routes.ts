/**
 * Route Definitions
 *
 * Central route registration for all DevTool APIs.
 */

import express from 'express';

// Controllers
import tsdbController from './controllers/tsdb.controller';
import controlController from './controllers/control.controller';
import quickstartController from './controllers/quickstart.controller';
import userController from './controllers/user.controller';
import iamController from './controllers/iam.controller';

const router = express.Router();

// =============================================================================
// User Routes - Authentication and user management
// =============================================================================
router.use('/user', userController);

// =============================================================================
// IAM Routes - Identity and Access Management
// =============================================================================
router.use('/iam', iamController);

// =============================================================================
// TSDB Routes - Time Series Database for LLM metrics
// =============================================================================
router.use('/tsdb', tsdbController);

// =============================================================================
// Control Routes - SDK control plane
// =============================================================================
router.use('/v1/control', controlController);

// =============================================================================
// Quickstart Routes - SDK documentation generation
// =============================================================================
router.use('/quickstart', quickstartController);

export default router;
