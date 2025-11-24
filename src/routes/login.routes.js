import { Router } from "express";
import { getPlayerLogin,getPlayerRegister } from "../controller/login.controller.js";

const router = Router();

router.post("/player/login", getPlayerLogin);
router.post("/player/register", getPlayerRegister);


export default router;