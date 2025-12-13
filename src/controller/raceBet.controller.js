import { pool } from "../db.js";

/**
 * ============================================
 * RACE BET CONTROLLER
 * ============================================
 * Gestiona las apuestas en carreras de caballos
 * con transacciones ACID para garantizar integridad
 */

/**
 * Colocar una nueva apuesta en una carrera
 * POST /api/race-bet/place
 */
export const placeBet = async (req, res) => {
    try {
        // 🔒 SEGURIDAD: El ID del jugador viene del TOKEN JWT verificado
        const id_player = res.locals.user?.id;
        const { id_game, race_number, horse_number, horse_name, bet_amount, horse_odds } = req.body;

        // Validación de autenticación
        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión para apostar"
            });
        }

        // Validación de datos requeridos
        if (!id_game || !race_number || !horse_number || !bet_amount || !horse_odds) {
            return res.status(400).json({
                success: false,
                message: "Faltan datos requeridos (id_game, race_number, horse_number, bet_amount, horse_odds)"
            });
        }

        // Validación de número de caballo (1-6)
        if (horse_number < 1 || horse_number > 6) {
            return res.status(400).json({
                success: false,
                message: "Número de caballo inválido (debe ser entre 1 y 6)"
            });
        }

        // Validación de monto de apuesta
        if (bet_amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "El monto de la apuesta debe ser mayor a 0"
            });
        }

        // Obtener saldo actual del jugador
        const [rows] = await pool.query(
            "SELECT chips FROM wallet WHERE id_player = ?",
            [id_player]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Jugador no encontrado"
            });
        }

        const currentBalance = rows[0].chips;

        // Verificar saldo suficiente
        if (currentBalance < bet_amount) {
            return res.status(400).json({
                success: false,
                message: "Saldo insuficiente. Adquiere más fichas para seguir jugando"
            });
        }

        // ============================================
        // TRANSACCIÓN ACID - Garantiza Atomicidad
        // ============================================
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // PASO 1: Registrar la apuesta en game_race_bet
            const [betResult] = await connection.query(
                `INSERT INTO game_race_bet 
                (id_game, id_player, race_number, horse_number, horse_name, bet_amount, horse_odds, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                [id_game, id_player, race_number, horse_number, horse_name, bet_amount, horse_odds]
            );

            const betId = betResult.insertId;

            // PASO 2: Registrar DÉBITO de la apuesta (transactions)
            await connection.query(
                `INSERT INTO transactions 
                (player_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at) 
                VALUES (?, 'DEBIT', ?, ?, ?, 'RACE_BET', ?, ?, NOW())`,
                [
                    id_player,
                    bet_amount,
                    currentBalance,
                    currentBalance - bet_amount,
                    betId,
                    `Apuesta en Carrera #${race_number} - Caballo #${horse_number}`
                ]
            );

            // PASO 3: Actualizar wallet - RESTAR apuesta
            const [updateResult] = await connection.query(
                `UPDATE wallet 
                SET chips = chips - ?, 
                    updated_at = NOW() 
                WHERE id_player = ? AND chips >= ?`,
                [bet_amount, id_player, bet_amount]
            );

            // Verificar que se actualizó
            if (updateResult.affectedRows === 0) {
                throw new Error('Saldo insuficiente o wallet no encontrado');
            }

            // COMMIT - Confirmar todas las operaciones
            await connection.commit();

            const newBalance = currentBalance - bet_amount;

            console.log(`✅ Apuesta registrada - Player: ${id_player}, Bet: ${betId}, Race: ${race_number}, Horse: ${horse_number}`);

            // Respuesta al cliente
            res.json({
                success: true,
                message: `Apuesta colocada en Caballo #${horse_number}`,
                bet: {
                    id_race_bet: betId,
                    race_number,
                    horse_number,
                    horse_name,
                    bet_amount,
                    horse_odds,
                    status: 'PENDING'
                },
                new_balance: newBalance
            });

        } catch (transactionError) {
            // ROLLBACK - Cancelar todas las operaciones si hay error
            await connection.rollback();
            console.error("❌ Error en transacción de apuesta, ROLLBACK ejecutado:", transactionError);

            return res.status(500).json({
                success: false,
                message: "Error al procesar la apuesta. No se realizó ningún cargo.",
                error: process.env.NODE_ENV === 'development' ? transactionError.message : undefined
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error("❌ Error al colocar apuesta:", error);
        return res.status(500).json({
            success: false,
            message: "Error del servidor al procesar la apuesta"
        });
    }
};

/**
 * Actualizar resultado de una carrera
 * PUT /api/race-bet/:id_race_bet/result
 */
export const updateRaceResult = async (req, res) => {
    try {
        const id_player = res.locals.user?.id;
        const { id_race_bet } = req.params;
        const { winner_horse, race_duration } = req.body;

        // Validación de autenticación
        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        // Validación de datos
        if (!winner_horse || !race_duration) {
            return res.status(400).json({
                success: false,
                message: "Faltan datos requeridos (winner_horse, race_duration)"
            });
        }

        // Obtener la apuesta
        const [betRows] = await pool.query(
            `SELECT * FROM game_race_bet WHERE id_race_bet = ? AND id_player = ?`,
            [id_race_bet, id_player]
        );

        if (!betRows || betRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Apuesta no encontrada o no pertenece al jugador"
            });
        }

        const bet = betRows[0];

        // Verificar que la apuesta esté pendiente
        if (bet.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: "Esta apuesta ya fue procesada"
            });
        }

        // Determinar si ganó o perdió
        const won = bet.horse_number === winner_horse;
        const winAmount = won ? bet.bet_amount * bet.horse_odds : 0;
        const status = won ? 'WON' : 'LOST';

        // ============================================
        // TRANSACCIÓN ACID
        // ============================================
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // PASO 1: Actualizar el resultado de la apuesta
            await connection.query(
                `UPDATE game_race_bet 
                SET winner_horse = ?, 
                    win_amount = ?, 
                    status = ?, 
                    race_duration = ?,
                    updated_at = NOW()
                WHERE id_race_bet = ?`,
                [winner_horse, winAmount, status, race_duration, id_race_bet]
            );

            // Si ganó, procesar el premio
            if (won && winAmount > 0) {
                // Obtener balance actual
                const [walletRows] = await connection.query(
                    "SELECT chips FROM wallet WHERE id_player = ?",
                    [id_player]
                );
                const currentBalance = walletRows[0].chips;

                // PASO 2: Registrar CRÉDITO del premio
                await connection.query(
                    `INSERT INTO transactions 
                    (player_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at) 
                    VALUES (?, 'CREDIT', ?, ?, ?, 'RACE_WIN', ?, ?, NOW())`,
                    [
                        id_player,
                        winAmount,
                        currentBalance,
                        currentBalance + winAmount,
                        id_race_bet,
                        `Premio Carrera #${bet.race_number} - Caballo #${bet.horse_number} ganador`
                    ]
                );

                // PASO 3: Actualizar wallet - SUMAR premio
                await connection.query(
                    `UPDATE wallet 
                    SET chips = chips + ?, 
                        updated_at = NOW() 
                    WHERE id_player = ?`,
                    [winAmount, id_player]
                );
            }

            // COMMIT
            await connection.commit();

            console.log(`✅ Resultado procesado - Bet: ${id_race_bet}, Status: ${status}, Win: ${winAmount}`);

            // Obtener balance actualizado
            const [newBalanceRows] = await pool.query(
                "SELECT chips FROM wallet WHERE id_player = ?",
                [id_player]
            );
            const newBalance = newBalanceRows[0].chips;

            res.json({
                success: true,
                message: won ? `¡Ganaste! Caballo #${bet.horse_number}` : `Perdiste. Ganó Caballo #${winner_horse}`,
                bet: {
                    id_race_bet,
                    race_number: bet.race_number,
                    horse_number: bet.horse_number,
                    horse_name: bet.horse_name,
                    bet_amount: bet.bet_amount,
                    horse_odds: bet.horse_odds,
                    winner_horse,
                    win_amount: winAmount,
                    status,
                    race_duration
                },
                new_balance: newBalance
            });

        } catch (transactionError) {
            await connection.rollback();
            console.error("❌ Error en transacción de resultado, ROLLBACK ejecutado:", transactionError);

            return res.status(500).json({
                success: false,
                message: "Error al procesar el resultado",
                error: process.env.NODE_ENV === 'development' ? transactionError.message : undefined
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error("❌ Error al actualizar resultado:", error);
        return res.status(500).json({
            success: false,
            message: "Error del servidor"
        });
    }
};

/**
 * Obtener historial de apuestas del jugador
 * GET /api/race-bet/player/:id_player
 */
export const getPlayerBetHistory = async (req, res) => {
    try {
        const id_player = res.locals.user?.id;
        const { status, limit = 50, offset = 0 } = req.query;

        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        let query = `
            SELECT 
                grb.*,
                g.name as game_name
            FROM game_race_bet grb
            LEFT JOIN games g ON grb.id_game = g.id_game
            WHERE grb.id_player = ?
        `;
        const params = [id_player];

        // Filtro opcional por status
        if (status && ['PENDING', 'WON', 'LOST', 'CANCELLED'].includes(status)) {
            query += ` AND grb.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY grb.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [bets] = await pool.query(query, params);

        // Obtener totales
        const [totals] = await pool.query(
            `SELECT 
                COUNT(*) as total_bets,
                SUM(CASE WHEN status = 'WON' THEN 1 ELSE 0 END) as total_wins,
                SUM(CASE WHEN status = 'LOST' THEN 1 ELSE 0 END) as total_losses,
                SUM(bet_amount) as total_wagered,
                SUM(win_amount) as total_won
            FROM game_race_bet 
            WHERE id_player = ?`,
            [id_player]
        );

        res.json({
            success: true,
            bets,
            statistics: totals[0],
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                count: bets.length
            }
        });

    } catch (error) {
        console.error("❌ Error al obtener historial:", error);
        return res.status(500).json({
            success: false,
            message: "Error del servidor"
        });
    }
};

/**
 * Obtener todas las apuestas de una carrera específica
 * GET /api/race-bet/race/:race_number
 */
export const getRaceBets = async (req, res) => {
    try {
        const { race_number } = req.params;

        const [bets] = await pool.query(
            `SELECT 
                grb.*,
                p.username as player_name
            FROM game_race_bet grb
            LEFT JOIN players p ON grb.id_player = p.id_player
            WHERE grb.race_number = ?
            ORDER BY grb.created_at ASC`,
            [race_number]
        );

        // Estadísticas de la carrera
        const [stats] = await pool.query(
            `SELECT 
                COUNT(*) as total_bets,
                SUM(bet_amount) as total_pool,
                horse_number,
                COUNT(*) as bets_count,
                SUM(bet_amount) as horse_pool
            FROM game_race_bet 
            WHERE race_number = ?
            GROUP BY horse_number`,
            [race_number]
        );

        res.json({
            success: true,
            race_number,
            bets,
            statistics: stats
        });

    } catch (error) {
        console.error("❌ Error al obtener apuestas de carrera:", error);
        return res.status(500).json({
            success: false,
            message: "Error del servidor"
        });
    }
};

/**
 * Obtener detalles de una apuesta específica
 * GET /api/race-bet/:id_race_bet
 */
export const getBetDetails = async (req, res) => {
    try {
        const id_player = res.locals.user?.id;
        const { id_race_bet } = req.params;

        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        const [bets] = await pool.query(
            `SELECT 
                grb.*,
                g.name as game_name,
                p.username as player_name
            FROM game_race_bet grb
            LEFT JOIN games g ON grb.id_game = g.id_game
            LEFT JOIN players p ON grb.id_player = p.id_player
            WHERE grb.id_race_bet = ? AND grb.id_player = ?`,
            [id_race_bet, id_player]
        );

        if (!bets || bets.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Apuesta no encontrada"
            });
        }

        res.json({
            success: true,
            bet: bets[0]
        });

    } catch (error) {
        console.error("❌ Error al obtener detalles de apuesta:", error);
        return res.status(500).json({
            success: false,
            message: "Error del servidor"
        });
    }
};
