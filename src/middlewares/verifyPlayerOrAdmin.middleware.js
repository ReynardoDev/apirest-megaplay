import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET;

/**
 * Middleware que permite acceso tanto a jugadores como a administradores
 * Verifica ambos tipos de tokens (player_token y admin_token)
 */
export const verifyPlayerOrAdmin = async (req, res, next) => {
    try {
        // Intentar verificar token de jugador primero
        const playerToken = req.cookies.token;

        if (playerToken) {
            try {
                const decoded = jwt.verify(playerToken, JWT_SECRET);

                // Cargar datos del jugador
                const [users] = await pool.query(
                    'SELECT id_player as id, username, email FROM players WHERE id_player = ?',
                    [decoded.id]
                );

                if (users.length > 0) {
                    res.locals.user = users[0];
                    res.locals.userType = 'player';
                    return next();
                }
            } catch (err) {
                // Token de jugador inválido, intentar con admin
            }
        }

        // Intentar verificar token de admin
        const adminToken = req.cookies.admin_token;

        if (adminToken) {
            try {
                const decoded = jwt.verify(adminToken, JWT_SECRET_ADMIN);

                if (decoded.type === 'admin') {
                    // Verificar que el admin existe y está activo
                    const [admins] = await pool.query(
                        'SELECT id, username, email, role FROM admins WHERE id = ? AND is_active = TRUE',
                        [decoded.id]
                    );

                    if (admins.length > 0) {
                        res.locals.admin = admins[0];
                        res.locals.userType = 'admin';
                        return next();
                    }
                }
            } catch (err) {
                // Token de admin inválido
            }
        }

        // Si ningún token es válido, redirigir al login
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({
                success: false,
                message: 'Debes iniciar sesión'
            });
        }

        return res.redirect('/api/login');

    } catch (error) {
        console.error('❌ Error en verifyPlayerOrAdmin middleware:', error.message);
        return res.redirect('/api/login');
    }
};
