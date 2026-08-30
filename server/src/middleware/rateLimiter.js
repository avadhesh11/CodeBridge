import { createRedisConnection } from "../services/queueService.js";

const rateLimitRedis = createRedisConnection("ratelimit");

/**
 * Rate limiter middleware for code execution.
 *
 * Two separate limits keyed by type:
 *   - "sample" (Run button)  → 1 request per user per 10 seconds
 *   - "hidden" (Submit button) → 1 request per user per 60 seconds
 */
const LIMITS = {
  sample: { max: 1, windowSec: 10,  label: "run" },
  hidden: { max: 1, windowSec: 60,  label: "submit" },
};

const executionRateLimiter = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) return next();

    const type = req.body?.type === "hidden" ? "hidden" : "sample";
    const { max, windowSec, label } = LIMITS[type];

    const key = `ratelimit:exec:${type}:${userId}`;

    // Atomically increment and get the new count
    const count = await rateLimitRedis.incr(key);

    if (count === 1) {
      // First request in window — set expiry
      await rateLimitRedis.expire(key, windowSec);
    }

    if (count > max) {
      const ttl = await rateLimitRedis.ttl(key);
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. You can only ${label} once every ${windowSec} second${windowSec > 1 ? "s" : ""}.`,
        retryAfter: ttl > 0 ? ttl : windowSec,
      });
    }

    next();
  } catch (err) {
    // If Redis is down, fail open — don't block legitimate users
    console.warn("[RateLimiter] Redis error, failing open:", err.message);
    next();
  }
};

export default executionRateLimiter;
