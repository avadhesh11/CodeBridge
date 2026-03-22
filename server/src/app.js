import express from "express";
import cors from "cors";
import errorHandler  from "./middleware/errorHandler.js";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import authRoutes from "../src/modules/auth/routes.js";
import authMiddleware from "./middleware/authmiddleware.js";
import roomRoutes from "./modules/room/routes.js";
import questionRoutes from "./modules/questions/routes.js";

import session from "express-session";
import passport from "passport";
import fs from "fs";

const app = express();


app.use(
  cors({
    origin:["https://localhost:5173",
    "https://10.196.193.152:5173"],
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
const mongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};
mongo();

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
