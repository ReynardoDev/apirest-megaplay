import { Router } from "express";

import {
    getPlayerList,
    renderCreateForm,
    playerCreate,
    playerEdit,
    playerUpdate,
    playerDelete
} from "../controller/player.crud.controller.js";

const router = Router();

// --- 1. LISTAR JUGADORES ---
router.get("/", getPlayerList);


// --- 2. CREAR JUGADOR ---
// A. Mostrar el formulario (GET)
router.get("/create", renderCreateForm);

// B. Procesar el formulario (POST)
router.post("/create", playerCreate);

// C. API endpoint para registro desde Godot (POST)
router.post("/register", playerCreate);


// --- 3. EDITAR JUGADOR ---
// A. Mostrar formulario de edición con los datos cargados
router.get("/edit/:id", playerEdit);

// B. Guardar cambios
router.post("/update/:id", playerUpdate);


// --- 4. ELIMINAR JUGADOR ---
router.get("/delete/:id", playerDelete);

export default router;