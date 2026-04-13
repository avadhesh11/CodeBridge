import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../context/authContext";
import {useNavigate} from "react-router-dom";
const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080c10; --surface: #0d1117; --surface2: #161b22; --surface3: #1c2128;
    --border: #21262d; --border2: #30363d;
    --green: #39d353; --green-dim: #1a4d2a;
    --cyan: #58d4f5; --cyan-dim: rgba(88,212,245,0.1);
    --amber: #f0a830; --amber-dim: rgba(240,168,48,0.1);
    --red: #f85149; --red-dim: rgba(248,81,73,0.1);
    --violet: #c084fc; --violet-dim: rgba(192,132,252,0.1);
    --text: #e6edf3; --text-muted: #7d8590;
  }
  html, body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }

  /* ── TOPBAR ── */
  .topbar {
    height: 50px; display: flex; align-items: center; gap: 14px;
    padding: 0 28px; background: var(--surface); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 50;
  }
  .logo { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 700; color: var(--green); }
  .logo span { color: var(--text-muted); }
  .sep { width: 1px; height: 18px; background: var(--border); }
  .breadcrumb { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
  .breadcrumb b { color: var(--text); }
  .spacer { flex: 1; }
  .back-btn {
    display: flex; align-items: center; gap: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 700;
    color: var(--text-muted); background: transparent; border: 1px solid var(--border);
    padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s;
  }
  .back-btn:hover { color: var(--text); border-color: var(--border2); }

  /* ── PAGE LAYOUT ── */
  .page {
    max-width: 1100px; margin: 0 auto;
    padding: 48px 32px 80px;
    display: grid; grid-template-columns: 1fr 380px; gap: 32px; align-items: start;
  }

  /* ── PAGE HEADER ── */
  .page-header { grid-column: 1 / -1; margin-bottom: 8px; }
  .page-title { font-size: 2.2rem; font-weight: 800; letter-spacing: -1.5px; margin-bottom: 6px; }
  .page-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--text-muted); }
  .page-sub span { color: var(--green); }

  /* ── FORM CARD ── */
  .form-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
  }
  .form-card-header {
    padding: 18px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  .fch-icon { font-size: 1rem; }
  .fch-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); }
  .form-card-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

  /* ── FIELDS ── */
  .field { display: flex; flex-direction: column; gap: 7px; }
  .field-label {
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;
    display: flex; align-items: center; gap: 6px;
  }
  .field-label .required { color: var(--red); }
  .field-hint { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--text-muted); margin-top: 2px; }
  .field-input {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    padding: 11px 14px; border-radius: 8px; font-family: 'JetBrains Mono', monospace;
    font-size: 0.83rem; outline: none; transition: border-color 0.2s; width: 100%;
  }
  .field-input:focus { border-color: var(--green); }
  .field-input::placeholder { color: var(--text-muted); }
  .field-input.error { border-color: var(--red); }
  .field-error { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--red); }

  /* CANDIDATE NAME + EMAIL ROW */
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* ── QUESTION SELECTOR ── */
  .q-search-wrap { position: relative; }
  .q-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem; pointer-events: none; }
  .q-search-input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 10px 12px 10px 34px; border-radius: 8px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; outline: none; transition: border-color 0.2s;
  }
  .q-search-input:focus { border-color: var(--green); }
  .q-search-input::placeholder { color: var(--text-muted); }

  .q-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; padding-right: 2px; }
  .q-list::-webkit-scrollbar { width: 3px; }
  .q-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .q-row {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface2); cursor: pointer; transition: all 0.15s;
    position: relative;
  }
  .q-row:hover { border-color: var(--border2); background: var(--surface3); }
  .q-row.selected { border-color: var(--green); background: var(--green-dim); }

  .q-diff { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; min-width: 52px; text-align: center; }
  .qd-easy  { background: var(--green-dim); color: var(--green); }
  .qd-med   { background: var(--amber-dim); color: var(--amber); }
  .qd-hard  { background: var(--red-dim); color: var(--red); }

  .q-title { flex: 1; font-size: 0.875rem; font-weight: 700; }
  .q-meta { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--text-muted); display: flex; gap: 8px; }
  .q-check {
    width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s;
  }
  .q-row.selected .q-check { border-color: var(--green); background: var(--green); }
  .q-check-inner { width: 8px; height: 8px; background: #000; border-radius: 50%; display: none; }
  .q-row.selected .q-check-inner { display: block; }

  /* ── SETTINGS TILES ── */
  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .tile {
    padding: 14px 16px; border-radius: 9px; border: 1px solid var(--border);
    background: var(--surface2); cursor: pointer; transition: all 0.15s; user-select: none;
  }
  .tile:hover { border-color: var(--border2); }
  .tile.on { border-color: var(--green); background: var(--green-dim); }
  .tile-icon { font-size: 1.2rem; margin-bottom: 6px; }
  .tile-label { font-size: 0.8rem; font-weight: 700; margin-bottom: 3px; }
  .tile-desc { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); line-height: 1.4; }
  .tile.on .tile-desc { color: rgba(57,211,83,0.7); }

  /* DURATION SELECTOR */
  .dur-opts { display: flex; gap: 6px; flex-wrap: wrap; }
  .dur-opt {
    padding: 7px 14px; border-radius: 7px; border: 1px solid var(--border);
    background: var(--surface2); cursor: pointer; font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem; font-weight: 700; color: var(--text-muted); transition: all 0.15s;
  }
  .dur-opt:hover { border-color: var(--border2); color: var(--text); }
  .dur-opt.active { border-color: var(--cyan); background: var(--cyan-dim); color: var(--cyan); }

  /* ── RIGHT: PREVIEW CARD ── */
  .preview-col { display: flex; flex-direction: column; gap: 20px; }

  .preview-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
    position: sticky; top: 70px;
  }
  .preview-header {
    padding: 18px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .preview-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); }
  .preview-id { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--cyan); background: var(--cyan-dim); border: 1px solid rgba(88,212,245,0.2); padding: 3px 10px; border-radius: 5px; }

  .preview-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .prow { display: flex; flex-direction: column; gap: 4px; }
  .prow-label { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
  .prow-val { font-size: 0.875rem; font-weight: 700; color: var(--text); }
  .prow-val.empty { color: var(--text-muted); font-weight: 400; font-style: italic; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; }
  .prow-val.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.83rem; }

  .prev-q-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--green-dim); border: 1px solid var(--green);
    padding: 5px 10px; border-radius: 6px;
  }
  .prev-q-badge-title { font-size: 0.8rem; font-weight: 700; color: var(--green); }

  .preview-divider { height: 1px; background: var(--border); margin: 0 -20px; }

  .feature-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700;
    padding: 3px 9px; border-radius: 5px; border: 1px solid var(--border); color: var(--text-muted);
  }
  .chip.on { border-color: var(--green); background: var(--green-dim); color: var(--green); }

  /* ── CREATE BUTTON ── */
  .create-btn-wrap { padding: 0 20px 20px; }
  .create-btn {
    width: 100%; padding: 14px; background: var(--green); color: #000; border: none;
    border-radius: 10px; font-weight: 800; font-size: 1rem; cursor: pointer;
    font-family: 'Syne', sans-serif; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .create-btn:hover { box-shadow: 0 0 28px rgba(57,211,83,0.4); transform: translateY(-1px); }
  .create-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .create-btn-sub { text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--text-muted); padding: 0 20px 16px; }

  /* ── SUCCESS OVERLAY ── */
  .success-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
    z-index: 200; display: flex; align-items: center; justify-content: center;
  }
  .success-card {
    background: var(--surface); border: 1px solid var(--green); border-radius: 18px;
    padding: 48px 40px; width: 480px; text-align: center;
    box-shadow: 0 0 60px rgba(57,211,83,0.15);
    animation: popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes popIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  .success-icon { font-size: 3rem; margin-bottom: 16px; }
  .success-title { font-size: 1.6rem; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
  .success-sub { color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; margin-bottom: 32px; line-height: 1.6; }
  .room-id-display {
    background: var(--surface2); border: 1px solid var(--green); border-radius: 10px;
    padding: 18px 20px; margin-bottom: 28px; position: relative;
  }
  .rid-label { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .rid-value { font-family: 'JetBrains Mono', monospace; font-size: 1.4rem; font-weight: 700; color: var(--green); letter-spacing: 3px; }
  .copy-btn {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: var(--green-dim); border: 1px solid var(--green); color: var(--green);
    font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 700;
    padding: 4px 10px; border-radius: 5px; cursor: pointer; transition: all 0.15s;
  }
  .copy-btn:hover { background: var(--green); color: #000; }
  .success-link {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 14px; margin-bottom: 24px; text-align: left;
  }
  .sl-label { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: var(--text-muted); margin-bottom: 4px; }
  .sl-url { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--cyan); word-break: break-all; }
  .success-actions { display: flex; gap: 10px; }
  .sac-primary { flex: 1; padding: 12px; background: var(--green); color: #000; border: none; border-radius: 9px; font-weight: 800; font-size: 0.9rem; cursor: pointer; font-family: 'Syne', sans-serif; }
  .sac-secondary { flex: 1; padding: 12px; background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 9px; font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: border-color 0.15s; }
  .sac-secondary:hover { border-color: var(--border2); }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
`;

const QUESTIONS = [
  { _id: "q1", tag: "Easy",   title: "Two Sum",            sampletcs: 2, hiddentcs: 4, timelimit: 2 },
  { _id: "q2", tag: "Easy",   title: "Valid Parentheses",  sampletcs: 1, hiddentcs: 3, timelimit: 2 },
  { _id: "q3", tag: "Medium", title: "Merge Intervals",    sampletcs: 1, hiddentcs: 3, timelimit: 2 },
  { _id: "q4", tag: "Medium", title: "3Sum",               sampletcs: 2, hiddentcs: 5, timelimit: 2 },
  { _id: "q5", tag: "Hard",   title: "LRU Cache",          sampletcs: 1, hiddentcs: 4, timelimit: 1 },
  { _id: "q6", tag: "Hard",   title: "Word Search II",     sampletcs: 1, hiddentcs: 3, timelimit: 2 },
];

const DURATIONS = ["30 min", "45 min", "60 min", "90 min", "Custom"];
const DIFF_MAP = { Easy: "qd-easy", Medium: "qd-med", Hard: "qd-hard" };


export default function CreateRoomPage() {
  const {user}=useAuth();
  const navigate=useNavigate();

  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    roomName: "",
    selectedQuestion: null,
    duration: "60 min",
    videoEnabled: true,
    screenShare: true,
    chatEnabled: true,
    codeExecution: true,
  });
  const [qSearch, setQSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [roomId,setRoomid] = useState("");
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

const handleCreate = async () => {
  try {
    const res = await api("post","room/new");

    setRoomid(res.data.roomID);
    setSuccess(true);

  } catch(err){
    console.error(err);
  }
};
  const filteredQ = QUESTIONS.filter(q =>
    q.title.toLowerCase().includes(qSearch.toLowerCase())
  );

  const update = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const toggleFeature = (key) => update(key, !form[key]);

  const validate = () => {
    const e = {};
    if (!form.candidateName.trim()) e.candidateName = "Candidate name is required";
    if (!form.selectedQuestion)     e.selectedQuestion = "Please select a question";
    return e;
  };


  const copyRoomId = () => {
    navigator.clipboard?.writeText(roomId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteLink = `${import.meta.env.VITE_FRONTEND_URL}/join/${roomId}`;

  const selectedQ = QUESTIONS.find(q => q._id === form.selectedQuestion);

  const features = [
    { key: "videoEnabled",  icon: "📹", label: "Video Call",      desc: "WebRTC peer-to-peer" },
    { key: "screenShare",   icon: "🖥️", label: "Screen Share",    desc: "getDisplayMedia API" },
    { key: "chatEnabled",   icon: "💬", label: "Live Chat",        desc: "In-session messaging" },
    { key: "codeExecution", icon: "🐳", label: "Code Execution",   desc: "Docker C++ sandbox" },
  ];

  return (
    <>
      <style>{css}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo">Code<span>Bridge</span></div>
        <div className="sep" />
        <div className="breadcrumb">Dashboard <span>›</span> <b>Create Room</b></div>
        <div className="spacer" />
        <button className="back-btn">← Back to Dashboard</button>
      </div>

      <div className="page">
        {/* PAGE HEADER */}
        <div className="page-header">
          <div className="page-title">Create Interview Room</div>
          <div className="page-sub">Room ID: <span>{roomId}</span> — will be shared with the candidate</div>
        </div>

        {/* ── LEFT COL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* CANDIDATE INFO */}
          <div className="form-card">
            <div className="form-card-header">
              <span className="fch-icon">👤</span>
              <span className="fch-title">Candidate Info</span>
            </div>
            <div className="form-card-body">
              {/* <div className="field-row">
                <div className="field">
                  <div className="field-label">Name <span className="required">*</span></div>
                  <input
                    className={`field-input ${errors.candidateName ? "error" : ""}`}
                    placeholder="Rahul Sharma"
                    value={form.candidateName}
                    onChange={e => update("candidateName", e.target.value)}
                  />
                  {errors.candidateName && <div className="field-error">⚠ {errors.candidateName}</div>}
                </div>
                <div className="field">
                  <div className="field-label">Email</div>
                  <input
                    className="field-input"
                    type="email"
                    placeholder="candidate@email.com"
                    value={form.candidateEmail}
                    onChange={e => update("candidateEmail", e.target.value)}
                  />
                  <div className="field-hint">Invite link will be sent here</div>
                </div>
              </div> */}
              <div className="field">
                <div className="field-label">Room Title </div>
                <input
                  className="field-input"
                  placeholder="e.g. Backend Round 1 – Rahul"
                  value={form.roomName}
                  onChange={e => update("roomName", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* QUESTION */}
          <div className="form-card">
            <div className="form-card-header">
              <span className="fch-icon">📋</span>
              <span className="fch-title">Add Public Question</span>
            </div>
            <div className="form-card-body">
              <div className="q-search-wrap">
                <span className="q-search-icon">⌕</span>
                <input
                  className="q-search-input"
                  placeholder="Search questions..."
                  value={qSearch}
                  onChange={e => setQSearch(e.target.value)}
                />
              </div>
              {errors.selectedQuestion && (
                <div className="field-error" style={{ marginTop: -8 }}>⚠ {errors.selectedQuestion}</div>
              )}
              <div className="q-list">
                {filteredQ.map(q => (
                  <div
                    key={q._id}
                    className={`q-row ${form.selectedQuestion === q._id ? "selected" : ""}`}
                    onClick={() => update("selectedQuestion", q._id)}
                  >
                    <span className={`q-diff ${DIFF_MAP[q.tag]}`}>{q.tag}</span>
                    <div style={{ flex: 1 }}>
                      <div className="q-title">{q.title}</div>
                      <div className="q-meta">
                        <span>⏱ {q.timelimit}s</span>
                        <span>📋 {q.sampletcs} sample</span>
                        <span>🔒 {q.hiddentcs} hidden</span>
                      </div>
                    </div>
                    <div className="q-check">
                      <div className="q-check-inner" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SESSION SETTINGS */}
          {/* <div className="form-card">
            <div className="form-card-header">
              <span className="fch-icon">⚙️</span>
              <span className="fch-title">Session Settings</span>
            </div>
            <div className="form-card-body"> 
               <div className="field">
                <div className="field-label">Duration</div>
                <div className="dur-opts">
                  {DURATIONS.map(d => (
                    <div
                      key={d}
                      className={`dur-opt ${form.duration === d ? "active" : ""}`}
                      onClick={() => update("duration", d)}
                    >{d}</div>
                  ))}
                </div>
              </div> 
               <div className="field">
                <div className="field-label">Features</div>
                <div className="tiles">
                  {features.map(f => (
                    <div
                      key={f.key}
                      className={`tile ${form[f.key] ? "on" : ""}`}
                      onClick={() => toggleFeature(f.key)}
                    >
                      <div className="tile-icon">{f.icon}</div>
                      <div className="tile-label">{f.label}</div>
                      <div className="tile-desc">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div> 
            </div>
          </div>*/}

        </div>

        {/* ── RIGHT COL: PREVIEW ── */}
        <div className="preview-col">
          {/* {/* <div className="preview-card"> */}
         <div className="preview-header">
                {/*  <span className="preview-title">// room preview</span>
              <span className="preview-id">{roomId}</span>
            </div>
            <div className="preview-body">
              <div className="prow">
                <div className="prow-label">Candidate</div>
                <div className={`prow-val ${!form.candidateName ? "empty" : ""}`}>
                  {form.candidateName || "— not set —"}
                </div>
              </div>
              {form.candidateEmail && (
                <div className="prow">
                  <div className="prow-label">Email</div>
                  <div className="prow-val mono">{form.candidateEmail}</div>
                </div>
              )}
              {form.roomName && (
                <div className="prow">
                  <div className="prow-label">Label</div>
                  <div className="prow-val">{form.roomName}</div>
                </div>
              )}
              <div className="preview-divider" />
              <div className="prow">
                <div className="prow-label">Question</div>
                {selectedQ ? (
                  <div className="prev-q-badge">
                    <span className={`q-diff ${DIFF_MAP[selectedQ.tag]}`} style={{ fontSize: "0.6rem" }}>{selectedQ.tag}</span>
                    <span className="prev-q-badge-title">{selectedQ.title}</span>
                  </div>
                ) : (
                  <div className="prow-val empty">— not selected —</div>
                )}
              </div>  */}
              {/* <div className="prow">
                <div className="prow-label">Duration</div>
                <div className="prow-val mono">{form.duration}</div>
              </div>
              <div className="preview-divider" />
              <div className="prow">
                <div className="prow-label">Features</div>
                <div className="feature-chips">
                  {features.map(f => (
                    <span key={f.key} className={`chip ${form[f.key] ? "on" : ""}`}>
                      {f.icon} {f.label}
                    </span>
                  ))}
                </div> */}
              {/* </div> */}
            {/* </div> */}

            <div className="create-btn-wrap">
              <button
                className="create-btn"
                onClick={handleCreate}
                // disabled={ !form.selectedQuestion}
              >
                <span>⚡</span> Launch Room
              </button>
            </div>
            <div className="create-btn-sub">
              Room ID <b style={{ color: "var(--cyan)" }}>{roomId}</b> · auto-expires after session ends
            </div>
          </div>
        </div>
      </div>

      {/* ── SUCCESS OVERLAY ── */}
      {success && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="success-icon">🚀</div>
            <div className="success-title">Room Created!</div>
            <div className="success-sub">
              Share the room ID or invite link with{" "}
              {/* <b style={{ color: "var(--text)" }}>{form.candidateName}</b> to get started. */}
            </div>

            <div className="room-id-display">
              <div className="rid-label">Room ID</div>
              <div className="rid-value">{roomId}</div>
              <button className="copy-btn" onClick={copyRoomId}>
                {copied ? "✓ Copied" : "⊕ Copy"}
              </button>
            </div>

            <div className="success-link">
              <div className="sl-label">Invite Link</div>
              <div className="sl-url">{inviteLink}</div>
            </div>

            <div className="success-actions">
              <button onClick={()=>{navigate(`/code/${roomId}`)}} className="sac-primary">→ Join Room Now</button>
              <button className="sac-secondary" onClick={() => setSuccess(false)}>✕ Close</button>
         
              <button className="sac-secondary" onClick={() => navigate(`/manage/${roomId}`)}>Add questions/edit room</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}