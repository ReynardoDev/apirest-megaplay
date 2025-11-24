import { pool } from "../db.js";

export const getWallet = async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM wallet");
    res.json(rows);
}

export const getChipsById = async (req, res) => {
  try {    
    // URL esperada: POST
    const { id } = req.body;

    // Validación básica
    if (!id) {
        return res.status(400).json({ message: "Falta el ID del jugador" });
    }

    // 2. CORRECCIÓN: Consultamos la tabla 'players' (donde guardas los chips actualmente)
    const [rows] = await pool.query("SELECT chips FROM wallet WHERE id_player = ?", [id]);

    if (rows.length <= 0) {
      return res.status(404).json({ 
        message: "Jugador no encontrado"
      });
    }

    // Devuelve: { "chips": 1500 }
    res.json(rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al obtener saldo"
    });
  }
};