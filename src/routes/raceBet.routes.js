import { Router } from "express";
import {
    placeBet,
    updateRaceResult,
    getPlayerBetHistory,
    getRaceBets,
    getBetDetails
} from "../controller/raceBet.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.middleware.js";

const router = Router();

// Colocar una nueva apuesta (requiere autenticación)
router.post("/race-bet/place", verifyJWT, placeBet);

// Actualizar resultado de carrera (requiere autenticación)
router.put("/race-bet/:id_race_bet/result", verifyJWT, updateRaceResult);

// Obtener historial de apuestas del jugador (requiere autenticación)
router.get("/race-bet/player/:id_player", verifyJWT, getPlayerBetHistory);

// Obtener todas las apuestas de una carrera (público para auditoría)
router.get("/race-bet/race/:race_number", getRaceBets);

// Obtener detalles de una apuesta específica (requiere autenticación)
router.get("/race-bet/:id_race_bet", verifyJWT, getBetDetails);

export default router;
