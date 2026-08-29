import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const isTls = redisUrl.startsWith("rediss://");

export const createRedisConnection = (name = "default") => {
  const client = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    retryStrategy(times) {
      return Math.min(times * 100, 2000);
    }
  });

  client.on("error", (err) => {
    // Upstash transient connection resets should be logged cleanly without crashing Node
    if (err.code === "ECONNRESET" || err.code === "EPIPE") {
      return;
    }
    console.error(`[Redis ${name}] Error:`, err.message);
  });

  return client;
};

export const connection = createRedisConnection("main");

export const executionQueue = new Queue("executionQueue", {
  connection: createRedisConnection("queue"),
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
});
