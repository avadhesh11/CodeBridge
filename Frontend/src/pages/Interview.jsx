import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api.js";
import socket from "../utils/socket.js";
import { useAuth } from "../context/authContext.jsx";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080c10; --surface: #0d1117; --surface2: #161b22; --surface3: #1c2128;
    --border: #21262d; --border2: #30363d;
    --green: #39d353; --green-dim: #1a4d2a; --cyan: #58d4f5;
    --amber: #f0a830; --text: #e6edf3; --text-muted: #7d8590; --red: #f85149;
    --violet: #c084fc;
  }
  html, body, #root { height: 100%; }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; overflow: hidden; }
  .topbar { height: 48px; display: flex; align-items: center; background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 16px; gap: 14px; flex-shrink: 0; }
  .topbar-logo { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 700; color: var(--green); cursor: pointer; }
  .topbar-logo span { color: var(--text-muted); }
  .topbar-sep { width: 1px; height: 20px; background: var(--border); }
  .topbar-spacer { flex: 1; }
  .topbar-actions { display: flex; gap: 8px; align-items: center; }
  .topbar-btn { padding: 6px 14px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; border: none; transition: all 0.15s; }
  .btn-screen { background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border); }
  .btn-screen:hover { color: var(--text); border-color: var(--border2); }
  .btn-end { background: rgba(248,81,73,0.15); color: var(--red); border: 1px solid rgba(248,81,73,0.3); }
  .btn-end:hover { background: rgba(248,81,73,0.25); }
  
  .mode-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700;
    padding: 3px 10px; border-radius: 5px;
  }
  .mp-practice { background: var(--green-dim); color: var(--green); border: 1px solid var(--green); }
  .mp-interview { background: rgba(88,212,245,0.12); color: var(--cyan); border: 1px solid rgba(88,212,245,0.3); }

  .timer-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700;
    padding: 4px 10px; border-radius: 6px;
  }
  .timer-normal { background: var(--surface2); border: 1px solid var(--border); color: var(--text); }
  .timer-warn { background: rgba(240,168,48,0.15); border: 1px solid var(--amber); color: var(--amber); }
  .timer-urgent { background: rgba(248,81,73,0.18); border: 1px solid var(--red); color: var(--red); animation: pulseTimer 1.2s infinite; }
  @keyframes pulseTimer { 0%,100%{opacity:1} 50%{opacity:0.5} }

  .interview-layout { display: flex; height: calc(100vh - 48px); }
  .problem-panel { min-width: 280px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
  .panel-tabs { display: flex; border-bottom: 1px solid var(--border); }
  .panel-tab { padding: 12px 16px; font-size: 0.78rem; font-weight: 700; cursor: pointer; color: var(--text-muted); border-bottom: 2px solid transparent; transition: all 0.15s; }
  .panel-tab.active { color: var(--text); border-bottom-color: var(--green); }
  .panel-body { flex: 1; overflow-y: auto; padding: 20px; }
  .panel-body::-webkit-scrollbar { width: 4px; }
  .panel-body::-webkit-scrollbar-track { background: transparent; }
  .panel-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .prob-difficulty { display: inline-block; padding: 3px 10px; border-radius: 100px; font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 700; margin-bottom: 12px; color: white; }
  .prob-title { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 14px; }
  .prob-desc { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--text-muted); line-height: 1.7; margin-bottom: 20px; }
  .prob-section-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
  .prob-example { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
  .prob-example span { color: var(--text-muted); }
  .prob-constraint { display: flex; gap: 8px; margin-bottom: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
  .prob-constraint::before { content: "•"; color: var(--green); }
  .editor-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .editor-topbar { height: 42px; display: flex; align-items: center; gap: 12px; padding: 0 14px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .lang-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); padding: 3px 10px; border-radius: 4px; }
  .users-row { display: flex; gap: 6px; align-items: center; }
  .user-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; }
  .ua-green { background: var(--green-dim); color: var(--green); border: 1px solid var(--green); }
  .ua-cyan { background: rgba(88,212,245,0.15); color: var(--cyan); border: 1px solid rgba(88,212,245,0.4); }
  .ua-solo { background: rgba(57,211,83,0.12); color: var(--green); border: 1px solid var(--green); padding: 2px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; font-weight: 700; }
  .editor-spacer { flex: 1; }
  .run-btn { padding: 7px 20px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.15s; }
  .run-btn:hover { border-color: var(--border2); }
  .submit-btn { padding: 7px 20px; background: var(--green); color: #000; border: none; border-radius: 6px; font-weight: 800; font-size: 0.8rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.15s; }
  .submit-btn:hover { box-shadow: 0 0 16px rgba(57,211,83,0.35); }
  .editor-wrapper { flex: 1; overflow: hidden; }
  .output-panel { flex-shrink: 0; border-top: 1px solid var(--border); display: flex; flex-direction: column; background: var(--surface); }
  .output-tabs { display: flex; align-items: center; border-bottom: 1px solid var(--border); padding: 0 14px; height: 38px; gap: 16px; }
  .output-tab { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); cursor: pointer; padding: 0 4px; border-bottom: 2px solid transparent; height: 100%; display: flex; align-items: center; }
  .output-tab.active { color: var(--text); border-bottom-color: var(--green); }
  .output-body { flex: 1; overflow-y: auto; padding: 14px 16px; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; line-height: 1.8; }
  .verdict-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .verdict-badge { padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 0.75rem; }
  .vb-accepted { background: var(--green-dim); color: var(--green); }
  .vb-error { background: rgba(248,81,73,0.15); color: var(--red); }
  .vb-running { background: rgba(240,168,48,0.15); color: var(--amber); }
  .output-meta { color: var(--text-muted); font-size: 0.72rem; }
  .output-text { color: var(--text-muted); white-space: pre-wrap; }
  .video-panel { width: 240px; flex-shrink: 0; background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; }
  .video-section { flex: 1; display: flex; flex-direction: column; }
  .video-box { flex: 1; background: var(--bg); display: flex; align-items: center; justify-content: center; position: relative; border-bottom: 1px solid var(--border); min-height: 140px; overflow: hidden; }
  .video-controls { display: flex; justify-content: center; gap: 10px; padding: 12px; border-top: 1px solid var(--border); }
  .vc-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all 0.15s; }
  .vc-btn:hover { border-color: var(--border2); }
  .vc-btn.muted { background: rgba(248,81,73,0.15); border-color: rgba(248,81,73,0.3); }
  .chat-section { height: 200px; border-top: 1px solid var(--border); display: flex; flex-direction: column; }
  .chat-header { padding: 10px 14px; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; border-bottom: 1px solid var(--border); }
  .chat-messages { flex: 1; overflow-y: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
  .chat-msg { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; }
  .chat-msg-name { font-weight: 700; margin-bottom: 2px; }
  .chat-msg-name.green { color: var(--green); }
  .chat-msg-name.cyan { color: var(--cyan); }
  .chat-msg-text { color: var(--text-muted); line-height: 1.5; }
  .chat-input-row { display: flex; border-top: 1px solid var(--border); }
  .chat-input { flex: 1; background: transparent; border: none; outline: none; padding: 10px 12px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text); }
  .chat-input::placeholder { color: var(--text-muted); }
  .chat-send { background: transparent; border: none; border-left: 1px solid var(--border); padding: 0 12px; cursor: pointer; color: var(--green); font-size: 0.85rem; }
  .perm-banner { background: rgba(248,81,73,0.15); border: 1px solid rgba(248,81,73,0.3); border-radius: 6px; padding: 8px 12px; margin: 8px; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--red); text-align: center; }
