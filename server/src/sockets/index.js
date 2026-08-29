import { Server } from "socket.io";
import registerRoom from "./roomSocket.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map(s => s.trim().replace(/\/$/, ""))
  : ["http://localhost:3000", "http://localhost:5173"];

export default function initSocket(server){
    
const io=new Server(server,{
    cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

io.use((socket, next) => {
  try {

    const cookies = cookie.parse(socket.handshake.headers.cookie || "");

    const token = cookies.accessToken;

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
io.on("connection",(socket)=>{
 
     console.log("Socket connected:", socket.id);
  console.log("User:", socket.user.id);
    registerRoom(io,socket);
   
});

}  