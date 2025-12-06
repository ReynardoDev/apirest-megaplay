import { pool } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET;

// Renderizar formulario de login de admin
export const adminLoginView = (req, res) => {
    res.render('admin/login', {
        title: 'Admin Login',
        message: req.query.message || ''
    });
};

// Procesar login de admin
export const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validación básica
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username y password son requeridos'
            });
        }

        // Buscar admin en la tabla admins
        const [admins] = await pool.query(
            'SELECT * FROM admins WHERE username = ? AND is_active = TRUE',
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const admin = admins[0];

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Actualizar last_login
        await pool.query(
            'UPDATE admins SET last_login = NOW() WHERE id = ?',
            [admin.id]
        );

        // Crear token JWT para admin
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                type: 'admin' // Importante: identificar que es un admin
            },
            JWT_SECRET_ADMIN,
            { expiresIn: '8h' } // Sesión más corta para admins
        );

        // Guardar token en cookie separada
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        });

        console.log(`✅ Admin login exitoso: ${admin.username} (${admin.role})`);

        res.json({
            success: true,
            message: 'Login exitoso',
            redirect: '/admin/dashboard'
        });

    } catch (error) {
        console.error('❌ Error en admin login:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Logout de admin
export const adminLogout = (req, res) => {
    res.clearCookie('admin_token');
    console.log('✅ Admin logout exitoso');
    res.redirect('/admin/login');
};
