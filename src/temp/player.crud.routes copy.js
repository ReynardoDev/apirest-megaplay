import { Router } from "express";
import { getPlayerList, playerCreate, playerEdit, playerUpdate } from "../controller/player.crud.controller.js";

const router = Router();

router.get("/", getPlayerList);

router.post("/create", playerCreate);

router.get("/create", (req, res) => {
    res.render("player/create.ejs");
});

router.get("/edit/:id", playerEdit);
router.put("/update/:id", playerUpdate);


router.get("/delete/:id", (req, res) => {
    res.render("player/delete.ejs");
});


export default router;