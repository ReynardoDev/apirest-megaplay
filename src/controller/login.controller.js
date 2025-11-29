import { pool } from "../db.js";
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Las variables JWT_SECRET y JWT_EXPIRES deben estar en tu archivo .env
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';


/*
 * =========================================================
 * Controlador de LOGIN
 * =========================================================
 */
export const getPlayerLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscamos al usuario por email y que esté activo.
        const [rows] = await pool.query(
            "SELECT id_player, user, email, password FROM players WHERE email = ? AND active = 1",
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

        // 🟢 CORRECCIÓN 2: Generar Token y Cookie SOLO después de verificar la contraseña

        // 3. Generar el Token (Payload con ID)
        const token = jwt.sign({ id: player.id_player }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        const maxAgeMs = JWT_EXPIRES === '1h' ? 60 * 60 * 1000 : undefined; // Ajustar duración a milisegundos

        // 4. Setear Cookie Segura
        res.cookie("access_token", token, {
            httpOnly: true,
            // 🛑 CRÍTICO: En localhost (que no usa HTTPS), secure DEBE ser false.
            // PERO, si usas 'sameSite: strict', a veces falla. Usamos 'lax'.
            // Usar 'process.env.NODE_ENV === "production"' para el valor real
            secure: false,
            sameSite: 'lax', // Mejor para desarrollo local.
            domain: 'localhost', // 💡 Explicamos al navegador dónde aplicar la cookie
            maxAge: maxAgeMs
        });



        // 5. Preparar la respuesta limpia
        const { password: _, ...playerWithoutPassword } = player;

        res.json({
            message: "Login exitoso",
            player: playerWithoutPassword
        });

    } catch (error) {
        console.error("Error en getPlayerLogin:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}


/*
 * =========================================================
 * Controlador de REGISTRO 
 * =========================================================
 */
export const getPlayerRegister = async (req, res) => {
    // ... (Tu código de validación de usuario/password/email) ...
    // La estructura está correcta para validaciones y hashing.

    try {
        const { user, password, email, active } = req.body;
        // ... (Tu código de validación y duplicados aquí) ...

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const cleanUser = user.trim();
        const cleanEmail = email.trim();
        const isActive = active !== undefined ? active : 1;
        let chips_bono = 10;

        // 🔴 CORRECCIÓN 3: Aquí falta la Transacción SQL
        // Usar pool.getConnection() para garantizar que las dos inserciones sean atómicas.

        const [result] = await pool.query(
            "INSERT INTO players (user, password, email, active) VALUES (?, ?, ?, ?)",
            [cleanUser, hashedPassword, cleanEmail, isActive]
        );

        const [result_wallet] = await pool.query(
            "INSERT INTO wallet (id_player, chips) VALUES (?, ?)",
            [result.insertId, chips_bono]
        );
        // Nota: Si usaras Transacciones, aquí pondrías connection.commit();

        // --- 5. RESPUESTA EXITOSA ---
        res.status(201).json({
            message: "Jugador registrado exitosamente",
            player: {
                id: result.insertId,
                user: cleanUser,
                email: cleanEmail,
                chips: chips_bono,
                active: isActive
            }
        });

    } catch (error) {
        console.error("Error en createPlayer:", error);
        // Nota: Si el error es un duplicado, debería ser 409, pero 500 para errores de DB es correcto.
        res.status(500).json({ message: "Error interno del servidor" });
    }
}


export const getProtected = async (req, res) => {
    const token = req.cookies.access_token;
    if (!token) {
        return res.status(401).json({ message: "Acceso no autorizado" });
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        res.json({ message: "Acceso autorizado", data });
    } catch (error) {
        console.error("Error en getProtecterd:", error);
        res.status(401).json({ message: "Acceso no autorizado" });
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