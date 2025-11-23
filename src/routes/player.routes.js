import {Router} from "express";
import { getPlayers, createPlayer, updatePlayer, deletePlayerById, getPlayerById, changeActivePlayer, getPlayerLogin,getWalletById } from "../controller/player.controller.js";

const router = Router();


//Players
router.get("/players", getPlayers);

router.get("/player/:id", getPlayerById);
router.put("/player/:id", updatePlayer);
router.delete("/player/:id", deletePlayerById);
router.patch("/player/active/:id/:active", changeActivePlayer);


//Login
router.get("/player/login/:email/:password", getPlayerLogin);

//Register
router.post("/player/register", createPlayer);

//Protected

//Logout

//Wallet
router.get("/wallet/:id", getWalletById);


export default router;