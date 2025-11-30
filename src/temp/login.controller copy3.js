import { pool } from "../db.js";
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Las variables JWT_SECRET y JWT_EXPIRES deben estar en tu archivo .env
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

/*
 * =========================================================
 * Controlador de VISTA LOGIN (GET)
 * =========================================================
 */
export const login = (req, res) => {
    const { user } = req.session;
    const { message } = req.query;

    res.render("login/index", {
        title: "Login",
        message: message,
        user: user
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
        // 1. Buscamos al usuario
        const [rows] = await pool.query(
            "SELECT id_player, user, email, password FROM players WHERE email = ? AND status != 'banned'",
            [email]
        );

        if (rows.length <= 0) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const player = rows[0];

        // 2. Comparamos la contraseña
        const esCorrecta = await bcrypt.compare(password, player.password);

        if (!esCorrecta) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        // 3. Generar el Token
        const token = jwt.sign({ id: player.id_player }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        const maxAgeMs = JWT_EXPIRES === '1h' ? 60 * 60 * 1000 : 3600000;

        // 4. Setear Cookie Segura (CORREGIDO)
        res.cookie("access_token", token, {
            httpOnly: true, //solo se puede acceder en el servidor
            secure: false,   // false para localhost (http)
            sameSite: 'lax', // lax para que funcione la navegación local
            // ❌ ELIMINADA LA LÍNEA: domain: 'localhost' 
            maxAge: maxAgeMs
        });

        // 5. Respuesta
        const { password: _, ...playerWithoutPassword } = player;

        res.json({
            message: "Login exitoso",
            player: playerWithoutPassword,
            token: token // Enviamos también el token por si el frontend lo necesita manualmente
        });

    } catch (error) {
        console.error("Error en getPlayerLogin:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}




export const getProtected = async (req, res) => {
    const { user } = req.session;

    if (!user) {
        return res.status(403).json({ message: "Acceso no autorizado" });
    }

    res.render("login/protected", {
        title: "Protected",
        user: user
    });

    try {
        res.json({ message: "Acceso autorizado", user });
    } catch (error) {
        console.error("Error en getProtecterd:", error);
        res.status(403).json({ message: "Acceso no autorizado" });
    }
}


//Revisar
export const getPlayerLogout = async (req, res) => {
    try {
        res.clearCookie("access_token");
        res.json({ message: "Logout exitoso" });
    } catch (error) {
        console.error("Error en getPlayerLogout:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

