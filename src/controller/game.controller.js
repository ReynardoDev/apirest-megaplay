import { pool } from "../db.js";
import { randomInt } from "crypto";

// ============================================
// CONFIGURACIÓN PROFESIONAL DE SLOT MACHINE
// ============================================

/**
 * RUEDA DE 64 SÍMBOLOS - Distribución Realista de Casino
 * 
 * Esta distribución está diseñada para un RTP (Return to Player) de ~88-92%
 * Similar a las slots de Las Vegas y casinos online profesionales.
 * 
 * DISTRIBUCIÓN POR RAREZA:
 * 
 * 🔴 ULTRA RARO (Jackpot):
 * - 💎 Diamond (x1) - 1.56% de aparición - JACKPOT MÁXIMO
 * 
 * 🟠 MUY RARO (Premium):
 * - 7️⃣ Seven (x2) - 3.125% de aparición - MEGA WIN
 * 
 * 🟡 RARO (Alto Valor):
 * - ⭐ Star (x3) - 4.69% de aparición
 * - 👑 Crown (x4) - 6.25% de aparición
 * 
 * 🟢 POCO COMÚN (Valor Medio):
 * - 🔔 Bell (x6) - 9.375% de aparición
 * - 🍇 Grape (x8) - 12.5% de aparición
 * 
 * 🔵 COMÚN (Valor Bajo):
 * - BAR (x12) - 18.75% de aparición
 * - 🍋 Lemon (x14) - 21.875% de aparición
 * 
 * ⚪ MUY COMÚN (Valor Mínimo):
 * - 🍒 Cherry (x14) - 21.875% de aparición (paga desde 1 símbolo)
 * 
 * TOTAL: 64 símbolos
 */
const REEL_SYMBOLS = [
    // ULTRA RARE - Jackpot Symbol (1 símbolo = 1.56%)
    "💎",                                                          // Diamond x1

    // VERY RARE - Premium Symbols (2 símbolos = 3.125%)
    "7️⃣", "7️⃣",                                                    // Sevens x2

    // RARE - High Value Symbols (3+4 = 7 símbolos = 10.94%)
    "⭐", "⭐", "⭐",                                                // Stars x3
    "👑", "👑", "👑", "👑",                                          // Crowns x4

    // UNCOMMON - Medium Value Symbols (6+8 = 14 símbolos = 21.875%)
    "🔔", "🔔", "🔔", "🔔", "🔔", "🔔",                             // Bells x6
    "🍇", "🍇", "🍇", "🍇", "🍇", "🍇", "🍇", "🍇",                 // Grapes x8

    // COMMON - Low Value Symbols (12+14 = 26 símbolos = 40.625%)
    "BAR", "BAR", "BAR", "BAR", "BAR", "BAR",                     // BARs x12
    "BAR", "BAR", "BAR", "BAR", "BAR", "BAR",
    "🍋", "🍋", "🍋", "🍋", "🍋", "🍋", "🍋",                       // Lemons x14
    "🍋", "🍋", "🍋", "🍋", "🍋", "🍋", "🍋",

    // VERY COMMON - Minimum Value (14 símbolos = 21.875%)
    "🍒", "🍒", "🍒", "🍒", "🍒", "🍒", "🍒",                       // Cherries x14
    "🍒", "🍒", "🍒", "🍒", "🍒", "🍒", "🍒"
];

/**
 * TABLA DE PAGOS AJUSTADA - Multiplicadores Realistas
 * 
 * Los multiplicadores están balanceados para:
 * - Premios altos muy raros pero emocionantes
 * - Premios pequeños frecuentes para mantener al jugador
 * - RTP objetivo: 88-92%
 */
const PAYTABLE = {
    // ULTRA RARE - JACKPOT
    "💎": {
        1: 0,        // No paga con 1
        2: 100,      // 2 diamantes = 100x (MUY RARO)
        3: 2000      // 3 diamantes = JACKPOT MÁXIMO 2000x
    },

    // VERY RARE - PREMIUM
    "7️⃣": {
        1: 0,        // No paga con 1
        2: 25,       // 2 sietes = 25x
        3: 250       // 3 sietes = MEGA WIN 250x
    },

    // RARE - HIGH VALUE
    "⭐": {
        1: 0,        // No paga con 1
        2: 15,       // 2 estrellas = 15x
        3: 150       // 3 estrellas = SUPER WIN 150x
    },
    "👑": {
        1: 0,        // No paga con 1
        2: 10,       // 2 coronas = 10x
        3: 100       // 3 coronas = BIG WIN 100x
    },

    // UNCOMMON - MEDIUM VALUE
    "🔔": {
        1: 0,        // No paga con 1
        2: 5,        // 2 campanas = 5x
        3: 50        // 3 campanas = 50x
    },
    "🍇": {
        1: 0,        // No paga con 1
        2: 3,        // 2 uvas = 3x
        3: 30        // 3 uvas = 30x
    },

    // COMMON - LOW VALUE
    "BAR": {
        1: 0,        // No paga con 1
        2: 2,        // 2 BARs = 2x
        3: 20        // 3 BARs = 20x
    },
    "🍋": {
        1: 0,        // No paga con 1
        2: 2,        // 2 limones = 2x
        3: 15        // 3 limones = 15x
    },

    // VERY COMMON - MINIMUM VALUE (Especial: paga desde 1)
    "🍒": {
        1: 1,        // 1 cereza = 1x (devuelve la apuesta)
        2: 3,        // 2 cerezas = 3x
        3: 10        // 3 cerezas = 10x
    }
};

