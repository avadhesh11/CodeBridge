import IORedis from "ioredis";

export const QUEUE_NAME = "executionQueue";
export const RESULTS_CHANNEL = "codebridge:execution:results";

const rawRedisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isUpstash = rawRedisUrl.includes("upstash.io");
const isTls = rawRedisUrl.startsWith("rediss://") || isUpstash;

const redisUrl = (isUpstash && rawRedisUrl.startsWith("redis://"))
  ? rawRedisUrl.replace("redis://", "rediss://")
  : rawRedisUrl;

export const createRedisConnection = (name = "worker") => {
  const client = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    keepAlive: 10000,
    connectTimeout: 20000,
    family: 4,
    retryStrategy(times) {
      return Math.min(times * 150, 2500);
    }
  });

  client.on("error", (err) => {
    if (
      err.code === "ECONNRESET" ||
      err.code === "EPIPE" ||
      err.message?.includes("ECONNRESET") ||
      err.message?.includes("EPIPE")
    ) {
      return;
    }
    console.warn(`[Redis ${name}] Notice:`, err.message);
  });

  return client;
};
