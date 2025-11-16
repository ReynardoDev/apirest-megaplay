import express from "express";
import indexRoutes from "./routes/index.routes.js";
import playerRoutes from "./routes/player.routes.js";
import walletRoutes from "./routes/wallet.routes.js";

const app = express();

app.use(express.json());

app.use(indexRoutes);

app.use('/api',playerRoutes);
app.use('/api',walletRoutes);

//Si falla ruta
app.use((req, res, next) => {
    res.status(404).json({
        message: "API not found"
    });
})

export default app;