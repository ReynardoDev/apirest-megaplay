import {Router} from "express";
import { getWallet, getChipsById } from "../controller/wallet.controller.js";

const router = Router();

router.get("/wallet", getWallet);
router.post("/wallet/getchips", getChipsById);

export default router;