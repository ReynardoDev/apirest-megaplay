import { pool } from "../db.js";
import {
    createPayment,
    getPaymentStatus,
    verifyIPNSignature,
    createPayout,
    isValidTronAddress,
    usdtToChips,
    chipsToUsdt
} from "../services/nowpayments.service.js";

/**
 * Crear un depósito USDT
 * POST /api/crypto/deposit
 */
export const createDeposit = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { amount_usdt } = req.body;
        const id_player = res.locals.user?.id;

        // Validaciones
        if (!id_player) {
            await connection.release();
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        const amountUSDT = parseFloat(amount_usdt);
        const minDeposit = parseFloat(process.env.MIN_DEPOSIT_USDT) || 5;
        const maxDeposit = parseFloat(process.env.MAX_DEPOSIT_USDT) || 10000;

        if (!amountUSDT || amountUSDT < minDeposit) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: `El monto mínimo de depósito es $${minDeposit} USDT`
            });
        }

        if (amountUSDT > maxDeposit) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: `El monto máximo de depósito es $${maxDeposit} USDT`
            });
        }

        await connection.beginTransaction();

        // Generar order_id único
        const orderId = `DEP-${id_player}-${Date.now()}`;
        const chipsToCredit = usdtToChips(amountUSDT);

        // Crear pago en NOWPayments
        const payment = await createPayment(amountUSDT, orderId, id_player);

        // Guardar en base de datos
        const expiresAt = payment.expiration_estimate_date
            ? new Date(payment.expiration_estimate_date)
            : new Date(Date.now() + 15 * 60 * 1000); // 15 minutos por defecto

        await connection.query(
            `INSERT INTO crypto_deposits 
        (id_player, payment_id, invoice_url, pay_address, amount_usdt, chips_to_credit, status, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id_player,
                payment.payment_id,
                payment.invoice_url,
                payment.pay_address,
                amountUSDT,
                chipsToCredit,
                payment.payment_status,
                expiresAt
            ]
        );

        await connection.commit();

        console.log(`💰 Depósito creado - Player: ${id_player}, Monto: $${amountUSDT} USDT, Chips: ${chipsToCredit}`);

        res.json({
            success: true,
            message: "Depósito creado exitosamente",
            data: {
                payment_id: payment.payment_id,
                pay_address: payment.pay_address,
                pay_amount: payment.pay_amount,
                pay_currency: payment.pay_currency,
                invoice_url: payment.invoice_url,
                amount_usdt: amountUSDT,
                chips_to_credit: chipsToCredit,
                expires_at: expiresAt,
                status: payment.payment_status
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error al crear depósito:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error al crear depósito"
        });
    } finally {
        connection.release();
    }
};

/**
 * Obtener estado de un depósito
 * GET /api/crypto/deposit/:id/status
 */
export const getDepositStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const id_player = res.locals.user?.id;

        // Obtener depósito de la DB
        const [deposits] = await pool.query(
            `SELECT * FROM crypto_deposits WHERE id = ? AND id_player = ?`,
            [id, id_player]
        );

        if (deposits.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Depósito no encontrado"
            });
        }

        const deposit = deposits[0];

        // Consultar estado actualizado en NOWPayments
        try {
            const paymentStatus = await getPaymentStatus(deposit.payment_id);

            // Actualizar en DB si cambió
            if (paymentStatus.payment_status !== deposit.status) {
                await pool.query(
                    `UPDATE crypto_deposits SET status = ?, updated_at = NOW() WHERE id = ?`,
                    [paymentStatus.payment_status, id]
                );
            }

            res.json({
                success: true,
                data: {
                    id: deposit.id,
                    payment_id: deposit.payment_id,
                    amount_usdt: deposit.amount_usdt,
                    chips_to_credit: deposit.chips_to_credit,
                    status: paymentStatus.payment_status,
                    pay_address: paymentStatus.pay_address,
                    actually_paid: paymentStatus.actually_paid,
                    created_at: deposit.created_at,
                    expires_at: deposit.expires_at
                }
            });

        } catch (error) {
            // Si falla la consulta a NOWPayments, devolver datos de DB
            res.json({
                success: true,
                data: {
                    id: deposit.id,
                    payment_id: deposit.payment_id,
                    amount_usdt: deposit.amount_usdt,
                    chips_to_credit: deposit.chips_to_credit,
                    status: deposit.status,
                    pay_address: deposit.pay_address,
                    created_at: deposit.created_at,
                    expires_at: deposit.expires_at
                }
            });
        }

    } catch (error) {
        console.error("❌ Error al obtener estado del depósito:", error);
        res.status(500).json({
            success: false,
            message: "Error al consultar estado del depósito"
        });
    }
};

/**
 * Webhook IPN de NOWPayments
 * POST /api/crypto/webhook/ipn
 */
export const handleIPNWebhook = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const signature = req.headers['x-nowpayments-sig'];
        const body = req.body;

        console.log('📨 Webhook IPN recibido:', body);

        // Verificar firma HMAC
        if (!verifyIPNSignature(body, signature)) {
            console.error('❌ Firma IPN inválida');
            return res.status(403).json({ error: 'Invalid signature' });
        }

        const {
            payment_id,
            payment_status,
            pay_amount,
            actually_paid,
            outcome_amount,
            order_id
        } = body;

        // Buscar depósito en DB
        const [deposits] = await connection.query(
            `SELECT * FROM crypto_deposits WHERE payment_id = ?`,
            [payment_id]
        );

        if (deposits.length === 0) {
            console.error('❌ Depósito no encontrado:', payment_id);
            return res.status(404).json({ error: 'Deposit not found' });
        }

        const deposit = deposits[0];

        await connection.beginTransaction();

        // Actualizar estado del depósito
        await connection.query(
            `UPDATE crypto_deposits SET status = ?, updated_at = NOW() WHERE payment_id = ?`,
            [payment_status, payment_id]
        );

        // Si el pago está completado (finished), acreditar chips
        if (payment_status === 'finished' && deposit.status !== 'finished') {
            console.log(`✅ Pago completado - Acreditando ${deposit.chips_to_credit} chips al jugador ${deposit.id_player}`);

            // Obtener balance actual
            const [walletRows] = await connection.query(
                `SELECT chips FROM wallet WHERE id_player = ?`,
                [deposit.id_player]
            );

            const currentBalance = walletRows.length > 0 ? parseFloat(walletRows[0].chips) : 0;
            const newBalance = currentBalance + deposit.chips_to_credit;

            // Actualizar wallet
            if (walletRows.length > 0) {
                await connection.query(
                    `UPDATE wallet SET chips = ?, total_deposited = total_deposited + ?, updated_at = NOW() WHERE id_player = ?`,
                    [newBalance, deposit.amount_usdt, deposit.id_player]
                );
            } else {
                // Crear wallet si no existe
                await connection.query(
                    `INSERT INTO wallet (id_player, chips, total_deposited, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
                    [deposit.id_player, deposit.chips_to_credit, deposit.amount_usdt]
                );
            }

            // Registrar transacción
            await connection.query(
                `INSERT INTO transactions 
          (player_id, transaction_type, amount, balance_before, balance_after, reference_type, description, crypto_tx_hash, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    deposit.id_player,
                    'CRYPTO_DEPOSIT',
                    deposit.chips_to_credit,
                    currentBalance,
                    newBalance,
                    'USDT_DEPOSIT',
                    `Depósito USDT - $${deposit.amount_usdt}`,
                    payment_id
                ]
            );

            // Marcar como confirmado
            await connection.query(
                `UPDATE crypto_deposits SET confirmed_at = NOW() WHERE payment_id = ?`,
                [payment_id]
            );

            console.log(`💰 Chips acreditados - Player: ${deposit.id_player}, Balance: ${currentBalance} → ${newBalance}`);
        }

        await connection.commit();

        // Responder rápidamente (< 3 segundos)
        res.status(200).json({ success: true });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error en webhook IPN:", error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

/**
 * Solicitar retiro USDT
 * POST /api/crypto/withdraw
 */
export const requestWithdrawal = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { destination_address, amount_usdt } = req.body;
        const id_player = res.locals.user?.id;

        // Validaciones
        if (!id_player) {
            await connection.release();
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        // Validar dirección TRON
        if (!isValidTronAddress(destination_address)) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: "Dirección TRON inválida. Debe empezar con 'T' y tener 34 caracteres"
            });
        }

        const amountUSDT = parseFloat(amount_usdt);
        const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL_USDT) || 10;
        const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL_USDT) || 5000;

        if (!amountUSDT || amountUSDT < minWithdrawal) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: `El monto mínimo de retiro es $${minWithdrawal} USDT`
            });
        }

        if (amountUSDT > maxWithdrawal) {
            await connection.release();
            return res.status(400).json({
                success: false,
                message: `El monto máximo de retiro es $${maxWithdrawal} USDT`
            });
        }

        const chipsToDebit = usdtToChips(amountUSDT);

        await connection.beginTransaction();

        // Verificar balance
        const [walletRows] = await connection.query(
            `SELECT chips FROM wallet WHERE id_player = ?`,
            [id_player]
        );

        if (walletRows.length === 0) {
            await connection.rollback();
            await connection.release();
            return res.status(404).json({
                success: false,
                message: "Wallet no encontrado"
            });
        }

        const currentBalance = parseFloat(walletRows[0].chips);

        if (currentBalance < chipsToDebit) {
            await connection.rollback();
            await connection.release();
            return res.status(400).json({
                success: false,
                message: "Saldo insuficiente",
                current_balance: currentBalance,
                required: chipsToDebit
            });
        }

        // Debitar chips inmediatamente
        const newBalance = currentBalance - chipsToDebit;

        await connection.query(
            `UPDATE wallet SET chips = ?, total_withdrawn = total_withdrawn + ?, updated_at = NOW() WHERE id_player = ?`,
            [newBalance, amountUSDT, id_player]
        );

        // Crear solicitud de retiro (pendiente de aprobación)
        const [result] = await connection.query(
            `INSERT INTO crypto_withdrawals 
        (id_player, destination_address, amount_usdt, chips_debited, status) 
      VALUES (?, ?, ?, ?, 'pending_approval')`,
            [id_player, destination_address, amountUSDT, chipsToDebit]
        );

        const withdrawalId = result.insertId;

        // Registrar transacción
        await connection.query(
            `INSERT INTO transactions 
        (player_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                id_player,
                'CRYPTO_WITHDRAWAL',
                chipsToDebit,
                currentBalance,
                newBalance,
                'USDT_WITHDRAWAL',
                withdrawalId,
                `Retiro USDT - $${amountUSDT}`
            ]
        );

        await connection.commit();

        console.log(`💸 Retiro solicitado - Player: ${id_player}, Monto: $${amountUSDT} USDT, Chips: ${chipsToDebit}`);

        res.json({
            success: true,
            message: "Retiro solicitado exitosamente. Será procesado en 24-48 horas.",
            data: {
                withdrawal_id: withdrawalId,
                destination_address,
                amount_usdt: amountUSDT,
                chips_debited: chipsToDebit,
                status: 'pending_approval',
                new_balance: newBalance
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error al solicitar retiro:", error);
        res.status(500).json({
            success: false,
            message: "Error al procesar retiro"
        });
    } finally {
        connection.release();
    }
};

/**
 * Obtener historial de transacciones crypto
 * GET /api/crypto/transactions
 */
export const getTransactionHistory = async (req, res) => {
    try {
        const id_player = res.locals.user?.id;
        const { limit = 20, offset = 0 } = req.query;

        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        // Obtener depósitos
        const [deposits] = await pool.query(
            `SELECT id, payment_id, amount_usdt, chips_to_credit, status, created_at, confirmed_at 
      FROM crypto_deposits 
      WHERE id_player = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?`,
            [id_player, parseInt(limit), parseInt(offset)]
        );

        // Obtener retiros
        const [withdrawals] = await pool.query(
            `SELECT id, destination_address, amount_usdt, chips_debited, status, created_at, processed_at 
      FROM crypto_withdrawals 
      WHERE id_player = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?`,
            [id_player, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: {
                deposits,
                withdrawals
            }
        });

    } catch (error) {
        console.error("❌ Error al obtener historial:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener historial de transacciones"
        });
    }
};

/**
 * Obtener tasa de conversión
 * GET /api/crypto/conversion-rate
 */
export const getConversionRate = (req, res) => {
    const usdtToChipsRate = parseFloat(process.env.USDT_TO_CHIPS_RATE) || 10;
    const chipsToUsdtRate = parseFloat(process.env.CHIPS_TO_USDT_RATE) || 0.1;

    res.json({
        success: true,
        data: {
            usdt_to_chips: usdtToChipsRate,
            chips_to_usdt: chipsToUsdtRate,
            min_deposit_usdt: parseFloat(process.env.MIN_DEPOSIT_USDT) || 5,
            max_deposit_usdt: parseFloat(process.env.MAX_DEPOSIT_USDT) || 10000,
            min_withdrawal_usdt: parseFloat(process.env.MIN_WITHDRAWAL_USDT) || 10,
            max_withdrawal_usdt: parseFloat(process.env.MAX_WITHDRAWAL_USDT) || 5000
        }
    });
};
