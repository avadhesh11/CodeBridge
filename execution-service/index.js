import "dotenv/config";
import http from "http";
import mongoose from "mongoose";
import { startExecutionWorker, stopExecutionWorker } from "./src/worker.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/codebridge";

async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("📦 [Worker] Connected to MongoDB:", MONGO_URI.split("@").pop());
  } catch (err) {
    console.warn("⚠️ [Worker] Primary MongoDB connection warning:", err.message);
    if (!MONGO_URI.includes("127.0.0.1") && !MONGO_URI.includes("localhost")) {
      try {
        console.log("🔄 [Worker] Attempting local MongoDB fallback (127.0.0.1:27017)...");
        await mongoose.connect("mongodb://127.0.0.1:27017/codebridge", { serverSelectionTimeoutMS: 5000 });
        console.log("📦 [Worker] Connected to fallback local MongoDB");
      } catch (localErr) {
        console.error("❌ [Worker] Could not connect to local fallback MongoDB:", localErr.message);
      }
    }
  }
}

async function bootstrap() {
  console.log("==================================================");
  console.log("      CodeBridge Execution Service Worker        ");
  console.log("==================================================");
  console.log(`Node Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Runner Mode:     ${process.env.EXECUTION_RUNNER || "auto"}`);
  console.log(`Redis Host:      ${(process.env.REDIS_URL || "redis://127.0.0.1:6379").split("@").pop()}`);

  await connectDatabase();
  await startExecutionWorker();

  // If deployed as a Render Web Service (Free Tier), bind to $PORT for health checks
  let healthServer = null;
  if (process.env.PORT) {
    healthServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "OK", service: "codebridge-execution-worker" }));
    });
    healthServer.listen(process.env.PORT, () => {
      console.log(`🌐 [Worker] Health check listening on port ${process.env.PORT}`);
    });
  }

  const shutdown = async (signal) => {
    console.log(`\n🛑 [Worker] Received ${signal}. Starting graceful shutdown...`);
    try {
      if (healthServer) {
        healthServer.close();
      }
      await stopExecutionWorker();
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log("[Worker] MongoDB disconnected.");
      }
      console.log("[Worker] Graceful shutdown complete. Exiting process.");
      process.exit(0);
    } catch (err) {
      console.error("[Worker] Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("❌ [Worker] Fatal error during startup:", err);
  process.exit(1);
});
