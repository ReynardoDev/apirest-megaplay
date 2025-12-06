import { pool } from '../db.js';

// Dashboard principal del admin
export const getDashboard = async (req, res) => {
    try {
        const admin = res.locals.admin;

        // Obtener estadísticas básicas
        const [playerStats] = await pool.query('SELECT COUNT(*) as total FROM players');
        const [walletStats] = await pool.query('SELECT SUM(chips) as total_chips FROM wallet');
        const [transactionStats] = await pool.query(
            `SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END) as total_bets
      FROM transactions
      WHERE DATE(created_at) = CURDATE()`
        );

        const stats = {
            totalPlayers: playerStats[0].total,
            totalChips: walletStats[0].total_chips || 0,
            todayTransactions: transactionStats[0].total_transactions,
            todayDeposits: transactionStats[0].total_deposits || 0,
            todayBets: transactionStats[0].total_bets || 0
        };

        res.render('admin/dashboard', {
            title: 'Dashboard Admin',
            admin: admin,
            stats: stats
        });

    } catch (error) {
        console.error('Error en admin dashboard:', error);
        res.status(500).send('Error al cargar el dashboard');
    }
};

// Vista de gestión de usuarios (renderiza EJS)
export const getUsersView = async (req, res) => {
    try {
        const [users] = await pool.query(`
      SELECT 
        p.id_player,
        p.name,
        p.username,
        p.email,
        p.status,
        p.kyc_verified,
        p.email_verified,
        p.country,
        p.created_at
      FROM players p
      ORDER BY p.created_at DESC
    `);

        res.render('admin/users', {
            title: 'Gestión de Jugadores',
            items: users
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).send('Error al cargar usuarios');
    }
};

// Obtener lista de usuarios
export const getUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
      SELECT 
        p.id_player as id,
        p.name,
        p.username,
        p.created_at,
        w.chips,
        w.total_deposited,
        w.total_wagered
      FROM players p
      LEFT JOIN wallet w ON p.id_player = w.id_player
      ORDER BY p.created_at DESC
      LIMIT 100
    `);

        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
};

// Obtener detalles de un usuario
export const getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const [users] = await pool.query(`
      SELECT 
        p.*,
        w.chips,
        w.bonus_chips,
        w.total_deposited,
        w.total_withdrawn,
        w.total_wagered,
        w.total_won
      FROM players p
      LEFT JOIN wallet w ON p.id_player = w.id_player
      WHERE p.id_player = ?
    `, [id]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        console.error('Error al obtener detalles de usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener detalles'
        });
    }
};

// Actualizar usuario (agregar/quitar chips, etc.)
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { chips } = req.body;

        if (chips !== undefined) {
            await pool.query(
                'UPDATE wallet SET chips = ?, updated_at = NOW() WHERE id_player = ?',
                [chips, id]
            );
        }

        res.json({
            success: true,
            message: 'Usuario actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario'
        });
    }
};

// Vista de transacciones (renderiza EJS)
export const getTransactionsView = async (req, res) => {
    try {
        const [transactions] = await pool.query(`
            SELECT 
                t.id_transaction,
                t.player_id,
                t.transaction_type,
                t.amount,
                t.balance_before,
                t.balance_after,
                t.description,
                t.created_at,
                p.username,
                p.email
            FROM transactions t
            LEFT JOIN players p ON t.player_id = p.id_player
            ORDER BY t.created_at DESC
            LIMIT 500
        `);

        // Calcular estadísticas del día
        const [dailyStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount ELSE 0 END) as total_deposits,
                SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
                SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits
            FROM transactions
            WHERE DATE(created_at) = CURDATE()
        `);

        res.render('admin/transactions', {
            title: 'Transacciones',
            transactions: transactions,
            stats: dailyStats[0]
        });
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        res.status(500).send('Error al cargar transacciones');
    }
};

// Obtener transacciones
export const getTransactions = async (req, res) => {
    try {
        const [transactions] = await pool.query(`
      SELECT 
        t.*,
        p.username
      FROM transactions t
      LEFT JOIN players p ON t.player_id = p.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);

        res.json({
            success: true,
            transactions: transactions
        });
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener transacciones'
        });
    }
};

// Estadísticas de juegos
export const getGameStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_spins,
        SUM(bet_amount) as total_bets,
        SUM(win_amount) as total_wins,
        AVG(win_amount / bet_amount) as avg_multiplier
      FROM game_spins
      WHERE DATE(created_at) = CURDATE()
    `);

        res.json({
            success: true,
            stats: stats[0]
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de juegos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};

// Estadísticas del sistema
export const getSystemStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM players) as total_players,
        (SELECT COUNT(*) FROM players WHERE DATE(created_at) = CURDATE()) as new_players_today,
        (SELECT SUM(chips) FROM wallet) as total_chips_in_system,
        (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = CURDATE()) as transactions_today
    `);

        res.json({
            success: true,
            stats: stats[0]
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del sistema:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};
