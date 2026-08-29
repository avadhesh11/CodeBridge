import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const rawRedisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const isUpstash = rawRedisUrl.includes("upstash.io");
const isTls = rawRedisUrl.startsWith("rediss://") || isUpstash;

// Ensure rediss:// protocol for Upstash
const redisUrl = (isUpstash && rawRedisUrl.startsWith("redis://"))
  ? rawRedisUrl.replace("redis://", "rediss://")
  : rawRedisUrl;

export const createRedisConnection = (name = "default") => {
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
    // Upstash serverless drops idle sockets gracefully — ignore EPIPE / ECONNRESET logs
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

export const connection = createRedisConnection("main");

export const executionQueue = new Queue("executionQueue", {
  connection: createRedisConnection("queue"),
  skipVersionCheck: true,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 100
  },
});

export const queueEvents = new QueueEvents("executionQueue", {
  connection: createRedisConnection("events"),
  skipVersionCheck: true
});
