import express from "express";
import controller from "./controller.js";
import authMiddleware from "../../middleware/authmiddleware.js";

const router = express.Router();

router.post("/import/preview", authMiddleware, controller.previewImport);
router.post("/import/confirm", authMiddleware, controller.confirmImport);

router.get("/user/all", authMiddleware, controller.fetchUserQuestions);
router.get("/bank/all", authMiddleware, controller.fetchAvailableBank);

router.post("/add", authMiddleware, controller.addQuestion);
router.post("/add/:roomId", authMiddleware, controller.addQuestion);

router.get("/public", controller.fetchPublicQuestions);
router.get("/public/:roomId", controller.fetchPublicQuestionsByRoom);
router.get("/private/:roomId", authMiddleware, controller.fetchPrivateQuestions);

router.get("/room/:roomId", authMiddleware, controller.fetchAllRoomQuestions);
router.post("/room/:roomId/attach", authMiddleware, controller.attachQuestionsToRoom);
router.delete("/room/:roomId/:questionId", authMiddleware, controller.removeQuestionFromRoom);

router.get("/:id", controller.getQuestion);
router.delete("/:id", authMiddleware, controller.deleteQuestion);

export default router;