import { Router } from "express";
import { getPlayers, getPlayerById, updatePlayer, deletePlayerById, changeActivePlayer, listPlayers } from "../controller/player.controller.js";

const router = Router();

router.get("/players", getPlayers);
router.get("/player/:id", getPlayerById);
router.put("/player/:id", updatePlayer);
router.delete("/player/:id", deletePlayerById);
router.patch("/player/active/:id/:active", changeActivePlayer);
router.get("/player/list", listPlayers);



export default router;