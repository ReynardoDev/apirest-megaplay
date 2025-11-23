
import { Router } from "express";
import { spinSlot } from "../controller/game.controller.js";

const router = Router();

router.post("/spin", spinSlot);

export default router;