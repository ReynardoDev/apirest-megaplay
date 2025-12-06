import { pool } from "../db.js";

// Controlador para renderizar el dashboard de billetera
export const getWallet = async (req, res) => {
  try {
    // Verificar autenticación
    if (!res.locals.user) {
      return res.redirect('/api/player/form_login?message=Debes iniciar sesión para ver tu billetera');
    }

    const id_player = res.locals.user.id;

    // Obtener datos completos de la wallet
    const [walletRows] = await pool.query(
      `SELECT 
        w.chips,
        w.bonus_chips,
        w.total_deposited,
        w.total_withdrawn,
        w.total_wagered,
        w.total_won,
        w.created_at,
        w.updated_at
      FROM wallet w
      WHERE w.id_player = ?`,
      [id_player]
    );

    if (walletRows.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Wallet no encontrado. Por favor contacta al soporte.'
      });
    }

    const wallet = walletRows[0];

    // Obtener últimas transacciones
    const [transactions] = await pool.query(
      `SELECT 
        transaction_type,
        amount,
        balance_after,
        description,
        created_at
      FROM transactions
      WHERE player_id = ?
      ORDER BY created_at DESC
      LIMIT 10`,
      [id_player]
    );

    // Renderizar vista de dashboard
    res.render('wallet/dashboard', {
      title: 'Mi Billetera',
      wallet: wallet,
      transactions: transactions
    });

  } catch (error) {
    console.error('Error en getWallet:', error);
    res.status(500).json({
      error: true,
      message: 'Error al cargar la billetera. Por favor intenta nuevamente.'
    });
  }
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

// Controlador para comprar chips (simulación de depósito)
export const purchaseChips = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { amount, payment_method = 'CREDIT_CARD' } = req.body;

    // 🔒 SEGURIDAD: El ID del jugador viene del TOKEN JWT verificado, NO del body
    // Esto garantiza que el usuario solo puede comprar chips para su propia cuenta
    // y no puede manipular el id_player desde el frontend
    const id_player = res.locals.user?.id;

    // Validación de jugador autenticado
    if (!id_player) {
      await connection.release();
      return res.status(401).json({
        success: false,
        message: "Debes iniciar sesión para comprar chips"
      });
    }

    // Validación de monto
    const purchaseAmount = parseFloat(amount);
    if (!purchaseAmount || purchaseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "El monto debe ser mayor a 0"
      });
    }

    if (purchaseAmount < 5) {
      return res.status(400).json({
        success: false,
        message: "El monto mínimo de compra es $5"
      });
    }

    if (purchaseAmount > 10000) {
      return res.status(400).json({
        success: false,
        message: "El monto máximo de compra es $10,000"
      });
    }

    // Iniciar transacción ACID
    await connection.beginTransaction();

    // 1. Obtener balance actual (o crear wallet si no existe)
    let [walletRows] = await connection.query(
      "SELECT chips FROM wallet WHERE id_player = ?",
      [id_player]
    );

    // Si no existe wallet, crearla
    if (walletRows.length === 0) {
      console.log(`📝 Creando wallet para usuario ${id_player}...`);
      await connection.query(
        `INSERT INTO wallet (id_player, chips, bonus_chips, total_deposited, total_withdrawn, total_wagered, total_won, created_at, updated_at)
         VALUES (?, 0, 0, 0, 0, 0, 0, NOW(), NOW())`,
        [id_player]
      );

      // Obtener el wallet recién creado
      [walletRows] = await connection.query(
        "SELECT chips FROM wallet WHERE id_player = ?",
        [id_player]
      );
    }

    const currentBalance = parseFloat(walletRows[0].chips) || 0;
    const newBalance = currentBalance + purchaseAmount;

    console.log(`💰 Compra - Balance actual: ${currentBalance}, Monto: ${purchaseAmount}, Nuevo balance: ${newBalance}`);

    // 2. Actualizar balance en wallet
    await connection.query(
      "UPDATE wallet SET chips = ?, total_deposited = total_deposited + ?, updated_at = NOW() WHERE id_player = ?",
      [newBalance, purchaseAmount, id_player]
    );

    // 3. Registrar transacción de depósito
    const now = new Date();
    await connection.query(
      `INSERT INTO transactions 
        (player_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_player,
        'DEPOSIT',
        purchaseAmount,
        currentBalance,
        newBalance,
        'CHIP_PURCHASE',
        null,
        `Compra de chips - ${payment_method}`,
        now
      ]
    );

    // Confirmar transacción
    await connection.commit();

    console.log(`✅ Compra exitosa - Player: ${id_player}, Monto: $${purchaseAmount}, Balance: ${currentBalance} → ${newBalance}`);

    res.json({
      success: true,
      message: "¡Compra exitosa!",
      data: {
        amount_purchased: purchaseAmount,
        previous_balance: currentBalance,
        new_balance: newBalance,
        payment_method: payment_method
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ Error en compra de chips:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar la compra"
    });
  } finally {
    connection.release();
  }
};

// Controlador para renderizar la vista de compra
export const purchaseView = (req, res) => {
  // res.locals.user ya está disponible gracias al middleware global
  if (!res.locals.user) {
    return res.redirect('/api/player/form_login?message=Debes iniciar sesión para comprar chips');
  }
  res.render('wallet/purchase', {
    title: 'Comprar Chips'
    // user ya está disponible en res.locals automáticamente
  });
};