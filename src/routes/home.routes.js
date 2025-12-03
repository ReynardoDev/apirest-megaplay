import { Router } from "express";
import { home } from "../controller/home.controller.js";

const router = Router();

router.get("/home", home);

export default router;