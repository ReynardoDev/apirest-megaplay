-- ============================================
-- MIGRACIÓN: Tablas para Pagos USDT y KYC
-- ============================================

-- Tabla para depósitos USDT vía NOWPayments
CREATE TABLE IF NOT EXISTS crypto_deposits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_player INT NOT NULL,
  payment_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'ID de pago de NOWPayments',
  invoice_url TEXT COMMENT 'URL de pago generada',
  pay_address VARCHAR(255) COMMENT 'Dirección USDT TRC20 para depositar',
  amount_usdt DECIMAL(18,8) NOT NULL COMMENT 'Monto en USDT',
  chips_to_credit INT NOT NULL COMMENT 'Chips a acreditar (amount * 10)',
  status ENUM('waiting', 'confirming', 'confirmed', 'finished', 'failed', 'expired') DEFAULT 'waiting',
  tx_hash VARCHAR(255) COMMENT 'Hash de transacción blockchain',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (id_player) REFERENCES players(id) ON DELETE CASCADE,
  INDEX idx_payment_id (payment_id),
  INDEX idx_player_status (id_player, status),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Depósitos USDT vía NOWPayments';

-- Tabla para retiros USDT
CREATE TABLE IF NOT EXISTS crypto_withdrawals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_player INT NOT NULL,
  destination_address VARCHAR(255) NOT NULL COMMENT 'Dirección TRON destino',
  amount_usdt DECIMAL(18,8) NOT NULL COMMENT 'Monto en USDT',
  chips_debited INT NOT NULL COMMENT 'Chips debitados (amount * 10)',
  status ENUM('pending_kyc', 'pending_approval', 'processing', 'completed', 'failed', 'rejected') DEFAULT 'pending_kyc',
  tx_hash VARCHAR(255) COMMENT 'Hash de transacción blockchain',
  payout_id VARCHAR(255) COMMENT 'ID de payout de NOWPayments',
  rejection_reason TEXT,
  admin_approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  FOREIGN KEY (id_player) REFERENCES players(id) ON DELETE CASCADE,
  INDEX idx_player_status (id_player, status),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Retiros USDT';

-- Tabla para KYC diferido
CREATE TABLE IF NOT EXISTS player_kyc (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_player INT UNIQUE NOT NULL,
  full_name VARCHAR(255),
  document_type ENUM('dni', 'passport', 'driver_license') COMMENT 'Tipo de documento',
  document_number VARCHAR(100),
  document_front_url TEXT COMMENT 'URL imagen frontal del documento',
  document_back_url TEXT COMMENT 'URL imagen reverso del documento',
  selfie_url TEXT COMMENT 'URL selfie con documento',
  status ENUM('not_submitted', 'pending_review', 'approved', 'rejected') DEFAULT 'not_submitted',
  rejection_reason TEXT,
  submitted_at TIMESTAMP NULL,
  reviewed_at TIMESTAMP NULL,
  reviewed_by INT COMMENT 'ID del admin que revisó',
  FOREIGN KEY (id_player) REFERENCES players(id) ON DELETE CASCADE,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Verificación KYC diferida';

-- Actualizar tabla transactions para soportar crypto
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS crypto_tx_hash VARCHAR(255) AFTER reference_id,
ADD INDEX IF NOT EXISTS idx_crypto_tx (crypto_tx_hash);

-- Crear directorio para uploads de KYC (ejecutar manualmente)
-- mkdir -p uploads/kyc

SELECT 'Migración de tablas crypto completada exitosamente' AS status;
