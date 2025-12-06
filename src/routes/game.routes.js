
import { Router } from "express";
import { spinSlot, blackDiamondView } from "../controller/game.controller.js";

const router = Router();

// Ruta para renderizar la vista del juego
router.get("/game/black_diamond", blackDiamondView);

// Ruta API para el spin
router.post("/spin", spinSlot);

export default router;
