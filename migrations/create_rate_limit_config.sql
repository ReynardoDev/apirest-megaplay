-- Tabla para configuración de Rate Limiting
CREATE TABLE `rate_limit_config` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`endpoint` VARCHAR(100) NOT NULL COMMENT 'Endpoint de la API (ej: wallet/bet)' COLLATE 'utf8mb4_unicode_ci',
	`max_requests` INT(10) UNSIGNED NOT NULL DEFAULT '30' COMMENT 'Máximo de peticiones permitidas',
	`window_ms` INT(10) UNSIGNED NOT NULL DEFAULT '60000' COMMENT 'Ventana de tiempo en milisegundos',
	`description` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Descripción del límite' COLLATE 'utf8mb4_unicode_ci',
	`is_active` TINYINT(1) NOT NULL DEFAULT '1' COMMENT 'Si está activo o no',
	`created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
	`updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE current_timestamp(),
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `endpoint` (`endpoint`) USING BTREE,
	INDEX `idx_active` (`is_active`) USING BTREE
)
COMMENT='Configuración de rate limiting por endpoint'
COLLATE='utf8mb4_unicode_ci'
ENGINE=InnoDB;

-- Insertar configuración por defecto
INSERT INTO `rate_limit_config` (`endpoint`, `max_requests`, `window_ms`, `description`, `is_active`) VALUES
('wallet/bet', 30, 60000, 'Límite de apuestas por minuto', 1),
('wallet/win', 30, 60000, 'Límite de ganancias por minuto', 1),
('wallet/purchase', 10, 60000, 'Límite de compras de chips por minuto', 1),
('player/login', 5, 300000, 'Límite de intentos de login (5 minutos)', 1),
('player/register', 3, 3600000, 'Límite de registros por hora', 1);
