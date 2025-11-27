import { Router } from "express";
import { getPlayerLogin,getPlayerRegister, getProtected } from "../controller/login.controller.js";

const router = Router();

router.post("/player/login", getPlayerLogin);
router.post("/player/register", getPlayerRegister);
router.get("/player/protected", getProtected);

export default router;