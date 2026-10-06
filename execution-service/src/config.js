import IORedis from "ioredis";

export const QUEUE_NAME = "executionQueue";
export const RESULTS_CHANNEL = "codebridge:execution:results";

const rawRedisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isUpstash = rawRedisUrl.includes("upstash.io");
const isTls = rawRedisUrl.startsWith("rediss://") || isUpstash;

const redisUrl = (isUpstash && rawRedisUrl.startsWith("redis://"))
  ? rawRedisUrl.replace("redis://", "rediss://")
  : rawRedisUrl;

let isQuotaExceeded = false;
let quotaExceededTimer = null;
let lastErrorLogTime = 0;

export const createRedisConnection = (name = "worker") => {
  const client = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    keepAlive: 30000,
    connectTimeout: 10000,
    family: 4,
    retryStrategy(times) {
      if (isQuotaExceeded) {
        return 60000;
      }
      // Exponential backoff to prevent bandwidth-exhausting retry loops
      return Math.min(Math.pow(2, Math.min(times, 5)) * 1000, 30000);
    }
  });

  client.on("error", (err) => {
    const msg = err.message || "";

    if (
      msg.includes("max daily request limit exceeded") ||
      msg.includes("quota exceeded") ||
      msg.includes("OOM command not allowed")
    ) {
      if (!isQuotaExceeded) {
        isQuotaExceeded = true;
        console.error(`🚨 [Redis ${name}] Upstash quota exceeded! Pausing reconnection for 60 seconds.`);
        if (quotaExceededTimer) clearTimeout(quotaExceededTimer);
        quotaExceededTimer = setTimeout(() => {
          isQuotaExceeded = false;
        }, 60000);
      }
      return;
    }

    if (
      err.code === "ECONNRESET" ||
      err.code === "EPIPE" ||
      msg.includes("ECONNRESET") ||
      msg.includes("EPIPE")
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastErrorLogTime > 10000) {
      lastErrorLogTime = now;
      console.warn(`[Redis ${name}] Notice:`, msg);
    }
  });

  client.on("ready", () => {
    isQuotaExceeded = false;
  });

  return client;
};
