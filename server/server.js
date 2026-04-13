import "dotenv/config";
import http from "http";
import fs from "fs";
import initSocket from "./src/sockets/index.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

// const options = {
//   key: fs.readFileSync("./key.pem"),
//   cert: fs.readFileSync("./cert.pem")
// };

const server = http.createServer( app);

initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});