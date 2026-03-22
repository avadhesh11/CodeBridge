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
  }
  html, body, #root { height: 100%; }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; overflow: hidden; }
  .topbar { height: 48px; display: flex; align-items: center; background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 16px; gap: 16px; flex-shrink: 0; }
  .topbar-logo { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 700; color: var(--green); }
  .topbar-logo span { color: var(--text-muted); }
  .topbar-sep { width: 1px; height: 20px; background: var(--border); }
  .topbar-spacer { flex: 1; }
  .topbar-actions { display: flex; gap: 8px; }
  .topbar-btn { padding: 6px 14px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; border: none; transition: all 0.15s; }
  .btn-screen { background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border); }
  .btn-screen:hover { color: var(--text); border-color: var(--border2); }
  .btn-end { background: rgba(248,81,73,0.15); color: var(--red); border: 1px solid rgba(248,81,73,0.3); }
  .btn-end:hover { background: rgba(248,81,73,0.25); }
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

const defaultCode = `#include <bits/stdc++.h>
using namespace std;

int main() {
    // All the best
    return 0;
}`;

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

  const [code, setCode] = useState(defaultCode);
  const [outputTab, setOutputTab] = useState("testcases");
  const [activeTab, setActiveTab] = useState("problem");
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [verdict, setVerdict] = useState({ status: "idle", output: "", error: null });
  const [submissionResult, setSubmissionResult] = useState(null);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [role, setRole] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [questions, setQuestions] = useState(null);
  const [leftWidth, setLeftWidth] = useState(Number(localStorage.getItem("leftWidth")) || 550);
  const [testHeight, setTestHeight] = useState(Number(localStorage.getItem("testHeight")) || 250);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShared, setScreenShared] = useState(false);

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
    const saved = localStorage.getItem("code");
    if (saved) { setCode(saved); localStorage.removeItem("code"); }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!roomID) { alert("no room found!"); navigate("/"); return; }

    socket.connect();

    socket.on("connect", () => {
      socket.emit("join-room", { roomID });
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connection error:", err.message);
    });

    socket.on("joined-successfully", (data) => {
      setRole(data.role);
    });

    socket.on("error-message", (msg) => {
      console.log("Socket error:", msg);
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
    socket.on("code-update", ({ code }) => setCode(code));
    socket.on("question-selected", ({ question }) => setQuestions(question));

    return () => {
      ["joined-successfully", "error-message", "code-update", "question-selected",
        "chat", "chat-history", "webrtc-offer", "webrtc-answer", "webrtc-ice",
        "start-call", "screen-share-start", "screen-share-stop"
      ].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, [roomID]);

  const sendMsg = () => {
    if (!chatMsg.trim()) return;
    socket.emit("chat", { message: chatMsg });
    setChatMsg("");
  };

  const fetchQuestions = async () => {
    try {
      const res = await api("get", `question/private/${roomID}`);
      setAllQuestions(res.data.questions);
    } catch (error) {
      console.log("unable to fetch questions", error);
    }
  };

  const handleRun = async () => {
    if (!questions) return;
    setOutputTab("output");
    setVerdict({ status: "running", output: "", error: null });
    try {
      const res = await api("post", "room/codeTest", { code, questionId: questions._id, type: "sample" });
      const { verdict, results, error } = res.data;
      if (verdict === "CE") return setVerdict({ status: "error", output: "Compile error", error });
      if (verdict === "RE") return setVerdict({ status: "error", output: "Runtime error", error });
      if (verdict === "AC") {
        setVerdict({ status: "success", output: "All testcases passed ✅" });
      } else {
        const failedCase = results?.find(r => r.status !== "PASS");
        setVerdict({
          status: "error",
          output: failedCase ? `Wrong Answer\n\nInput: ${failedCase.input}\nExpected: ${failedCase.expected}\nGot: ${failedCase.actual}` : verdict,
          error: null
        });
      }
    } catch {
      setVerdict({ status: "error", output: "", error: "Execution failed" });
    }
  };

  const handleSubmit = async () => {
    if (!questions) return;
    setOutputTab("output");
    setVerdict({ status: "running", output: "", error: null });
    try {
      const res = await api("post", "room/codeTest", { code, questionId: questions._id, type: "hidden" });
      const { verdict, error } = res.data;
      if (verdict === "CE") return setVerdict({ status: "error", error });
      if (verdict === "AC") {
        setVerdict({ status: "success", output: "🎉 Accepted on hidden testcases!" });
        setActiveTab("submissions");
      } else {
        setVerdict({ status: "error", output: "Final Verdict: Failed on a hidden test-case" });
      }
      setSubmissionResult(verdict);
    } catch {
      setVerdict({ status: "error", error: "Submission failed" });
    }
  };

  const reset = () => {
    localStorage.removeItem("testHeight");
    localStorage.removeItem("leftWidth");
    localStorage.setItem("code", code);
    window.location.reload();
  };

  useEffect(() => { fetchQuestions(); }, []);

  const diffColor = { Easy: "green", Medium: "orange", Hard: "red" };

  return (
    <>
      <style>{styles}</style>

      <div className="topbar">
        <div className="topbar-logo">Code<span>Bridge</span></div>
        <div className="topbar-sep" />
        <select
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", padding: "5px 10px", borderRadius: "6px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}
          value={questions?._id || ""}
          onChange={(e) => {
            const q = allQuestions.find(q => q._id === e.target.value);
            if (!q) return;
            setQuestions(q);
            socket.emit("select-question", { questionId: q._id });
          }}
        >
          <option value="">{questions ? questions.title : "Select Question"}</option>
          {allQuestions.map((q) => (
            <option key={q._id} value={q._id}>{q.title}</option>
          ))}
        </select>
        <div className="topbar-spacer" />
        <div className="topbar-actions">
          <button className="topbar-btn btn-screen" onClick={screenSharing ? stopScreenShare : startScreenShare}>
            {screenSharing ? "Stop Sharing" : "Start Screen Share"}
          </button>
          <button className="topbar-btn btn-end">✕ End Session</button>
        </div>
      </div>

      <div className="interview-layout">

        <div className="problem-panel" style={{ width: leftWidth }}>
          <div className="panel-tabs">
            {["problem", "submissions"].map(t => (
              <div key={t} className={`panel-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)} style={{ textTransform: "capitalize" }}>{t}</div>
            ))}
          </div>
          <div className="panel-body">
            {activeTab === "problem" ? (
              <>
                {questions && <span className="prob-difficulty" style={{ backgroundColor: diffColor[questions.tag] }}>{questions.tag}</span>}
                <div className="prob-title">{questions ? questions.title : "Please Select Question First"}</div>
                <div className="prob-desc">{questions ? questions.description : ""}</div>
                {questions && <div className="prob-section-title">Examples</div>}
                {questions && questions.sampletcs.map((tc, i) => (
                  <div className="prob-example" key={i}>
                    <div style={{ marginBottom: 6 }}><span>Input: </span><pre style={{ display: "inline", color: "var(--cyan)" }}>{tc.input}</pre></div>
                    <div><span>Output: </span><pre style={{ display: "inline", color: "var(--green)" }}>{tc.output}</pre></div>
                  </div>
                ))}
                {questions && questions.constraints.split("\n").map((c, i) => <div className="prob-constraint" key={i}>{c}</div>)}
                {questions && <div className="prob-constraint">TimeLimit: {questions.timelimit}s</div>}
              </>
            ) : (
              <>
                <div className="prob-section-title" style={{ marginBottom: 16 }}>Recent Submissions</div>
                {[
                  { v: "Accepted", t: "12ms", m: "9.2MB", time: "2 min ago", color: "var(--green)" },
                  { v: "Wrong Answer", t: "8ms", m: "8.1MB", time: "5 min ago", color: "var(--red)" },
                  { v: "Compilation Error", t: "—", m: "—", time: "8 min ago", color: "var(--amber)" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", fontWeight: 700, color: s.color }}>{s.v}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: "var(--text-muted)" }}>{s.time}</span>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>{s.t} · {s.m}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div style={{ width: "4px", cursor: "col-resize", background: "var(--border)", flexShrink: 0 }}
          onMouseDown={(e) => {
            const startX = e.clientX; const startWidth = leftWidth;
            const onMove = (e) => { const w = startWidth + (e.clientX - startX); if (w > 250 && w < 600) { setLeftWidth(w); localStorage.setItem("leftWidth", w); } };
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
          }}
        />

        <div className="editor-panel">
          <div className="editor-topbar">
            <span className="lang-tag">C++</span>
            <div className="users-row">
              <div className="user-avatar ua-green" title="Interviewer">IM</div>
              <div className="user-avatar ua-cyan" title="Candidate">CA</div>
            </div>
            <div className="editor-spacer" />
            <button className="run-btn" onClick={handleRun}>▷ Run</button>
            <button className="submit-btn" onClick={handleSubmit}>Submit</button>
            <button className="run-btn" style={{ backgroundColor: "red" }} onClick={reset}>Reset Layout</button>
          </div>

          <div className="editor-wrapper">
            {screenShared ? (
              <video ref={screenVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            ) : (
              <Editor
                height="100%"
                defaultLanguage="cpp"
                theme="vs-dark"
                value={code}
                onChange={(v) => {
                  if (role === "interviewer") return;
                  setCode(v);
                  socket.emit("code-change", { code: v });
                }}
                options={{
                  readOnly: role === "interviewer",
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
              {["output", "testcases"].map(t => (
                <div key={t} className={`output-tab ${outputTab === t ? "active" : ""}`} onClick={() => setOutputTab(t)} style={{ textTransform: "capitalize" }}>{t}</div>
              ))}
            </div>
            <div className="output-body">
              {outputTab === "output" ? (
                <>
                  {verdict.status === "idle" && <div className="output-text">No output yet. Click Run to execute.</div>}
                  {verdict.status === "running" && <div className="verdict-row"><span className="verdict-badge vb-running">⟳ Running...</span><span className="output-meta">Compiling with g++...</span></div>}
                  {verdict.status === "success" && <><div className="verdict-row"><span className="verdict-badge vb-accepted">✓ Accepted</span></div><div className="output-text">{verdict.output}</div></>}
                  {verdict.status === "error" && <><div className="verdict-row"><span className="verdict-badge vb-error">✕ Failed</span></div><div className="output-text">{verdict.error || verdict.output}</div></>}
                </>
              ) : (
                <div>
                  {questions && questions.sampletcs.map((tc, i) => (
                    <div key={i} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 14px", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Case {i + 1}:</span>
                      <pre style={{ color: "var(--cyan)" }}>{tc.input}</pre>
                      <span style={{ color: "var(--text-muted)" }}>Expected:</span>
                      <pre style={{ color: "var(--green)" }}>{tc.output}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {submissionResult && (
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", fontWeight: 700, color: submissionResult === "AC" ? "var(--green)" : "var(--red)" }}>
              {submissionResult === "AC" ? "Accepted ✅" : submissionResult}
            </div>
          </div>
        )}

        <div className="video-panel">
          <div className="video-section" style={{ flex: "0 0 auto" }}>
            {permissionError && (
              <div className="perm-banner">
                Camera/mic blocked — click the 🔒 in your browser address bar and allow permissions, then refresh.
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

        {camOff && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
            Camera Off
          </div>
        )}
      </div>
    </>
  );
}