import { pool } from "../db.js";
import validator from 'validator';
import bcrypt from 'bcryptjs';


export const getPlayerList = async (req, res) => {
    try {
        const [result] = await pool.query("SELECT * FROM players");
        res.render("player/index.ejs", {
            var_title: "CRUD Players",
            items: result
        });
    } catch (error) {
        console.error("Error en getPlayerList:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

export const renderCreateForm = (req, res) => {
    res.render("player/create.ejs", {
        item: {}
    });
}


export const playerCreate = async (req, res) => {

    try {
        const { user, password, email, active } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const cleanUser = user.trim();
        const cleanEmail = email.trim();
        const isActive = active !== undefined ? active : 1;

        let chips_bono = 100;

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

export const playerEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("SELECT * FROM players WHERE id_player = ?", [id]);
        res.render("player/edit.ejs", {
            var_title: "CRUD Players",
            item: result[0]
        });
    } catch (error) {
        console.error("Error en getPlayerById:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

export const playerUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { user, password, email, active } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const cleanUser = user.trim();
        const cleanEmail = email.trim();
        const isActive = active !== undefined ? active : 1;

        const [result] = await pool.query(
            "UPDATE players SET user = ?, password = ?, email = ?, active = ? WHERE id_player = ?",
            [cleanUser, hashedPassword, cleanEmail, isActive, id]
        );
        res.render("player/edit.ejs", {
            message: "Jugador actualizado exitosamente"
        });
    } catch (error) {
        console.error("Error en updatePlayer:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

export const playerDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("DELETE FROM players WHERE id_player = ?", [id]);
        res.render("player/delete.ejs", {
            message: "Jugador eliminado exitosamente"
        });
    } catch (error) {
        console.error("Error en deletePlayer:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}
