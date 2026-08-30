import express from "express";
import roomController from "./controller.js";
import authMiddleware from "../../middleware/authmiddleware.js";
import executionRateLimiter from "../../middleware/rateLimiter.js";
import executionIdempotency from "../../middleware/idempotency.js";

const router = express.Router();

router.post("/new", authMiddleware, roomController.createRoom);

// Rate limiter + idempotency applied to code execution:
//   1. authMiddleware   — ensures req.user exists
//   2. executionRateLimiter — blocks > 1 req/user/min with 429
//   3. executionIdempotency — returns cached result for duplicate submissions
//   4. roomController.runCode — actual execution (only reached if new, non-rate-limited request)
router.post("/codeTest", authMiddleware, executionRateLimiter, executionIdempotency, roomController.runCode);

router.post("/close/:roomID", authMiddleware, roomController.closeRoom);
router.get("/questions/:roomID", authMiddleware, roomController.getQuestions);
router.get("/user/all", authMiddleware, roomController.getUserRooms);
router.get("/:roomID", authMiddleware, roomController.getRoom);
export default router;