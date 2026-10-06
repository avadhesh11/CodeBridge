import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createRedisConnection, CROSS_PROCESS_CHANNEL } from "../services/queueService.js";
import registerRoom from "./roomSocket.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";

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

  // Configure Redis adapter & cross-process relay with minimal connection footprint
  try {
    const pubClient = createRedisConnection("socketio-pub");
    const subClient = pubClient.duplicate();

    io.adapter(createAdapter(pubClient, subClient));
    console.log("[Socket.io] Horizontal scaling enabled with Redis adapter");

    // Reuse subClient to listen for worker completion events (avoids extra Redis connections)
    subClient.subscribe(CROSS_PROCESS_CHANNEL, (err) => {
      if (!err) {
        console.log(`[Socket.io] Subscribed to '${CROSS_PROCESS_CHANNEL}' for worker results`);
      }
    });

    subClient.on("message", (channel, message) => {
      if (channel === CROSS_PROCESS_CHANNEL) {
        try {
          const payload = JSON.parse(message);
          const { roomID, submissionId } = payload;
          if (roomID) {
            io.to(roomID).emit("execution-result", payload);
          }
          console.log(`[Socket.io] Relayed worker execution result for submission ${submissionId} to room ${roomID}`);
        } catch (parseErr) {
          console.warn("[Socket.io] Error parsing worker execution payload:", parseErr.message);
        }
      }
    });
  } catch (adapterErr) {
    console.warn("[Socket.io] Running with default in-memory adapter:", adapterErr.message);
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