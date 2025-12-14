import { Router } from "express";
import { getPlayerLogin, getProtected, getPlayerLogout, login } from "../controller/login.controller.js";
import { playerCreateAPI } from "../controller/player.crud.controller.js";

const router = Router();


router.get("/player/form_login", login);
router.post("/player/login", getPlayerLogin);
router.post("/player/register", playerCreateAPI); // Ruta para registro desde Godot (devuelve JSON)
router.get("/player/protected", getProtected);
router.get("/player/logout", getPlayerLogout);

export default router;