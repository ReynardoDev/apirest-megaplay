import { Router } from "express";
import { ping } from "../controller/index.controller.js";
import { login } from "../controller/login.controller.js";

const router = Router();

// Ruta raíz - mostrar página de login
router.get('/', login);

router.get('/ping', ping);

export default router;