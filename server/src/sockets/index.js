import { Server } from "socket.io";
import registerRoom from "./roomSocket.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";
export default function initSocket(server){
    
const io=new Server(server,{
    cors: {
    origin: ["https://localhost:5173","https://10.196.193.152:5173"],
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