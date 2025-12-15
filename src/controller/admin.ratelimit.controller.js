import { pool } from '../db.js';

// Renderizar vista de configuración de rate limits
export const getRateLimitsView = async (req, res) => {
    try {
        res.render('admin/rate_limit', {
            title: 'Configuración Rate Limit'
        });
    } catch (error) {
        console.error('Error al cargar vista de rate limits:', error);
        res.status(500).send('Error al cargar la vista');
    }
};

// Obtener todas las configuraciones de rate limit (API)
export const getRateLimits = async (req, res) => {
    try {
        const [configs] = await pool.query(
            'SELECT * FROM rate_limit_config ORDER BY endpoint ASC'
        );

        res.json({
            success: true,
            configs: configs
        });
    } catch (error) {
        console.error('Error al obtener rate limits:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuraciones'
        });
    }
};

// Obtener una configuración por ID (API)
export const getRateLimitById = async (req, res) => {
    try {
        const { id } = req.params;

        const [configs] = await pool.query(
            'SELECT * FROM rate_limit_config WHERE id = ?',
            [id]
        );

        if (configs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuración no encontrada'
            });
        }

        res.json({
            success: true,
            config: configs[0]
        });
    } catch (error) {
        console.error('Error al obtener rate limit:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuración'
        });
    }
};

// Actualizar configuración de rate limit (API)
export const updateRateLimit = async (req, res) => {
    try {
        const { id } = req.params;
        const { max_requests, window_ms, description } = req.body;

        // Validaciones
        if (!max_requests || !window_ms) {
            return res.status(400).json({
                success: false,
                message: 'Max requests y window son requeridos'
            });
        }

        const maxReq = parseInt(max_requests);
        const windowTime = parseInt(window_ms);

        if (maxReq <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Max requests debe ser mayor a 0'
            });
        }

        if (windowTime <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Window debe ser mayor a 0'
            });
        }

        // Actualizar configuración
        await pool.query(
            `UPDATE rate_limit_config 
            SET max_requests = ?, window_ms = ?, description = ?, updated_at = NOW()
            WHERE id = ?`,
            [maxReq, windowTime, description || null, id]
        );

        console.log(`✅ Rate limit actualizado: ID ${id}`);

        res.json({
            success: true,
            message: 'Configuración actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar rate limit:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar configuración'
        });
    }
};

// Activar/Desactivar rate limit (API)
export const toggleRateLimit = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener estado actual
        const [configs] = await pool.query(
            'SELECT is_active FROM rate_limit_config WHERE id = ?',
            [id]
        );

        if (configs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuración no encontrada'
            });
        }

        const newStatus = configs[0].is_active ? 0 : 1;

        // Actualizar estado
        await pool.query(
            'UPDATE rate_limit_config SET is_active = ?, updated_at = NOW() WHERE id = ?',
            [newStatus, id]
        );

        console.log(`✅ Rate limit ${newStatus ? 'activado' : 'desactivado'}: ID ${id}`);

        res.json({
            success: true,
            message: `Configuración ${newStatus ? 'activada' : 'desactivada'} exitosamente`,
            is_active: newStatus
        });
    } catch (error) {
        console.error('Error al cambiar estado de rate limit:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado'
        });
    }
};
