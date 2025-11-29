import { pool } from "../db.js";
import bcrypt from 'bcryptjs';
// import validator from 'validator'; // No lo estabas usando, pero puedes dejarlo si planeas validar

// --- LISTAR (GET) ---
export const getPlayerList = async (req, res) => {
    try {
        const [result] = await pool.query("SELECT * FROM players");
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
        error: null // Importante para que no falle el if(error) en la vista
    });
}

// --- PROCESAR CREACIÓN (POST) ---
export const playerCreate = async (req, res) => {
    try {
        const { user, password, email, active } = req.body;

        // 1. Validación básica
        if (!user || !password || !email) {
            return res.render("player/create", {
                error: "Todos los campos son obligatorios",
                item: req.body // Mantenemos lo que escribió
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const cleanUser = user.trim();
        const cleanEmail = email.trim();
        const isActive = active !== undefined ? active : 1;
        let chips_bono = 100;

        // 2. Insertar Jugador
        const [result] = await pool.query(
            "INSERT INTO players (user, password, email, active) VALUES (?, ?, ?, ?)",
            [cleanUser, hashedPassword, cleanEmail, isActive]
        );

        // 3. Insertar Wallet
        await pool.query(
            "INSERT INTO wallet (id_player, chips) VALUES (?, ?)",
            [result.insertId, chips_bono]
        );

        // 4. ÉXITO: Redirigir a la lista principal
        // NO enviamos JSON, porque venimos de un formulario HTML
        res.redirect('/crud');

    } catch (error) {
        console.error("Error en playerCreate:", error);
        res.render("player/create", {
            error: "Error al guardar: " + error.message,
            item: req.body
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
    const { user, password, email, active } = req.body;

    try {
        const cleanUser = user.trim();
        const cleanEmail = email.trim();
        const isActive = active !== undefined ? active : 1;

        // Lógica: Si el usuario escribió contraseña nueva, la actualizamos.
        // Si la dejó vacía, mantenemos la vieja.
        if (password && password.trim().length > 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await pool.query(
                "UPDATE players SET user = ?, password = ?, email = ?, active = ? WHERE id_player = ?",
                [cleanUser, hashedPassword, cleanEmail, isActive, id]
            );
        } else {
            // Actualizamos todo MENOS la contraseña
            await pool.query(
                "UPDATE players SET user = ?, email = ?, active = ? WHERE id_player = ?",
                [cleanUser, cleanEmail, isActive, id]
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