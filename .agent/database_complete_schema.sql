-- ============================================
-- FAIR PLAY CASINO - DATABASE SCHEMA
-- ============================================
-- Versión: 2.0.0
-- Fecha: 2025-12-06
-- Descripción: Schema completo para sistema de casino online
-- Características: ACID, Auditoría, Seguridad, Performance
-- ============================================

-- Configuración inicial
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS `fair_play_casino` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `fair_play_casino`;

-- ============================================
-- TABLA: players
-- Descripción: Información de jugadores registrados
-- ============================================

DROP TABLE IF EXISTS `players`;

CREATE TABLE `players` (
    `id_player` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Información personal
    `name` VARCHAR(100) NOT NULL COMMENT 'Nombre completo del jugador',
    `email` VARCHAR(150) NOT NULL UNIQUE COMMENT 'Email único',
    `username` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nombre de usuario único',
    
    -- Autenticación
    `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt de la contraseña',
    `salt` VARCHAR(64) NULL COMMENT 'Salt para password (opcional si usas bcrypt)',
    
    -- Información adicional
    `date_of_birth` DATE NULL COMMENT 'Fecha de nacimiento',
    `country` VARCHAR(2) NULL COMMENT 'Código ISO del país (ej: US, MX)',
    `phone` VARCHAR(20) NULL COMMENT 'Número de teléfono',
    
    -- Estado de la cuenta
    `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION') DEFAULT 'ACTIVE',
    `email_verified` BOOLEAN DEFAULT FALSE,
    `kyc_verified` BOOLEAN DEFAULT FALSE COMMENT 'Know Your Customer verification',
    
    -- Límites y restricciones
    `daily_deposit_limit` DECIMAL(15, 2) NULL DEFAULT 1000.00,
    `daily_bet_limit` DECIMAL(15, 2) NULL DEFAULT 500.00,
    
    -- Metadatos
    `last_login_at` TIMESTAMP NULL,
    `last_login_ip` VARCHAR(45) NULL COMMENT 'IPv4 o IPv6',
    `registration_ip` VARCHAR(45) NULL,
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL COMMENT 'Soft delete',
    
    -- Índices
    INDEX `idx_email` (`email`),
    INDEX `idx_username` (`username`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Jugadores registrados en el casino';

-- ============================================
-- TABLA: wallet
-- Descripción: Billetera de cada jugador
-- ============================================

DROP TABLE IF EXISTS `wallet`;

CREATE TABLE `wallet` (
    `id_wallet` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `id_player` INT UNSIGNED NOT NULL UNIQUE COMMENT 'Un wallet por jugador',
    
    -- Balance
    `chips` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Saldo actual en chips',
    `bonus_chips` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Chips de bonificación',
    
    -- Estadísticas
    `total_deposited` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total depositado histórico',
    `total_withdrawn` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total retirado histórico',
    `total_wagered` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total apostado histórico',
    `total_won` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Total ganado histórico',
    
    -- Control
    `currency` VARCHAR(3) DEFAULT 'USD' COMMENT 'Código ISO de moneda',
    `is_locked` BOOLEAN DEFAULT FALSE COMMENT 'Wallet bloqueado por admin',
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (`id_player`) REFERENCES `players`(`id_player`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Índices
    INDEX `idx_player` (`id_player`),
    INDEX `idx_chips` (`chips`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Billetera de jugadores';

-- ============================================
-- TABLA: games
-- Descripción: Catálogo de juegos disponibles
-- ============================================

DROP TABLE IF EXISTS `games`;

CREATE TABLE `games` (
    `id_game` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Información del juego
    `name` VARCHAR(100) NOT NULL COMMENT 'Nombre del juego',
    `slug` VARCHAR(100) NOT NULL UNIQUE COMMENT 'URL-friendly name',
    `type` ENUM('SLOT', 'ROULETTE', 'BLACKJACK', 'POKER', 'BACCARAT', 'OTHER') NOT NULL,
    `provider` VARCHAR(50) NULL COMMENT 'Proveedor del juego',
    
    -- Configuración
    `min_bet` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    `max_bet` DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
    `rtp` DECIMAL(5, 2) NULL COMMENT 'Return to Player %',
    
    -- Estado
    `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE',
    `is_featured` BOOLEAN DEFAULT FALSE,
    
    -- Metadatos
    `description` TEXT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `rules_url` VARCHAR(255) NULL,
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX `idx_type` (`type`),
    INDEX `idx_status` (`status`),
    INDEX `idx_slug` (`slug`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Catálogo de juegos del casino';

-- ============================================
-- TABLA: game_spins
-- Descripción: Registro de cada jugada/spin
-- ============================================

DROP TABLE IF EXISTS `game_spins`;

CREATE TABLE `game_spins` (
    `id_spin` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Relaciones
    `player_id` INT UNSIGNED NOT NULL,
    `game_id` INT UNSIGNED NOT NULL,
    
    -- Datos de la jugada
    `bet_amount` DECIMAL(10, 2) NOT NULL COMMENT 'Monto apostado',
    `win_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Monto ganado',
    
    -- RNG y Resultados
    `rng_data` JSON NOT NULL COMMENT 'Índices RNG generados',
    `result_reels` JSON NOT NULL COMMENT 'Símbolos resultantes',
    
    -- Metadatos
    `win_type` ENUM('none', 'smallwin', 'win', 'superwin', 'bigwin', 'jackpot') DEFAULT 'none',
    `session_id` VARCHAR(64) NULL COMMENT 'ID de sesión del jugador',
    `ip_address` VARCHAR(45) NULL,
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id_player`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    FOREIGN KEY (`game_id`) REFERENCES `games`(`id_game`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Índices
    INDEX `idx_player` (`player_id`),
    INDEX `idx_game` (`game_id`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_player_game` (`player_id`, `game_id`),
    INDEX `idx_win_type` (`win_type`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de jugadas/spins';

-- ============================================
-- TABLA: transactions
-- Descripción: Registro de todas las transacciones financieras
-- ============================================

DROP TABLE IF EXISTS `transactions`;

CREATE TABLE `transactions` (
    `id_transaction` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Información del jugador
    `player_id` INT UNSIGNED NOT NULL,
    
    -- Tipo de transacción
    `transaction_type` ENUM('DEBIT', 'CREDIT', 'DEPOSIT', 'WITHDRAWAL', 'BONUS', 'REFUND', 'ADJUSTMENT') NOT NULL,
    
    -- Monto de la transacción
    `amount` DECIMAL(15, 2) NOT NULL COMMENT 'Monto de la transacción',
    
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
    
    -- Información de procesamiento
    `processed_by` INT UNSIGNED NULL COMMENT 'ID del admin que procesó (si aplica)',
    `processed_at` TIMESTAMP NULL,
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id_player`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Índices
    INDEX `idx_player_id` (`player_id`),
    INDEX `idx_transaction_type` (`transaction_type`),
    INDEX `idx_reference` (`reference_type`, `reference_id`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_player_created` (`player_id`, `created_at`),
    INDEX `idx_status` (`status`),
    INDEX `idx_player_type_created` (`player_id`, `transaction_type`, `created_at` DESC)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de todas las transacciones financieras';

-- ============================================
-- TABLA: deposits
-- Descripción: Depósitos de dinero real
-- ============================================

DROP TABLE IF EXISTS `deposits`;

CREATE TABLE `deposits` (
    `id_deposit` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Relaciones
    `player_id` INT UNSIGNED NOT NULL,
    
    -- Información del depósito
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(3) DEFAULT 'USD',
    
    -- Método de pago
    `payment_method` ENUM('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'CRYPTO', 'OTHER') NOT NULL,
    `payment_provider` VARCHAR(50) NULL COMMENT 'Stripe, PayPal, etc.',
    
    -- Referencias externas
    `external_transaction_id` VARCHAR(100) NULL COMMENT 'ID de la transacción en el proveedor',
    `payment_details` JSON NULL COMMENT 'Detalles del pago',
    
    -- Estado
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED') DEFAULT 'PENDING',
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `completed_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id_player`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Índices
    INDEX `idx_player` (`player_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_external_id` (`external_transaction_id`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Depósitos de dinero real';

-- ============================================
-- TABLA: withdrawals
-- Descripción: Retiros de dinero
-- ============================================

DROP TABLE IF EXISTS `withdrawals`;

CREATE TABLE `withdrawals` (
    `id_withdrawal` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Relaciones
    `player_id` INT UNSIGNED NOT NULL,
    
    -- Información del retiro
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(3) DEFAULT 'USD',
    `fee` DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Comisión del retiro',
    `net_amount` DECIMAL(15, 2) NOT NULL COMMENT 'Monto neto a recibir',
    
    -- Método de pago
    `payment_method` ENUM('BANK_TRANSFER', 'PAYPAL', 'CRYPTO', 'CHECK', 'OTHER') NOT NULL,
    `payment_details` JSON NULL COMMENT 'Datos bancarios, wallet crypto, etc.',
    
    -- Estado y aprobación
    `status` ENUM('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
    `approved_by` INT UNSIGNED NULL COMMENT 'ID del admin que aprobó',
    `rejection_reason` TEXT NULL,
    
    -- Referencias externas
    `external_transaction_id` VARCHAR(100) NULL,
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `approved_at` TIMESTAMP NULL,
    `completed_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id_player`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Índices
    INDEX `idx_player` (`player_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Retiros de dinero';

-- ============================================
-- TABLA: bonuses
-- Descripción: Bonificaciones y promociones
-- ============================================

DROP TABLE IF EXISTS `bonuses`;

CREATE TABLE `bonuses` (
    `id_bonus` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Información del bono
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NULL UNIQUE COMMENT 'Código promocional',
    `type` ENUM('WELCOME', 'DEPOSIT', 'NO_DEPOSIT', 'CASHBACK', 'FREE_SPINS', 'RELOAD', 'VIP') NOT NULL,
    
    -- Configuración del bono
    `amount` DECIMAL(10, 2) NULL COMMENT 'Monto fijo del bono',
    `percentage` DECIMAL(5, 2) NULL COMMENT 'Porcentaje del depósito',
    `max_amount` DECIMAL(10, 2) NULL COMMENT 'Monto máximo del bono',
    
    -- Requisitos
    `wagering_requirement` INT DEFAULT 1 COMMENT 'Multiplicador de apuesta (ej: 30x)',
    `min_deposit` DECIMAL(10, 2) NULL COMMENT 'Depósito mínimo requerido',
    
    -- Validez
    `valid_from` TIMESTAMP NOT NULL,
    `valid_until` TIMESTAMP NULL,
    `max_uses` INT NULL COMMENT 'Usos máximos totales',
    `max_uses_per_player` INT DEFAULT 1,
    
    -- Estado
    `status` ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') DEFAULT 'ACTIVE',
    
    -- Descripción
    `description` TEXT NULL,
    `terms_and_conditions` TEXT NULL,
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX `idx_code` (`code`),
    INDEX `idx_type` (`type`),
    INDEX `idx_status` (`status`),
    INDEX `idx_valid_dates` (`valid_from`, `valid_until`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bonificaciones y promociones';

-- ============================================
-- TABLA: player_bonuses
-- Descripción: Bonos asignados a jugadores
-- ============================================

DROP TABLE IF EXISTS `player_bonuses`;

CREATE TABLE `player_bonuses` (
    `id_player_bonus` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Relaciones
    `player_id` INT UNSIGNED NOT NULL,
    `bonus_id` INT UNSIGNED NOT NULL,
    
    -- Información del bono
    `bonus_amount` DECIMAL(10, 2) NOT NULL COMMENT 'Monto del bono otorgado',
    `wagering_required` DECIMAL(15, 2) NOT NULL COMMENT 'Monto total a apostar',
    `wagering_completed` DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Monto apostado hasta ahora',
    
    -- Estado
    `status` ENUM('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FORFEITED') DEFAULT 'ACTIVE',
    
    -- Timestamps
    `claimed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NULL,
    `completed_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id_player`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    FOREIGN KEY (`bonus_id`) REFERENCES `bonuses`(`id_bonus`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    
    -- Índices
    INDEX `idx_player` (`player_id`),
    INDEX `idx_bonus` (`bonus_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_player_status` (`player_id`, `status`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bonos asignados a jugadores';

-- ============================================
-- TABLA: sessions
-- Descripción: Sesiones de jugadores
-- ============================================

DROP TABLE IF EXISTS `sessions`;

CREATE TABLE `sessions` (
    `id_session` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Relaciones
    `player_id` INT UNSIGNED NOT NULL,
    
    -- Información de sesión
    `session_token` VARCHAR(255) NOT NULL UNIQUE,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    
    -- Geolocalización
    `country` VARCHAR(2) NULL,
    `city` VARCHAR(100) NULL,
    
    -- Estado
    `is_active` BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_activity_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NOT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id_player`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Índices
    INDEX `idx_player` (`player_id`),
    INDEX `idx_token` (`session_token`),
    INDEX `idx_active` (`is_active`),
    INDEX `idx_expires` (`expires_at`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Sesiones de jugadores';

-- ============================================
-- TABLA: audit_logs
-- Descripción: Registro de auditoría de acciones importantes
-- ============================================

DROP TABLE IF EXISTS `audit_logs`;

CREATE TABLE `audit_logs` (
    `id_log` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- Actor
    `player_id` INT UNSIGNED NULL,
    `admin_id` INT UNSIGNED NULL,
    
    -- Acción
    `action` VARCHAR(100) NOT NULL COMMENT 'LOGIN, DEPOSIT, WITHDRAWAL, BET, WIN, etc.',
    `entity_type` VARCHAR(50) NULL COMMENT 'player, wallet, game_spin, etc.',
    `entity_id` BIGINT UNSIGNED NULL,
    
    -- Detalles
    `description` TEXT NULL,
    `old_values` JSON NULL COMMENT 'Valores anteriores',
    `new_values` JSON NULL COMMENT 'Valores nuevos',
    
    -- Contexto
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    
    -- Timestamp
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX `idx_player` (`player_id`),
    INDEX `idx_action` (`action`),
    INDEX `idx_entity` (`entity_type`, `entity_id`),
    INDEX `idx_created_at` (`created_at`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de auditoría';

-- ============================================
-- VISTAS
-- ============================================

-- Vista: Auditoría de balance de jugadores
DROP VIEW IF EXISTS `v_player_balance_audit`;

CREATE VIEW `v_player_balance_audit` AS
SELECT 
    p.id_player,
    p.name AS player_name,
    p.email,
    p.status AS player_status,
    w.chips AS current_balance,
    w.bonus_chips,
    w.total_deposited,
    w.total_withdrawn,
    w.total_wagered,
    w.total_won,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'DEBIT' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0) AS total_debits,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'CREDIT' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0) AS total_credits,
    COUNT(DISTINCT gs.id_spin) AS total_spins,
    COALESCE(SUM(gs.bet_amount), 0) AS total_bet_amount,
    COALESCE(SUM(gs.win_amount), 0) AS total_win_amount,
    COALESCE(SUM(gs.bet_amount) - SUM(gs.win_amount), 0) AS net_casino_profit,
    p.created_at AS player_since
FROM 
    players p
    LEFT JOIN wallet w ON p.id_player = w.id_player
    LEFT JOIN transactions t ON p.id_player = t.player_id
    LEFT JOIN game_spins gs ON p.id_player = gs.player_id
WHERE 
    p.deleted_at IS NULL
GROUP BY 
    p.id_player, p.name, p.email, p.status, w.chips, w.bonus_chips, 
    w.total_deposited, w.total_withdrawn, w.total_wagered, w.total_won, p.created_at;

-- Vista: Estadísticas de juegos
DROP VIEW IF EXISTS `v_game_statistics`;

CREATE VIEW `v_game_statistics` AS
SELECT 
    g.id_game,
    g.name AS game_name,
    g.type AS game_type,
    g.status,
    COUNT(gs.id_spin) AS total_spins,
    COUNT(DISTINCT gs.player_id) AS unique_players,
    COALESCE(SUM(gs.bet_amount), 0) AS total_wagered,
    COALESCE(SUM(gs.win_amount), 0) AS total_paid_out,
    COALESCE(SUM(gs.bet_amount) - SUM(gs.win_amount), 0) AS casino_profit,
    CASE 
        WHEN SUM(gs.bet_amount) > 0 
        THEN ROUND((SUM(gs.win_amount) / SUM(gs.bet_amount)) * 100, 2)
        ELSE 0 
    END AS actual_rtp,
    g.rtp AS theoretical_rtp
FROM 
    games g
    LEFT JOIN game_spins gs ON g.id_game = gs.game_id
GROUP BY 
    g.id_game, g.name, g.type, g.status, g.rtp;

-- ============================================
-- NOTA IMPORTANTE SOBRE TRIGGERS Y PROCEDIMIENTOS
-- ============================================
-- Los triggers y procedimientos almacenados deben crearse manualmente
-- desde la línea de comandos de MySQL debido a limitaciones con DELIMITER
-- en clientes GUI. Ver archivo: database_triggers_procedures.sql

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Insertar juegos de ejemplo
INSERT INTO `games` (`name`, `slug`, `type`, `min_bet`, `max_bet`, `rtp`, `status`, `is_featured`, `description`) VALUES
('Black Diamond', 'black-diamond', 'SLOT', 1.00, 100.00, 90.00, 'ACTIVE', TRUE, 'Slot machine clásico con símbolos de diamantes y premios épicos'),
('Lucky Sevens', 'lucky-sevens', 'SLOT', 0.50, 50.00, 92.00, 'ACTIVE', FALSE, 'Slot de 3 carretes con símbolos de la suerte'),
('Mega Fortune', 'mega-fortune', 'SLOT', 2.00, 200.00, 88.50, 'ACTIVE', TRUE, 'Slot progresivo con jackpot millonario');

-- Insertar jugador de ejemplo
INSERT INTO `players` (`name`, `email`, `username`, `password_hash`, `status`, `email_verified`) VALUES
('Juan Pérez', 'juan@example.com', 'juanperez', '$2b$10$examplehash', 'ACTIVE', TRUE);

-- Crear wallet para el jugador
INSERT INTO `wallet` (`id_player`, `chips`) VALUES
(1, 1000.00);

-- ============================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================

-- Índice compuesto para consultas de historial
CREATE INDEX `idx_transactions_player_type_date` 
ON `transactions` (`player_id`, `transaction_type`, `created_at` DESC);

-- Índice para reportes por fecha
CREATE INDEX `idx_game_spins_date_game` 
ON `game_spins` (`created_at`, `game_id`);

-- ============================================
-- CONFIGURACIÓN FINAL
-- ============================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

SELECT 'Database schema created successfully!' AS status;
