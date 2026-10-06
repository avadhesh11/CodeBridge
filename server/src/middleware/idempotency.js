import crypto from "crypto";
import { getSharedRedisClient } from "../services/queueService.js";

const idempotencyRedis = getSharedRedisClient();

const AC_TTL_SECONDS = 60;
const NON_AC_TTL_SECONDS = 5;

let isCircuitOpen = false;
let circuitOpenUntil = 0;

const executionIdempotency = (req, res, next) => {
  if (isCircuitOpen && Date.now() < circuitOpenUntil) {
    return next();
  }

  try {
    const userId = req.user?._id?.toString();
    const { code, questionId, type, language } = req.body;

    if (!userId || !code || !questionId) {
      return next();
    }

    const hashInput = `${userId}:${questionId}:${type || "sample"}:${language || "C++"}:${code}`;
    const hash = crypto.createHash("sha256").update(hashInput).digest("hex");
    const cacheKey = `idempotency:exec:${hash}`;

    req._idempotencyKey = cacheKey;

    idempotencyRedis
      .get(cacheKey)
      .then((cached) => {
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            return res.status(200).json({ success: true, _cached: true, ...parsed });
          } catch {
            return next();
          }
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
          if (res.statusCode === 200 && body?.success && body?.verdict) {
            const { success: _s, _cached: _c, ...resultOnly } = body;
            const ttl = body.verdict === "AC" ? AC_TTL_SECONDS : NON_AC_TTL_SECONDS;
            idempotencyRedis
              .set(cacheKey, JSON.stringify(resultOnly), "EX", ttl)
              .catch(() => {});
          }
          return originalJson(body);
        };

        next();
      })
      .catch((err) => {
        isCircuitOpen = true;
        circuitOpenUntil = Date.now() + 30000;
        console.warn("[Idempotency] Redis error, bypassing idempotency for 30s:", err.message);
        next();
      });
  } catch (err) {
    next();
  }
};

export default executionIdempotency;
