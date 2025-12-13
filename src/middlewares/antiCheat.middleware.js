/**
 * Middleware de Rate Limiting para prevenir spam y trampa
 * Limita el número de peticiones por usuario en un período de tiempo
 */

// Almacenamiento en memoria de las peticiones por usuario
// En producción, considera usar Redis para compartir entre instancias
const userRequests = new Map();
const activeBets = new Map(); // Rastrear apuestas activas

/**
 * Rate Limiter general
 * @param {number} maxRequests - Máximo de peticiones permitidas
 * @param {number} windowMs - Ventana de tiempo en milisegundos
 */
export const rateLimiter = (maxRequests = 10, windowMs = 60000) => {
    return (req, res, next) => {
        const userId = res.locals.user?.id;

        if (!userId) {
            // Si no hay usuario autenticado, el middleware de auth lo manejará
            return next();
        }

        const now = Date.now();
        const userKey = `rate_${userId}`;

        // Obtener o crear registro de peticiones del usuario
        if (!userRequests.has(userKey)) {
            userRequests.set(userKey, []);
        }

        const requests = userRequests.get(userKey);

        // Limpiar peticiones fuera de la ventana de tiempo
        const validRequests = requests.filter(timestamp => now - timestamp < windowMs);

        // Verificar si excede el límite
        if (validRequests.length >= maxRequests) {
            console.log(`⚠️ Rate limit excedido - User: ${userId}, Requests: ${validRequests.length}/${maxRequests}`);

            return res.status(429).json({
                success: false,
                message: "Demasiadas peticiones. Por favor espera un momento.",
                retry_after: Math.ceil((validRequests[0] + windowMs - now) / 1000) // segundos
            });
        }

        // Agregar petición actual
        validRequests.push(now);
        userRequests.set(userKey, validRequests);

        next();
    };
};

/**
 * Anti-Concurrent Bet Middleware
 * Previene que un usuario tenga múltiples apuestas activas simultáneamente
 */
export const preventConcurrentBets = (req, res, next) => {
    const userId = res.locals.user?.id;

    if (!userId) {
        return next();
    }

    const betKey = `bet_${userId}`;

    // Verificar si el usuario ya tiene una apuesta activa
    if (activeBets.has(betKey)) {
        const activeBet = activeBets.get(betKey);
        const timeSinceStart = Date.now() - activeBet.timestamp;

        // Si la apuesta tiene menos de 5 segundos, rechazar
        if (timeSinceStart < 5000) {
            console.log(`🚫 Apuesta concurrente bloqueada - User: ${userId}`);

            return res.status(429).json({
                success: false,
                message: "Ya tienes una apuesta en proceso. Espera a que termine.",
                active_bet_id: activeBet.id
            });
        } else {
            // Si pasaron más de 5 segundos, probablemente hubo un error
            // Limpiar la apuesta antigua y permitir continuar
            console.log(`⚠️ Limpiando apuesta antigua - User: ${userId}`);
            activeBets.delete(betKey);
        }
    }

    // Marcar apuesta como activa
    const betId = `${userId}_${Date.now()}`;
    activeBets.set(betKey, {
        id: betId,
        timestamp: Date.now()
    });

    // Agregar función para limpiar la apuesta al finalizar
    res.on('finish', () => {
        activeBets.delete(betKey);
        console.log(`✅ Apuesta finalizada - User: ${userId}`);
    });

    next();
};

/**
 * Validación de monto de apuesta
 * Previene apuestas sospechosamente altas o patrones de trampa
 */
export const validateBetAmount = (req, res, next) => {
    const { amount } = req.body;
    const userId = res.locals.user?.id;

    const betAmount = parseFloat(amount);

    // Validaciones básicas
    if (isNaN(betAmount) || betAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: "Monto de apuesta inválido"
        });
    }

    // Límite máximo por apuesta (configurable)
    const MAX_BET = 10000;
    if (betAmount > MAX_BET) {
        console.log(`🚨 Apuesta sospechosa - User: ${userId}, Amount: ${betAmount}`);

        return res.status(400).json({
            success: false,
            message: `El monto máximo de apuesta es ${MAX_BET} fichas`
        });
    }

    // Límite mínimo
    const MIN_BET = 1;
    if (betAmount < MIN_BET) {
        return res.status(400).json({
            success: false,
            message: `El monto mínimo de apuesta es ${MIN_BET} ficha`
        });
    }

    next();
};

/**
 * Detector de patrones sospechosos
 * Analiza el historial de apuestas para detectar bots o scripts
 */
const betHistory = new Map();

