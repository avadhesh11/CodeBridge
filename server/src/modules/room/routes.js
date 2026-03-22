import express from "express";
import roomController from "./controller.js";
import authMiddleware from "../../middleware/authmiddleware.js";
const router=express.Router();

router.post("/new",authMiddleware,roomController.createRoom);
router.post("/codeTest",roomController.runCode);
export default router;