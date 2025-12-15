import { Router } from "express";
import {
    getWallet,
    getChipsById,
    purchaseChips,
    purchaseView,
    placeBet,
    processWin
} from "../controller/wallet.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.middleware.js";
import {
    rateLimiter,
    preventConcurrentBets,
    validateBetAmount,
    detectSuspiciousPatterns
} from "../middlewares/antiCheat.middleware.js";

const router = Router();

router.get("/wallet", getWallet);
router.post("/wallet/getchips", getChipsById);

// Rutas para compra de chips
router.get("/wallet/purchase", purchaseView);
router.post("/wallet/purchase", verifyJWT, purchaseChips);  // Protegida con JWT

// Rutas para juegos (apuestas y ganancias) - PROTEGIDAS CON JWT Y ANTI-CHEAT
router.post("/wallet/bet",
    verifyJWT,                          // 1. Verificar autenticación
    rateLimiter('wallet/bet'),          // 2. Rate limit dinámico desde DB
    preventConcurrentBets,              // 3. Prevenir apuestas simultáneas
    validateBetAmount,                  // 4. Validar monto de apuesta
    detectSuspiciousPatterns,           // 5. Detectar patrones de trampa
    placeBet                            // 6. Procesar apuesta
);

router.post("/wallet/win",
    verifyJWT,                          // 1. Verificar autenticación
    rateLimiter('wallet/win'),          // 2. Rate limit dinámico desde DB
    processWin                          // 3. Procesar ganancia
);

export default router;