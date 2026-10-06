import { Worker } from "bullmq";
import { createRedisConnection, QUEUE_NAME, RESULTS_CHANNEL } from "./config.js";
import { runJudge, initJudgeEngine, prewarmDockerImages } from "./engine.js";
import submissionModel from "./models/submission.js";
import roomModel from "./models/room.js";

const VERDICT_STATUS_MAP = {
  AC: "ACCEPTED",
  WA: "WRONG_ANSWER",
  TLE: "TIME_LIMIT_EXCEEDED",
  CE: "COMPILATION_ERROR",
  RE: "RUNTIME_ERROR",
  ERROR: "INTERNAL_ERROR"
};

let workerInstance = null;
let publisherClient = null;

export const processExecutionJob = async (job) => {
  const { submissionId, questionId, testcases, code, language, timelimit, roomID, userId, type } = job.data;
  console.log(`[Worker] Processing job ${job.id} | submission: ${submissionId || "N/A"} | lang: ${language || "C++"} | testcases: ${testcases?.length || 0}`);

  if (submissionId) {
    try {
      await submissionModel.findOneAndUpdate(
        { submissionId },
        {
          $set: {
            status: "RUNNING",
            startedAt: new Date()
          }
        }
      );
    } catch (dbErr) {
      console.warn(`[Worker] Failed to mark submission ${submissionId} as RUNNING:`, dbErr.message);
    }
  }

  let result;
  try {
    result = await runJudge(testcases || [], code, language || "C++", timelimit || 2);
  } catch (judgeErr) {
    console.error(`[Worker] 🔥 Judge execution crashed for job ${job.id}:`, judgeErr);
    result = {
      verdict: "ERROR",
      error: judgeErr.message || "Execution engine failure"
    };
  }

  const mappedStatus = VERDICT_STATUS_MAP[result.verdict] || "INTERNAL_ERROR";

  if (submissionId) {
    try {
      await submissionModel.findOneAndUpdate(
        { submissionId },
        {
          $set: {
            status: mappedStatus,
            verdict: result.verdict,
            results: result.results || [],
            error: result.error || null,
            completedAt: new Date()
          }
        }
      );
    } catch (saveErr) {
      console.error(`[Worker] Failed to save submission result for ${submissionId}:`, saveErr.message);
    }
  }

  if (type === "hidden" && roomID && userId) {
    try {
      await roomModel.updateOne(
        { roomID },
        {
          $push: {
            submissions: {
              user: userId,
              question: questionId,
              verdict: result.verdict,
              code,
              language: language || "C++",
              createdAt: new Date()
            }
          }
        }
      );
    } catch (roomErr) {
      console.error(`[Worker] Failed to update room ${roomID} submissions:`, roomErr.message);
    }
  }

  if (publisherClient) {
    try {
      const completionPayload = {
        submissionId,
        roomID,
        userId,
        type: type || "sample",
        verdict: result.verdict,
        status: mappedStatus,
        results: result.results || [],
        error: result.error || null,
        completedAt: new Date().toISOString()
      };
      await publisherClient.publish(RESULTS_CHANNEL, JSON.stringify(completionPayload));
    } catch (pubErr) {
      console.warn("[Worker] Failed to publish completion event to Redis:", pubErr.message);
    }
  }

  return result;
};

export const startExecutionWorker = async ({ concurrency = 1 } = {}) => {
  if (workerInstance) {
    console.warn("[Worker] Worker is already running.");
    return workerInstance;
  }

  await initJudgeEngine();
  await prewarmDockerImages().catch((e) => console.warn("[Worker] Image prewarm warning:", e.message));

  publisherClient = createRedisConnection("worker-publisher");
  const workerRedis = createRedisConnection("execution-worker");

  workerInstance = new Worker(
    QUEUE_NAME,
    processExecutionJob,
    {
      connection: workerRedis,
      concurrency: Number(process.env.WORKER_CONCURRENCY) || concurrency,
      skipVersionCheck: true,
      lockDuration: 120_000
    }
  );

  workerInstance.on("completed", (job) => {
    console.log(`[Worker] ✅ Job ${job.id} completed successfully`);
  });

  workerInstance.on("failed", async (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} failed:`, err?.message);
    if (job?.data?.submissionId) {
      try {
        await submissionModel.findOneAndUpdate(
          { submissionId: job.data.submissionId },
          {
            $set: {
              status: "INTERNAL_ERROR",
              verdict: "ERROR",
              error: err?.message || "Job execution failed in queue",
              completedAt: new Date()
            }
          }
        );
      } catch {}
    }
  });

  workerInstance.on("error", (err) => {
    console.error("[Worker] Worker error:", err.message);
  });

  console.log(`[Worker] 🚀 Execution Worker started on queue '${QUEUE_NAME}' with concurrency ${process.env.WORKER_CONCURRENCY || concurrency}`);
  return workerInstance;
};

export const stopExecutionWorker = async () => {
  console.log("[Worker] Shutting down execution worker...");
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
  if (publisherClient) {
    publisherClient.disconnect();
    publisherClient = null;
  }
  console.log("[Worker] Execution worker stopped.");
};
