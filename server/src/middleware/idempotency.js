import crypto from "crypto";
import { createRedisConnection } from "../services/queueService.js";

const idempotencyRedis = createRedisConnection("idempotency");

/**
 * Idempotency middleware for code execution.
 *
 * Computes a deterministic hash from: userId + questionId + type + language + code.
 * - If a cached result exists for this hash → return it immediately (no Docker spawned).
 * - Otherwise → let the request proceed, then cache the response for CACHE_TTL_SECONDS.
 *
 * This means multiple rapid clicks / simultaneous submissions of the same code
 * are treated as a single job.
 */
const CACHE_TTL_SECONDS = 60;

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

    // Attach key to request so the response interceptor can cache it
    req._idempotencyKey = cacheKey;

    // Check for cached result
    idempotencyRedis.get(cacheKey).then((cached) => {
      if (cached) {
        console.log(`[Idempotency] Cache HIT for key ${hash.slice(0, 8)}…`);
        try {
          const parsed = JSON.parse(cached);
          return res.status(200).json({ success: true, _cached: true, ...parsed });
        } catch {
          // Corrupt cache entry — proceed normally
          return next();
        }
      }

      // Cache MISS — intercept res.json to cache the result before sending
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful execution results
        if (res.statusCode === 200 && body?.success && body?.verdict) {
          const { success: _s, _cached: _c, ...resultOnly } = body;
          idempotencyRedis
            .set(cacheKey, JSON.stringify(resultOnly), "EX", CACHE_TTL_SECONDS)
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
