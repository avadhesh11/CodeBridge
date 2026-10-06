import { getSharedRedisClient } from "../services/queueService.js";

const rateLimitRedis = getSharedRedisClient();

const LIMITS = {
  sample: { max: 1, windowSec: 10, label: "run" },
  hidden: { max: 1, windowSec: 60, label: "submit" }
};

let isCircuitOpen = false;
let circuitOpenUntil = 0;

const executionRateLimiter = async (req, res, next) => {
  // If circuit breaker is open (Redis has failed or quota exceeded), fail open safely
  if (isCircuitOpen && Date.now() < circuitOpenUntil) {
    return next();
  }

  try {
    const userId = req.user?._id?.toString();
    if (!userId) return next();

    const type = req.body?.type === "hidden" ? "hidden" : "sample";
    const { max, windowSec, label } = LIMITS[type];
    const key = `ratelimit:exec:${type}:${userId}`;

    const count = await rateLimitRedis.incr(key);

    if (count === 1) {
      await rateLimitRedis.expire(key, windowSec);
    }

    if (count > max) {
      const ttl = await rateLimitRedis.ttl(key);
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. You can only ${label} once every ${windowSec} second${windowSec > 1 ? "s" : ""}.`,
        retryAfter: ttl > 0 ? ttl : windowSec
      });
    }

    next();
  } catch (err) {
    // Trip circuit breaker for 30 seconds on Redis failure to prevent request floods
    isCircuitOpen = true;
    circuitOpenUntil = Date.now() + 30000;
    console.warn("[RateLimiter] Redis unavailable, failing open for 30s:", err.message);
    next();
  }
};

export default executionRateLimiter;
