import express from "express";
import cors from "cors";
import indexRoutes from "./routes/index.routes.js";
import playerRoutes from "./routes/player.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import gameRoutes from "./routes/game.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(indexRoutes);

app.use('/api',playerRoutes);
app.use('/api',walletRoutes);
app.use('/api',gameRoutes);

//Si falla ruta
app.use((req, res, next) => {
    res.status(404).json({
        message: "API not found"
    });
})

export default app;