/**
 * Calcula el premio basado en los símbolos obtenidos
 */
const calculateWin = (reels, betAmount) => {
    const [reel1, reel2, reel3] = reels;
    let winAmount = 0;
    let message = "Suerte para la próxima";
    let winType = "none";

    // Verificar 3 símbolos iguales (LÍNEA COMPLETA)
    if (reel1 === reel2 && reel2 === reel3) {
        const multiplier = PAYTABLE[reel1]?.[3] || 0;
        winAmount = betAmount * multiplier;

        // Mensajes especiales según el símbolo
        if (reel1 === "💎") {
            message = "💎 ¡¡¡JACKPOT DIAMANTE!!! 💎";
            winType = "jackpot";
        } else if (reel1 === "7️⃣") {
            message = "🎰 ¡MEGA WIN! ¡TRIPLE SIETE! 🎰";
            winType = "bigwin";
        } else if (reel1 === "⭐") {
            message = "⭐ ¡SUPER WIN! ¡TRIPLE ESTRELLA! ⭐";
            winType = "superwin";
        } else if (reel1 === "👑") {
            message = "👑 ¡BIG WIN! ¡TRIPLE CORONA! 👑";
            winType = "bigwin";
        } else if (reel1 === "🔔") {
            message = "🔔 ¡GRAN PREMIO! ¡TRIPLE CAMPANA! 🔔";
            winType = "win";
        } else if (reel1 === "BAR") {
            message = "🎯 ¡TRIPLE BAR! ¡Excelente!";
            winType = "win";
        } else if (reel1 === "🍇") {
            message = "🍇 ¡Triple Uva! ¡Bien jugado!";
            winType = "win";
        } else if (reel1 === "🍋") {
            message = "🍋 ¡Triple Limón! ¡Ganaste!";
            winType = "win";
        } else if (reel1 === "🍒") {
            message = "🍒 ¡Triple Cereza! ¡Ganaste!";
            winType = "win";
        }
    }
    // Verificar 2 símbolos iguales (DOBLE)
    else if (reel1 === reel2) {
        const multiplier = PAYTABLE[reel1]?.[2] || 0;
        if (multiplier > 0) {
            winAmount = betAmount * multiplier;
            message = `¡Doble ${reel1}! ¡Ganaste!`;
            winType = "smallwin";
        }
    }
    // Verificar cereza en primera posición (PREMIO ESPECIAL)
    else if (reel1 === "🍒") {
        const multiplier = PAYTABLE["🍒"][1];
        winAmount = betAmount * multiplier;
        message = "🍒 ¡Cereza de la suerte!";
        winType = "smallwin";
    }

    return { winAmount, message, winType };
};