export const detectSuspiciousPatterns = (req, res, next) => {
    const userId = res.locals.user?.id;
    const { amount } = req.body;

    if (!userId) {
        return next();
    }

    const historyKey = `history_${userId}`;
    const now = Date.now();

    // Obtener historial del usuario
    if (!betHistory.has(historyKey)) {
        betHistory.set(historyKey, []);
    }

    const history = betHistory.get(historyKey);

    // Limpiar historial antiguo (últimos 5 minutos para mejor análisis)
    const recentHistory = history.filter(bet => now - bet.timestamp < 300000); // 5 minutos

    // Agregar apuesta actual
    recentHistory.push({
        amount: parseFloat(amount),
        timestamp: now
    });

    betHistory.set(historyKey, recentHistory);

    // PATRÓN 1: Demasiadas apuestas en poco tiempo (más de 50 en 5 minutos)
    // Esto permite ~10 apuestas por minuto, razonable para juego activo
    if (recentHistory.length > 50) {
        console.log(`🚨 Patrón sospechoso detectado - User: ${userId}, Bets: ${recentHistory.length} en 5 minutos`);

        return res.status(429).json({
            success: false,
            message: "Actividad sospechosa detectada. Tu cuenta ha sido temporalmente limitada."
        });
    }

    // PATRÓN 2: Apuestas idénticas repetidas (bot)
    // Requiere al menos 15 apuestas en 5 minutos para evitar falsos positivos
    // Es normal que un jugador apueste el mismo monto varias veces
    if (recentHistory.length >= 15) {
        const amounts = recentHistory.map(b => b.amount);
        const uniqueAmounts = [...new Set(amounts)];

        // Si solo hay 1, 2 o 3 montos diferentes en 15+ apuestas, verificar porcentaje
        if (uniqueAmounts.length <= 3) {
            // Contar cuántas veces aparece el monto más común
            const amountCounts = {};
            amounts.forEach(amt => {
                amountCounts[amt] = (amountCounts[amt] || 0) + 1;
            });

            const maxCount = Math.max(...Object.values(amountCounts));
            const totalBets = amounts.length;

            // Si más del 90% de las apuestas son del mismo monto (muy sospechoso)
            if (maxCount / totalBets > 0.9) {
                console.log(`🚨 Bot detectado - User: ${userId}, Apuestas idénticas: ${maxCount}/${totalBets} con monto ${Object.keys(amountCounts).find(k => amountCounts[k] === maxCount)}`);

                return res.status(429).json({
                    success: false,
                    message: "Patrón de apuestas sospechoso detectado. Por favor varía tus apuestas."
                });
            }
        }
    }

    // PATRÓN 3: Apuestas muy rápidas con intervalos sospechosamente regulares
    // Un humano tiene variación natural en el tiempo entre apuestas
    if (recentHistory.length >= 8) {
        const intervals = [];
        for (let i = 1; i < recentHistory.length; i++) {
            intervals.push(recentHistory[i].timestamp - recentHistory[i - 1].timestamp);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        // Calcular desviación estándar para detectar patrones robóticos
        const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - avgInterval, 2);
        }, 0) / intervals.length;
        const stdDeviation = Math.sqrt(variance);

        // Si el promedio es muy bajo (menos de 2 segundos) Y la desviación es muy baja (patrón robótico)
        // Desviación < 300ms indica un patrón extremadamente regular (bot)
        if (avgInterval < 2000 && stdDeviation < 300) {
            console.log(`🚨 Patrón robótico detectado - User: ${userId}, Promedio: ${avgInterval}ms, Desviación: ${stdDeviation}ms`);

            return res.status(429).json({
                success: false,
                message: "Patrón de apuestas automático detectado. Tómate un momento entre apuestas."
            });
        }

        // Si las apuestas son extremadamente rápidas (menos de 1 segundo promedio)
        if (avgInterval < 1000) {
            console.log(`🚨 Apuestas muy rápidas - User: ${userId}, Promedio: ${avgInterval}ms`);

            return res.status(429).json({
                success: false,
                message: "Estás apostando demasiado rápido. Tómate un momento."
            });
        }
    }

    next();
};

/**
 * Limpiar datos antiguos periódicamente
 * Ejecutar cada 5 minutos para liberar memoria
 */
export const cleanupOldData = () => {
    const now = Date.now();
    const CLEANUP_THRESHOLD = 300000; // 5 minutos

    // Limpiar rate limiter
    for (const [key, requests] of userRequests.entries()) {
        const validRequests = requests.filter(timestamp => now - timestamp < 60000);
        if (validRequests.length === 0) {
            userRequests.delete(key);
        } else {
            userRequests.set(key, validRequests);
        }
    }

    // Limpiar apuestas activas antiguas (posibles errores)
    for (const [key, bet] of activeBets.entries()) {
        if (now - bet.timestamp > 10000) { // Más de 10 segundos
            activeBets.delete(key);
            console.log(`🧹 Limpiando apuesta antigua: ${key}`);
        }
    }

    // Limpiar historial
    for (const [key, history] of betHistory.entries()) {
        const recentHistory = history.filter(bet => now - bet.timestamp < 300000); // 5 minutos
        if (recentHistory.length === 0) {
            betHistory.delete(key);
        } else {
            betHistory.set(key, recentHistory);
        }
    }

    console.log(`🧹 Limpieza completada - Users en memoria: ${userRequests.size}`);
};

// Ejecutar limpieza cada 5 minutos
setInterval(cleanupOldData, 300000);
