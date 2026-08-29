import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";

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
  .logo { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 700; color: var(--green); cursor: pointer; }
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
    max-width: 1120px; margin: 0 auto;
    padding: 40px 32px 80px;
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
  .fch-icon { font-size: 1.1rem; }
  .fch-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); }
  .form-card-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

  /* ── MODE & TIMER SELECTION TILES ── */
  .option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .option-card {
    padding: 18px; border-radius: 10px; border: 1.5px solid var(--border);
    background: var(--surface2); cursor: pointer; transition: all 0.2s; user-select: none;
    display: flex; flex-direction: column; gap: 8px; position: relative;
  }
  .option-card:hover { border-color: var(--border2); background: var(--surface3); }
  .option-card.active-interview {
    border-color: var(--cyan); background: rgba(88,212,245,0.08); box-shadow: 0 0 20px rgba(88,212,245,0.15);
  }
  .option-card.active-practice {
    border-color: var(--green); background: rgba(57,211,83,0.08); box-shadow: 0 0 20px rgba(57,211,83,0.15);
  }
  .option-card.active-timed {
    border-color: var(--amber); background: rgba(240,168,48,0.08); box-shadow: 0 0 20px rgba(240,168,48,0.15);
  }
  .option-card.active-unlimited {
    border-color: var(--violet); background: rgba(192,132,252,0.08); box-shadow: 0 0 20px rgba(192,132,252,0.15);
  }
  .opt-icon-row { display: flex; align-items: center; justify-content: space-between; }
  .opt-icon { font-size: 1.6rem; }
  .opt-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; font-weight: 700;
    padding: 2px 7px; border-radius: 4px; text-transform: uppercase;
  }
  .opt-title { font-size: 0.95rem; font-weight: 800; }
  .opt-desc { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: var(--text-muted); line-height: 1.5; }

  /* ── DURATION SELECTOR ── */
  .dur-opts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .dur-opt {
    padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface2); cursor: pointer; font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem; font-weight: 700; color: var(--text-muted); transition: all 0.15s;
  }
  .dur-opt:hover { border-color: var(--border2); color: var(--text); }
  .dur-opt.active { border-color: var(--amber); background: var(--amber-dim); color: var(--amber); }

  .custom-dur-row { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
  .custom-dur-input {
    width: 140px; background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    padding: 9px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace;
    font-size: 0.85rem; outline: none; transition: border-color 0.2s;
  }
  .custom-dur-input:focus { border-color: var(--amber); }
  .custom-dur-label { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--text-muted); }

  /* ── FIELDS ── */
  .field { display: flex; flex-direction: column; gap: 7px; }
  .field-label {
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;
    display: flex; align-items: center; gap: 6px;
  }
  .field-hint { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--text-muted); margin-top: 2px; }
  .field-input {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    padding: 11px 14px; border-radius: 8px; font-family: 'JetBrains Mono', monospace;
    font-size: 0.83rem; outline: none; transition: border-color 0.2s; width: 100%;
  }
  .field-input:focus { border-color: var(--green); }
  .field-input::placeholder { color: var(--text-muted); }

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

  .q-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; padding-right: 2px; }
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
    width: 20px; height: 20px; border-radius: 5px; border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s;
  }
  .q-row.selected .q-check { border-color: var(--green); background: var(--green); }
  .q-check-inner { font-size: 0.7rem; color: #000; display: none; font-weight: 900; }
  .q-row.selected .q-check-inner { display: block; }

  .q-selected-bar {
    display: flex; align-items: center; justify-content: space-between;
    background: var(--green-dim); border: 1px solid var(--green); border-radius: 8px;
    padding: 8px 14px; margin-bottom: 10px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.72rem;
  }
  .q-selected-count { color: var(--green); font-weight: 700; }
  .q-clear-btn {
    background: transparent; border: none; color: var(--text-muted);
    font-size: 0.67rem; cursor: pointer; font-family: 'JetBrains Mono', monospace;
    font-weight: 700; padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
  }
  .q-clear-btn:hover { color: var(--red); }

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
  .preview-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700;
    padding: 3px 10px; border-radius: 5px;
  }
  .pb-interview { color: var(--cyan); background: var(--cyan-dim); border: 1px solid rgba(88,212,245,0.3); }
  .pb-practice { color: var(--green); background: var(--green-dim); border: 1px solid rgba(57,211,83,0.3); }

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

  /* ── CREATE BUTTON ── */
  .create-btn-wrap { padding: 0 20px 20px; }
  .create-btn {
    width: 100%; padding: 14px; color: #000; border: none;
    border-radius: 10px; font-weight: 800; font-size: 1rem; cursor: pointer;
    font-family: 'Syne', sans-serif; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .create-btn.btn-interview { background: var(--cyan); }
  .create-btn.btn-interview:hover { box-shadow: 0 0 28px rgba(88,212,245,0.4); transform: translateY(-1px); }
  .create-btn.btn-practice { background: var(--green); }
  .create-btn.btn-practice:hover { box-shadow: 0 0 28px rgba(57,211,83,0.4); transform: translateY(-1px); }
  .create-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .create-btn-sub { text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--text-muted); padding: 0 20px 16px; }

  /* ── SUCCESS OVERLAY ── */
  .success-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
    z-index: 200; display: flex; align-items: center; justify-content: center;
  }
  .success-card {
    background: var(--surface); border: 1px solid var(--green); border-radius: 18px;
    padding: 44px 36px; width: 480px; text-align: center;
    box-shadow: 0 0 60px rgba(57,211,83,0.15);
    animation: popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes popIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  .success-icon { font-size: 3rem; margin-bottom: 14px; }
  .success-title { font-size: 1.6rem; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
  .success-sub { color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; margin-bottom: 26px; line-height: 1.6; }
  .room-id-display {
    background: var(--surface2); border: 1px solid var(--green); border-radius: 10px;
    padding: 16px 20px; margin-bottom: 22px; position: relative;
  }
  .rid-label { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .rid-value { font-family: 'JetBrains Mono', monospace; font-size: 1.4rem; font-weight: 700; color: var(--green); letter-spacing: 3px; }
  .copy-btn {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: var(--green-dim); border: 1px solid var(--green); color: var(--green);
    font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 700;
    padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s;
  }
  .copy-btn:hover { background: var(--green); color: #000; }
  .success-link {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 14px; margin-bottom: 22px; text-align: left;
  }
  .sl-label { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: var(--text-muted); margin-bottom: 4px; }
  .sl-url { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--cyan); word-break: break-all; }
  .success-actions { display: flex; flex-direction: column; gap: 10px; }
  .sac-primary { width: 100%; padding: 13px; background: var(--green); color: #000; border: none; border-radius: 9px; font-weight: 800; font-size: 0.95rem; cursor: pointer; font-family: 'Syne', sans-serif; }
  .sac-row { display: flex; gap: 10px; }
  .sac-secondary { flex: 1; padding: 11px; background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 9px; font-weight: 700; font-size: 0.85rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: border-color 0.15s; }
  .sac-secondary:hover { border-color: var(--border2); }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
`;

const FALLBACK_QUESTIONS = [
  { _id: "q1", tag: "Easy", title: "Two Sum", sampletcs: 2, hiddentcs: 4, timelimit: 2 },
  { _id: "q2", tag: "Easy", title: "Valid Parentheses", sampletcs: 1, hiddentcs: 3, timelimit: 2 },
  { _id: "q3", tag: "Medium", title: "Merge Intervals", sampletcs: 1, hiddentcs: 3, timelimit: 2 },
  { _id: "q4", tag: "Medium", title: "3Sum", sampletcs: 2, hiddentcs: 5, timelimit: 2 },
  { _id: "q5", tag: "Hard", title: "LRU Cache", sampletcs: 1, hiddentcs: 4, timelimit: 1 },
  { _id: "q6", tag: "Hard", title: "Word Search II", sampletcs: 1, hiddentcs: 3, timelimit: 2 },
];

const PRESET_DURATIONS = [15, 30, 45, 60, 90, 120];
const DIFF_MAP = { Easy: "qd-easy", Medium: "qd-med", Hard: "qd-hard" };

export default function CreateRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode: "interview" | "practice"
  const [mode, setMode] = useState("interview");

  // Timer: "unlimited" | "timed"
  const [timerType, setTimerType] = useState("unlimited");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isCustomDur, setIsCustomDur] = useState(false);
  const [customDurInput, setCustomDurInput] = useState("60");

  const [roomName, setRoomName] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [qSearch, setQSearch] = useState("");
  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [publicQuestions, setPublicQuestions] = useState([]);
  const [qSourceFilter, setQSourceFilter] = useState("all"); // "all" | "my" | "public"
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await api("get", "question/bank/all");
        const pub = (res.data.data?.publicQuestions || []).map(q => ({ ...q, isMine: false }));
        const mine = (res.data.data?.myQuestions || []).map(q => ({ ...q, isMine: true }));
        
        // Merge without duplicating IDs
        const seen = new Set();
        const combined = [];
        for (const q of [...mine, ...pub]) {
          if (!seen.has(q._id)) {
            seen.add(q._id);
            combined.push(q);
          }
        }
        setPublicQuestions(combined.length > 0 ? combined : FALLBACK_QUESTIONS);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
        try {
          const pubRes = await api("get", "question/public");
          setPublicQuestions(pubRes.data.questions || FALLBACK_QUESTIONS);
        } catch {
          setPublicQuestions(FALLBACK_QUESTIONS);
        }
      }
    };
    fetchQuestions();
  }, []);

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const isTimed = timerType === "timed";
      const actualDuration = isTimed
        ? (isCustomDur ? Math.max(1, parseInt(customDurInput, 10) || 60) : durationMinutes)
        : null;

      const defaultName = mode === "practice" ? "Solo Practice Session" : "Interview Room";

      const res = await api("post", "room/new", {
        name: roomName.trim() || defaultName,
        questionIds: [...selectedQuestions],
        mode,
        isTimed,
        durationMinutes: actualDuration
      });

      setRoomId(res.data.roomID);
      setSuccess(true);
    } catch (err) {
      console.error("Room creation failed:", err);
      alert("Failed to create room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleQuestion = (id) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearQuestions = () => setSelectedQuestions(new Set());

  const filteredQ = publicQuestions.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(qSearch.toLowerCase());
    const matchSource =
      qSourceFilter === "all" ? true :
      qSourceFilter === "my" ? q.isMine :
      !q.isMine;
    return matchSearch && matchSource;
  });

  const copyRoomId = () => {
    navigator.clipboard?.writeText(roomId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteLink = `${import.meta.env.VITE_FRONTEND_URL || window.location.origin}/code/${roomId}`;
  const selectedQList = publicQuestions.filter(q => selectedQuestions.has(q._id));

  const effectiveDuration = isCustomDur ? (parseInt(customDurInput, 10) || 60) : durationMinutes;

  return (
    <>
      <style>{css}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo" onClick={() => navigate("/dashboard")}>Code<span>Bridge</span></div>
        <div className="sep" />
        <div className="breadcrumb">Dashboard <span>›</span> <b>Create Room</b></div>
        <div className="spacer" />
        <button className="back-btn" onClick={() => navigate("/dashboard")}>← Back to Dashboard</button>
      </div>

      <div className="page">
        {/* PAGE HEADER */}
        <div className="page-header">
          <div className="page-title">
            {mode === "practice" ? "Create Practice Room" : "Create Interview Room"}
          </div>
          <div className="page-sub">
            {mode === "practice"
              ? "Distraction-free individual workspace to solve algorithm problems and sharpen your skills"
              : "1-on-1 collaborative environment with video call, real-time code sync & proctoring"}
          </div>
        </div>

        {/* ── LEFT COL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 1. ROOM MODE SELECTOR */}
          <div className="form-card">
            <div className="form-card-header">
              <span className="fch-icon">🎯</span>
              <span className="fch-title">1. Choose Room Type</span>
            </div>
            <div className="form-card-body">
              <div className="option-grid">
                {/* Interview Option */}
                <div
                  className={`option-card ${mode === "interview" ? "active-interview" : ""}`}
                  onClick={() => setMode("interview")}
                >
                  <div className="opt-icon-row">
                    <span className="opt-icon">👥</span>
                    <span className="opt-badge" style={{ background: "rgba(88,212,245,0.15)", color: "var(--cyan)" }}>Collaborative</span>
                  </div>
                  <div className="opt-title" style={{ color: mode === "interview" ? "var(--cyan)" : "var(--text)" }}>Interview Mode</div>
                  <div className="opt-desc">
                    1-on-1 session with live video/audio, screen sharing, chat, and candidate proctoring.
                  </div>
                </div>

                {/* Practice Option */}
                <div
                  className={`option-card ${mode === "practice" ? "active-practice" : ""}`}
                  onClick={() => setMode("practice")}
                >
                  <div className="opt-icon-row">
                    <span className="opt-icon">🧑‍💻</span>
                    <span className="opt-badge" style={{ background: "rgba(57,211,83,0.15)", color: "var(--green)" }}>Solo Practice</span>
                  </div>
                  <div className="opt-title" style={{ color: mode === "practice" ? "var(--green)" : "var(--text)" }}>Practice Mode</div>
                  <div className="opt-desc">
                    Individual workspace. No video or candidate screens — just you, the code editor, and testcases.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. TIMER & PERSISTENCE CONFIGURATION */}
          <div className="form-card">
            <div className="form-card-header">
              <span className="fch-icon">⏱️</span>
              <span className="fch-title">2. Session Duration & Expiry</span>
            </div>
            <div className="form-card-body">
              <div className="option-grid">
                {/* Not Timed */}
                <div
                  className={`option-card ${timerType === "unlimited" ? "active-unlimited" : ""}`}
                  onClick={() => setTimerType("unlimited")}
                >
                  <div className="opt-icon-row">
                    <span className="opt-icon">♾️</span>
                    <span className="opt-badge" style={{ background: "rgba(192,132,252,0.15)", color: "var(--violet)" }}>Unlimited</span>
                  </div>
                  <div className="opt-title" style={{ color: timerType === "unlimited" ? "var(--violet)" : "var(--text)" }}>Not Timed</div>
                  <div className="opt-desc">
                    Room persists until you manually end or close the session. No time limit.
                  </div>
                </div>

                {/* Timed Session */}
                <div
                  className={`option-card ${timerType === "timed" ? "active-timed" : ""}`}
                  onClick={() => setTimerType("timed")}
                >
                  <div className="opt-icon-row">
                    <span className="opt-icon">⏳</span>
                    <span className="opt-badge" style={{ background: "rgba(240,168,48,0.15)", color: "var(--amber)" }}>Auto-Close</span>
                  </div>
                  <div className="opt-title" style={{ color: timerType === "timed" ? "var(--amber)" : "var(--text)" }}>Timed Session</div>
                  <div className="opt-desc">
                    Room auto-expires and closes automatically once the timer duration runs out.
                  </div>
                </div>
              </div>

              {/* Duration Options when Timed is selected */}
              {timerType === "timed" && (
                <div style={{ marginTop: 14, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <div className="field-label" style={{ color: "var(--amber)" }}>
                    Select Duration:
                  </div>
                  <div className="dur-opts">
                    {PRESET_DURATIONS.map(mins => (
                      <div
                        key={mins}
                        className={`dur-opt ${!isCustomDur && durationMinutes === mins ? "active" : ""}`}
                        onClick={() => {
                          setIsCustomDur(false);
                          setDurationMinutes(mins);
                        }}
                      >
                        {mins} min
                      </div>
                    ))}
                    <div
                      className={`dur-opt ${isCustomDur ? "active" : ""}`}
                      onClick={() => setIsCustomDur(true)}
                    >
                      Custom ✎
                    </div>
                  </div>

                  {isCustomDur && (
                    <div className="custom-dur-row">
                      <input
                        className="custom-dur-input"
                        type="number"
                        min="1"
                        max="1440"
                        value={customDurInput}
                        onChange={e => setCustomDurInput(e.target.value)}
                        placeholder="Minutes"
                      />
                      <span className="custom-dur-label">minutes (Room will close after this time)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. ROOM DETAILS */}
          <div className="form-card">
            <div className="form-card-header">
              <span className="fch-icon">🏷️</span>
              <span className="fch-title">3. Room Details</span>
            </div>
            <div className="form-card-body">
              <div className="field">
                <div className="field-label">Room Title</div>
                <input
                  className="field-input"
                  placeholder={mode === "practice" ? "e.g. Dynamic Programming Practice" : "e.g. Frontend Engineering Round – Round 1"}
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                />
                <div className="field-hint">
                  {mode === "practice"
                    ? "Give your practice session a memorable name."
                    : "Helps you identify this interview in your dashboard."}
                </div>
              </div>
            </div>
          </div>

          {/* 4. SELECT QUESTIONS */}
          <div className="form-card">
            <div className="form-card-header">
              <span className="fch-icon">📋</span>
              <span className="fch-title">4. Select Practice / Interview Questions</span>
              {selectedQuestions.size > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--green)", color: "#000", borderRadius: "10px", padding: "2px 10px", fontSize: "0.7rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                  {selectedQuestions.size} selected
                </span>
              )}
            </div>
            <div className="form-card-body">
              {selectedQuestions.size > 0 && (
                <div className="q-selected-bar">
                  <span className="q-selected-count">✓ {selectedQuestions.size} question{selectedQuestions.size !== 1 ? "s" : ""} selected</span>
                  <button className="q-clear-btn" onClick={clearQuestions}>✕ Clear all</button>
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                <button
                  type="button"
                  onClick={() => setQSourceFilter("all")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: qSourceFilter === "all" ? "var(--green)" : "var(--border)",
                    background: qSourceFilter === "all" ? "var(--green-dim)" : "var(--surface2)",
                    color: qSourceFilter === "all" ? "var(--green)" : "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  All ({publicQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQSourceFilter("my")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: qSourceFilter === "my" ? "var(--cyan)" : "var(--border)",
                    background: qSourceFilter === "my" ? "var(--cyan-dim)" : "var(--surface2)",
                    color: qSourceFilter === "my" ? "var(--cyan)" : "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  👤 My Questions ({publicQuestions.filter(q => q.isMine).length})
                </button>
                <button
                  type="button"
                  onClick={() => setQSourceFilter("public")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: qSourceFilter === "public" ? "var(--amber)" : "var(--border)",
                    background: qSourceFilter === "public" ? "var(--amber-dim)" : "var(--surface2)",
                    color: qSourceFilter === "public" ? "var(--amber)" : "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  🌐 Public Bank ({publicQuestions.filter(q => !q.isMine).length})
                </button>
              </div>

              <div className="q-search-wrap">
                <span className="q-search-icon">⌕</span>
                <input
                  className="q-search-input"
                  placeholder="Search questions by title..."
                  value={qSearch}
                  onChange={e => setQSearch(e.target.value)}
                />
              </div>
              <div className="q-list">
                {filteredQ.length === 0 && (
                  <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                    No questions found in this category.
                  </div>
                )}
                {filteredQ.map(q => (
                  <div
                    key={q._id}
                    className={`q-row ${selectedQuestions.has(q._id) ? "selected" : ""}`}
                    onClick={() => toggleQuestion(q._id)}
                  >
                    <span className={`q-diff ${DIFF_MAP[q.tag] || "qd-easy"}`}>{q.tag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="q-title">{q.title}</div>
                        {q.isMine && (
                          <span style={{ fontSize: "0.6rem", background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid rgba(88,212,245,0.3)", borderRadius: "4px", padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                            👤 My Question
                          </span>
                        )}
                      </div>
                      <div className="q-meta">
                        <span>⏱ {q.timelimit || 2}s</span>
                        <span>📋 {Array.isArray(q.sampletcs) ? q.sampletcs.length : (q.sampletcs || 0)} sample</span>
                        <span>🔒 {Array.isArray(q.hiddentcs) ? q.hiddentcs.length : (q.hiddentcs || 0)} hidden</span>
                      </div>
                    </div>
                    <div className="q-check">
                      <div className="q-check-inner">✓</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT COL: PREVIEW ── */}
        <div className="preview-col">
          <div className="preview-card">
            <div className="preview-header">
              <span className="preview-title">// Room Summary</span>
              <span className={`preview-badge ${mode === "practice" ? "pb-practice" : "pb-interview"}`}>
                {mode === "practice" ? "🧑‍💻 Practice" : "👥 Interview"}
              </span>
            </div>

            <div className="preview-body">
              {/* Room Title */}
              <div className="prow">
                <div className="prow-label">Room Title</div>
                <div className={`prow-val ${!roomName ? "empty" : ""}`}>
                  {roomName || (mode === "practice" ? "Solo Practice Session" : "Interview Room")}
                </div>
              </div>

              {/* Mode */}
              <div className="prow">
                <div className="prow-label">Mode</div>
                <div className="prow-val" style={{ color: mode === "practice" ? "var(--green)" : "var(--cyan)" }}>
                  {mode === "practice" ? "Solo Practice (No Video/Screens)" : "1-on-1 Live Interview"}
                </div>
              </div>

              {/* Timer */}
              <div className="prow">
                <div className="prow-label">Session Duration</div>
                <div className="prow-val" style={{ color: timerType === "timed" ? "var(--amber)" : "var(--text-muted)" }}>
                  {timerType === "timed" ? `⏱ ${effectiveDuration} minutes (Auto-closes)` : "♾️ Not Timed (Unlimited)"}
                </div>
              </div>

              <div className="preview-divider" />

              {/* Selected questions list */}
              <div className="prow">
                <div className="prow-label">
                  Assigned Questions
                  {selectedQList.length > 0 && (
                    <span style={{ marginLeft: 6, background: "var(--green)", color: "#000", borderRadius: "8px", padding: "1px 7px", fontSize: "0.6rem", fontWeight: 800 }}>
                      {selectedQList.length}
                    </span>
                  )}
                </div>
                {selectedQList.length === 0 ? (
                  <div className="prow-val empty">— none selected (optional) —</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                    {selectedQList.map((q, idx) => (
                      <div key={q._id} className="prev-q-badge" style={{ justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "var(--text-muted)", minWidth: "16px" }}>
                            {idx + 1}.
                          </span>
                          <span className={`q-diff ${DIFF_MAP[q.tag] || "qd-easy"}`} style={{ fontSize: "0.58rem", padding: "1px 6px" }}>{q.tag}</span>
                          <span className="prev-q-badge-title" style={{ fontSize: "0.78rem" }}>{q.title}</span>
                        </div>
                        <button
                          onClick={() => toggleQuestion(q._id)}
                          style={{ background: "transparent", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, padding: "0 4px", flexShrink: 0 }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="create-btn-wrap">
              <button
                className={`create-btn ${mode === "practice" ? "btn-practice" : "btn-interview"}`}
                onClick={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? "Setting Up Room..." : "⚙️ Add / Remove Questions →"}
              </button>
            </div>
            <div className="create-btn-sub">
              {timerType === "timed"
                ? <>Session duration: <b style={{ color: "var(--amber)" }}>{effectiveDuration} min</b> · Timer only starts when you launch the session</>
                : <>Persistent room · closes manually when session ends</>}
            </div>
          </div>
        </div>
      </div>

      {/* ── SUCCESS OVERLAY ── */}
      {success && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="success-icon">{mode === "practice" ? "🧑‍💻" : "🚀"}</div>
            <div className="success-title">
              {mode === "practice" ? "Practice Room Created!" : "Interview Room Created!"}
            </div>
            <div className="success-sub">
              {mode === "practice"
                ? "Configure your questions first in the Question Manager. Your session timer will only start once you launch the room."
                : "Configure your questions, or share the Room ID with the candidate. The session timer starts when the room is launched."}
            </div>

            <div className="room-id-display">
              <div className="rid-label">Room ID</div>
              <div className="rid-value">{roomId}</div>
              <button className="copy-btn" onClick={copyRoomId}>
                {copied ? "✓ Copied" : "⊕ Copy"}
              </button>
            </div>

            {mode === "interview" && (
              <div className="success-link">
                <div className="sl-label">Candidate Invite Link</div>
                <div className="sl-url">{inviteLink}</div>
              </div>
            )}

            <div className="success-actions">
              <button onClick={() => navigate(`/manage/${roomId}`)} className="sac-primary">
                ⚙️ Add / Manage Questions →
              </button>
              <div className="sac-row">
                <button className="sac-secondary" onClick={() => navigate(`/code/${roomId}`)}>
                  🚀 Launch Room Now
                </button>
                <button className="sac-secondary" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}