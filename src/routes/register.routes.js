import { Router } from "express";
import {
    renderCreateForm,
    playerCreate
} from "../controller/player.crud.controller.js";

const router = Router();

// Ruta pública para registro de nuevos jugadores
router.get("/", renderCreateForm);
router.post("/", playerCreate);

export default router;
