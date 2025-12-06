-- ============================================
-- ACTUALIZAR TABLA PLAYERS - Agregar columna NAME
-- ============================================

USE `fair_play_casino`;

-- Verificar estructura actual
DESCRIBE players;

-- Agregar columna 'name' si no existe
ALTER TABLE `players` 
ADD COLUMN IF NOT EXISTS `name` VARCHAR(100) NOT NULL AFTER `id_player`;

-- Agregar columna 'username' si no existe (renombrar 'user' a 'username')
-- Primero verificamos si existe 'user'
ALTER TABLE `players` 
CHANGE COLUMN `user` `username` VARCHAR(50) NOT NULL;

-- Agregar columna 'password_hash' si no existe (renombrar 'password' a 'password_hash')
ALTER TABLE `players` 
CHANGE COLUMN `password` `password_hash` VARCHAR(255) NOT NULL;

-- Agregar columnas adicionales si no existen
ALTER TABLE `players` 
ADD COLUMN IF NOT EXISTS `phone` VARCHAR(20) NULL AFTER `email`,
ADD COLUMN IF NOT EXISTS `country` VARCHAR(2) NULL AFTER `phone`,
ADD COLUMN IF NOT EXISTS `date_of_birth` DATE NULL AFTER `country`,
ADD COLUMN IF NOT EXISTS `kyc_verified` BOOLEAN DEFAULT FALSE AFTER `email_verified`,
ADD COLUMN IF NOT EXISTS `daily_deposit_limit` DECIMAL(15, 2) NULL DEFAULT 1000.00 AFTER `kyc_verified`,
ADD COLUMN IF NOT EXISTS `daily_bet_limit` DECIMAL(15, 2) NULL DEFAULT 500.00 AFTER `daily_deposit_limit`,
ADD COLUMN IF NOT EXISTS `last_login_at` TIMESTAMP NULL AFTER `daily_bet_limit`,
ADD COLUMN IF NOT EXISTS `last_login_ip` VARCHAR(45) NULL AFTER `last_login_at`,
ADD COLUMN IF NOT EXISTS `registration_ip` VARCHAR(45) NULL AFTER `last_login_ip`,
ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
ADD COLUMN IF NOT EXISTS `deleted_at` TIMESTAMP NULL AFTER `updated_at`;

-- Modificar columna status si existe
ALTER TABLE `players` 
MODIFY COLUMN `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION') DEFAULT 'ACTIVE';

-- Eliminar columna kyc_status si existe (reemplazada por kyc_verified)
ALTER TABLE `players` 
DROP COLUMN IF EXISTS `kyc_status`;

-- Verificar estructura final
DESCRIBE players;

SELECT 'Tabla players actualizada exitosamente!' AS status;
