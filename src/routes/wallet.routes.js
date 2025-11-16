import {Router} from "express";
import { getWallet } from "../controller/wallet.controller.js";

const router = Router();

router.get("/wallet", getWallet);
//router.post("/wallet", createWallet);
//router.put("/wallet/:id", updateWallet);
//router.delete("/wallet/:id", deleteWallet);
//router.patch("/wallet/:id", changeWallet);

export default router;