`;

const languageTemplates = {
  "C++": `#include <bits/stdc++.h>
using namespace std;

int main() {
    // All the best
    return 0;
}`,
  "Python": `def main():
    # All the best
    pass

if __name__ == '__main__':
    main()`,
  "Java": `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // All the best
    }
}`,
  "JavaScript": `// All the best
function main() {
    
}

main();`
};

const monacoLangMap = {
  "C++": "cpp",
  "Python": "python",
  "Java": "java",
  "JavaScript": "javascript"
};

const defaultCode = languageTemplates["C++"];

const pcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

export default function InterviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roomID } = useParams();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const isOfferingRef = useRef(false);
  const iceCandidateQueueRef = useRef([]);
  const remoteDescSetRef = useRef(false);

  const [roomMode, setRoomMode] = useState("interview");
  const [isTimed, setIsTimed] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const [code, setCode] = useState(defaultCode);
  const [language, setLanguage] = useState("C++");
  const [outputTab, setOutputTab] = useState("testcases");
  const [activeTab, setActiveTab] = useState("problem");
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [verdict, setVerdict] = useState({ status: "idle", output: "", error: null });
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
  const [submissionResult, setSubmissionResult] = useState(null);
  // Guards: prevent multiple in-flight requests from rapid clicks
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [role, setRole] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [questions, setQuestions] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [leftWidth, setLeftWidth] = useState(Number(localStorage.getItem("leftWidth")) || 550);
  const [testHeight, setTestHeight] = useState(Number(localStorage.getItem("testHeight")) || 250);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShared, setScreenShared] = useState(false);
  const [candidateFullscreenWarning, setCandidateFullscreenWarning] = useState(false);
  const [interviewerDecisionPopup, setInterviewerDecisionPopup] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [fullscreenViolations, setFullscreenViolations] = useState(0);

  // Live Timer Countdown Effect
  useEffect(() => {
    if (!isTimed || !expiresAt) return;

    const calcTime = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    };

    setTimeLeft(calcTime());

    const timer = setInterval(() => {
      const remaining = calcTime();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        alert("⏰ Session time limit reached! The room has closed.");
        navigate("/dashboard");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimed, expiresAt, navigate]);

  const formatTimer = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const waitForMedia = () =>
    new Promise((resolve) => {
      if (localStreamRef.current) return resolve();
      const interval = setInterval(() => {
        if (localStreamRef.current) { clearInterval(interval); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(interval); resolve(); }, 5000);
    });

  const flushIceCandidates = async () => {
    const peer = peerRef.current;
    if (!peer || !remoteDescSetRef.current) return;
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.log("ICE flush error", e); }
    }
  };

  const getOrCreatePeer = () => {
    if (peerRef.current) return peerRef.current;

    const peer = new RTCPeerConnection(pcConfig);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    peer.ontrack = (event) => {
      const stream = event.streams[0];
      remoteStreamRef.current = stream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) socket.emit("webrtc-ice", event.candidate);
    };

    peer.onconnectionstatechange = () => {
      console.log("WebRTC state:", peer.connectionState);
    };

    peerRef.current = peer;
    return peer;
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = peerRef.current?.getSenders().find(s => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setScreenSharing(true);
      socket.emit("screen-share-start");
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.log("Screen share error", err);
    }
  };

  const stopScreenShare = () => {
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    const sender = peerRef.current?.getSenders().find(s => s.track?.kind === "video");
    if (sender && cameraTrack) sender.replaceTrack(cameraTrack);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setScreenSharing(false);
    socket.emit("screen-share-stop");
  };

  useEffect(() => {
    if (!questions || !code) return;

    const timeout = setTimeout(() => {
      localStorage.setItem(`${questions._id}_${language}`, code);
    }, 300);

    return () => clearTimeout(timeout);
  }, [code, questions, language]);

  useEffect(() => {
    if (questions) {
      const saved = localStorage.getItem(`${questions._id}_${language}`);
      if (saved) setCode(saved);
      else setCode(languageTemplates[language]);
    }
  }, [questions, language]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Only start camera/mic in interview mode
  useEffect(() => {
    if (roomMode === "practice") return;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.log("Media error", err);
        setPermissionError(true);
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioOnly;
        } catch {
          localStreamRef.current = new MediaStream();
        }
      }
    };
    startMedia();
  }, [roomMode]);

  const enterSecureFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) await elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
    } catch (err) {
      console.log("fullscreen failed", err);
    }
  };

  const sendCandidateWarning = () => {
    socket.emit("interviewer-warn-candidate");
    setInterviewerDecisionPopup(false);
  };

  const ignoreCandidateViolation = () => {
    setInterviewerDecisionPopup(false);
  };

  // Fullscreen only enforced in interview mode for candidate
  useEffect(() => {
    if (roomMode === "practice" || role !== "candidate") return;
    setTimeout(() => {
      enterSecureFullscreen();
    }, 1000);
  }, [role, roomMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (roomMode === "practice" || role !== "candidate") return;

      if (!document.fullscreenElement) {
        setCandidateFullscreenWarning(true);
        socket.emit("candidate-left-fullscreen");
        setFullscreenViolations(prev => prev + 1);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [role, roomMode]);

  useEffect(() => {
    if (!roomID) { alert("No room found!"); navigate("/"); return; }

    socket.connect();

    socket.on("connect", () => {
      socket.emit("join-room", { roomID });
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connection error:", err.message);
    });

    socket.on("joined-successfully", (data) => {
      setRole(data.role);
      if (data.mode) setRoomMode(data.mode);
      if (data.isTimed !== undefined) setIsTimed(data.isTimed);
      if (data.expiresAt) setExpiresAt(data.expiresAt);
      if (data.durationMinutes) setDurationMinutes(data.durationMinutes);
      if (data.currentLanguage) {
        setLanguage(data.currentLanguage);
      }
    });

    socket.on("error-message", (msg) => {
      console.log("Socket error:", msg);
      alert(msg);
      navigate("/dashboard");
    });

    socket.on("chat-history", (chats) => {
      const formatted = chats.map(c => {
        const isMe = c.sender?.toString() === user?._id;
        return { name: isMe ? "You" : "Other", color: isMe ? "green" : "cyan", text: c.message };
      });
      setMessages(formatted);
    });

    socket.on("chat", ({ sender, message }) => {
      setMessages(prev => [...prev, {
        name: sender === user?._id?.toString() ? "You" : "Other",
        color: sender === user?._id?.toString() ? "green" : "cyan",
        text: message
      }]);
    });

    socket.on("start-call", async () => {
      console.log("start-call received — I am the offerer");
      await waitForMedia();
      isOfferingRef.current = true;
      remoteDescSetRef.current = false;
      iceCandidateQueueRef.current = [];
      const peer = getOrCreatePeer();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtc-offer", offer);
    });

    socket.on("webrtc-offer", async (offer) => {
      if (isOfferingRef.current) {
        console.log("Ignoring webrtc-offer — I am the offerer");
        return;
      }
      console.log("webrtc-offer received — sending answer");
      await waitForMedia();
      remoteDescSetRef.current = false;
      iceCandidateQueueRef.current = [];
      const peer = getOrCreatePeer();
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      remoteDescSetRef.current = true;
      await flushIceCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc-answer", answer);
    });

    socket.on("webrtc-answer", async (answer) => {
      if (!isOfferingRef.current) {
        console.log("Ignoring webrtc-answer — I did not create the offer");
        return;
      }
      console.log("webrtc-answer received — setting remote description");
      if (peerRef.current) {
        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          remoteDescSetRef.current = true;
          await flushIceCandidates();
        } catch (e) {
          console.log("setRemoteDescription error", e);
        }
      }
    });

    socket.on("webrtc-ice", async (candidate) => {
      if (!remoteDescSetRef.current) {
        iceCandidateQueueRef.current.push(candidate);
        return;
      }
      if (peerRef.current) {
        try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (e) { console.log("ICE error", e); }
      }
    });

    socket.on("screen-share-start", () => setScreenShared(true));
    socket.on("screen-share-stop", () => setScreenShared(false));
    socket.on("code-update", ({ code }) => {
      setCode(code);
      if (questions) {
        localStorage.setItem(`${questions._id}_${language}`, code); 
      }
    });
    socket.on("language-update", ({ language: newLang }) => {
      setLanguage(newLang);
    });
    socket.on("question-selected", ({ question }) => {
      setQuestions(question);
    });
    
    socket.on("candidate-left-fullscreen-alert", () => {
      if (role === "interviewer") setInterviewerDecisionPopup(true);
    });

    socket.on("candidate-warning", () => {
      if (role === "candidate") {
        setWarningMessage("⚠ Interviewer Warning: Please stay in fullscreen mode for a fair interview.");
        setTimeout(() => setWarningMessage(""), 5000);
      }
    });

    socket.on("session-ended", (data) => {
      alert(data?.reason || "The room session has been ended.");
      navigate("/dashboard");
    });

    return () => {
      ["joined-successfully", "error-message", "code-update", "language-update", "candidate-left-fullscreen-alert", "candidate-warning", "question-selected",
        "chat", "chat-history", "webrtc-offer", "webrtc-answer", "webrtc-ice",
        "start-call", "screen-share-start", "screen-share-stop", "session-ended"
      ].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, [roomID, role, navigate]);

  const handleEndSession = () => {
    if (roomMode === "practice") {
      const confirmLeave = window.confirm("Are you sure you want to exit your practice session?");
      if (confirmLeave) {
        socket.emit("end-session");
        navigate("/dashboard");
      }
    } else if (role === "interviewer") {
      const confirmEnd = window.confirm("Are you sure you want to end this interview session? This will close the room for the candidate as well.");
      if (confirmEnd) {
        socket.emit("end-session");
      }
    } else {
      const confirmLeave = window.confirm("Are you sure you want to leave the interview session?");
      if (confirmLeave) {
        navigate("/dashboard");
      }
    }
  };

  const sendMsg = () => {
    if (!chatMsg.trim()) return;
    socket.emit("chat", { message: chatMsg });
    setChatMsg("");
  };

  const fetchQuestions = async () => {
    try {
      const res = await api("get", `question/room/${roomID}`);
      const qs = res.data.questions || [];
      const seenIds = new Set();
      const seenTitles = new Set();
      const unique = [];
      for (const q of qs) {
        if (!q || !q.title) continue;
        const idStr = q._id?.toString();
        const titleNorm = q.title.trim().toLowerCase();
        if (!seenIds.has(idStr) && !seenTitles.has(titleNorm)) {
          seenIds.add(idStr);
          seenTitles.add(titleNorm);
          unique.push(q);
        }
      }
      setAllQuestions(unique);
      if (unique.length > 0) {
        setQuestions(prev => prev ? (unique.find(q => q._id === prev._id || q.title.trim().toLowerCase() === prev.title?.trim().toLowerCase()) || unique[0]) : unique[0]);
      }
    } catch (error) {
      console.log("unable to fetch questions", error);
    }
  };

  const fetchRoomDetails = async () => {
    try {
      const res = await api("get", `room/${roomID}`);
      if (res.data?.room) {
        const r = res.data.room;
        if (r.mode) setRoomMode(r.mode);
        if (r.isTimed !== undefined) setIsTimed(r.isTimed);
        if (r.expiresAt) setExpiresAt(r.expiresAt);
        if (r.durationMinutes) setDurationMinutes(r.durationMinutes);
        if (r.submissions) setSubmissions(r.submissions);
      }
    } catch (error) {
      console.log("unable to fetch room details", error);
    }
  };

  const isInterviewerRole = roomMode !== "practice" && role === "interviewer";

  const handleLanguageChange = (newLang) => {
    if (isInterviewerRole) return;
    setLanguage(newLang);
    const templateCode = languageTemplates[newLang];
    setCode(templateCode);
    socket.emit("language-change", { language: newLang });
    socket.emit("code-change", { code: templateCode });
  };

  const handleRun = async () => {
    // Guard: if a run is already in-flight, ignore extra clicks entirely
    if (isRunning || isSubmitting) return;
    if (!questions) return;
    setIsRunning(true);
    setRateLimitMsg("");
    setOutputTab("output");
    setVerdict({ status: "running", output: "", error: null });
    try {
      const res = await api("post", "room/codeTest", { roomID, code, questionId: questions._id, type: "sample", language });
      const { verdict, results, error } = res.data;
      setSelectedCaseIndex(0);
      if (verdict === "CE") return setVerdict({ status: "error", title: "Compile Error", output: error || "Compilation failed", error, results: [] });
      if (verdict === "RE") return setVerdict({ status: "error", title: "Runtime Error", output: error || "Runtime error occurred", error, results: [] });
      if (verdict === "TLE") return setVerdict({ status: "error", title: "Time Limit Exceeded ⏱️", output: "⏱️ Time Limit Exceeded\n\nYour code took longer than the time limit to execute (possible infinite loop or large complexity).", error: null, results: [] });
      if (verdict === "AC") {
        setVerdict({ status: "success", title: "Accepted ✅", output: "All sample testcases passed!", error: null, results: results || [] });
      } else {
        const failedCase = results?.find(r => r.status !== "PASS");
        setVerdict({
          status: "error",
          title: "Wrong Answer ✕",
          output: failedCase ? `Wrong Answer\n\nInput: ${failedCase.input}\nExpected: ${failedCase.expected}\nGot: ${failedCase.actual}` : (verdict || "Failed"),
          error: null,
          results: results || []
        });
      }
    } catch (err) {
      // Handle 429 rate limit response
      if (err?.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 10;
        const msg = `⏳ Too fast! You can only Run once every 10 seconds. Wait ${retryAfter}s.`;
        setRateLimitMsg(msg);
        setVerdict({ status: "error", title: "Rate Limited", output: msg, error: null, results: [] });
      } else {
        setVerdict({ status: "error", title: "Execution Error", output: "Execution failed on sandbox server.", error: "Execution failed", results: [] });
      }
    } finally {
      // Always re-enable the button — even if request errored
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    // Guard: if a submission is already in-flight, ignore extra clicks entirely
    if (isSubmitting || isRunning) return;
    if (!questions) return;
    setIsSubmitting(true);
    setRateLimitMsg("");
    setOutputTab("output");
    setVerdict({ status: "running", output: "", error: null });
    try {
      const res = await api("post", "room/codeTest", { roomID, code, questionId: questions._id, type: "hidden", language });
      const { verdict, error } = res.data;
      if (verdict === "CE") return setVerdict({ status: "error", output: "Compile error", error });
      if (verdict === "RE") return setVerdict({ status: "error", output: "Runtime error", error });
      if (verdict === "TLE") return setVerdict({ status: "error", output: "⏱️ Time Limit Exceeded on hidden testcases.", error: null });
      if (verdict === "AC") {
        setVerdict({ status: "success", output: "🎉 Accepted on hidden testcases!" });
        setActiveTab("submissions");
      } else {
        setVerdict({ status: "error", output: `Final Verdict: ${verdict || "Failed on a hidden test-case"}` });
      }
      setSubmissionResult(verdict);
      fetchRoomDetails();
    } catch (err) {
      // Handle 429 rate limit response
      if (err?.response?.status === 429) {
        const retryAfter = err.response.data?.retryAfter || 60;
        const msg = `⏳ Too fast! You can only Submit once every 60 seconds. Wait ${retryAfter}s.`;
        setRateLimitMsg(msg);
        setVerdict({ status: "error", title: "Rate Limited", output: msg, error: null });
      } else {
        setVerdict({ status: "error", error: "Submission failed" });
      }
    } finally {
      // Always re-enable the button — even if request errored
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    localStorage.removeItem("testHeight");
    localStorage.removeItem("leftWidth");
    localStorage.setItem("code", code);
    window.location.reload();
  };

  useEffect(() => {
    fetchQuestions();
    fetchRoomDetails();
  }, []);

  const diffColor = { Easy: "green", Medium: "orange", Hard: "red" };

  return (
    <>
      <style>{styles}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="topbar-logo" onClick={() => navigate("/dashboard")}>
          Code<span>Bridge</span>
        </div>
        <div className="topbar-sep" />

        {/* Room Mode Badge */}
        <span className={`mode-pill ${roomMode === "practice" ? "mp-practice" : "mp-interview"}`}>
          {roomMode === "practice" ? "🧑‍💻 Solo Practice" : "👥 Interview Mode"}
        </span>

        {/* Question Selector */}
        <select
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "5px 10px",
            borderRadius: "6px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.75rem",
            outline: "none"
          }}
          value={questions?._id || ""}
          onChange={(e) => {
            const q = allQuestions.find(q => q._id === e.target.value);
            if (!q) return;
            setQuestions(q);
            socket.emit("select-question", { questionId: q._id });
          }}
        >
          {allQuestions.length === 0 ? (
            <option value="">No questions in room</option>
          ) : (
            allQuestions.map((q) => (
              <option key={q._id} value={q._id}>{q.title}</option>
            ))
          )}
        </select>

        {/* Countdown Timer Badge */}
        {isTimed && timeLeft !== null && (
          <div className={`timer-pill ${timeLeft <= 120 ? "timer-urgent" : (timeLeft <= 600 ? "timer-warn" : "timer-normal")}`}>
            <span>⏱</span>
            <span>{formatTimer(timeLeft)}</span>
          </div>
        )}

        <div className="topbar-spacer" />

        <div className="topbar-actions">
          {roomMode !== "practice" && (
            <button className="topbar-btn btn-screen" onClick={screenSharing ? stopScreenShare : startScreenShare}>
              {screenSharing ? "Stop Sharing" : "Start Screen Share"}
            </button>
          )}

          <button className="topbar-btn btn-end" onClick={handleEndSession}>
            {roomMode === "practice" ? "✕ Exit Practice" : (role === "interviewer" ? "✕ End Session" : "✕ Leave Session")}
          </button>
        </div>
      </div>

      <div className="interview-layout">
        {/* LEFT PANEL: PROBLEM & SUBMISSIONS */}
        <div className="problem-panel" style={{ width: leftWidth }}>
          <div className="panel-tabs">
            {["problem", "submissions"].map(t => (
              <div key={t} className={`panel-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)} style={{ textTransform: "capitalize" }}>{t}</div>
            ))}
          </div>
          <div className="panel-body">
            {activeTab === "problem" ? (
              <>
                {questions && <span className="prob-difficulty" style={{ backgroundColor: diffColor[questions.tag] || "green" }}>{questions.tag}</span>}
                <div className="prob-title">{questions ? questions.title : "Please Select Question First"}</div>
                <div className="prob-desc">{questions ? questions.description : "No question chosen. Select one from the top bar dropdown to begin."}</div>
                {questions && <div className="prob-section-title">Examples</div>}
                {questions && questions.sampletcs?.map((tc, i) => (
                  <div className="prob-example" key={i}>
                    <div style={{ marginBottom: 6 }}><span>Input: </span><pre style={{ display: "inline", color: "var(--cyan)" }}>{tc.input}</pre></div>
                    <div style={{ marginBottom: tc.explanation ? 6 : 0 }}><span>Output: </span><pre style={{ display: "inline", color: "var(--green)" }}>{tc.output}</pre></div>
                    {tc.explanation && (
                      <div style={{ marginTop: 6, color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        <span style={{ color: "var(--amber)", fontWeight: 700 }}>Explanation: </span>
                        <span>{tc.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
                {questions?.constraints && questions.constraints.split("\n").map((c, i) => <div className="prob-constraint" key={i}>{c}</div>)}
                {questions && <div className="prob-constraint">TimeLimit: {questions.timelimit || 2}s</div>}
              </>
            ) : (
              <>
                <div className="prob-section-title" style={{ marginBottom: 16 }}>Recent Submissions</div>
                {submissions.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", padding: "20px 0" }}>
                    No submissions yet.
                  </div>
                ) : (
                  [...submissions].reverse().map((s, i) => {
                    const verdictInfo = {
                      AC: { label: "Accepted", color: "var(--green)" },
                      WA: { label: "Wrong Answer", color: "var(--red)" },
                      TLE: { label: "Time Limit Exceeded", color: "var(--amber)" },
                      CE: { label: "Compilation Error", color: "var(--amber)" },
                      RE: { label: "Runtime Error", color: "var(--red)" },
                    };
                    const info = verdictInfo[s.verdict] || { label: s.verdict || "Submitted", color: "var(--text)" };
                    
                    const formatTimeAgo = (dateStr) => {
                      const diff = Date.now() - new Date(dateStr).getTime();
                      const minutes = Math.floor(diff / 60000);
                      if (minutes < 1) return "Just now";
                      if (minutes === 1) return "1 min ago";
                      if (minutes < 60) return `${minutes} min ago`;
                      const hours = Math.floor(minutes / 60);
                      if (hours === 1) return "1 hour ago";
                      if (hours < 24) return `${hours} hours ago`;
                      return new Date(dateStr).toLocaleDateString();
                    };

                    return (
                      <div key={i} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", fontWeight: 700, color: info.color }}>{info.label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: "var(--text-muted)" }}>{formatTimeAgo(s.createdAt)}</span>
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                          <span>{s.question?.title || "Unknown Question"}</span>
                          <span>{s.language || "C++"}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

        {/* RESIZE HANDLE */}
        <div style={{ width: "4px", cursor: "col-resize", background: "var(--border)", flexShrink: 0 }}
          onMouseDown={(e) => {
            const startX = e.clientX; const startWidth = leftWidth;
            const onMove = (e) => { const w = startWidth + (e.clientX - startX); if (w > 250 && w < 750) { setLeftWidth(w); localStorage.setItem("leftWidth", w); } };
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
          }}
        />

        {/* CENTER / EDITOR PANEL */}
        <div className="editor-panel">
          <div className="editor-topbar">
            <select
              className="lang-tag"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", padding: "3px 10px", borderRadius: "4px", cursor: isInterviewerRole ? "not-allowed" : "pointer" }}
              disabled={isInterviewerRole}
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="C++">C++</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="JavaScript">JavaScript</option>
            </select>

            <div className="users-row">
              {roomMode === "practice" ? (
                <div className="ua-solo">🧑‍💻 Solo Practice</div>
              ) : (
                <>
                  <div className="user-avatar ua-green" title="Interviewer">IM</div>
                  <div className="user-avatar ua-cyan" title="Candidate">CA</div>
                </>
              )}
            </div>

            <div className="editor-spacer" />
            <button
              className="run-btn"
              id="btn-run-code"
              onClick={handleRun}
              disabled={isRunning || isSubmitting}
              style={{ opacity: (isRunning || isSubmitting) ? 0.5 : 1, cursor: (isRunning || isSubmitting) ? "not-allowed" : "pointer" }}
            >
              {isRunning ? "⧗ Running…" : "▷ Run"}
            </button>
            <button
              className="submit-btn"
              id="btn-submit-code"
              onClick={handleSubmit}
              disabled={isRunning || isSubmitting}
              style={{ opacity: (isRunning || isSubmitting) ? 0.5 : 1, cursor: (isRunning || isSubmitting) ? "not-allowed" : "pointer" }}
            >
              {isSubmitting ? "⧗ Submitting…" : "Submit"}
            </button>
            <button className="run-btn" style={{ background: "rgba(248,81,73,0.15)", color: "var(--red)", borderColor: "rgba(248,81,73,0.3)" }} onClick={reset}>Reset Layout</button>
          </div>

          <div className="editor-wrapper">
            {screenShared ? (
              <video ref={screenVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            ) : (
              <Editor
                height="100%"
                language={monacoLangMap[language] || "cpp"}
                theme="vs-dark"
                value={code}
                onChange={(v) => {
                  if (isInterviewerRole) return;
                  setCode(v || "");
                  socket.emit("code-change", { code: v || "" });
                }}
                options={{
                  readOnly: isInterviewerRole,
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 22,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  renderLineHighlight: "line",
                  bracketPairColorization: { enabled: true },
                }}
              />
            )}
          </div>

          <div style={{ height: "4px", cursor: "row-resize", background: "var(--border)", flexShrink: 0 }}
            onMouseDown={(e) => {
              const startY = e.clientY; const startH = testHeight;
              const onMove = (e) => { const h = startH + (startY - e.clientY); if (h > 100 && h < 500) { setTestHeight(h); localStorage.setItem("testHeight", h); } };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
              document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }}
          />

          <div className="output-panel" style={{ height: testHeight }}>
            <div className="output-tabs">
              {[
                { id: "output", label: "⚡ Test Result" },
                { id: "testcases", label: "📋 Sample Testcases" }
              ].map(t => (
                <div
                  key={t.id}
                  className={`output-tab ${outputTab === t.id ? "active" : ""}`}
                  onClick={() => setOutputTab(t.id)}
                >
                  {t.label}
                </div>
              ))}
            </div>
            <div className="output-body">
              {outputTab === "output" && (
                <>
                  {verdict.status === "idle" && (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "12px 4px" }}>
                      No output yet. Click <b style={{ color: "var(--green)" }}>▷ Run</b> to test against sample cases or <b style={{ color: "var(--green)" }}>Submit</b> for hidden judging.
                    </div>
                  )}

                  {verdict.status === "running" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 0" }}>
                      <span className="verdict-badge vb-running" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                        ⟳ Running Sandbox...
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        Enqueued in BullMQ · Executing in Docker sandbox container...
                      </span>
                    </div>
                  )}

                  {verdict.status !== "idle" && verdict.status !== "running" && (
                    <div>
                      {/* Top status bar */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            className={`verdict-badge ${verdict.status === "success" ? "vb-accepted" : "vb-error"}`}
                            style={{ fontSize: "0.85rem", padding: "5px 14px", fontWeight: 800 }}
                          >
                            {verdict.status === "success" ? "✓ Accepted" : (verdict.title || "✕ Failed")}
                          </span>
                          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {verdict.results?.length > 0
                              ? `${verdict.results.filter(r => r.status === "PASS").length}/${verdict.results.length} testcases passed`
                              : (verdict.error ? "Error occurred during execution" : "")}
                          </span>
                        </div>
                      </div>

                      {/* If Compile / Runtime / TLE error with string */}
                      {(verdict.error || verdict.output) && (!verdict.results || verdict.results.length === 0) && (
                        <div style={{ background: "rgba(248,81,73,0.08)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: "8px", padding: "14px", color: "var(--red)", fontSize: "0.82rem", whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace" }}>
                          {verdict.error || verdict.output}
                        </div>
                      )}

                      {/* Multi-case results cards */}
                      {verdict.results && verdict.results.length > 0 && (
                        <div>
                          {/* Case pills */}
                          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                            {verdict.results.map((r, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedCaseIndex(idx)}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: "6px",
                                  border: "1px solid",
                                  borderColor: selectedCaseIndex === idx ? (r.status === "PASS" ? "var(--green)" : "var(--red)") : "var(--border)",
                                  background: selectedCaseIndex === idx ? (r.status === "PASS" ? "var(--green-dim)" : "rgba(248,81,73,0.15)") : "var(--surface2)",
                                  color: r.status === "PASS" ? "var(--green)" : "var(--red)",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                {r.status === "PASS" ? "✓" : "✕"} Case {idx + 1}
                              </button>
                            ))}
                          </div>

                          {/* Selected Case Detail */}
                          {verdict.results[selectedCaseIndex] && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              <div>
                                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Input</div>
                                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 14px", color: "var(--cyan)", fontSize: "0.82rem", whiteSpace: "pre-wrap" }}>
                                  {verdict.results[selectedCaseIndex].input || "<empty>"}
                                </div>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--green)", textTransform: "uppercase", marginBottom: "4px" }}>Expected Output</div>
                                  <div style={{ background: "var(--surface2)", border: "1px solid rgba(57,211,83,0.3)", borderRadius: "6px", padding: "10px 14px", color: "var(--green)", fontSize: "0.82rem", whiteSpace: "pre-wrap" }}>
                                    {verdict.results[selectedCaseIndex].expected}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: verdict.results[selectedCaseIndex].status === "PASS" ? "var(--green)" : "var(--red)", textTransform: "uppercase", marginBottom: "4px" }}>
                                    Your Output ({verdict.results[selectedCaseIndex].status === "PASS" ? "Matched ✓" : "Diff ✕"})
                                  </div>
                                  <div style={{
                                    background: "var(--surface2)",
                                    border: "1px solid",
                                    borderColor: verdict.results[selectedCaseIndex].status === "PASS" ? "rgba(57,211,83,0.3)" : "rgba(248,81,73,0.4)",
                                    borderRadius: "6px",
                                    padding: "10px 14px",
                                    color: verdict.results[selectedCaseIndex].status === "PASS" ? "var(--green)" : "var(--red)",
                                    fontSize: "0.82rem",
                                    whiteSpace: "pre-wrap"
                                  }}>
                                    {verdict.results[selectedCaseIndex].actual || "<empty output>"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {outputTab === "testcases" && (
                <div>
                  {/* Sample testcase pills */}
                  {questions?.sampletcs?.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                      {questions.sampletcs.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCaseIndex(idx)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "6px",
                            border: "1px solid",
                            borderColor: selectedCaseIndex === idx ? "var(--cyan)" : "var(--border)",
                            background: selectedCaseIndex === idx ? "rgba(88,212,245,0.15)" : "var(--surface2)",
                            color: selectedCaseIndex === idx ? "var(--cyan)" : "var(--text-muted)",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {questions?.sampletcs?.[selectedCaseIndex] ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Input</div>
                        <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 14px", color: "var(--cyan)", fontSize: "0.82rem", whiteSpace: "pre-wrap" }}>
                          {questions.sampletcs[selectedCaseIndex].input}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--green)", textTransform: "uppercase", marginBottom: "4px" }}>Expected Output</div>
                        <div style={{ background: "var(--surface2)", border: "1px solid rgba(57,211,83,0.3)", borderRadius: "6px", padding: "10px 14px", color: "var(--green)", fontSize: "0.82rem", whiteSpace: "pre-wrap" }}>
                          {questions.sampletcs[selectedCaseIndex].output}
                        </div>
                      </div>
                    
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", padding: "12px 0" }}>No sample test cases available.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: VIDEO & CHAT (INTERVIEW MODE ONLY) */}
        {roomMode !== "practice" && (
          <div className="video-panel">
            <div className="video-section" style={{ flex: "0 0 auto" }}>
              {permissionError && (
                <div className="perm-banner">
                  Camera/mic blocked — click the 🔒 in your address bar and allow permissions, then refresh.
                </div>
              )}
              <div className="video-box">
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div className="video-box">
                {!screenShared && (
                  <video
                    ref={(el) => {
                      remoteVideoRef.current = el;
                      if (el && remoteStreamRef.current) {
                        el.srcObject = remoteStreamRef.current;
                        el.muted = false;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
              <div className="video-controls">
                <button className={`vc-btn ${micMuted ? "muted" : ""}`} onClick={() => {
                  const newState = !micMuted; setMicMuted(newState);
                  const t = localStreamRef.current?.getAudioTracks()[0];
                  if (t) t.enabled = !newState;
                }} title="Mute">{micMuted ? "🔇" : "🎤"}</button>
                <button className={`vc-btn ${camOff ? "muted" : ""}`} onClick={() => {
                  const newState = !camOff; setCamOff(newState);
                  const t = localStreamRef.current?.getVideoTracks()[0];
                  if (t) t.enabled = !newState;
                }} title="Camera">{camOff ? "📷" : "📹"}</button>
                <button className="vc-btn" title="Settings">⚙️</button>
              </div>
            </div>

            <div className="chat-section">
              <div className="chat-header">Chat</div>
              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div className="chat-msg" key={i}>
                    <div className={`chat-msg-name ${m.color}`}>{m.name}</div>
                    <div className="chat-msg-text">{m.text}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-input-row">
                <input className="chat-input" placeholder="Send a message..." value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} />
                <button className="chat-send" onClick={sendMsg}>↵</button>
              </div>
            </div>
          </div>
        )}

        {/* Interview anti-cheat candidate forced fullscreen warning */}
        {roomMode !== "practice" && candidateFullscreenWarning && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <div style={{
              background: "#111",
              border: "1px solid red",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              width: "420px"
            }}>
              <h2 style={{ color: "red", marginBottom: "12px" }}>Secure Interview Mode Exited</h2>
              <p style={{ color: "#aaa", marginBottom: "20px" }}>
                You left fullscreen interview mode. Please re-enter immediately for fairness.
              </p>
              <button
                onClick={() => {
                  enterSecureFullscreen();
                  setCandidateFullscreenWarning(false);
                }}
                style={{
                  padding: "10px 22px",
                  background: "red",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
              >
                Re-enter Fullscreen
              </button>
            </div>
          </div>
        )}

        {/* Interviewer decision popup */}
        {roomMode !== "practice" && interviewerDecisionPopup && (
          <div style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#161b22",
            border: "1px solid orange",
            borderRadius: "10px",
            padding: "18px",
            zIndex: 9999,
            width: "320px"
          }}>
            <div style={{ color: "orange", fontWeight: 800, marginBottom: "10px" }}>
              Candidate left fullscreen mode.
            </div>
            <div style={{ color: "#aaa", fontSize: "0.8rem", marginBottom: "14px" }}>
              Ask candidate to re-enter secure mode?
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={sendCandidateWarning} style={{ flex: 1, padding: "8px", background: "orange", border: "none", borderRadius: "6px", cursor: "pointer" }}>Warn Candidate</button>
              <button onClick={ignoreCandidateViolation} style={{ flex: 1, padding: "8px", background: "#333", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Leave This Time</button>
            </div>
          </div>
        )}

        {/* candidate top warning bar */}
        {roomMode !== "practice" && warningMessage && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "rgba(255,0,0,0.85)",
            color: "white",
            textAlign: "center",
            padding: "10px",
            zIndex: 9999,
            fontWeight: 700
          }}>
            {warningMessage}
          </div>
        )}

      </div>
    </>
  );
}