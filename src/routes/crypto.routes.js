import { Router } from "express";
import {
    createDeposit,
    getDepositStatus,
    handleIPNWebhook,
    requestWithdrawal,
    getTransactionHistory,
    getConversionRate
} from "../controller/crypto.controller.js";
import {
    submitKYC,
    getKYCStatus,
    requireKYC,
    renderKYCVerify
} from "../controller/kyc.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.middleware.js";
import { rateLimiter } from "../middlewares/antiCheat.middleware.js";
import multer from "multer";

const router = Router();

// Configurar multer para uploads de KYC
const upload = multer({
    dest: 'uploads/kyc/temp/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max por archivo
    },
    fileFilter: (req, file, cb) => {
        // Solo permitir imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'));
        }
    }
});

// ============================================
// RUTAS DE DEPÓSITOS USDT
// ============================================

// Crear depósito
router.post(
    "/crypto/deposit",
    verifyJWT,
    rateLimiter('crypto/deposit'),
    createDeposit
);

// Obtener estado de depósito
router.get(
    "/crypto/deposit/:id/status",
    verifyJWT,
    getDepositStatus
);

// ============================================
// WEBHOOK IPN (sin autenticación JWT)
// ============================================

// Webhook de NOWPayments (verificado por firma HMAC)
router.post(
    "/crypto/webhook/ipn",
    handleIPNWebhook
);

// ============================================
// RUTAS DE RETIROS USDT
// ============================================

// Solicitar retiro (requiere KYC aprobado)
router.post(
    "/crypto/withdraw",
    verifyJWT,
    requireKYC,  // Middleware que verifica KYC
    rateLimiter('crypto/withdraw'),
    requestWithdrawal
);

// ============================================
// HISTORIAL Y CONVERSIÓN
// ============================================

// Obtener historial de transacciones crypto
router.get(
    "/crypto/transactions",
    verifyJWT,
    getTransactionHistory
);

// Obtener tasa de conversión
router.get(
    "/crypto/conversion-rate",
    getConversionRate
);

// ============================================
// RUTAS DE KYC
// ============================================

// Vista de verificación KYC
router.get(
    "/kyc/verify",
    renderKYCVerify
);

// Enviar documentos KYC
router.post(
    "/kyc/submit",
    verifyJWT,
    upload.fields([
        { name: 'document_front', maxCount: 1 },
        { name: 'document_back', maxCount: 1 },
        { name: 'selfie', maxCount: 1 }
    ]),
    submitKYC
);

// Obtener estado de KYC
router.get(
    "/kyc/status",
    verifyJWT,
    getKYCStatus
);

export default router;
