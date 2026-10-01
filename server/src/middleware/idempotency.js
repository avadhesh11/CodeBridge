import crypto from "crypto";
import { createRedisConnection } from "../services/queueService.js";

const idempotencyRedis = createRedisConnection("idempotency");

/**
 * Idempotency middleware for code execution.
 *
 * Computes a deterministic hash from: userId + questionId + type + language + code.
 * - Cache HIT  → return cached result immediately (no Docker spawned).
 * - Cache MISS → let request proceed, then cache the response.
 *
 * TTL strategy:
 *   - AC  verdict → cached 60s  (no need to re-run a correct solution)
 *   - Any other   → cached 5s   (just enough to deduplicate double-clicks,
 *                                short enough that fixing code gets re-evaluated)
 */
const AC_TTL_SECONDS     = 60;
const NON_AC_TTL_SECONDS = 5;

const executionIdempotency = (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    const { code, questionId, type, language } = req.body;

    if (!userId || !code || !questionId) {
      return next();
    }

    // Build a stable hash key — same inputs always → same key
    const hashInput = `${userId}:${questionId}:${type || "sample"}:${language || "C++"}:${code}`;
    const hash = crypto.createHash("sha256").update(hashInput).digest("hex");
    const cacheKey = `idempotency:exec:${hash}`;

    req._idempotencyKey = cacheKey;

    idempotencyRedis.get(cacheKey).then((cached) => {
      if (cached) {
        console.log(`[Idempotency] Cache HIT for key ${hash.slice(0, 8)}…`);
        try {
          const parsed = JSON.parse(cached);
          return res.status(200).json({ success: true, _cached: true, ...parsed });
        } catch {
          return next(); // Corrupt entry — proceed normally
        }
      }

      // Cache MISS — intercept res.json to cache the result before sending
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode === 200 && body?.success && body?.verdict) {
          const { success: _s, _cached: _c, ...resultOnly } = body;
          const ttl = body.verdict === "AC" ? AC_TTL_SECONDS : NON_AC_TTL_SECONDS;
          idempotencyRedis
            .set(cacheKey, JSON.stringify(resultOnly), "EX", ttl)
            .catch((e) => console.warn("[Idempotency] Cache write error:", e.message));
        }
        return originalJson(body);
      };

      next();
    }).catch((err) => {
      console.warn("[Idempotency] Redis error, skipping cache:", err.message);
      next();
    });

  } catch (err) {
    console.warn("[Idempotency] Unexpected error:", err.message);
    next();
  }
};

export default executionIdempotency;
