import { Router } from "express";
import { getWallet, getChipsById, purchaseChips, purchaseView } from "../controller/wallet.controller.js";

const router = Router();

router.get("/wallet", getWallet);
router.post("/wallet/getchips", getChipsById);

// Rutas para compra de chips
router.get("/wallet/purchase", purchaseView);
router.post("/wallet/purchase", purchaseChips);

export default router;