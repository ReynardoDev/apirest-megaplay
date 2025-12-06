import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET;

/**
 * Middleware para verificar que el usuario es un administrador autenticado
 * Verifica el token JWT en la cookie admin_token
 */
export const requireAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.admin_token;

        if (!token) {
            // Si es una petición AJAX, devolver JSON
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'Debes iniciar sesión como administrador'
                });
            }
            // Si es una petición normal, redirigir al login
            return res.redirect('/admin/login?message=Debes iniciar sesión como administrador');
        }

        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET_ADMIN);

        // Verificar que el tipo sea admin
        if (decoded.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado'
            });
        }

        // Verificar que el admin existe y está activo
        const [admins] = await pool.query(
            'SELECT id, username, email, full_name, role FROM admins WHERE id = ? AND is_active = TRUE',
            [decoded.id]
        );

        if (admins.length === 0) {
            res.clearCookie('admin_token');
            return res.redirect('/admin/login?message=Sesión inválida');
        }

        // Hacer disponible los datos del admin
        res.locals.admin = admins[0];
        req.admin = admins[0];

        next();
    } catch (error) {
        console.error('❌ Error en admin middleware:', error.message);
        res.clearCookie('admin_token');

        // Si es una petición AJAX, devolver JSON
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({
                success: false,
                message: 'Sesión expirada'
            });
        }
        // Si es una petición normal, redirigir al login
        return res.redirect('/admin/login?message=Sesión expirada');
    }
};
