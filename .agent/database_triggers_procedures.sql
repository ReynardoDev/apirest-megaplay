-- ============================================
-- FAIR PLAY CASINO - TRIGGERS Y PROCEDIMIENTOS
-- ============================================
-- Este archivo debe ejecutarse desde la línea de comandos de MySQL
-- Comando: mysql -u root -p fair_play_casino < database_triggers_procedures.sql
-- ============================================

USE `fair_play_casino`;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER $$

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS `trg_validate_transaction_before_insert`$$

-- Crear trigger de validación de transacciones
CREATE TRIGGER `trg_validate_transaction_before_insert`
BEFORE INSERT ON `transactions`
FOR EACH ROW
BEGIN
    -- Validar que el monto sea positivo
    IF NEW.amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El monto de la transacción debe ser mayor a 0';
    END IF;
    
    -- Validar que balance_after sea correcto para CREDIT
    IF NEW.transaction_type IN ('CREDIT', 'DEPOSIT', 'BONUS') THEN
        IF NEW.balance_after != NEW.balance_before + NEW.amount THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Balance_after incorrecto para transacción de crédito';
        END IF;
    END IF;
    
    -- Validar que balance_after sea correcto para DEBIT
    IF NEW.transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN
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
-- PROCEDIMIENTOS ALMACENADOS
-- ============================================

DELIMITER $$

-- Eliminar procedimiento si existe
DROP PROCEDURE IF EXISTS `sp_verify_balance_integrity`$$

-- Crear procedimiento de verificación de integridad
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
        END AS integrity_status;
END$$

DELIMITER ;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 'Triggers y procedimientos creados exitosamente!' AS status;

-- Mostrar triggers creados
SHOW TRIGGERS WHERE `Table` = 'transactions';

-- Mostrar procedimientos creados
SHOW PROCEDURE STATUS WHERE Db = 'fair_play_casino';