export const spinSlot = async (req, res) => {
    try {
        // 🔒 SEGURIDAD: El ID del jugador viene del TOKEN JWT verificado, NO del body
        // Esto garantiza que el usuario solo puede jugar con su propia cuenta
        const id_player = res.locals.user?.id;
        const { bet_amount, game_id } = req.body;

        // Validación de autenticación
        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión para jugar"
            });
        }

        // Validación de datos
        if (!bet_amount) {
            return res.status(400).json({
                success: false,
                message: "Falta el monto de la apuesta"
            });
        }

        // Obtener saldo actual del jugador
        const [rows] = await pool.query(
            "SELECT chips FROM wallet WHERE id_player = ?",
            [id_player]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "Jugador no encontrado" });
        }

        const currentBalance = rows[0].chips;

        // Verificar saldo suficiente
        if (currentBalance < bet_amount) {
            return res.status(400).json({
                message: "Saldo insuficiente. Adquiere más fichas para seguir jugando"
            });
        }

        // ============================================
        // GENERACIÓN DE NÚMEROS ALEATORIOS (RNG)
        // ============================================
        const maxIndex = REEL_SYMBOLS.length; // 64 símbolos
        const reel1_idx = randomInt(0, maxIndex);
        const reel2_idx = randomInt(0, maxIndex);
        const reel3_idx = randomInt(0, maxIndex);

        const reel1_symbol = REEL_SYMBOLS[reel1_idx];
        const reel2_symbol = REEL_SYMBOLS[reel2_idx];
        const reel3_symbol = REEL_SYMBOLS[reel3_idx];

        const resultReels = [reel1_symbol, reel2_symbol, reel3_symbol];

        // ============================================
        // CÁLCULO DE PREMIOS
        // ============================================
        const { winAmount, message, winType } = calculateWin(resultReels, bet_amount);

        // ============================================
        // TRANSACCIÓN ACID - Garantiza Atomicidad
        // ============================================

        // Obtener una conexión del pool para la transacción
        const connection = await pool.getConnection();

        try {
            // INICIAR TRANSACCIÓN
            await connection.beginTransaction();

            // ============================================
            // PASO 1: Registrar la jugada (game_spins)
            // ============================================
            const rngData = JSON.stringify([reel1_idx, reel2_idx, reel3_idx]);
            const reelsJson = JSON.stringify(resultReels);

            const [gameSpinResult] = await connection.query(
                `INSERT INTO game_spins 
                (player_id, bet_amount, win_amount, rng_data, result_reels, game_id) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [id_player, bet_amount, winAmount, rngData, reelsJson, game_id]
            );

            const gameSpinId = gameSpinResult.insertId;

            // ============================================
            // PASO 2: Registrar DÉBITO de la apuesta (transactions)
            // ============================================
            await connection.query(
                `INSERT INTO transactions 
                (player_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at) 
                VALUES (?, 'DEBIT', ?, ?, ?, 'GAME_SPIN', ?, ?, NOW())`,
                [
                    id_player,
                    bet_amount,
                    currentBalance,
                    currentBalance - bet_amount,
                    gameSpinId,
                    `Apuesta en ${game_id === 1 ? 'Black Diamond' : 'Slot'}`
                ]
            );

            // ============================================
            // PASO 3: Actualizar wallet - RESTAR apuesta
            // ============================================
            const [updateResult] = await connection.query(
                `UPDATE wallet 
                SET chips = chips - ?, 
                    updated_at = NOW() 
                WHERE id_player = ? AND chips >= ?`,
                [bet_amount, id_player, bet_amount]
            );

            // Verificar que se actualizó (saldo suficiente)
            if (updateResult.affectedRows === 0) {
                throw new Error('Saldo insuficiente o wallet no encontrado');
            }

            // ============================================
            // PASO 4 y 5: Si ganó, registrar CRÉDITO y SUMAR premio
            // ============================================
            if (winAmount > 0) {
                // PASO 4: Registrar CRÉDITO del premio
                await connection.query(
                    `INSERT INTO transactions 
                    (player_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at) 
                    VALUES (?, 'CREDIT', ?, ?, ?, 'GAME_WIN', ?, ?, NOW())`,
                    [
                        id_player,
                        winAmount,
                        currentBalance - bet_amount,
                        currentBalance - bet_amount + winAmount,
                        gameSpinId,
                        `Premio en ${game_id === 1 ? 'Black Diamond' : 'Slot'} - ${winType}`
                    ]
                );

                // PASO 5: Actualizar wallet - SUMAR premio
                await connection.query(
                    `UPDATE wallet 
                    SET chips = chips + ?, 
                        updated_at = NOW() 
                    WHERE id_player = ?`,
                    [winAmount, id_player]
                );
            }

            // ============================================
            // COMMIT - Confirmar todas las operaciones
            // ============================================
            await connection.commit();

            // Calcular nuevo balance
            const newBalance = currentBalance - bet_amount + winAmount;

            //console.log(`✅ Transacción completada - Player: ${id_player}, Spin: ${gameSpinId}, Balance: ${currentBalance} → ${newBalance}`);

            // ============================================
            // RESPUESTA AL CLIENTE
            // ============================================
            res.json({
                success: true,
                reels: resultReels,
                win: winAmount,
                message: message,
                win_type: winType,
                new_balance: newBalance,
                bet_amount: bet_amount,
                game_spin_id: gameSpinId,
                // Info adicional para debugging (opcional, remover en producción)
                rng_indices: [reel1_idx, reel2_idx, reel3_idx]
            });

        } catch (transactionError) {
            // ============================================
            // ROLLBACK - Cancelar todas las operaciones si hay error
            // ============================================
            await connection.rollback();

            console.error("❌ Error en transacción, ROLLBACK ejecutado:", transactionError);

            return res.status(500).json({
                success: false,
                message: "Error al procesar la jugada. No se realizó ningún cargo.",
                error: process.env.NODE_ENV === 'development' ? transactionError.message : undefined
            });

        } finally {
            // Liberar la conexión de vuelta al pool
            connection.release();
        }

    } catch (error) {
        console.error("❌ Error al realizar el spin:", error);
        return res.status(500).json({
            success: false,
            message: "Error del servidor al procesar la jugada"
        });
    }
}

// Controlador para renderizar la vista del juego Black Diamond
export const blackDiamondView = (req, res) => {
    res.render("slot/black_diamond/index", {
        title: "Black Diamond"
    });
}
