import { Queue } from "bullmq";
import IORedis from "ioredis";

export const EXECUTION_QUEUE_NAME = "executionQueue";
export const CROSS_PROCESS_CHANNEL = "codebridge:execution:results";

const rawRedisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const isUpstash = rawRedisUrl.includes("upstash.io");
const isTls = rawRedisUrl.startsWith("rediss://") || isUpstash;

const redisUrl = (isUpstash && rawRedisUrl.startsWith("redis://"))
  ? rawRedisUrl.replace("redis://", "rediss://")
  : rawRedisUrl;

// Circuit Breaker State to protect bandwidth & prevent infinite retry storms
let isQuotaExceeded = false;
let quotaExceededTimer = null;
let lastErrorLogTime = 0;

/**
 * Creates an Upstash-safe IORedis connection with aggressive exponential backoff
 * and circuit-breaking when daily quotas or memory limits are exceeded.
 */
export const createRedisConnection = (name = "default") => {
  const client = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1, // Fail fast on commands instead of queuing in memory
    enableReadyCheck: false,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    keepAlive: 30000, // 30s keepalive reduces socket overhead
    connectTimeout: 10000,
    family: 4,
    retryStrategy(times) {
      // If Upstash quota limit is exceeded, back off for 60 seconds!
      if (isQuotaExceeded) {
        return 60000;
      }

      // Exponential backoff with jitter: 2s, 4s, 8s, up to 30s max
      // Prevents rapid reconnect loops that burn gigabytes of bandwidth
      const delay = Math.min(Math.pow(2, Math.min(times, 5)) * 1000, 30000);
      return delay;
    }
  });

  client.on("error", (err) => {
    const msg = err.message || "";

    // 1. Detect Upstash Daily Quota or OOM Limit Exceeded
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
          console.log(`🔄 [Redis ${name}] Quota backoff expired. Attempting single reconnect probe.`);
        }, 60000);
      }
      return;
    }

    // 2. Suppress benign socket close notices (Upstash drops idle sockets cleanly)
    if (
      err.code === "ECONNRESET" ||
      err.code === "EPIPE" ||
      msg.includes("ECONNRESET") ||
      msg.includes("EPIPE")
    ) {
      return;
    }

    // 3. Throttle error logging to at most once every 10 seconds to avoid flooding logs
    const now = Date.now();
    if (now - lastErrorLogTime > 10000) {
      lastErrorLogTime = now;
      console.warn(`[Redis ${name}] Connection notice:`, msg);
    }
  });

  client.on("ready", () => {
    isQuotaExceeded = false;
  });

  return client;
};

// Singleton shared client for light commands (rate-limiter, idempotency, health checks)
// Reusing ONE client eliminates multiple simultaneous connection pools to Upstash
let sharedClientInstance = null;
export const getSharedRedisClient = () => {
  if (!sharedClientInstance) {
    sharedClientInstance = createRedisConnection("shared");
  }
  return sharedClientInstance;
};

// Backward-compatible connection export
export const connection = getSharedRedisClient();

/**
 * BullMQ executionQueue configured specifically for Serverless Redis (Upstash)
 * - skipVersionCheck: avoids unnecessary INFO/CLUSTER commands on startup
 * - removeOnComplete & removeOnFail: auto-cleans Redis memory immediately
 */
export const executionQueue = new Queue(EXECUTION_QUEUE_NAME, {
  connection: createRedisConnection("queue-producer"),
  skipVersionCheck: true,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true, // Immediately cleans Redis memory
    removeOnFail: true
  }
});
