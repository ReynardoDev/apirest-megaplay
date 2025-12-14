import { Router } from 'express';
import * as gamesController from '../controller/admin.games.controller.js';

const router = Router();

// Vista de gestión de juegos
router.get('/', gamesController.getGamesView);

// API endpoints
router.get('/api', gamesController.getGames);
router.get('/api/:id', gamesController.getGameById);
router.post('/api', gamesController.createGame);
router.put('/api/:id', gamesController.updateGame);
router.delete('/api/:id', gamesController.deleteGame);

export default router;
