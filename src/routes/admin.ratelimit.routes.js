import { Router } from 'express';
import * as rateLimitController from '../controller/admin.ratelimit.controller.js';

const router = Router();

// Vista de configuración de rate limits
router.get('/', rateLimitController.getRateLimitsView);

// API endpoints
router.get('/api', rateLimitController.getRateLimits);
router.get('/api/:id', rateLimitController.getRateLimitById);
router.put('/api/:id', rateLimitController.updateRateLimit);
router.patch('/api/:id/toggle', rateLimitController.toggleRateLimit);

export default router;
