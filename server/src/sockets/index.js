import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createRedisConnection, CROSS_PROCESS_CHANNEL } from "../services/queueService.js";
import registerRoom from "./roomSocket.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim().replace(/\/$/, ""))
  : ["http://localhost:3000", "http://localhost:5173"];

export default function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  // Configure horizontal scaling via Redis adapter
  try {
    const pubClient = createRedisConnection("socketio-pub");
    const subClient = pubClient.duplicate();
    subClient.on("error", (err) => {
      if (
        err.code === "ECONNRESET" ||
        err.code === "EPIPE" ||
        err.message?.includes("ECONNRESET") ||
        err.message?.includes("EPIPE")
      ) {
        return;
      }
      console.warn("[Redis socketio-sub] Notice:", err.message);
    });

    io.adapter(createAdapter(pubClient, subClient));
    console.log("[Socket.io] Horizontal scaling enabled with Redis adapter");
  } catch (adapterErr) {
    console.warn("[Socket.io] Could not initialize Redis adapter, using default in-memory adapter:", adapterErr.message);
  }

  // Cross-Process Worker Completion Relay
  // Execution worker (running independently on EC2 or Render) publishes to CROSS_PROCESS_CHANNEL.
  // The API Socket.IO instance listens and broadcasts execution-result to the appropriate room.
  try {
    const subResultsClient = createRedisConnection("socketio-exec-results");
    subResultsClient.subscribe(CROSS_PROCESS_CHANNEL, (err) => {
      if (err) {
        console.warn("[Socket.io] Could not subscribe to worker execution results:", err.message);
      } else {
        console.log(`[Socket.io] Subscribed to '${CROSS_PROCESS_CHANNEL}' for cross-process worker execution results`);
      }
    });

    subResultsClient.on("message", (channel, message) => {
      if (channel === CROSS_PROCESS_CHANNEL) {
        try {
          const payload = JSON.parse(message);
          const { roomID, submissionId, verdict, status, results, error, userId, type } = payload;
          if (roomID) {
            io.to(roomID).emit("execution-result", payload);
          }
          console.log(`[Socket.io] Relayed worker execution result for submission ${submissionId} to room ${roomID}`);
        } catch (parseErr) {
          console.warn("[Socket.io] Error parsing worker execution payload:", parseErr.message);
        }
      }
    });
  } catch (subErr) {
    console.warn("[Socket.io] Could not initialize worker results subscriber:", subErr.message);
  }

  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies.accessToken || socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Token not found for socket connection"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    console.log("User:", socket.user?.id);
    registerRoom(io, socket);
  });

  return io;
}