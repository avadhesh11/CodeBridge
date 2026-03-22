import { useState } from "react";

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
  .table-header { display: grid; grid-template-columns: 1fr 1.5fr 1fr 1fr 1fr 80px; gap: 0; padding: 12px 20px; border-bottom: 1px solid var(--border); }
  .th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
  .table-row { display: grid; grid-template-columns: 1fr 1.5fr 1fr 1fr 1fr 80px; gap: 0; padding: 16px 20px; border-bottom: 1px solid var(--border); align-items: center; transition: background 0.15s; cursor: pointer; }
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

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState("Sessions");
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{styles}</style>
      <div className="dash-layout">

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-logo">Code<span>Bridge</span></div>
          <div className="sidebar-nav">
            {[
              {icon:"⊡",label:"Sessions"},
              {icon:"◧",label:"Questions"},
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
          <div className="sidebar-user">
            <div className="user-ava">IM</div>
            <div>
              <div className="user-info-name">Interviewer</div>
              <div className="user-info-role">interviewer</div>
            </div>
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
              <button className="btn-new" onClick={()=>setShowModal(true)}>+ New Session</button>
            </div>

            {/* STATS */}
            <div className="stats-row">
              {[
                {label:"Total Sessions",num:"24",change:"+3 this week",up:true},
                {label:"Pass Rate",num:"58%",change:"+5% vs last month",up:true},
                {label:"Avg Duration",num:"47m",change:"-3m vs last month",up:true},
                {label:"Active Now",num:"1",change:"1 live session",up:false},
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
                <div className="th">Candidate</div>
                <div className="th">Problem</div>
                <div className="th">Status</div>
                <div className="th">Date</div>
                <div className="th"></div>
              </div>
              {sessions.map((s,i) => (
                <div className="table-row" key={i}>
                  <div className="td-mono" style={{color:"var(--cyan)"}}>{s.id}</div>
                  <div style={{fontSize:"0.875rem",fontWeight:600}}>{s.candidate}</div>
                  <div className="td-mono td-muted">{s.problem}</div>
                  <div><span className={`status-pill ${s.status==="live"?"sp-live":s.status==="scheduled"?"sp-scheduled":"sp-done"}`}>{s.status==="live"?"● Live":s.status==="scheduled"?"◌ Scheduled":"✓ Done"}</span></div>
                  <div className="td-mono td-muted" style={{fontSize:"0.75rem"}}>{s.date}</div>
                  <div>{s.status==="live"?<button className="join-btn">Join →</button>:<button className="view-btn">View</button>}</div>
                </div>
              ))}
            </div>
          </>}

          {activeNav === "Questions" && <>
            <div className="dash-header">
              <div>
                <div className="dash-title">Question Bank</div>
                <div className="dash-sub">$ codebridge --list-problems</div>
              </div>
              <button className="btn-new">+ Add Question</button>
            </div>
            <div className="qbank-grid">
              {questions.map((q,i) => (
                <div className="qcard" key={i}>
                  <div className={`qcard-diff qd-${q.diff.toLowerCase()}`}>{q.diff}</div>
                  <div className="qcard-title">{q.title}</div>
                  <div style={{marginTop:8}}>{q.tags.map(t => <span className="qcard-tag" key={t}>{t}</span>)}</div>
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

        {/* CREATE MODAL */}
        {showModal && (
          <div className="modal-overlay" onClick={()=>setShowModal(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">New Interview Session</div>
              <div className="modal-sub">$ codebridge --create-session</div>
              <div className="form-group">
                <label className="form-label">Candidate Name</label>
                <input className="form-input" placeholder="Enter candidate's name" />
              </div>
              <div className="form-group">
                <label className="form-label">Problem</label>
                <select className="form-input form-select">
                  {questions.map(q => <option key={q.title}>{q.title} ({q.diff})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Scheduled Time (optional)</label>
                <input className="form-input" type="datetime-local" />
              </div>
              <div className="modal-actions">
                <button className="modal-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="modal-create" onClick={()=>setShowModal(false)}>Create Session →</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}