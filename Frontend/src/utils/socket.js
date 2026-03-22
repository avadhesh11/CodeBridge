import {io} from "socket.io-client";

const socket=io(import.meta.env.VITE_BACKEND_URL, {
   withCredentials: true,
  auth: {
    token: document.cookie
      .split("; ")
      .find(row => row.startsWith("accessToken="))
      ?.split("=")[1]
  },
  autoConnect: false
});

export default socket;