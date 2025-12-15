import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt from 'jsonwebtoken'; // 1. IMPORTAR JWT

// Imports de rutas...
import indexRoutes from "./routes/index.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import gameRoutes from "./routes/game.routes.js";
import raceBetRoutes from "./routes/raceBet.routes.js";
import homeRoutes from "./routes/home.routes.js";
import loginRoutes from "./routes/login.routes.js";
import playerCrudRoutes from "./routes/player.crud.routes.js";
import registerRoutes from "./routes/register.routes.js";
import adminLoginRoutes from "./routes/admin.login.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import cryptoRoutes from "./routes/crypto.routes.js";

// Middlewares
import { jsonSyntaxErrorHandler } from "./middlewares/errorHandler.js";

// Configuración de rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Variables de entorno (Asegúrate de que coincidan con tu login controller)
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

// --- MIDDLEWARES GLOBALES ---
app.use(cors({
    origin: true, // En desarrollo, acepta cualquier origen
    credentials: true // 🔑 Permite envío de cookies
}));
app.use(express.json()); // Solo una vez
app.use(express.urlencoded({ extended: true })); // Para formularios HTML
app.use(cookieParser());

// Middleware para inyectar datos del usuario en todas las vistas
app.use(async (req, res, next) => {
    const token = req.cookies.access_token;
    res.locals.user = null; // Por defecto, no hay usuario

    if (token) {
        try {
            const data = jwt.verify(token, JWT_SECRET);

            // Obtener los chips actuales del usuario desde la base de datos
            const { pool } = await import('./db.js');
            const [rows] = await pool.query(
                "SELECT chips FROM wallet WHERE id_player = ?",
                [data.id]
            );

            // Hacemos disponible el usuario en TODAS las vistas EJS
            res.locals.user = {
                id: data.id,
                name: data.user, // El nombre de usuario viene del token
                chips: rows.length > 0 ? rows[0].chips : 0 // Chips actuales
            };

            // 🔍 DEBUG: Ver qué datos se están cargando
            console.log('✅ Usuario autenticado:', {
                id: res.locals.user.id,
                name: res.locals.user.name,
                chips: res.locals.user.chips
            });

        } catch (error) {
            // Token inválido o expirado, simplemente no hay usuario
            console.log('❌ Error de autenticación:', error.message);
            res.locals.user = null;
        }
    }

    next();
});




// --- MIDDLEWARE DE AUTENTICACIÓN (Definido, pero no usado globalmente aún) ---
const verifyToken = (req, res, next) => {
    const token = req.cookies.access_token;
    req.session = { user: null };

    if (!token) {
        // Si intenta entrar al CRUD sin token, error 403 o redirigir al login
        return res.status(403).render('login/index', { // O res.redirect('/login')
            title: "Login",
            message: "Debes iniciar sesión primero"
        });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.session.user = data;
        next(); // Token válido, pasa
    } catch (error) {
        return res.status(403).send("Token inválido o expirado");
    }
};

// --- VISTAS ---
// ⚠️ IMPORTANTE: Configurar vistas ANTES de las rutas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- RUTAS ---

app.use(indexRoutes);
app.use(homeRoutes);

// Rutas Públicas (No requieren token)
app.use('/api', loginRoutes); // El login debe ser público
app.use('/api', gameRoutes);  // Rutas de juego
app.use('/api', raceBetRoutes); // Rutas de apuestas de carreras
app.use('/register', registerRoutes); // Registro público

// Rutas de Admin (Login público)
app.use('/admin', adminLoginRoutes);

// Rutas de Admin (Protegidas - requieren admin_token)
app.use('/admin', adminRoutes);

// Rutas Protegidas (Requieren token de jugador O admin)
// 👇 Permite acceso tanto a jugadores como a admins
import { verifyPlayerOrAdmin } from './middlewares/verifyPlayerOrAdmin.middleware.js';
app.use('/crud', verifyPlayerOrAdmin, playerCrudRoutes);
app.use('/api', cryptoRoutes); // Rutas de crypto (depósitos, retiros, KYC)
app.use('/api', walletRoutes); // Quizás quieras proteger la billetera también

// --- MANEJADORES DE ERROR (SIEMPRE AL FINAL) ---
// Manejador de errores de JSON (Siempre al final de los parsers)
app.use(jsonSyntaxErrorHandler);

// 404 Handler - DEBE SER EL ÚLTIMO
app.use((req, res, next) => {
    res.status(404).json({
        message: "404 - Page not found"
    });
})

export default app;