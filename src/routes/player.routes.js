import {Router} from "express";
import { getPlayers, createPlayer, updatePlayer, deletePlayerById, getPlayerById, changeActivePlayer } from "../controller/player.controller.js";

const router = Router();


//Players
router.get("/players", getPlayers);
router.post("/players", createPlayer);

//Player
router.get("/player/:id", getPlayerById);
router.put("/player/:id", updatePlayer);
router.delete("/player/:id", deletePlayerById);
router.patch("/player/active/:id/:active", changeActivePlayer);

export default router;