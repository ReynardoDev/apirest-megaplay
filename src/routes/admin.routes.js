import { Router } from 'express';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import * as adminController from '../controller/admin.controller.js';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management (View)
router.get('/users', adminController.getUsersView);

// User Management (API)
router.get('/api/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id', adminController.updateUser);

// Transactions (View)
router.get('/transactions', adminController.getTransactionsView);

// Transactions (API)
router.get('/api/transactions', adminController.getTransactions);

// Statistics
router.get('/stats/games', adminController.getGameStats);
router.get('/stats/system', adminController.getSystemStats);

export default router;
