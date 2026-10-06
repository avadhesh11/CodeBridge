import "dotenv/config";
import http from "http";
import initSocket from "./src/sockets/index.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io with Redis adapter and cross-process event relay
initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log("==================================================");
  console.log(`🚀 CodeBridge API Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Worker Mode: Execution delegated to BullMQ / Worker`);
  console.log("==================================================");
});
