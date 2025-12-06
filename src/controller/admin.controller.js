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

// Vista de estadísticas (renderiza EJS)
export const getStatsView = async (req, res) => {
    try {
        // Obtener período de tiempo (por defecto últimos 7 días)
        const period = req.query.period || '7';
        const daysAgo = parseInt(period);

        // 1. KPIs Principales
        const [kpis] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM players WHERE status = 'ACTIVE') as active_players,
                (SELECT COUNT(*) FROM players WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) as new_players,
                (SELECT SUM(chips) FROM wallet) as total_chips_in_system,
                (SELECT COUNT(DISTINCT player_id) FROM transactions WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) as active_players_period
        `, [daysAgo, daysAgo]);

        // 2. Ingresos y Gastos del Período
        const [revenue] = await pool.query(`
            SELECT 
                SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount ELSE 0 END) as total_deposits,
                SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
                SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits
            FROM transactions
            WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        `, [daysAgo]);

        // 3. Datos para gráfico de línea (Ingresos diarios)
        const [dailyRevenue] = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount ELSE 0 END) as deposits,
                SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END) as debits
            FROM transactions
            WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [daysAgo]);

        // 4. Top 10 jugadores por volumen de apuestas
        const [topPlayers] = await pool.query(`
            SELECT 
                p.username,
                p.email,
                SUM(t.amount) as total_wagered,
                COUNT(t.id_transaction) as transaction_count
            FROM transactions t
            JOIN players p ON t.player_id = p.id_player
            WHERE t.transaction_type = 'DEBIT'
                AND DATE(t.created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY p.id_player, p.username, p.email
            ORDER BY total_wagered DESC
            LIMIT 10
        `, [daysAgo]);

        // 5. Distribución de tipos de transacciones
        const [transactionTypes] = await pool.query(`
            SELECT 
                transaction_type,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM transactions
            WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY transaction_type
        `, [daysAgo]);

        // 6. Distribución de jugadores por estado
        const [playerStatus] = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM players
            GROUP BY status
        `);

        // 7. Nuevos registros por día
        const [newPlayersByDay] = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_players
            FROM players
            WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [daysAgo]);

        res.render('admin/statistics', {
            title: 'Estadísticas',
            period: period,
            kpis: kpis[0],
            revenue: revenue[0],
            dailyRevenue: dailyRevenue,
            topPlayers: topPlayers,
            transactionTypes: transactionTypes,
            playerStatus: playerStatus,
            newPlayersByDay: newPlayersByDay
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).send('Error al cargar estadísticas');
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
