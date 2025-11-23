import { pool } from "../db.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; // <--- Importamos la librería

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Buscar al usuario en la BD
        const [rows] = await pool.query("SELECT * FROM players WHERE user = ?", [username]);
        
        if (rows.length === 0) { 
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const player = rows[0];

        // 2. Verificar la contraseña (bcrypt)
        const isPasswordValid = await bcrypt.compare(password, player.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        // 3. GENERAR EL TOKEN (La parte importante)
        // Payload: Qué datos viajan ENCRIPTADOS dentro del token.
        // NO pongas la contraseña aquí. Solo ID y quizás el rol o email.
        const payload = {
            id: player.id_player,
            user: player.user
        };

        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET, // La llave privada del .env
            { expiresIn: process.env.JWT_EXPIRES || '1h' } // Tiempo de vida
        );

        // 4. Enviar el token al cliente
        res.json({
            message: "Login exitoso",
            token: token // <--- El frontend debe guardar esto (localStorage/Cookie)
        });

    } catch (error) {
        return res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
};