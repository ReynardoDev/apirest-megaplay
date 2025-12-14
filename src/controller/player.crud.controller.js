import { pool } from "../db.js";
import bcrypt from 'bcryptjs';
// import validator from 'validator'; // No lo estabas usando, pero puedes dejarlo si planeas validar

// --- LISTAR (GET) ---
export const getPlayerList = async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT 
                id_player,
                username as user,
                email,
                kyc_verified,
                status,
                created_at
            FROM players
            ORDER BY created_at DESC
        `);
        res.render("player/index", {
            var_title: "CRUD Players",
            items: result
        });
    } catch (error) {
        console.error("Error en getPlayerList:", error);
        res.status(500).send("Error interno del servidor");
    }
}

// --- MOSTRAR FORMULARIO CREAR (GET) ---
export const renderCreateForm = (req, res) => {
    res.render("player/create", {
        item: {},
        error: null,
        message: null,
    });
}

// --- PROCESAR CREACIÓN (POST) ---
export const playerCreate = async (req, res) => {
    try {
        const { name, username, password, email, phone, country } = req.body;

        // 1. Validación básica
        if (!name || !username || !password || !email) {
            return res.render("player/create", {
                error: "Todos los campos obligatorios deben ser completados (nombre, usuario, contraseña, email)",
                item: req.body,
                message: null,
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const cleanName = name.trim();
        const cleanUsername = username.trim();
        const cleanEmail = email.trim();
        const cleanPhone = phone ? phone.trim() : null;
        const cleanCountry = country ? country.trim().toUpperCase() : null;
        let chips_bono = 1000;

        // 2. Insertar Jugador (estructura correcta de fair_play_casino)
        const [result] = await pool.query(
            `INSERT INTO players 
            (name, username, email, password_hash, phone, country, status, email_verified) 
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', TRUE)`,
            [cleanName, cleanUsername, cleanEmail, hashedPassword, cleanPhone, cleanCountry]
        );

        const newPlayerId = result.insertId;

        // 3. Insertar Wallet
        await pool.query(
            "INSERT INTO wallet (id_player, chips) VALUES (?, ?)",
            [newPlayerId, chips_bono]
        );

        // 4. Registrar transacción del bono inicial
        await pool.query(
            `INSERT INTO transactions 
            (player_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                newPlayerId,
                'BONUS',
                chips_bono,
                0,
                chips_bono,
                'REGISTRATION_BONUS',
                null,
                'Bono de bienvenida por registro'
            ]
        );

        // 5. ÉXITO: Redirigir al login con mensaje de éxito
        // Si viene de /register (público), redirigir al login
        // Si viene de /crud (admin), redirigir al CRUD
        const isPublicRegistration = req.path === '/';

        if (isPublicRegistration) {
            // Registro público - redirigir al login
            res.render("player/create", {
                error: null,
                item: {},
                message: `¡Cuenta creada exitosamente! Has recibido ${chips_bono} chips de bono. Ahora puedes iniciar sesión.`
            });
        } else {
            // Registro desde admin - redirigir al CRUD
            res.redirect('/crud?message=Jugador creado exitosamente');
        }

    } catch (error) {
        console.error("Error en playerCreate:", error);

        // Manejar errores específicos
        let errorMessage = "Error al guardar: " + error.message;

        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('email')) {
                errorMessage = "Este email ya está registrado";
            } else if (error.message.includes('username')) {
                errorMessage = "Este nombre de usuario ya está en uso";
            }
        }

        res.render("player/create", {
            error: errorMessage,
            item: req.body,
            message: null,
        });
    }
}

// --- PROCESAR CREACIÓN DESDE API (POST) - Para Godot/Clientes API ---
export const playerCreateAPI = async (req, res) => {
    try {
        const { name, username, password, email, phone, country } = req.body;

        // 1. Validación básica
        if (!name || !username || !password || !email) {
            return res.status(400).json({
                success: false,
                message: "Todos los campos obligatorios deben ser completados (nombre, usuario, contraseña, email)"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const cleanName = name.trim();
        const cleanUsername = username.trim();
        const cleanEmail = email.trim();
        const cleanPhone = phone ? phone.trim() : null;
        const cleanCountry = country ? country.trim().toUpperCase() : null;
        let chips_bono = 1000;

        // 2. Insertar Jugador
        const [result] = await pool.query(
            `INSERT INTO players 
            (name, username, email, password_hash, phone, country, status, email_verified) 
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', TRUE)`,
            [cleanName, cleanUsername, cleanEmail, hashedPassword, cleanPhone, cleanCountry]
        );

        const newPlayerId = result.insertId;

        // 3. Insertar Wallet
        await pool.query(
            "INSERT INTO wallet (id_player, chips) VALUES (?, ?)",
            [newPlayerId, chips_bono]
        );

        // 4. Registrar transacción del bono inicial
        await pool.query(
            `INSERT INTO transactions 
            (player_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                newPlayerId,
                'BONUS',
                chips_bono,
                0,
                chips_bono,
                'REGISTRATION_BONUS',
                null,
                'Bono de bienvenida por registro'
            ]
        );

        // 5. ÉXITO: Devolver JSON
        return res.status(201).json({
            success: true,
            message: `¡Cuenta creada exitosamente! Has recibido ${chips_bono} chips de bono.`,
            data: {
                id_player: result.insertId,
                username: cleanUsername,
                email: cleanEmail,
                chips_bono: chips_bono
            }
        });

    } catch (error) {
        console.error("Error en playerCreateAPI:", error);

        // Manejar errores específicos
        let errorMessage = "Error al guardar: " + error.message;

        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('email')) {
                errorMessage = "Este email ya está registrado";
            } else if (error.message.includes('username')) {
                errorMessage = "Este nombre de usuario ya está en uso";
            }
        }

        return res.status(400).json({
            success: false,
            message: errorMessage
        });
    }
}

// --- MOSTRAR FORMULARIO EDICIÓN (GET) ---
export const playerEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("SELECT * FROM players WHERE id_player = ?", [id]);

        if (result.length === 0) {
            return res.redirect('/crud'); // Si no existe, volver al inicio
        }

        res.render("player/edit", {
            var_title: "Editar Jugador",
            item: result[0], // Pasamos los datos para rellenar los inputs
            error: null
        });
    } catch (error) {
        console.error("Error en playerEdit:", error);
        res.status(500).send("Error interno");
    }
}

// --- PROCESAR EDICIÓN (POST) ---
export const playerUpdate = async (req, res) => {
    const { id } = req.params;
    const { name, username, password, email, status } = req.body;

    try {
        const cleanName = name ? name.trim() : '';
        const cleanUsername = username ? username.trim() : '';
        const cleanEmail = email ? email.trim() : '';
        const playerStatus = status || 'ACTIVE';

        // Lógica: Si el usuario escribió contraseña nueva, la actualizamos.
        // Si la dejó vacía, mantenemos la vieja.
        if (password && password.trim().length > 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await pool.query(
                `UPDATE players 
                SET name = ?, username = ?, password_hash = ?, email = ?, status = ? 
                WHERE id_player = ?`,
                [cleanName, cleanUsername, hashedPassword, cleanEmail, playerStatus, id]
            );
        } else {
            // Actualizamos todo MENOS la contraseña
            await pool.query(
                `UPDATE players 
                SET name = ?, username = ?, email = ?, status = ? 
                WHERE id_player = ?`,
                [cleanName, cleanUsername, cleanEmail, playerStatus, id]
            );
        }

        // ÉXITO: Volver a la lista
        res.redirect('/crud');

    } catch (error) {
        console.error("Error en playerUpdate:", error);
        // Si falla, volvemos a mostrar el form con el error y los datos
        res.render("player/edit", {
            error: "Error al actualizar: " + error.message,
            item: { ...req.body, id_player: id }, // Reconstruimos el objeto para la vista
            var_title: "Editar Jugador"
        });
    }
}

// --- PROCESAR ELIMINACIÓN (GET o POST dependiendo de tu ruta) ---
export const playerDelete = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM players WHERE id_player = ?", [id]);

        // ÉXITO: Volver a la lista
        res.redirect('/crud');

    } catch (error) {
        console.error("Error en playerDelete:", error);
        res.status(500).send("Error al eliminar");
    }
}