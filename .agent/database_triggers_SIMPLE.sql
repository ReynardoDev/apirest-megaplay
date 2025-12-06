-- ============================================
-- INSTRUCCIONES IMPORTANTES
-- ============================================
-- 
-- DEBES SELECCIONAR Y EJECUTAR CADA BLOQUE COMPLETO
-- Desde "CREATE TRIGGER" hasta "END;" (inclusive)
--
-- ============================================

USE `fair_play_casino`;

-- ============================================
-- PASO 1: Eliminar trigger anterior
-- ============================================

DROP TRIGGER IF EXISTS `trg_validate_transaction_before_insert`;

-- ============================================
-- PASO 2: Crear trigger
-- ============================================
-- IMPORTANTE: Selecciona desde la línea "CREATE TRIGGER" 
-- hasta la línea "END;" (las 28 líneas completas)
-- ============================================

CREATE TRIGGER `trg_validate_transaction_before_insert` BEFORE INSERT ON `transactions` FOR EACH ROW BEGIN IF NEW.amount <= 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto de la transacción debe ser mayor a 0'; END IF; IF NEW.transaction_type IN ('CREDIT', 'DEPOSIT', 'BONUS') THEN IF NEW.balance_after != NEW.balance_before + NEW.amount THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Balance_after incorrecto para transacción de crédito'; END IF; END IF; IF NEW.transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN IF NEW.balance_after != NEW.balance_before - NEW.amount THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Balance_after incorrecto para transacción de débito'; END IF; END IF; IF NEW.balance_after < 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Balance no puede ser negativo'; END IF; END;

-- ============================================
-- PASO 3: Eliminar procedimiento anterior
-- ============================================

DROP PROCEDURE IF EXISTS `sp_verify_balance_integrity`;

-- ============================================
-- PASO 4: Crear procedimiento
-- ============================================
-- IMPORTANTE: Selecciona desde "CREATE PROCEDURE"
-- hasta "END;" (todo el bloque completo)
-- ============================================

CREATE PROCEDURE `sp_verify_balance_integrity`(IN p_player_id INT) BEGIN DECLARE v_wallet_balance DECIMAL(15,2); DECLARE v_calculated_balance DECIMAL(15,2); DECLARE v_initial_balance DECIMAL(15,2); SELECT chips INTO v_wallet_balance FROM wallet WHERE id_player = p_player_id; SELECT balance_before INTO v_initial_balance FROM transactions WHERE player_id = p_player_id ORDER BY created_at ASC LIMIT 1; SELECT COALESCE(v_initial_balance, 0) + COALESCE(SUM(CASE WHEN transaction_type IN ('CREDIT', 'DEPOSIT', 'BONUS') THEN amount WHEN transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN -amount ELSE 0 END), 0) INTO v_calculated_balance FROM transactions WHERE player_id = p_player_id AND status = 'COMPLETED'; SELECT p_player_id AS player_id, v_wallet_balance AS wallet_balance, v_calculated_balance AS calculated_balance, ABS(v_wallet_balance - v_calculated_balance) AS difference, CASE WHEN ABS(v_wallet_balance - v_calculated_balance) < 0.01 THEN 'OK' ELSE 'ERROR' END AS integrity_status; END;

-- ============================================
-- PASO 5: Verificar
-- ============================================

SHOW TRIGGERS WHERE `Table` = 'transactions';

SHOW PROCEDURE STATUS WHERE Db = 'fair_play_casino';
