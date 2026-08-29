import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/authContext";
import ImportQuestionsModal from "../components/ImportQuestionsModal.jsx";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080c10; --surface: #0d1117; --surface2: #161b22; --surface3: #1c2128;
    --border: #21262d; --border2: #30363d;
    --green: #39d353; --green-dim: #1a4d2a; --cyan: #58d4f5;
    --amber: #f0a830; --text: #e6edf3; --text-muted: #7d8590; --red: #f85149;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }
  
  /* SIDEBAR */
  .dash-layout { display: flex; min-height: 100vh; }
  .sidebar {
    width: 220px; flex-shrink: 0; background: var(--surface);
    border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 0;
    position: sticky; top: 0; height: 100vh;
  }
  .sidebar-logo { font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; color: var(--green); padding: 0 20px 24px; border-bottom: 1px solid var(--border); }
  .sidebar-logo span { color: var(--text-muted); }
  .sidebar-nav { padding: 20px 12px; flex: 1; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 600;
    color: var(--text-muted); transition: all 0.15s; margin-bottom: 2px;
  }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active { background: var(--green-dim); color: var(--green); }
  .nav-icon { font-size: 1rem; }
  .sidebar-user { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
  .user-ava { width: 34px; height: 34px; border-radius: 50%; background: var(--green-dim); border: 1px solid var(--green); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--green); }
  .user-info-name { font-size: 0.8rem; font-weight: 700; }
  .user-info-role { font-size: 0.7rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }

  /* MAIN */
  .dash-main { flex: 1; padding: 40px; overflow-y: auto; }
  .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .dash-title { font-size: 2rem; font-weight: 800; letter-spacing: -1px; }
  .dash-sub { color: var(--text-muted); font-size: 0.875rem; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
  .btn-new { background: var(--green); color: #000; padding: 11px 24px; border-radius: 8px; font-weight: 800; font-size: 0.875rem; cursor: pointer; border: none; font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .btn-new:hover { box-shadow: 0 0 20px rgba(57,211,83,0.3); }

  /* STATS ROW */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 24px; }
  .stat-card-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; }
  .stat-card-num { font-size: 2rem; font-weight: 800; letter-spacing: -1px; font-family: 'JetBrains Mono', monospace; }
  .stat-card-change { font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
  .stat-card-change.up { color: var(--green); }

  /* SESSIONS TABLE */
  .section-title { font-size: 1.1rem; font-weight: 800; margin-bottom: 16px; }
  .sessions-table { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 32px; }
  .table-header { display: grid; grid-template-columns: 1fr 1.5fr 3fr 1fr 100px; gap: 0; padding: 12px 20px; border-bottom: 1px solid var(--border); }
  .th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
  .table-row { display: grid; grid-template-columns: 1fr 1.5fr 3fr 1fr 100px; gap: 0; padding: 16px 20px; border-bottom: 1px solid var(--border); align-items: center; transition: background 0.15s; cursor: pointer; }
  .table-row:last-child { border-bottom: none; }
  .table-row:hover { background: var(--surface2); }
  .td-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; }
  .td-muted { color: var(--text-muted); }
  .status-pill { display: inline-block; padding: 3px 10px; border-radius: 100px; font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 700; }
  .sp-live { background: rgba(57,211,83,0.15); color: var(--green); }
  .sp-done { background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border); }
  .sp-scheduled { background: rgba(88,212,245,0.1); color: var(--cyan); }
  .verdict-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .vd-pass { background: var(--green); }
  .vd-fail { background: var(--red); }
  .vd-none { background: var(--text-muted); }
  .join-btn { padding: 6px 14px; background: var(--green); color: #000; border: none; border-radius: 6px; font-weight: 800; font-size: 0.72rem; cursor: pointer; font-family: 'Syne', sans-serif; }
  .view-btn { padding: 6px 14px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: 6px; font-weight: 700; font-size: 0.72rem; cursor: pointer; font-family: 'Syne', sans-serif; }

  /* CREATE MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 40px; width: 480px; }
  .modal-title { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
  .modal-sub { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 32px; font-family: 'JetBrains Mono', monospace; }
  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-size: 0.72rem; font-weight: 700; margin-bottom: 7px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'JetBrains Mono', monospace; }
  .form-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 11px 14px; border-radius: 7px; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; outline: none; transition: border-color 0.2s; }
  .form-input:focus { border-color: var(--green); }
  .form-select { appearance: none; }
  .modal-actions { display: flex; gap: 12px; margin-top: 28px; }
  .modal-cancel { flex: 1; padding: 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-weight: 700; font-family: 'Syne', sans-serif; }
  .modal-create { flex: 1; padding: 12px; background: var(--green); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 800; font-family: 'Syne', sans-serif; }

  /* QUESTION BANK */
  .qbank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .qcard { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; transition: border-color 0.15s; cursor: pointer; }
  .qcard:hover { border-color: var(--border2); }
  .qcard-diff { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700; margin-bottom: 8px; }
  .qd-easy { color: var(--green); }
  .qd-med { color: var(--amber); }
  .qd-hard { color: var(--red); }
  .qcard-title { font-size: 0.875rem; font-weight: 700; margin-bottom: 6px; }
  .qcard-tag { display: inline-block; background: var(--surface2); border: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: var(--text-muted); padding: 2px 8px; border-radius: 4px; margin-right: 4px; }
`;

const sessions = [
  { id: "#4f2a", candidate: "Rahul Sharma", problem: "Two Sum", status: "live", verdict: "—", date: "Now" },
  { id: "#3e1b", candidate: "Priya Patel", problem: "Valid Parentheses", status: "done", verdict: "pass", date: "Today, 2:30pm" },
  { id: "#2d0c", candidate: "Arjun Singh", problem: "Merge Intervals", status: "done", verdict: "fail", date: "Today, 11am" },
  { id: "#1c9a", candidate: "Sneha Gupta", problem: "LRU Cache", status: "scheduled", verdict: "—", date: "Tomorrow, 10am" },
];

const questions = [
  { title: "Two Sum", diff: "Easy", tags: ["Array","HashMap"] },
  { title: "Valid Parentheses", diff: "Easy", tags: ["Stack","String"] },
  { title: "Merge Intervals", diff: "Medium", tags: ["Array","Sort"] },
  { title: "LRU Cache", diff: "Medium", tags: ["Design","HashMap"] },
  { title: "Word Search II", diff: "Hard", tags: ["Trie","DFS"] },
  { title: "Median of Two Sorted Arrays", diff: "Hard", tags: ["Binary Search"] },
];

const renderRoomQuestions = (room) => {
  // Build question list — prefer populated room.questions, fallback to currentQuestion
  let roomQuestions = [...(room.questions || [])];
  if (roomQuestions.length === 0 && room.currentQuestion) {
    roomQuestions = [room.currentQuestion];
  }

  if (roomQuestions.length === 0) {
    return <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No questions assigned</span>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {roomQuestions.map((q) => {
        const qId = (q._id || q).toString();
        const qTitle = q.title || "Unknown";

        const candidateSubmissions = (room.submissions || []).filter((s) => {
          const sQId = (s.question?._id || s.question || "").toString();
          return sQId === qId;
        });

        const solvedSub = candidateSubmissions.find((s) => s.verdict === "AC");

        if (solvedSub) {
          return (
            <div key={qId} style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="td-mono" style={{ color: "var(--text)" }}>{qTitle}</span>
              <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "0.75rem" }}>✓ Solved</span>
              <span className="qcard-tag" style={{ margin: 0, padding: "1px 6px", fontSize: "0.6rem", color: "var(--green)", borderColor: "var(--green)" }}>
                {solvedSub.language || "C++"}
              </span>
            </div>
          );
        } else {
          const attempted = candidateSubmissions.length > 0;
          return (
            <div key={qId} style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="td-mono" style={{ color: "var(--text-muted)" }}>{qTitle}</span>
              {attempted ? (
                <span style={{ color: "var(--red)", fontWeight: 700, fontSize: "0.75rem" }}>✕ Attempted</span>
              ) : (
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>○ Unsolved</span>
              )}
            </div>
          );
        }
      })}
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState("Sessions");
  const [showModal, setShowModal] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [qBankTab, setQBankTab] = useState("all"); // "all" | "my" | "public"

  const [rooms, setRooms] = useState([]);
  const [publicQuestions, setPublicQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [roomsRes, bankRes] = await Promise.all([
        api("get", "room/user/all"),
        api("get", "question/bank/all")
      ]);
      setRooms(roomsRes.data.rooms || []);
      const pub = (bankRes.data.data?.publicQuestions || []).map(q => ({ ...q, isMine: false }));
      const mine = (bankRes.data.data?.myQuestions || []).map(q => ({ ...q, isMine: true }));
      const seen = new Set();
      const combined = [];
      for (const q of [...mine, ...pub]) {
        if (!seen.has(q._id)) {
          seen.add(q._id);
          combined.push(q);
        }
      }
      setPublicQuestions(combined.length > 0 ? combined : questions.map(q => ({
        _id: q.title,
        title: q.title,
        tag: q.diff,
        timelimit: 2,
        sampletcs: [],
        isMine: false
      })));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setPublicQuestions(questions.map(q => ({
        _id: q.title,
        title: q.title,
        tag: q.diff,
        timelimit: 2,
        sampletcs: [],
        isMine: false
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserQuestion = async (id) => {
    if (!window.confirm("Delete this question from your personal library?")) return;
    try {
      await api("delete", `question/${id}`);
      setPublicQuestions(prev => prev.filter(q => q._id !== id));
    } catch (err) {
      console.error("Failed to delete question:", err);
      alert("Failed to delete question.");
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const userInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("")
    : "U";

  return (
    <>
      <style>{styles}</style>
      <div className="dash-layout">

        {/* SIDEBAR */}
        <div className="sidebar" style={{cursor:"pointer"}}>
          <div onClick={() => navigate("/")} className="sidebar-logo">Code<span>Bridge</span></div>
          <div className="sidebar-nav">
            {[
              {icon:"⊡",label:"Sessions"},
      
              {icon:"◈",label:"Analytics"},
              {icon:"⊞",label:"Candidates"},
              {icon:"◉",label:"Settings"},
            ].map(n => (
              <div key={n.label} className={`nav-item ${activeNav===n.label?"active":""}`} onClick={()=>setActiveNav(n.label)}>
                <span className="nav-icon">{n.icon}</span>
                {n.label}
              </div>
            ))}
          </div>

          <div style={{ padding: "0 12px 12px" }}>
            <div
              className="nav-item"
              onClick={logout}
              style={{ color: "var(--red)", border: "1px solid rgba(248,81,73,0.25)", background: "rgba(248,81,73,0.05)" }}
            >
              <span className="nav-icon" style={{ fontSize: "1rem" }}>⎋</span>
              Logout
            </div>
          </div>

          <div className="sidebar-user" onClick={() => navigate("/profile")} style={{ cursor: "pointer", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
              <div className="user-ava">
                {user?.avatar ? (
                  <img src={user.avatar} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} alt="avatar" />
                ) : (
                  userInitials
                )}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div className="user-info-name" style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{user?.name || "User"}</div>
                <div className="user-info-role">{user?.role || "user"}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); logout(); }}
              title="Sign Out"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--red)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="dash-main">
          {activeNav === "Sessions" && <>
            <div className="dash-header">
              <div>
                <div className="dash-title">Interview Sessions</div>
                <div className="dash-sub">$ codebridge --list-sessions</div>
              </div>
              <button className="btn-new" onClick={()=>navigate("/create")}>+ New Session</button>
            </div>

            {/* STATS */}
            <div className="stats-row">
              {[
                {label:"Total Sessions",num:rooms.length,change:"All created rooms",up:true},
                {label:"Pass Rate",num:`${rooms.length > 0 ? Math.round((rooms.filter(r => r.submissions?.some(s => s.verdict === "AC")).length / rooms.length) * 100) : 0}%`,change:"AC on hidden testcases",up:true},
                {label:"Active Now",num:rooms.filter(r => r.status === "active").length,change:"Live interview rooms",up:false},
              ].map((s,i) => (
                <div className="stat-card" key={i}>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-num">{s.num}</div>
                  <div className={`stat-card-change ${s.up?"up":""}`}>{s.change}</div>
                </div>
              ))}
            </div>

            {/* TABLE */}
            <div className="section-title">Recent Sessions</div>
            <div className="sessions-table">
              <div className="table-header">
                <div className="th">Session ID</div>
                <div className="th">Candidate/Interviewer</div>
                <div className="th">Questions & Solved Status</div>
                <div className="th">Status</div>
                <div className="th"></div>
              </div>
              {loading ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>
                  Loading sessions...
                </div>
              ) : rooms.length === 0 ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
                  <div style={{ fontWeight: 700, color: "var(--text)", fontSize: "1rem", marginBottom: "8px" }}>No sessions yet</div>
                  <div>Create a new session to get started</div>
                </div>
              ) : rooms.map((room) => {
                const isPractice = room.mode === "practice";
                const isInterviewer = (room.interviewer?._id || room.interviewer)?.toString() === user?._id?.toString();
                const otherUser = isInterviewer ? room.candidate : room.interviewer;
                const otherUserName = isPractice
                  ? "Solo Practice"
                  : (otherUser?.name || (isInterviewer ? "Waiting for candidate..." : "Interviewer"));
                const displayId = `#${room.roomID.substring(0, 5)}`;
                const statusLabel = room.status === "active" ? "● Live" : "✓ Done";
                const statusClass = room.status === "active" ? "sp-live" : "sp-done";

                return (
                  <div className="table-row" key={room._id} onClick={() => room.status === "active" && navigate(`/code/${room.roomID}`)} style={{ cursor: room.status === "active" ? "pointer" : "default" }}>
                    <div>
                      <div className="td-mono" style={{ color: "var(--cyan)", fontWeight: 700 }}>{displayId}</div>
                      <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                        <span style={{
                          fontSize: "0.6rem",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: isPractice ? "rgba(57,211,83,0.12)" : "rgba(88,212,245,0.12)",
                          color: isPractice ? "var(--green)" : "var(--cyan)",
                          border: `1px solid ${isPractice ? "rgba(57,211,83,0.3)" : "rgba(88,212,245,0.3)"}`
                        }}>
                          {isPractice ? "Practice" : "Interview"}
                        </span>
                        {room.isTimed && (
                          <span style={{
                            fontSize: "0.6rem",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "rgba(240,168,48,0.12)",
                            color: "var(--amber)",
                            border: "1px solid rgba(240,168,48,0.3)"
                          }}>
                            ⏱ {room.durationMinutes}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{otherUserName}</div>
                    <div>{renderRoomQuestions(room)}</div>
                    <div><span className={`status-pill ${statusClass}`}>{statusLabel}</span></div>
                    <div>
                      {room.status === "active" ? (
                        <button className="join-btn" onClick={(e) => { e.stopPropagation(); navigate(`/code/${room.roomID}`); }}>Join →</button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>Expired</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>}

          {activeNav === "Questions" && <>
            <div className="dash-header">
              <div>
                <div className="dash-title">Question Bank</div>
                <div className="dash-sub">$ codebridge --list-problems</div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn-new"
                  style={{
                    background: "var(--surface2)",
                    color: "var(--cyan)",
                    border: "1px solid var(--border2)"
                  }}
                  onClick={() => setImportModalOpen(true)}
                >
                  📁 Import to My Library
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "8px", margin: "16px 0 20px" }}>
              <button
                type="button"
                onClick={() => setQBankTab("all")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: qBankTab === "all" ? "var(--green)" : "var(--border)",
                  background: qBankTab === "all" ? "var(--green-dim)" : "var(--surface2)",
                  color: qBankTab === "all" ? "var(--green)" : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                All ({publicQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => setQBankTab("my")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: qBankTab === "my" ? "var(--cyan)" : "var(--border)",
                  background: qBankTab === "my" ? "var(--cyan-dim)" : "var(--surface2)",
                  color: qBankTab === "my" ? "var(--cyan)" : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                👤 My Library ({publicQuestions.filter(q => q.isMine).length})
              </button>
              <button
                type="button"
                onClick={() => setQBankTab("public")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: qBankTab === "public" ? "var(--amber)" : "var(--border)",
                  background: qBankTab === "public" ? "var(--amber-dim)" : "var(--surface2)",
                  color: qBankTab === "public" ? "var(--amber)" : "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🌐 Public Bank ({publicQuestions.filter(q => !q.isMine).length})
              </button>
            </div>

            <div className="qbank-grid">
              {publicQuestions.filter(q => {
                if (qBankTab === "my") return q.isMine;
                if (qBankTab === "public") return !q.isMine;
                return true;
              }).map((q, i) => (
                <div className="qcard" key={q._id} style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div className={`qcard-diff qd-${(q.tag || "easy").toLowerCase()}`}>{q.tag || "Easy"}</div>
                    {q.isMine && (
                      <span style={{ fontSize: "0.6rem", background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid rgba(88,212,245,0.3)", borderRadius: "4px", padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                        👤 My Library
                      </span>
                    )}
                  </div>
                  <div className="qcard-title" style={{ marginTop: "6px" }}>{q.title}</div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span className="qcard-tag">{q.timelimit || 2}s limit</span>
                      <span className="qcard-tag">{q.sampletcs?.length || 0} sample TCs</span>
                    </div>
                    {q.isMine && (
                      <button
                        onClick={() => handleDeleteUserQuestion(q._id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--red)",
                          fontSize: "0.72rem",
                          fontFamily: "'JetBrains Mono', monospace",
                          cursor: "pointer",
                          fontWeight: 700
                        }}
                      >
                        ✕ del
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>}

          {!["Sessions","Questions"].includes(activeNav) && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:12}}>
              <div style={{fontSize:"3rem"}}>🚧</div>
              <div style={{fontWeight:800,fontSize:"1.2rem"}}>{activeNav} — Coming Soon</div>
              <div style={{color:"var(--text-muted)",fontFamily:"'JetBrains Mono',monospace",fontSize:"0.8rem"}}>This page is under construction.</div>
            </div>
          )}
        </div>

        {/* IMPORT FROM JSON MODAL */}
        <ImportQuestionsModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => fetchDashboardData()}
          qtype="public"
        />

      </div>
    </>
  );
}