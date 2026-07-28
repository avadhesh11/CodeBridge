import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// connection should be reused or configured with maxRetriesPerRequest: null
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const executionQueue = new Queue("executionQueue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const queueEvents = new QueueEvents("executionQueue", {
  connection,
});
