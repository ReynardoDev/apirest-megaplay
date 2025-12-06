-- ============================================
-- TABLA DE TRANSACCIONES - Sistema ACID
-- ============================================

CREATE TABLE IF NOT EXISTS `transactions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Información del jugador
    `player_id` INT UNSIGNED NOT NULL,
    
    -- Tipo de transacción
    `transaction_type` ENUM('DEBIT', 'CREDIT', 'DEPOSIT', 'WITHDRAWAL', 'BONUS', 'REFUND') NOT NULL,
    
    -- Monto de la transacción
    `amount` DECIMAL(15, 2) NOT NULL,
    
    -- Balance antes y después (para auditoría)
    `balance_before` DECIMAL(15, 2) NOT NULL,
    `balance_after` DECIMAL(15, 2) NOT NULL,
    
    -- Referencia a la operación que generó la transacción
    `reference_type` ENUM('GAME_SPIN', 'GAME_WIN', 'DEPOSIT', 'WITHDRAWAL', 'BONUS', 'REFUND', 'ADJUSTMENT') NOT NULL,
    `reference_id` BIGINT UNSIGNED NULL COMMENT 'ID de game_spins, deposits, etc.',
    
    -- Descripción legible
    `description` VARCHAR(255) NULL,
    
    -- Metadatos adicionales (JSON)
    `metadata` JSON NULL COMMENT 'Información adicional en formato JSON',
    
    -- Estado de la transacción
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED') DEFAULT 'COMPLETED',
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para optimizar consultas
    INDEX `idx_player_id` (`player_id`),
    INDEX `idx_transaction_type` (`transaction_type`),
    INDEX `idx_reference` (`reference_type`, `reference_id`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_player_created` (`player_id`, `created_at`),
    
    -- Llave foránea
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id_player`) ON DELETE RESTRICT ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de todas las transacciones financieras del casino';

-- ============================================
-- ACTUALIZAR TABLA game_spins (agregar created_at si no existe)
-- ============================================

ALTER TABLE `game_spins` 
ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `game_id`,
ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ============================================
-- ACTUALIZAR TABLA wallet (agregar updated_at si no existe)
-- ============================================

ALTER TABLE `wallet` 
ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `chips`,
ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ============================================
-- VISTA PARA AUDITORÍA - Balance de Jugador
-- ============================================

CREATE OR REPLACE VIEW `v_player_balance_audit` AS
SELECT 
    p.id AS player_id,
    p.name AS player_name,
    w.chips AS current_balance,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'DEBIT' THEN t.amount ELSE 0 END), 0) AS total_debits,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'CREDIT' THEN t.amount ELSE 0 END), 0) AS total_credits,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0) AS total_deposits,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) AS total_withdrawals,
    COUNT(DISTINCT gs.id) AS total_spins,
    COALESCE(SUM(gs.bet_amount), 0) AS total_wagered,
    COALESCE(SUM(gs.win_amount), 0) AS total_won,
    COALESCE(SUM(gs.bet_amount) - SUM(gs.win_amount), 0) AS net_loss
FROM 
    players p
    LEFT JOIN wallet w ON p.id = w.id_player
    LEFT JOIN transactions t ON p.id = t.player_id AND t.status = 'COMPLETED'
    LEFT JOIN game_spins gs ON p.id = gs.player_id
GROUP BY 
    p.id, p.name, w.chips;

-- ============================================
-- PROCEDIMIENTO ALMACENADO - Verificar Integridad
-- ============================================

DELIMITER $$

CREATE PROCEDURE `sp_verify_balance_integrity`(IN p_player_id INT)
BEGIN
    DECLARE v_wallet_balance DECIMAL(15,2);
    DECLARE v_calculated_balance DECIMAL(15,2);
    DECLARE v_initial_balance DECIMAL(15,2);
    
    -- Obtener balance actual del wallet
    SELECT chips INTO v_wallet_balance
    FROM wallet
    WHERE id_player = p_player_id;
    
    -- Obtener balance inicial (primera transacción)
    SELECT balance_before INTO v_initial_balance
    FROM transactions
    WHERE player_id = p_player_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Calcular balance basado en transacciones
    SELECT 
        COALESCE(v_initial_balance, 0) +
        COALESCE(SUM(CASE 
            WHEN transaction_type IN ('CREDIT', 'DEPOSIT', 'BONUS') THEN amount
            WHEN transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN -amount
            ELSE 0
        END), 0)
    INTO v_calculated_balance
    FROM transactions
    WHERE player_id = p_player_id
    AND status = 'COMPLETED';
    
    -- Retornar resultados
    SELECT 
        p_player_id AS player_id,
        v_wallet_balance AS wallet_balance,
        v_calculated_balance AS calculated_balance,
        ABS(v_wallet_balance - v_calculated_balance) AS difference,
        CASE 
            WHEN ABS(v_wallet_balance - v_calculated_balance) < 0.01 THEN 'OK'
            ELSE 'ERROR'
        END AS status;
END$$

DELIMITER ;

-- ============================================
-- TRIGGER - Validar transacciones
-- ============================================

DELIMITER $$

CREATE TRIGGER `trg_validate_transaction_before_insert`
BEFORE INSERT ON `transactions`
FOR EACH ROW
BEGIN
    -- Validar que el monto sea positivo
    IF NEW.amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El monto de la transacción debe ser mayor a 0';
    END IF;
    
    -- Validar que balance_after sea correcto
    IF NEW.transaction_type IN ('CREDIT', 'DEPOSIT', 'BONUS') THEN
        IF NEW.balance_after != NEW.balance_before + NEW.amount THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Balance_after incorrecto para transacción de crédito';
        END IF;
    ELSEIF NEW.transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN
        IF NEW.balance_after != NEW.balance_before - NEW.amount THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Balance_after incorrecto para transacción de débito';
        END IF;
    END IF;
    
    -- Validar que no haya balance negativo
    IF NEW.balance_after < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Balance no puede ser negativo';
    END IF;
END$$

DELIMITER ;

-- ============================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================

-- Índice para consultas de historial de jugador
CREATE INDEX IF NOT EXISTS `idx_player_type_created` 
ON `transactions` (`player_id`, `transaction_type`, `created_at` DESC);

-- Índice para reportes por fecha
CREATE INDEX IF NOT EXISTS `idx_created_type_amount` 
ON `transactions` (`created_at`, `transaction_type`, `amount`);

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL - SOLO PARA TESTING)
-- ============================================

-- Descomentar para insertar datos de prueba
/*
INSERT INTO transactions 
(player_id, transaction_type, amount, balance_before, balance_after, reference_type, description) 
VALUES 
(1, 'DEPOSIT', 1000.00, 0.00, 1000.00, 'DEPOSIT', 'Depósito inicial'),
(1, 'DEBIT', 10.00, 1000.00, 990.00, 'GAME_SPIN', 'Apuesta en Black Diamond'),
(1, 'CREDIT', 50.00, 990.00, 1040.00, 'GAME_WIN', 'Premio en Black Diamond');
*/

-- ============================================
-- CONSULTAS ÚTILES PARA AUDITORÍA
-- ============================================

-- Ver todas las transacciones de un jugador
-- SELECT * FROM transactions WHERE player_id = 1 ORDER BY created_at DESC;

-- Ver balance calculado vs real
-- CALL sp_verify_balance_integrity(1);

-- Ver resumen de jugador
-- SELECT * FROM v_player_balance_audit WHERE player_id = 1;

-- Ver transacciones de hoy
-- SELECT * FROM transactions WHERE DATE(created_at) = CURDATE();

-- Ver total apostado y ganado por día
/*
SELECT 
    DATE(created_at) as fecha,
    SUM(CASE WHEN transaction_type = 'DEBIT' AND reference_type = 'GAME_SPIN' THEN amount ELSE 0 END) as total_apostado,
    SUM(CASE WHEN transaction_type = 'CREDIT' AND reference_type = 'GAME_WIN' THEN amount ELSE 0 END) as total_ganado,
    SUM(CASE WHEN transaction_type = 'DEBIT' AND reference_type = 'GAME_SPIN' THEN amount ELSE 0 END) -
    SUM(CASE WHEN transaction_type = 'CREDIT' AND reference_type = 'GAME_WIN' THEN amount ELSE 0 END) as ganancia_casino
FROM transactions
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
*/
