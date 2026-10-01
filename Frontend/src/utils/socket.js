import { io } from "socket.io-client";

const getToken = () =>
  document.cookie
    .split("; ")
    .find((row) => row.startsWith("accessToken="))
    ?.split("=")[1] ?? "";

// autoConnect:false — we connect manually in Interview.jsx
// auth is a function so each (re)connect reads the CURRENT cookie value,
// not the one present when this module was first imported.
const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  auth: (cb) => cb({ token: getToken() }),
  autoConnect: false,
});

export default socket;