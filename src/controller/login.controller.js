import { pool } from "../db.js";
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Validación básica de variables de entorno para evitar errores silenciosos
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET no está definido en el archivo .env");
    process.exit(1);
}

/*
 * =========================================================
 * Controlador de VISTA LOGIN (GET)
 * =========================================================
 */
export const login = (req, res) => {
    // req.session.user viene de tu middleware 'verifyToken' que configuramos antes
    const { user } = req.session || {};
    const { message } = req.query;

    // Si ya está logueado, redirigir al dashboard/crud
    if (user) {
        return res.redirect('/home');
    }

    res.render("login/index", {
        title: "Login",
        message: message,
        user: null
    });
};

/*
 * =========================================================
 * Controlador de PROCESO LOGIN (POST)
 * =========================================================
 */
export const getPlayerLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscamos al usuario (Verificamos también que no esté baneado)
        const [rows] = await pool.query(
            "SELECT id_player, username, email, password_hash FROM players WHERE email = ? AND status != 'BANNED'",
            [email]
        );

        if (rows.length <= 0) {
            return res.status(401).json({ message: "Credenciales inválidas o cuenta suspendida" });
        }

        const player = rows[0];

        // 2. Comparamos la contraseña
        const esCorrecta = await bcrypt.compare(password, player.password_hash);

        if (!esCorrecta) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        // 3. Generar el Token
        const token = jwt.sign({
            id: player.id_player,
            user: player.username // Útil guardar el nombre en el token
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        const maxAgeMs = JWT_EXPIRES === '1h' ? 60 * 60 * 1000 : 3600000;

        // 4. Setear Cookie Segura
        res.cookie("access_token", token, {
            httpOnly: true,
            secure: false,   // false para localhost
            sameSite: 'lax',
            maxAge: maxAgeMs
        });

        // 5. Respuesta
        const { password: _, ...playerWithoutPassword } = player;

        res.status(200).json({
            message: "Login exitoso",
            player: playerWithoutPassword,
            // token: token // No es estrictamente necesario enviarlo si ya va en cookie, pero ayuda al debug
        });

    } catch (error) {
        console.error("Error en getPlayerLogin:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

/*
 * =========================================================
 * Controlador PROTEGIDO (Dashboard/Vista)
 * =========================================================
 */
export const getProtected = (req, res) => {
    // Asumimos que el middleware 'verifyToken' ya llenó req.session.user
    const { user } = req.session || {};

    if (!user) {
        // Si es una vista, redirigimos. Si es API, devolvemos 403.
        // Como usas res.render, asumimos que es VISTA.
        return res.redirect('/api/player/form_login?message=Debes iniciar sesión');
    }

    // 🛑 CORRECCIÓN: Solo respondemos UNA VEZ
    res.render("login/protected", {
        title: "Protected Area",
        user: user
    });
}

/*
 * =========================================================
 * Controlador de LOGOUT
 * =========================================================
 */
export const getPlayerLogout = (req, res) => {
    try {
        // 1. Borrar cookie
        res.clearCookie("access_token");

        // 2. Limpiar sesión en memoria (si la usas)
        if (req.session) req.session.user = null;

        // 3. Responder (Para API JSON)
        // res.json({ message: "Logout exitoso" });

        // 3. Responder (Para Web App - Redirección)
        res.redirect('/api/player/form_login');

    } catch (error) {
        console.error("Error en getPlayerLogout:", error);
        res.status(500).json({ message: "Error al cerrar sesión" });
    }
}