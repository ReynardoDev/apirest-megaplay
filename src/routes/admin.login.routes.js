import { Router } from 'express';
import { adminLoginView, adminLogin, adminLogout } from '../controller/admin.login.controller.js';

const router = Router();

// Rutas públicas de autenticación de admin
router.get('/login', adminLoginView);
router.post('/login', adminLogin);
router.get('/logout', adminLogout);

export default router;
