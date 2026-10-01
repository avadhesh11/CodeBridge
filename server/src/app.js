import express from "express";
import cors from "cors";
import errorHandler  from "./middleware/errorHandler.js";
import mongoose from "mongoose";
import quesmodel from "./models/question.js";
import cookieParser from "cookie-parser";
import authRoutes from "../src/modules/auth/routes.js";
import authMiddleware from "./middleware/authmiddleware.js";
import roomRoutes from "./modules/room/routes.js";
import questionRoutes from "./modules/questions/routes.js";

import session from "express-session";
import passport from "passport";
import fs from "fs";

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(s => s.trim().replace(/\/$/, ""))
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS: Origin '${origin}' is not allowed`), false);
    },
    credentials: true
  })
);

app.use((req, res, next) => {
  if (req.url.includes("//")) {
    req.url = req.url.replace(/\/{2,}/g, "/");
  }
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
// app.use(session({
//   secret: "secret",
//   resave: false,
//   saveUninitialized: false
// }));

// app.use(passport.initialize());
// app.use(passport.session());
const seedQuestions = async () => {
  try {
    const count = await quesmodel.countDocuments({ qtype: "public" });
    if (count === 0) {
      console.log("🌱 Seeding public questions...");
      await quesmodel.create([
        {
          title: "Two Sum",
          description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nInput format: The first line contains target and the size of array. The next line contains the array elements.\nOutput format: Print the space-separated indices.",
          qtype: "public",
          tag: "Easy",
          constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
          timelimit: 2,
          sampletcs: [
            { input: "9 4\n2 7 11 15", output: "0 1" },
            { input: "6 3\n3 2 4", output: "1 2" }
          ],
          hiddentcs: [
            { input: "6 2\n3 3", output: "0 1" },
            { input: "10 5\n1 2 3 7 5", output: "2 3" }
          ]
        },
        {
          title: "Valid Parentheses",
          description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid (prints 1 for true, 0 for false).",
          qtype: "public",
          tag: "Easy",
          constraints: "1 <= s.length <= 10^4\ns consists of parentheses only.",
          timelimit: 2,
          sampletcs: [
            { input: "()", output: "1" },
            { input: "()[]{}", output: "1" }
          ],
          hiddentcs: [
            { input: "(]", output: "0" },
            { input: "([)]", output: "0" },
            { input: "{[]}", output: "1" }
          ]
        }
      ]);
      console.log("✅ Seeding complete!");
    }
  } catch (err) {
    console.error("Failed to seed public questions:", err);
  }
};

const mongo = async () => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/codebridge";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log("MongoDB connected");
    await seedQuestions();
  } catch (err) {
    console.warn("Primary MongoDB connection warning:", err.message);
    if (!uri.includes("127.0.0.1") && !uri.includes("localhost")) {
      try {
        console.log("Connecting to fallback local MongoDB (127.0.0.1:27017)...");
        await mongoose.connect("mongodb://127.0.0.1:27017/codebridge", { serverSelectionTimeoutMS: 4000 });
        console.log("MongoDB connected (local fallback)");
        await seedQuestions();
      } catch (localErr) {
        console.error("Local fallback MongoDB connection error:", localErr.message);
      }
    }
  }
};
mongo();

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { executionQueue } from "./services/queueService.js";

// BullMQ Visual Dashboard (disabled by default in production)
if (process.env.ENABLE_QUEUE_BOARD === "true") {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(executionQueue)],
    serverAdapter: serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());
}

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

app.use("/api/auth",authRoutes);
app.use("/api/room",roomRoutes);
app.use("/api/question",questionRoutes);

app.use(errorHandler);

export default app;
