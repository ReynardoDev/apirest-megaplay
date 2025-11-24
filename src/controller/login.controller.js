import { pool } from "../db.js";
import validator from 'validator';
import bcrypt from 'bcryptjs';


export const getPlayerLogin = async (req, res) => {
  // 1. Obtenemos los datos del body (POST)
  const { email, password } = req.body;

  try {
    // 2. Buscamos al usuario por email y que esté activo.
    // IMPORTANTE: Debemos traer el campo 'password' de la BD para poder compararlo.
    const [rows] = await pool.query(
      "SELECT id_player, user, email, password FROM players WHERE email = ? AND active = 1", 
      [email]
    );

    // 3. Si no hay filas, el usuario no existe o no está activo
    if (rows.length <= 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const player = rows[0];

    // 4. Comparamos la contraseña plana (req.body.password) con el hash de la BD (player.password)
    const esCorrecta = await bcrypt.compare(password, player.password);

    if (!esCorrecta) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // 5. Login Exitoso: Preparamos la respuesta
    // Quitamos la contraseña del objeto antes de enviarlo al frontend por seguridad
    const { password: _, ...playerWithoutPassword } = player;

    res.json({
      message: "Login exitoso",
      player: playerWithoutPassword
      // Aquí podrías añadir el token JWT si lo implementaste:
      // token: tokenGenerado
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
}


//Register
export const getPlayerRegister = async (req, res) => {
    try {
        const { user, password, email, active } = req.body;

        // --- 1. VALIDACIONES PREVIAS (Error 400) ---

        // Validar Usuario
        if (!user || typeof user !== 'string') {
            return res.status(400).json({ message: 'El nombre de usuario es obligatorio y debe ser texto' });
        }
        const cleanUser = user.trim(); // Limpiamos espacios

        // Validar Password
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ message: 'La contraseña es obligatoria' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
        }

        // Validar Email
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'El email es obligatorio' });
        }
        const cleanEmail = email.trim(); // Limpiamos espacios
        
        // Usamos Regex o validator (más seguro)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ message: 'Formato de email inválido' });
        }

        // --- 2. VERIFICAR DUPLICADOS (Lógica Corregida) ---
        
        // Hacemos una sola consulta para buscar si existe el usuario O el email
        const [existingUsers] = await pool.query(
            "SELECT id_player FROM players WHERE user = ? OR email = ?", 
            [cleanUser, cleanEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'El usuario o el correo electrónico ya están registrados' });
        }

        // --- 3. SEGURIDAD (Hashing) ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- 4. INSERTAR EN BD ---
        // Usamos las variables limpias (cleanUser, cleanEmail) y el password hasheado
        // Asignamos active = 1 por defecto si no viene en el body
        const isActive = active !== undefined ? active : 1;

        const [result] = await pool.query(
            "INSERT INTO players (user, password, email, active) VALUES (?, ?, ?, ?)", 
            [cleanUser, hashedPassword, cleanEmail, isActive]
        );

        chips_bono = 10;

        const [result_wallet] = await pool.query(
            "INSERT INTO wallet (id_player, chips) VALUES (?, ?)",
            [result.insertId, chips_bono]
        );

        // --- 5. RESPUESTA EXITOSA ---
        res.status(201).json({
            message: "Jugador registrado exitosamente",
            player: {
                id: result.insertId,
                user: cleanUser,
                email: cleanEmail,
                chips: chips_bono,
                active: isActive
                // ¡NO devolvemos la contraseña!
            }
        });

    } catch (error) {
        // No enviar esta información en producción
        console.error("Error en createPlayer:", error);
        res.status(500).json({
            message: "Error interno del servidor"
        });
    }
}