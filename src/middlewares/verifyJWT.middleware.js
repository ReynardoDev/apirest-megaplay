import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware para verificar token JWT desde Header Authorization o Cookie
 * Soporta tanto clientes web (cookies) como clientes móviles/Godot (header)
 */
export const verifyJWT = async (req, res, next) => {
    let token = null;

    // 1. Intentar obtener token del header Authorization (para Godot/API clients)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remover "Bearer "
        console.log('🔑 Token obtenido del header Authorization');
    }

    // 2. Si no hay token en header, intentar desde cookie (para web)
    if (!token && req.cookies.access_token) {
        token = req.cookies.access_token;
        console.log('🔑 Token obtenido de cookie');
    }

    // 3. Si no hay token en ningún lado, rechazar
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Debes iniciar sesión"
        });
    }

    // 4. Verificar y decodificar token
    try {
        const data = jwt.verify(token, JWT_SECRET);

        // Obtener los chips actuales del usuario desde la base de datos
        const { pool } = await import('../db.js');
        const [rows] = await pool.query(
            "SELECT chips FROM wallet WHERE id_player = ?",
            [data.id]
        );

        // Hacer disponible el usuario en res.locals
        res.locals.user = {
            id: data.id,
            name: data.user,
            chips: rows.length > 0 ? rows[0].chips : 0
        };

        console.log('✅ Usuario autenticado:', {
            id: res.locals.user.id,
            name: res.locals.user.name,
            chips: res.locals.user.chips
        });

        next();

    } catch (error) {
        console.log('❌ Error de autenticación:', error.message);

        // Distinguir entre token expirado y token inválido
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expirado. Por favor inicia sesión nuevamente."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Token inválido"
        });
    }
};
