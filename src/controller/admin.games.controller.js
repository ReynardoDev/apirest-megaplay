import { pool } from '../db.js';

// Renderizar vista de gestión de juegos
export const getGamesView = async (req, res) => {
    try {
        res.render('admin/games', {
            title: 'Gestión de Juegos'
        });
    } catch (error) {
        console.error('Error al cargar vista de juegos:', error);
        res.status(500).send('Error al cargar la vista');
    }
};

// Obtener todos los juegos (API)
export const getGames = async (req, res) => {
    try {
        const { type, status, search } = req.query;

        let query = 'SELECT * FROM games WHERE 1=1';
        const params = [];

        // Filtro por tipo
        if (type && type !== 'ALL') {
            query += ' AND type = ?';
            params.push(type);
        }

        // Filtro por estado
        if (status && status !== 'ALL') {
            query += ' AND status = ?';
            params.push(status);
        }

        // Búsqueda por nombre o slug
        if (search) {
            query += ' AND (name LIKE ? OR slug LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC';

        const [games] = await pool.query(query, params);

        res.json({
            success: true,
            games: games
        });
    } catch (error) {
        console.error('Error al obtener juegos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener juegos'
        });
    }
};

// Obtener un juego por ID (API)
export const getGameById = async (req, res) => {
    try {
        const { id } = req.params;

        const [games] = await pool.query(
            'SELECT * FROM games WHERE id_game = ?',
            [id]
        );

        if (games.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Juego no encontrado'
            });
        }

        res.json({
            success: true,
            game: games[0]
        });
    } catch (error) {
        console.error('Error al obtener juego:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener juego'
        });
    }
};

// Crear nuevo juego (API)
export const createGame = async (req, res) => {
    try {
        const {
            name,
            slug,
            type,
            provider,
            min_bet,
            max_bet,
            rtp,
            status,
            is_featured,
            description,
            thumbnail_url,
            rules_url
        } = req.body;

        // Validaciones
        if (!name || !slug || !type) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, slug y tipo son requeridos'
            });
        }

        // Validar que min_bet < max_bet
        if (parseFloat(min_bet) >= parseFloat(max_bet)) {
            return res.status(400).json({
                success: false,
                message: 'La apuesta mínima debe ser menor que la máxima'
            });
        }

        // Validar RTP (0-100)
        if (rtp && (parseFloat(rtp) < 0 || parseFloat(rtp) > 100)) {
            return res.status(400).json({
                success: false,
                message: 'El RTP debe estar entre 0 y 100'
            });
        }

        // Verificar que el slug sea único
        const [existing] = await pool.query(
            'SELECT id_game FROM games WHERE slug = ?',
            [slug]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El slug ya existe. Por favor usa uno diferente.'
            });
        }

        // Insertar el juego
        const [result] = await pool.query(
            `INSERT INTO games 
            (name, slug, type, provider, min_bet, max_bet, rtp, status, is_featured, description, thumbnail_url, rules_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                slug,
                type,
                provider || null,
                min_bet || 1.00,
                max_bet || 1000.00,
                rtp || null,
                status || 'ACTIVE',
                is_featured ? 1 : 0,
                description || null,
                thumbnail_url || null,
                rules_url || null
            ]
        );

        console.log(`✅ Juego creado: ${name} (ID: ${result.insertId})`);

        res.json({
            success: true,
            message: 'Juego creado exitosamente',
            game_id: result.insertId
        });
    } catch (error) {
        console.error('Error al crear juego:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear juego'
        });
    }
};

// Actualizar juego (API)
export const updateGame = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            slug,
            type,
            provider,
            min_bet,
            max_bet,
            rtp,
            status,
            is_featured,
            description,
            thumbnail_url,
            rules_url
        } = req.body;

        // Validaciones
        if (!name || !slug || !type) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, slug y tipo son requeridos'
            });
        }

        // Validar que min_bet < max_bet
        if (parseFloat(min_bet) >= parseFloat(max_bet)) {
            return res.status(400).json({
                success: false,
                message: 'La apuesta mínima debe ser menor que la máxima'
            });
        }

        // Validar RTP (0-100)
        if (rtp && (parseFloat(rtp) < 0 || parseFloat(rtp) > 100)) {
            return res.status(400).json({
                success: false,
                message: 'El RTP debe estar entre 0 y 100'
            });
        }

        // Verificar que el slug sea único (excepto para el juego actual)
        const [existing] = await pool.query(
            'SELECT id_game FROM games WHERE slug = ? AND id_game != ?',
            [slug, id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El slug ya existe. Por favor usa uno diferente.'
            });
        }

        // Actualizar el juego
        await pool.query(
            `UPDATE games SET 
            name = ?, 
            slug = ?, 
            type = ?, 
            provider = ?, 
            min_bet = ?, 
            max_bet = ?, 
            rtp = ?, 
            status = ?, 
            is_featured = ?, 
            description = ?, 
            thumbnail_url = ?, 
            rules_url = ?,
            updated_at = NOW()
            WHERE id_game = ?`,
            [
                name,
                slug,
                type,
                provider || null,
                min_bet,
                max_bet,
                rtp || null,
                status,
                is_featured ? 1 : 0,
                description || null,
                thumbnail_url || null,
                rules_url || null,
                id
            ]
        );

        console.log(`✅ Juego actualizado: ${name} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Juego actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar juego:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar juego'
        });
    }
};

// Eliminar juego (soft delete - cambiar a INACTIVE)
export const deleteGame = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE games SET status = ?, updated_at = NOW() WHERE id_game = ?',
            ['INACTIVE', id]
        );

        console.log(`✅ Juego eliminado (INACTIVE): ID ${id}`);

        res.json({
            success: true,
            message: 'Juego eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar juego:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar juego'
        });
    }
};
