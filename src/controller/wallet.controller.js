import { pool } from "../db.js";

export const getWallet = async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM wallet");
    res.json(rows);
}
