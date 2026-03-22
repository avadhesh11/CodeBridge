import { useState, useEffect } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/authContext.jsx";
const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080c10; --surface: #0d1117; --surface2: #161b22; --surface3: #1c2128;
    --border: #21262d; --border2: #30363d;
    --green: #39d353; --green-dim: #1a4d2a;
    --cyan: #58d4f5; --cyan-dim: rgba(88,212,245,0.1);
    --amber: #f0a830; --amber-dim: rgba(240,168,48,0.12);
    --red: #f85149; --red-dim: rgba(248,81,73,0.12);
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

  /* ── HERO BANNER ── */
  .hero-banner {
    height: 160px; position: relative; overflow: hidden;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .hero-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(var(--border) 1px, transparent 1px),
                      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 40px 40px; opacity: 0.5;
  }
  .hero-glow {
    position: absolute; bottom: -60px; left: 120px;
    width: 400px; height: 200px;
    background: radial-gradient(ellipse, rgba(57,211,83,0.1) 0%, transparent 70%);
  }
  .hero-edit-banner {
    position: absolute; top: 12px; right: 16px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 700;
    color: var(--text-muted); background: rgba(13,17,23,0.7); border: 1px solid var(--border);
    padding: 4px 10px; border-radius: 5px; cursor: pointer; transition: all 0.15s; backdrop-filter: blur(4px);
  }
  .hero-edit-banner:hover { color: var(--text); border-color: var(--border2); }

  /* ── PROFILE HEADER ── */
  .profile-header {
    max-width: 1000px; margin: 0 auto;
    padding: 0 32px; position: relative;
  }
  .avatar-wrap {
    position: absolute; top: -52px; left: 32px;
    width: 104px; height: 104px;
  }
  .avatar {
    width: 104px; height: 104px; border-radius: 50%;
    border: 3px solid var(--bg); background: var(--green-dim);
    display: flex; align-items: center; justify-content: center;
    font-size: 2.4rem; font-weight: 800; color: var(--green);
    font-family: 'Syne', sans-serif; cursor: pointer;
    position: relative; overflow: hidden; transition: all 0.2s;
  }
  .avatar:hover .avatar-overlay { opacity: 1; }
  .avatar-overlay {
    position: absolute; inset: 0; background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s; border-radius: 50%;
    font-size: 0.7rem; color: var(--text); font-family: 'JetBrains Mono', monospace; font-weight: 700;
  }
  .avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .online-ring {
    position: absolute; bottom: 6px; right: 6px;
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--green); border: 2px solid var(--bg);
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(57,211,83,0.4)} 50%{box-shadow:0 0 0 5px rgba(57,211,83,0)} }

  .profile-meta { padding-top: 68px; padding-bottom: 20px; display: flex; align-items: flex-end; justify-content: space-between; }
  .profile-name-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .profile-name { font-size: 1.8rem; font-weight: 800; letter-spacing: -1px; }
  .role-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700;
    padding: 3px 10px; border-radius: 5px; background: var(--green-dim);
    color: var(--green); border: 1px solid var(--green);
  }
  .profile-handle { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }
  .profile-bio { font-size: 0.875rem; color: var(--text-muted); max-width: 480px; line-height: 1.6; }
  .edit-profile-btn {
    padding: 9px 22px; background: transparent; color: var(--text);
    border: 1px solid var(--border); border-radius: 8px; font-weight: 700;
    font-size: 0.82rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.15s;
    white-space: nowrap;
  }
  .edit-profile-btn:hover { border-color: var(--border2); }
  .edit-profile-btn.saving { background: var(--green); color: #000; border-color: var(--green); }

  /* ── TABS ── */
  .tabs-bar {
    max-width: 1000px; margin: 0 auto;
    padding: 0 32px; border-bottom: 1px solid var(--border);
    display: flex; gap: 0;
  }
  .tab-btn {
    padding: 12px 20px; font-size: 0.82rem; font-weight: 700;
    color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent;
    transition: all 0.15s; display: flex; align-items: center; gap: 7px;
  }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--text); border-bottom-color: var(--green); }
  .tab-count {
    background: var(--surface2); border: 1px solid var(--border);
    font-family: 'JetBrains Mono', monospace; font-size: 0.62rem;
    padding: 1px 6px; border-radius: 4px; color: var(--text-muted);
  }

  /* ── MAIN CONTENT ── */
  .main {
    max-width: 1000px; margin: 0 auto; padding: 32px;
    display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start;
  }

  /* ── CARDS ── */
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
    margin-bottom: 20px;
  }
  .card-header {
    padding: 16px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); }
  .card-body { padding: 20px; }
  .card-action { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--cyan); cursor: pointer; }
  .card-action:hover { text-decoration: underline; }

  /* ── STATS ── */
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); }
  .stat-cell { background: var(--surface); padding: 20px; text-align: center; }
  .stat-num { font-family: 'JetBrains Mono', monospace; font-size: 1.8rem; font-weight: 700; letter-spacing: -1px; }
  .stat-lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }

  /* ACTIVITY HEATMAP */
  .heatmap-wrap { overflow-x: auto; padding-bottom: 4px; }
  .heatmap { display: flex; gap: 3px; }
  .heatmap-col { display: flex; flex-direction: column; gap: 3px; }
  .hm-cell {
    width: 12px; height: 12px; border-radius: 2px; background: var(--surface2);
    transition: transform 0.1s;
  }
  .hm-cell:hover { transform: scale(1.3); }
  .hm-0 { background: var(--surface2); }
  .hm-1 { background: #1a4d2a; }
  .hm-2 { background: #256e35; }
  .hm-3 { background: #2ea043; }
  .hm-4 { background: var(--green); }
  .heatmap-legend { display: flex; align-items: center; gap: 6px; margin-top: 8px; justify-content: flex-end; }
  .hm-legend-label { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: var(--text-muted); }

  /* SESSION LIST */
  .session-row {
    display: flex; align-items: center; gap: 12px; padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .session-row:last-child { border-bottom: none; }
  .session-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
  .si-pass { background: var(--green-dim); }
  .si-fail { background: var(--red-dim); }
  .si-pending { background: var(--amber-dim); }
  .session-info { flex: 1; }
  .session-name { font-size: 0.875rem; font-weight: 700; margin-bottom: 2px; }
  .session-meta { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--text-muted); display: flex; gap: 10px; }
  .verdict-pill { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700; padding: 3px 9px; border-radius: 5px; }
  .vp-pass    { background: var(--green-dim); color: var(--green); }
  .vp-fail    { background: var(--red-dim); color: var(--red); }
  .vp-pending { background: var(--amber-dim); color: var(--amber); }

  /* EDIT FORM */
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .field:last-child { margin-bottom: 0; }
  .field-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
  .field-input {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    padding: 10px 13px; border-radius: 8px; font-family: 'JetBrains Mono', monospace;
    font-size: 0.82rem; outline: none; transition: border-color 0.2s; width: 100%;
  }
  .field-input:focus { border-color: var(--green); }
  .field-input::placeholder { color: var(--text-muted); }
  .field-textarea { min-height: 80px; resize: vertical; line-height: 1.6; }
  .field-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* RIGHT SIDEBAR */
  .sidebar-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
  .sc-header { padding: 14px 18px; border-bottom: 1px solid var(--border); }
  .sc-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); }
  .sc-body { padding: 18px; }

  /* INFO LIST */
  .info-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
  .info-row:last-child { margin-bottom: 0; }
  .info-icon { font-size: 0.9rem; margin-top: 1px; flex-shrink: 0; width: 18px; text-align: center; }
  .info-text { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }
  .info-text b { color: var(--text); }

  /* SKILL TAGS */
  .skill-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-tag {
    font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 700;
    padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--surface2); color: var(--text-muted); cursor: default;
    transition: all 0.15s;
  }
  .skill-tag:hover { border-color: var(--green); color: var(--green); background: var(--green-dim); }

  /* DANGER ZONE */
  .danger-zone { border-color: rgba(248,81,73,0.3) !important; }
  .danger-zone .card-title { color: var(--red) !important; }
  .danger-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .danger-row:last-child { border-bottom: none; }
  .danger-label { font-size: 0.875rem; font-weight: 700; }
  .danger-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--text-muted); margin-top: 3px; }
  .danger-btn { padding: 7px 16px; border-radius: 7px; font-weight: 700; font-size: 0.78rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.15s; }
  .danger-btn-mild { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
  .danger-btn-mild:hover { color: var(--red); border-color: var(--red); }
  .danger-btn-hard { background: var(--red-dim); color: var(--red); border: 1px solid rgba(248,81,73,0.3); }
  .danger-btn-hard:hover { background: rgba(248,81,73,0.25); }

  /* TOAST */
  .toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 300;
    background: var(--green-dim); border: 1px solid var(--green); color: var(--green);
    padding: 12px 20px; border-radius: 9px; font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; gap: 8px;
    animation: slideUp 0.3s ease; box-shadow: 0 0 24px rgba(57,211,83,0.2);
  }
  @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
