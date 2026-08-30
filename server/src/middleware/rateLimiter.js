import { createRedisConnection } from "../services/queueService.js";

const rateLimitRedis = createRedisConnection("ratelimit");

/**
 * Rate limiter middleware for code execution.
 * Allows MAX_REQUESTS per user within WINDOW_SECONDS.
 *
 * Key: ratelimit:exec:{userId}
 */
const MAX_REQUESTS = 1;
const WINDOW_SECONDS = 60;

const executionRateLimiter = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString();

    if (!userId) {
      // No user — let auth middleware handle it
      return next();
    }

    const key = `ratelimit:exec:${userId}`;

    // Atomically increment and get the new count
    const count = await rateLimitRedis.incr(key);

    if (count === 1) {
      // First request in window — set expiry
      await rateLimitRedis.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_REQUESTS) {
      // Find how many seconds remain before the window resets
      const ttl = await rateLimitRedis.ttl(key);
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. You can only submit once every ${WINDOW_SECONDS} seconds.`,
        retryAfter: ttl > 0 ? ttl : WINDOW_SECONDS,
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
