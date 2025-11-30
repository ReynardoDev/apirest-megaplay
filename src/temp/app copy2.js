import express from "express";
import cors from "cors";
import path from "path";            // 1. Importar path
import { fileURLToPath } from "url"; // 2. Importar para recrear __dirname

// Imports de rutas...
import indexRoutes from "./routes/index.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import gameRoutes from "./routes/game.routes.js";
import loginRoutes from "./routes/login.routes.js";
import playerCrudRoutes from "./routes/player.crud.routes.js";

import cookieParser from "cookie-parser";

// 3. 'middlewares' 
import { jsonSyntaxErrorHandler } from "./middlewares/errorHandler.js";


// 4. CONFIGURACIÓN DE RUTAS ABSOLUTAS (Para ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use(indexRoutes);

// Manejador de errores de JSON (Va después de express.json y antes de las rutas)
app.use(jsonSyntaxErrorHandler);


app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use((req, res, next) => {
    const token = req.cookies.access_token;
    req.session = { user: null };

    if (!token) {
        return res.status(403).json({ message: "Acceso no autorizado" })
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.session.user = data;
    } catch { }
    /*  console.error("Error en middleware de autenticación:", error); */
    next(); // Continua con la siguiente ruta
})



// Rutas de API
app.use('/api', walletRoutes);
app.use('/api', gameRoutes);
app.use('/api', loginRoutes);

// Rutas de Vistas (CRUD)
app.use('/crud', playerCrudRoutes);

// 5. CONFIGURACIÓN DE VISTAS (A prueba de balas)
app.set('view engine', 'ejs');

// Esto asume que la carpeta 'views' está DENTRO de 'src', junto a este archivo index.js
// Si 'views' está FUERA de 'src', usa: path.join(__dirname, '../views')
app.set('views', path.join(__dirname, 'views'));

// Si falla ruta (404)
app.use((req, res, next) => {
    res.status(404).json({
        message: "API not found"
    });
})

export default app;