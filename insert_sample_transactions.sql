-- Script para insertar transacciones de muestra en la base de datos
-- Esto permitirá que los gráficos de estadísticas muestren datos

-- Asegurarse de que existan jugadores primero
-- Asumiendo que ya tienes jugadores con id_player 1, 2, 3

-- Insertar transacciones de muestra de los últimos 30 días
INSERT INTO transactions (player_id, transaction_type, amount, balance_before, balance_after, reference_type, description, status, created_at) VALUES
-- Depósitos
(1, 'DEPOSIT', 1000.00, 0.00, 1000.00, 'DEPOSIT', 'Depósito inicial', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(2, 'DEPOSIT', 500.00, 0.00, 500.00, 'DEPOSIT', 'Depósito inicial', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 28 DAY)),
(3, 'DEPOSIT', 750.00, 0.00, 750.00, 'DEPOSIT', 'Depósito inicial', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(1, 'DEPOSIT', 500.00, 1000.00, 1500.00, 'DEPOSIT', 'Recarga de chips', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(2, 'DEPOSIT', 300.00, 500.00, 800.00, 'DEPOSIT', 'Recarga de chips', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 15 DAY)),

-- Débitos (apuestas)
(1, 'DEBIT', 50.00, 1500.00, 1450.00, 'GAME_SPIN', 'Apuesta en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 19 DAY)),
(1, 'DEBIT', 100.00, 1450.00, 1350.00, 'GAME_SPIN', 'Apuesta en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(2, 'DEBIT', 25.00, 800.00, 775.00, 'GAME_SPIN', 'Apuesta en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 14 DAY)),
(3, 'DEBIT', 75.00, 750.00, 675.00, 'GAME_SPIN', 'Apuesta en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 13 DAY)),
(1, 'DEBIT', 200.00, 1350.00, 1150.00, 'GAME_SPIN', 'Apuesta en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 10 DAY)),

-- Créditos (ganancias)
(1, 'CREDIT', 150.00, 1150.00, 1300.00, 'GAME_WIN', 'Ganancia en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 9 DAY)),
(2, 'CREDIT', 75.00, 775.00, 850.00, 'GAME_WIN', 'Ganancia en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(3, 'CREDIT', 200.00, 675.00, 875.00, 'GAME_WIN', 'Ganancia en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 7 DAY)),

-- Transacciones más recientes
(1, 'DEPOSIT', 1000.00, 1300.00, 2300.00, 'DEPOSIT', 'Depósito', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 'DEBIT', 50.00, 850.00, 800.00, 'GAME_SPIN', 'Apuesta en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 'DEBIT', 100.00, 875.00, 775.00, 'GAME_SPIN', 'Apuesta en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, 'CREDIT', 250.00, 2300.00, 2550.00, 'GAME_WIN', 'Ganancia en Black Diamond', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'DEPOSIT', 500.00, 800.00, 1300.00, 'DEPOSIT', 'Recarga de chips', 'COMPLETED', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 'CREDIT', 150.00, 775.00, 925.00, 'GAME_WIN', 'Ganancia en Black Diamond', 'COMPLETED', NOW());

-- Verificar que se insertaron correctamente
SELECT 
    transaction_type,
    COUNT(*) as total_transactions,
    SUM(amount) as total_amount
FROM transactions
GROUP BY transaction_type;
