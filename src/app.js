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
import homeRoutes from "./routes/home.routes.js";
import loginRoutes from "./routes/login.routes.js";
import playerCrudRoutes from "./routes/player.crud.routes.js";

// Middlewares
import { jsonSyntaxErrorHandler } from "./middlewares/errorHandler.js";

// Configuración de rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Variables de entorno (Asegúrate de que coincidan con tu login controller)
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

// --- MIDDLEWARES GLOBALES ---
app.use(cors());
app.use(express.json()); // Solo una vez
app.use(express.urlencoded({ extended: true })); // Para formularios HTML
app.use(cookieParser());

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

// --- RUTAS ---

app.use(indexRoutes);
app.use(homeRoutes);

// Rutas Públicas (No requieren token)
app.use('/api', loginRoutes); // El login debe ser público
app.use('/api', gameRoutes);  // Depende de tu lógica, quizás el juego requiera auth

// Rutas Protegidas (Requieren token)
// 👇 AQUÍ APLICAMOS EL MIDDLEWARE SOLO AL CRUD
app.use('/crud', verifyToken, playerCrudRoutes);
app.use('/api', walletRoutes); // Quizás quieras proteger la billetera también

// Manejador de errores de JSON (Siempre al final de los parsers)
app.use(jsonSyntaxErrorHandler);

// --- VISTAS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        message: "API not found"
    });
})

export default app;