import "dotenv/config";
import https from "https";
import fs from "fs";
import initSocket from "./src/sockets/index.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

const options = {
  key: fs.readFileSync("./key.pem"),
  cert: fs.readFileSync("./cert.pem")
};

const server = https.createServer(options, app);

initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTPS Server running on https://localhost:${PORT}`);
});