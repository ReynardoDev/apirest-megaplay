import { Router } from "express";
import { getPlayerLogin, getProtected, login } from "../controller/login.controller.js";

const router = Router();


router.get("/player/form_login", login);
router.post("/player/login", getPlayerLogin);
router.get("/player/protected", getProtected);

export default router;