`;

// ── helpers ────────────────────────────────────────────────────
const SESSIONS = [
  { name: "Rahul Sharma",   problem: "Two Sum",          verdict: "pass",    date: "Today, 3:10 PM",     dur: "52 min" },
  { name: "Priya Patel",    problem: "Valid Parentheses", verdict: "pass",    date: "Today, 11:20 AM",    dur: "38 min" },
  { name: "Arjun Singh",    problem: "Merge Intervals",   verdict: "fail",    date: "Yesterday",           dur: "61 min" },
  { name: "Sneha Gupta",    problem: "LRU Cache",         verdict: "pending", date: "Tomorrow, 10:00 AM", dur: "60 min" },
  { name: "Dev Malhotra",   problem: "3Sum",              verdict: "fail",    date: "Dec 18",              dur: "47 min" },
];

const SKILLS = ["C++", "Algorithms", "Data Structures", "System Design", "React", "Node.js", "MongoDB", "Docker"];

const verdictIcon = { pass: "✓", fail: "✕", pending: "◌" };
const verdictIconBg = { pass: "si-pass", fail: "si-fail", pending: "si-pending" };

// generate a simple heatmap dataset (52 weeks × 7 days)
const heatmapData = Array.from({ length: 52 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const r = Math.random();
    if (w > 45) return r < 0.5 ? Math.floor(r * 5) : 0;
    return r < 0.3 ? 0 : Math.floor(Math.random() * 5);
  })
);

export default function ProfilePage() {
  const [tab, setTab]       = useState("overview");
  const [editing, setEditing] = useState(false);
  const [toast, setToast]   = useState(false);

  const navigate=useNavigate();
const {user}=useAuth();
// if(!user){
//   navigate("/login");
// }



  const [profile, setProfile] = useState({
   Name:      "",
    handle:  "",
    email:    "",
    company:   "TechCorp India",
    location:  "Bangalore, India",
    bio:       "Senior engineer & technical interviewer. Building CodeBridge to make hiring easier.",
  });
useEffect(()=>{
  if(user){
    setProfile(p => ({
      ...p,
      Name: user?.name,
      handle: user?.name,
      email: user?.email
    }));
  }
},[user]);


  const [draft, setDraft] = useState({ ...profile });
useEffect(()=>{
  setDraft(profile);
},[profile]);
const initials = profile.Name
  ? profile.Name.split(" ").map(n => n[0]).join("")
  : "";

  const saveProfile = () => {
    setProfile({ ...draft });
    setEditing(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const upd = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const totalSessions = SESSIONS.length;
  const passed        = SESSIONS.filter(s => s.verdict === "pass").length;
  const passRate      = Math.round((passed / totalSessions) * 100);

  return (
    <>
      <style>{css}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo">Code<span>Bridge</span></div>
        <div className="sep" />
        <div className="breadcrumb">Dashboard <span>›</span> <b>Profile</b></div>
        <div className="spacer" />
        <button className="back-btn">← Dashboard</button>
      </div>

      {/* HERO BANNER */}
      <div className="hero-banner">
        <div className="hero-grid" />
        <div className="hero-glow" />
        <button className="hero-edit-banner">⊞ Edit Banner</button>
      </div>

      {/* PROFILE HEADER */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="profile-header">
          <div className="avatar-wrap">
            <div className="avatar">
              {initials}
              <div className="avatar-overlay">📷 Change</div>
            </div>
            <div className="online-ring" />
          </div>

          <div className="profile-meta">
            <div>
              <div className="profile-name-row">
                <div className="profile-name">{profile.Name} </div>
              </div>
              <div className="profile-handle">@{profile.handle}</div>
              <div className="profile-bio">{profile.bio}</div>
            </div>
            <button
              className={`edit-profile-btn ${editing ? "saving" : ""}`}
              onClick={() => editing ? saveProfile() : setEditing(true)}
            >
              {editing ? "✓ Save Changes" : "✎ Edit Profile"}
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs-bar">
          {[
            { id: "overview",  label: "Overview" },
            { id: "sessions",  label: "Sessions",  count: totalSessions },
            { id: "edit",      label: "Edit Profile" },
            { id: "security",  label: "Security" },
          ].map(t => (
            <div
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => { setTab(t.id); if (t.id === "edit") setEditing(true); }}
            >
              {t.label}
              {t.count != null && <span className="tab-count">{t.count}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="main">
          <div>
            {/* Stats */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="stats-grid">
                <div className="stat-cell">
                  <div className="stat-num" style={{ color: "var(--green)" }}>{totalSessions}</div>
                  <div className="stat-lbl">Sessions</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-num" style={{ color: "var(--cyan)" }}>{passed}</div>
                  <div className="stat-lbl">Passed</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-num" style={{ color: "var(--amber)" }}>{passRate}%</div>
                  <div className="stat-lbl">Pass Rate</div>
                </div>
              </div>
            </div>

            {/* Activity heatmap */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">// activity — last 12 months</span>
              </div>
              <div className="card-body">
                <div className="heatmap-wrap">
                  <div className="heatmap">
                    {heatmapData.map((week, wi) => (
                      <div className="heatmap-col" key={wi}>
                        {week.map((val, di) => (
                          <div key={di} className={`hm-cell hm-${val}`} title={`${val} session${val !== 1 ? "s" : ""}`} />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="heatmap-legend">
                    <span className="hm-legend-label">Less</span>
                    {[0,1,2,3,4].map(v => <div key={v} className={`hm-cell hm-${v}`} />)}
                    <span className="hm-legend-label">More</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div>
            <div className="sidebar-card">
              <div className="sc-header"><div className="sc-title">// info</div></div>
              <div className="sc-body">
                <div className="info-row"><div className="info-icon">🏢</div><div className="info-text"><b>{profile.company}</b></div></div>
                <div className="info-row"><div className="info-icon">📍</div><div className="info-text">{profile.location}</div></div>
                <div className="info-row"><div className="info-icon">✉️</div><div className="info-text">{profile.email}</div></div>
                <div className="info-row"><div className="info-icon">🎙️</div><div className="info-text">Role: <b>{profile.role}</b></div></div>
              </div>
            </div>

            <div className="sidebar-card">
              <div className="sc-header"><div className="sc-title">// skills</div></div>
              <div className="sc-body">
                <div className="skill-tags">
                  {SKILLS.map(s => <span className="skill-tag" key={s}>{s}</span>)}
                </div>
              </div>
            </div>

            <div className="sidebar-card">
              <div className="sc-header"><div className="sc-title">// recent sessions</div></div>
              <div className="sc-body" style={{ padding: "0 18px" }}>
                {SESSIONS.slice(0, 3).map((s, i) => (
                  <div className="session-row" key={i}>
                    <div className={`session-icon ${verdictIconBg[s.verdict]}`}>
                      {verdictIcon[s.verdict]}
                    </div>
                    <div className="session-info">
                      <div className="session-name" style={{ fontSize: "0.8rem" }}>{s.name}</div>
                      <div className="session-meta"><span>{s.problem}</span></div>
                    </div>
                    <span className={`verdict-pill vp-${s.verdict}`}>{s.verdict}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SESSIONS TAB ── */}
      {tab === "sessions" && (
        <div className="main" style={{ gridTemplateColumns: "1fr" }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">// all sessions</span>
              <span className="card-action">Export CSV</span>
            </div>
            <div className="card-body" style={{ padding: "0 20px" }}>
              {SESSIONS.map((s, i) => (
                <div className="session-row" key={i}>
                  <div className={`session-icon ${verdictIconBg[s.verdict]}`} style={{ fontSize: "1.1rem" }}>
                    {verdictIcon[s.verdict]}
                  </div>
                  <div className="session-info">
                    <div className="session-name">{s.name}</div>
                    <div className="session-meta">
                      <span>📋 {s.problem}</span>
                      <span>⏱ {s.dur}</span>
                      <span>🗓 {s.date}</span>
                    </div>
                  </div>
                  <span className={`verdict-pill vp-${s.verdict}`}>{s.verdict}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE TAB ── */}
      {tab === "edit" && (
        <div className="main">
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><span className="card-title">// personal info</span></div>
              <div className="card-body">
                <div className="field-row-2">
                  <div className="field">
                    <div className="field-label">Name</div>
                    <input className="field-input" value={draft.Name} onChange={e => upd("Name", e.target.value)} />
                  </div>
                 
                </div>
                <div className="field">
                  <div className="field-label">Username / Handle</div>
                  <input className="field-input" value={draft.handle} onChange={e => upd("handle", e.target.value)} placeholder="@handle" />
                </div>
                <div className="field">
                  <div className="field-label">Bio</div>
                  <textarea className="field-input field-textarea" value={draft.bio} onChange={e => upd("bio", e.target.value)} />
                </div>
                <div className="field-row-2">
                  <div className="field">
                    <div className="field-label">Company</div>
                    <input className="field-input" value={draft.company} onChange={e => upd("company", e.target.value)} />
                  </div>
                  <div className="field">
                    <div className="field-label">Location</div>
                    <input className="field-input" value={draft.location} onChange={e => upd("location", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">// contact</span></div>
              <div className="card-body">
                <div className="field">
                  <div className="field-label">Email Address</div>
                  <input className="field-input" type="email" value={draft.email} onChange={e => upd("email", e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button style={{ padding:"9px 20px", background:"transparent", color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", fontWeight:700, fontFamily:"'Syne',sans-serif" }} onClick={() => { setDraft({...profile}); setTab("overview"); }}>Cancel</button>
              <button style={{ padding:"9px 24px", background:"var(--green)", color:"#000", border:"none", borderRadius:8, cursor:"pointer", fontWeight:800, fontFamily:"'Syne',sans-serif" }} onClick={saveProfile}>Save Changes</button>
            </div>
          </div>

          {/* right: avatar upload */}
          <div>
            <div className="sidebar-card">
              <div className="sc-header"><div className="sc-title">// profile photo</div></div>
              <div className="sc-body" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, paddingTop:24, paddingBottom:24 }}>
                <div className="avatar" style={{ width:80, height:80, fontSize:"1.8rem", cursor:"default" }}>{initials}</div>
                <div style={{ textAlign:"center" }}>
                  <button style={{ padding:"8px 18px", background:"var(--surface3)", border:"1px solid var(--border)", color:"var(--text)", borderRadius:7, cursor:"pointer", fontWeight:700, fontSize:"0.8rem", fontFamily:"'Syne',sans-serif", marginBottom:8, display:"block", width:"100%" }}>⬆ Upload Photo</button>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.65rem", color:"var(--text-muted)", lineHeight:1.5 }}>JPG, PNG or GIF<br/>Max 2MB</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {tab === "security" && (
        <div className="main">
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><span className="card-title">// change password</span></div>
              <div className="card-body">
                <div className="field">
                  <div className="field-label">Current Password</div>
                  <input className="field-input" type="password" placeholder="••••••••••" />
                </div>
                <div className="field-row-2">
                  <div className="field">
                    <div className="field-label">New Password</div>
                    <input className="field-input" type="password" placeholder="Min. 8 characters" />
                  </div>
                  <div className="field">
                    <div className="field-label">Confirm New Password</div>
                    <input className="field-input" type="password" placeholder="••••••••••" />
                  </div>
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
                  <button style={{ padding:"9px 24px", background:"var(--green)", color:"#000", border:"none", borderRadius:8, cursor:"pointer", fontWeight:800, fontFamily:"'Syne',sans-serif" }}>Update Password</button>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><span className="card-title">// active sessions</span></div>
              <div className="card-body" style={{ padding:"0 20px" }}>
                {[
                  { device:"Chrome on macOS", loc:"Bangalore, IN", time:"Now (current)", current:true },
                  { device:"Firefox on Windows", loc:"Mumbai, IN",    time:"2 days ago",   current:false },
                ].map((s, i) => (
                  <div className="session-row" key={i}>
                    <div className="session-icon" style={{ background:"var(--surface2)", fontSize:"1.1rem" }}>💻</div>
                    <div className="session-info">
                      <div className="session-name" style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {s.device}
                        {s.current && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.62rem", background:"var(--green-dim)", color:"var(--green)", border:"1px solid var(--green)", padding:"1px 7px", borderRadius:4 }}>current</span>}
                      </div>
                      <div className="session-meta"><span>📍 {s.loc}</span><span>🕐 {s.time}</span></div>
                    </div>
                    {!s.current && <button className="danger-btn danger-btn-mild">Revoke</button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="card danger-zone">
              <div className="card-header"><span className="card-title">// danger zone</span></div>
              <div className="card-body" style={{ padding:"0 20px" }}>
                <div className="danger-row">
                  <div>
                    <div className="danger-label">Export All Data</div>
                    <div className="danger-sub">Download all your sessions and profile data as JSON.</div>
                  </div>
                  <button className="danger-btn danger-btn-mild">Export</button>
                </div>
                <div className="danger-row">
                  <div>
                    <div className="danger-label">Delete Account</div>
                    <div className="danger-sub">Permanently delete your account and all session data.</div>
                  </div>
                  <button className="danger-btn danger-btn-hard">Delete Account</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="sidebar-card">
              <div className="sc-header"><div className="sc-title">// account info</div></div>
              <div className="sc-body">
                <div className="info-row"><div className="info-icon">🔐</div><div className="info-text">Auth: <b>JWT</b></div></div>
                <div className="info-row"><div className="info-icon">📅</div><div className="info-text">Joined: <b>Jan 2025</b></div></div>
                <div className="info-row"><div className="info-icon">✅</div><div className="info-text">Email: <b>Verified</b></div></div>
                <div className="info-row"><div className="info-icon">🎙️</div><div className="info-text">Role: <b>{profile.role}</b></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">✓ Profile updated successfully</div>}
    </>
  );
}