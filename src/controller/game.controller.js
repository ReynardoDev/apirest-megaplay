import { pool } from "../db.js";
import { randomInt } from "crypto";

const SYMBOLS = ["🍒", "🍋", "🔔", "BAR", "7️⃣", "💎","🍒", "🍋", "♣️", "BAR","🍒", "♦️", "🔔", "BAR","♠️","♥️"];

export const spinSlot = async (req, res) => {

    try {   
        
        const { id_player, bet_amount } = req.body; 

        // Obtener saldo actual del jugador (Consulta a BD)
        const [rows] = await pool.query("SELECT chips FROM wallet WHERE id_player = ?", [id_player]);
        var newBalance = rows[0].chips;
        
        if (!id_player || !bet_amount) {
            return res.status(400).json({ message: "Faltan datos" });
        }

        if (newBalance <= 0 || newBalance < bet_amount) {
            return res.status(500).json({ message: "Adquiere mas fichas para seguir jugando" });
        }

        // 1. RNG
        const maxIndex = SYMBOLS.length;
        const reel1_idx = randomInt(0, maxIndex);
        const reel2_idx = randomInt(0, maxIndex);
        const reel3_idx = randomInt(0, maxIndex);
        
        
        const reel1_char = SYMBOLS[reel1_idx];
        const reel2_char = SYMBOLS[reel2_idx];
        const reel3_char = SYMBOLS[reel3_idx];

        const resultReels = [reel1_char, reel2_char, reel3_char];

        let winAmount = 0;
        let message = "Luck for next time";

        // Lógica de Premios
        if (reel1_char === reel2_char && reel2_char === reel3_char) {
            if (reel1_char === "💎") {
                winAmount = bet_amount * 500; 
                message = "¡JACKPOT! ¡DIAMANTES!";
            } else if (reel1_char === "7️⃣") {
                winAmount = bet_amount * 100;
                message = "¡SUPER BIG WIN!";
            } else {
                winAmount = bet_amount * 20;
                message = "¡Ganaste!";
            }
        } 
        
        if (reel1_char === "🍒") {
            winAmount = bet_amount * 2;
            message = "Premio de Cerezas";
        }else if (reel1_char === "🍒" && reel2_char === "🍒") {
            winAmount = bet_amount * 4;
            message = "Premio de Cerezas";
        } else if (reel1_char === "🍒" && reel2_char === "🍒" && reel3_char === "🍒") {
            winAmount = bet_amount * 6;
            message = "Premio de Cerezas";
        }

        if (reel1_char === "🔔" && reel2_char === "🔔" && reel3_char === "🔔") {
            winAmount = bet_amount * 10;
            message = "Premio de Campanas";
        }



        // 4. Auditoría
        const rngData = JSON.stringify([reel1_idx, reel2_idx, reel3_idx]);
        const reelsJson = JSON.stringify(resultReels);

        // Insertar datos de la jugada
        await pool.query(
            "INSERT INTO game_spins (player_id, bet_amount, win_amount, rng_data, result_reels) VALUES (?, ?, ?, ?, ?)",
            [id_player, bet_amount, winAmount, rngData, reelsJson]
        );

        // Actualizar el saldo del jugador (Restar apuesta + Sumar premio) 
        await pool.query(
            "UPDATE wallet SET chips = chips - ? + ? WHERE id_player = ?",
            [bet_amount, winAmount, id_player]
        );        

        newBalance = newBalance - bet_amount + winAmount;

        res.json({
            reels: resultReels, 
            win: winAmount,
            message: message,
            new_balance: newBalance
        });

    } catch (error) {
        console.log("Error al realizar el spin: ", error);
        return res.status(500).json({ message: "Error del servidor" });
    }
}