import { Router } from "express";
// Asegúrate de importar la nueva función 'renderCreateForm' que creamos en el paso anterior
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
// Usamos la función dedicada que envía {error: null, data: {}}
// Si usas la función inline (req, res) => res.render(...) TE DARÁ ERROR en el EJS.
router.get("/create", renderCreateForm);

// B. Procesar el formulario (POST)
router.post("/create", playerCreate);


// --- 3. EDITAR JUGADOR ---
// A. Mostrar formulario de edición con los datos cargados
router.get("/edit/:id", playerEdit);

// B. Guardar cambios
// ⚠️ IMPORTANTE: Cambiado de PUT a POST porque HTML Forms no soportan PUT nativo.
router.post("/update/:id", playerUpdate);


// --- 4. ELIMINAR JUGADOR ---
// Si tu intención es borrar directamente al hacer click en un enlace:
router.get("/delete/:id", playerDelete);

/* NOTA: Si prefieres mostrar una pantalla de confirmación antes de borrar:
   router.get("/delete/:id", renderDeleteConfirm);
   router.post("/delete/:id", deletePlayerAction);
*/

export default router;