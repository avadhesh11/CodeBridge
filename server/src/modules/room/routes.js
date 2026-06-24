import express from "express";
import roomController from "./controller.js";
import authMiddleware from "../../middleware/authmiddleware.js";
const router=express.Router();

router.post("/new",authMiddleware,roomController.createRoom);
router.post("/codeTest",authMiddleware,roomController.runCode);
router.post("/close/:roomID", authMiddleware, roomController.closeRoom);
router.get("/questions/:roomID", authMiddleware, roomController.getQuestions);
router.get("/user/all", authMiddleware, roomController.getUserRooms);
router.get("/:roomID", authMiddleware, roomController.getRoom);
export default router;