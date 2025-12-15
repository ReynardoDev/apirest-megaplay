import { pool } from "../db.js";
import path from "path";
import fs from "fs";

/**
 * Middleware: Verificar que el jugador tenga KYC aprobado
 * Bloquea retiros si KYC no está completado
 */
export const requireKYC = async (req, res, next) => {
    try {
        const id_player = res.locals.user?.id;

        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        // Verificar estado de KYC
        const [kycRows] = await pool.query(
            `SELECT status FROM player_kyc WHERE id_player = ?`,
            [id_player]
        );

        if (kycRows.length === 0 || kycRows[0].status === 'not_submitted') {
            return res.status(403).json({
                success: false,
                kyc_required: true,
                message: "🎉 ¡Felicidades por tu ganancia! Para retirar fondos, necesitamos verificar tu identidad por seguridad y regulaciones.",
                redirect_to: "/api/kyc/verify"
            });
        }

        const kycStatus = kycRows[0].status;

        if (kycStatus === 'pending_review') {
            return res.status(403).json({
                success: false,
                kyc_pending: true,
                message: "Tu verificación KYC está en revisión. Te notificaremos cuando esté aprobada (24-48 horas)."
            });
        }

        if (kycStatus === 'rejected') {
            return res.status(403).json({
                success: false,
                kyc_rejected: true,
                message: "Tu verificación KYC fue rechazada. Por favor, envía nuevos documentos.",
                redirect_to: "/api/kyc/verify"
            });
        }

        if (kycStatus === 'approved') {
            // KYC aprobado, continuar
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: "Verificación KYC requerida"
            });
        }

    } catch (error) {
        console.error("❌ Error en middleware requireKYC:", error);
        res.status(500).json({
            success: false,
            message: "Error al verificar KYC"
        });
    }
};

/**
 * Enviar documentos KYC
 * POST /api/kyc/submit
 */
export const submitKYC = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const id_player = res.locals.user?.id;
        const { full_name, document_type, document_number } = req.body;
        const files = req.files;

        // Validaciones
        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        if (!full_name || !document_type || !document_number) {
            return res.status(400).json({
                success: false,
                message: "Todos los campos son obligatorios"
            });
        }

        if (!files || !files.document_front || !files.document_back || !files.selfie) {
            return res.status(400).json({
                success: false,
                message: "Debes subir todos los documentos requeridos (frontal, reverso, selfie)"
            });
        }

        await connection.beginTransaction();

        // Crear directorio para el jugador si no existe
        const uploadDir = path.join(process.env.KYC_UPLOAD_PATH || 'uploads/kyc', id_player.toString());
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Mover archivos a directorio permanente
        const documentFrontPath = path.join(uploadDir, `document_front_${Date.now()}${path.extname(files.document_front[0].originalname)}`);
        const documentBackPath = path.join(uploadDir, `document_back_${Date.now()}${path.extname(files.document_back[0].originalname)}`);
        const selfiePath = path.join(uploadDir, `selfie_${Date.now()}${path.extname(files.selfie[0].originalname)}`);

        fs.renameSync(files.document_front[0].path, documentFrontPath);
        fs.renameSync(files.document_back[0].path, documentBackPath);
        fs.renameSync(files.selfie[0].path, selfiePath);

        // Verificar si ya existe KYC para este jugador
        const [existingKYC] = await connection.query(
            `SELECT id FROM player_kyc WHERE id_player = ?`,
            [id_player]
        );

        if (existingKYC.length > 0) {
            // Actualizar KYC existente
            await connection.query(
                `UPDATE player_kyc 
        SET full_name = ?, document_type = ?, document_number = ?, 
            document_front_url = ?, document_back_url = ?, selfie_url = ?,
            status = 'pending_review', submitted_at = NOW()
        WHERE id_player = ?`,
                [full_name, document_type, document_number, documentFrontPath, documentBackPath, selfiePath, id_player]
            );
        } else {
            // Crear nuevo registro KYC
            await connection.query(
                `INSERT INTO player_kyc 
          (id_player, full_name, document_type, document_number, document_front_url, document_back_url, selfie_url, status, submitted_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', NOW())`,
                [id_player, full_name, document_type, document_number, documentFrontPath, documentBackPath, selfiePath]
            );
        }

        await connection.commit();

        console.log(`📄 KYC enviado - Player: ${id_player}, Nombre: ${full_name}`);

        res.json({
            success: true,
            message: "Documentos enviados exitosamente. Serán revisados en 24-48 horas.",
            data: {
                status: 'pending_review',
                submitted_at: new Date()
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error al enviar KYC:", error);
        res.status(500).json({
            success: false,
            message: "Error al procesar documentos KYC"
        });
    } finally {
        connection.release();
    }
};

/**
 * Obtener estado de KYC del jugador
 * GET /api/kyc/status
 */
export const getKYCStatus = async (req, res) => {
    try {
        const id_player = res.locals.user?.id;

        if (!id_player) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión"
            });
        }

        const [kycRows] = await pool.query(
            `SELECT id, full_name, document_type, status, submitted_at, reviewed_at, rejection_reason 
      FROM player_kyc 
      WHERE id_player = ?`,
            [id_player]
        );

        if (kycRows.length === 0) {
            return res.json({
                success: true,
                data: {
                    status: 'not_submitted',
                    message: 'No has enviado documentos KYC aún'
                }
            });
        }

        const kyc = kycRows[0];

        res.json({
            success: true,
            data: {
                id: kyc.id,
                full_name: kyc.full_name,
                document_type: kyc.document_type,
                status: kyc.status,
                submitted_at: kyc.submitted_at,
                reviewed_at: kyc.reviewed_at,
                rejection_reason: kyc.rejection_reason
            }
        });

    } catch (error) {
        console.error("❌ Error al obtener estado KYC:", error);
        res.status(500).json({
            success: false,
            message: "Error al consultar estado KYC"
        });
    }
};

/**
 * Renderizar vista de verificación KYC
 * GET /api/kyc/verify
 */
export const renderKYCVerify = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.redirect('/api/player/form_login?message=Debes iniciar sesión');
        }

        const id_player = res.locals.user.id;

        // Obtener estado actual de KYC
        const [kycRows] = await pool.query(
            `SELECT status, rejection_reason FROM player_kyc WHERE id_player = ?`,
            [id_player]
        );

        const kycStatus = kycRows.length > 0 ? kycRows[0].status : 'not_submitted';
        const rejectionReason = kycRows.length > 0 ? kycRows[0].rejection_reason : null;

        res.render('kyc/verify', {
            title: 'Verificación de Identidad',
            kyc_status: kycStatus,
            rejection_reason: rejectionReason
        });

    } catch (error) {
        console.error("❌ Error al renderizar vista KYC:", error);
        res.status(500).send('Error al cargar página de verificación');
    }
};
