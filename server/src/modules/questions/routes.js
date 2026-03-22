import express from "express";
import controller from "./controller.js";
import authMiddleware from "../../middleware/authmiddleware.js";

const router = express.Router();

router.post("/add/:roomId", authMiddleware, controller.addQuestion);

router.get("/public", controller.fetchPublicQuestions);

router.get("/private/:roomId", authMiddleware, controller.fetchPrivateQuestions);

router.get("/:id", controller.getQuestion);

router.delete("/:id", authMiddleware, controller.deleteQuestion);

export default router;