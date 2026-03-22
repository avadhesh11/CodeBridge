import { useState, useEffect,useRef } from "react";
import api from "../utils/api";
import { AuthProvider, useAuth } from "../context/authContext.jsx";
import { useNavigate } from "react-router-dom";
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080c10;
    --surface: #0d1117;
    --surface2: #161b22;
    --border: #21262d;
    --green: #39d353;
    --green-dim: #1a4d2a;
    --cyan: #58d4f5;
    --amber: #f0a830;
    --text: #e6edf3;
    --text-muted: #7d8590;
    --red: #f85149;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; overflow-x: hidden; }

  .home-page { min-height: 100vh; }

  /* NAV */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 48px;
    background: rgba(8,12,16,0.85); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }
  .nav-logo { font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; font-weight: 700; color: var(--green); letter-spacing: -0.5px; }
  .nav-logo span { color: var(--text-muted); }
  .nav-links { display: flex; gap: 32px; align-items: center; }
  .nav-links a { color: var(--text); text-decoration: none; font-size: 0.9rem; font-weight: 600; transition: color 0.2s; }
  .nav-links a:hover { color: var(--text); }
  .nav-cta { background: var(--green); color: #000; padding: 9px 22px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; text-decoration: none; transition: opacity 0.2s; }
  .nav-cta:hover { opacity: 0.85; color: #000; }
.nav-cta-2 { background: var(--green); color: #000; padding: 9px 22px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; text-decoration: none; transition: opacity 0.2s; }
  /* HERO */
  .hero {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 100px 48px 60px;
    position: relative; overflow: hidden;
  }
  .hero-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
    opacity: 0.4;
  }
  .hero-glow {
    position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse, rgba(57,211,83,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-content { position: relative; z-index: 1; text-align: center; max-width: 860px; }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    padding: 6px 14px; border-radius: 100px; margin-bottom: 32px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted);
  }
  .hero-badge-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .hero-title { font-size: clamp(3rem, 7vw, 5.5rem); font-weight: 800; line-height: 1.05; letter-spacing: -2px; margin-bottom: 24px; }
  .hero-title .accent { color: var(--green); }
  .hero-title .accent2 { color: var(--cyan); }
  .hero-sub { font-size: 1.15rem; color: var(--text-muted); line-height: 1.7; max-width: 560px; margin: 0 auto 48px; font-family: 'JetBrains Mono', monospace; font-weight: 300; }
  .hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .btn-primary { background: var(--green); color: #000; padding: 14px 32px; border-radius: 8px; font-weight: 800; font-size: 0.95rem; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; font-family: 'Syne', sans-serif; }
  .btn-primary:hover { box-shadow: 0 0 32px rgba(57,211,83,0.4); transform: translateY(-1px); }
  .btn-secondary { background: transparent; color: var(--text); padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; text-decoration: none; border: 1px solid var(--border); cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .btn-secondary:hover { border-color: var(--text-muted); }
.btn-secondary-2 { background: transparent; color: var(--green); padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; text-decoration: none; border: 1px solid var(--border); cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; }
  /* TERMINAL PREVIEW */
  .terminal-preview {
    max-width: 820px; margin: 80px auto 0; position: relative; z-index: 1;
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  }
  .terminal-bar {
    display: flex; align-items: center; gap: 8px; padding: 12px 16px;
    background: var(--surface2); border-bottom: 1px solid var(--border);
  }
  .t-dot { width: 12px; height: 12px; border-radius: 50%; }
  .t-red { background: #ff5f57; }
  .t-yellow { background: #febc2e; }
  .t-green { background: #28c840; }
  .t-title { flex: 1; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); }
  .terminal-body { display: flex; }
  .t-left { width: 45%; padding: 24px; border-right: 1px solid var(--border); }
  .t-right { width: 55%; padding: 24px; }
  .t-label { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .t-problem-title { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
  .t-problem-desc { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px; }
  .t-tag { display: inline-block; background: var(--green-dim); color: var(--green); font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; padding: 3px 10px; border-radius: 4px; }
  .t-code { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; line-height: 1.8; }
  .t-code .kw { color: #ff7b72; }
  .t-code .fn { color: #d2a8ff; }
  .t-code .cm { color: var(--text-muted); }
  .t-code .str { color: #a5d6ff; }
  .t-code .num { color: #79c0ff; }
  .t-verdict { margin-top: 16px; display: flex; align-items: center; gap: 8px; }
  .verdict-accepted { color: var(--green); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 700; }
  .verdict-time { color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }

  /* STATS */
  .stats { padding: 80px 48px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .stats-grid { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .stat-item { background: var(--surface); padding: 40px; text-align: center; }
  .stat-num { font-size: 3rem; font-weight: 800; color: var(--green); font-family: 'JetBrains Mono', monospace; letter-spacing: -2px; }
  .stat-label { color: var(--text-muted); font-size: 0.85rem; margin-top: 6px; }

  /* FEATURES */
  .features { padding: 100px 48px; }
  .section-label { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--green); text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 16px; }
  .section-title { font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; text-align: center; margin-bottom: 64px; letter-spacing: -1px; }
  .features-grid { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
  .feature-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 32px; transition: border-color 0.2s; }
  .feature-card:hover { border-color: var(--text-muted); }
  .feature-icon { font-size: 1.8rem; margin-bottom: 16px; }
  .feature-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 10px; }
  .feature-desc { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }

  /* HOW IT WORKS */
  .how { padding: 100px 48px; background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .steps { max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
  .step { display: flex; gap: 24px; padding: 32px 0; border-bottom: 1px solid var(--border); }
  .step:last-child { border-bottom: none; }
  .step-num { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--green); font-weight: 700; min-width: 32px; padding-top: 4px; }
  .step-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; }
  .step-desc { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }

  /* CTA */
  .cta-section { padding: 120px 48px; text-align: center; }
  .cta-title { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; letter-spacing: -2px; margin-bottom: 24px; }
  .cta-sub { color: var(--text-muted); font-size: 1rem; margin-bottom: 48px; font-family: 'JetBrains Mono', monospace; }

  /* FOOTER */
  footer { padding: 32px 48px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .footer-logo { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--text-muted); }
  .footer-logo span { color: var(--green); }
  .footer-copy { color: var(--text-muted); font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; }
`;



export default function HomePage({user}) {
  const navigate=useNavigate();
  const scrollref=useRef();
  const [typed, setTyped] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
const [roomCode, setRoomCode] = useState("");
  const fullText = "code_bridge --init";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTyped(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);
const handleJoinRoom = () => {
  if (!roomCode.trim()) {
    alert("Enter room code");
    return;
  }

  navigate(`/code/${roomCode}`);
};
  return (
    <>
      <style>{styles}</style>
      <div className="home-page">
        <nav>
          <div className="nav-logo">Code<span>Bridge</span></div>
          <div className="nav-links">
            <button className="nav-cta" onClick={()=>{
              scrollref.current?.scrollIntoView({behaviour:"smooth", block: 'start'})
            }}>Features</button>
            {user && (
    <button
      className="btn-secondary"
      style={{padding:"8px 16px"}}
      onClick={() => setShowJoinModal(true)}
    >
      Join Room
    </button>
  )}
            {!user ? ( <a href="/login" className="nav-cta">Get Started →</a>):
            (
              <a href="/profile" className="nav-cta" >Profile</a>
            )
            }
           
          </div>
        </nav>

        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-glow" />
          <div className="hero-content">
            <div className="hero-badge">
              <div className="hero-badge-dot" />
              $ {typed}<span style={{animation:"blink 1s infinite", color:"var(--green)"}}>_</span>
            </div>
            <h1 className="hero-title">
              Interview. <span className="accent">Code.</span><br />
              <span className="accent2">Hire Faster.</span>
            </h1>
            <p className="hero-sub">
              Real-time collaborative coding interviews with Docker-powered C++ execution, WebRTC video, and instant verdicts.
            </p>
            <div className="hero-actions">
              <a href="/signup" className="btn-primary">Start Interviewing →</a>
              <a href="/login" className="btn-secondary">Join as Candidate</a>
            </div>
          </div>
        </section>

        {/* Terminal Preview */}
        <div style={{padding:"0 48px"}}>
          <div className="terminal-preview">
            <div className="terminal-bar">
              <div className="t-dot t-red"/><div className="t-dot t-yellow"/><div className="t-dot t-green"/>
              <div className="t-title">codebridge — interview session #4f2a</div>
            </div>
            <div className="terminal-body">
              <div className="t-left">
                <div className="t-label">Problem</div>
                <div className="t-problem-title">Two Sum</div>
                <div className="t-problem-desc">Given an array of integers, return indices of two numbers that add up to target.</div>
                <span className="t-tag">Easy</span>
                <div style={{marginTop:16}}>
                  <div className="t-label">Example</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:"0.75rem", color:"var(--cyan)"}}>
                    Input: [2,7,11,15], 9<br/>
                    Output: [0,1]
                  </div>
                </div>
              </div>
              <div className="t-right">
                <div className="t-label">Solution.cpp</div>
                <div className="t-code">
                  <div><span className="kw">#include</span> <span className="str">&lt;iostream&gt;</span></div>
                  <div><span className="kw">#include</span> <span className="str">&lt;vector&gt;</span></div>
                  <div><span className="kw">#include</span> <span className="str">&lt;unordered_map&gt;</span></div>
                  <div>&nbsp;</div>
                  <div><span className="kw">class</span> <span className="fn">Solution</span> {'{'}</div>
                  <div>&nbsp;&nbsp;<span className="kw">public</span>:</div>
                  <div>&nbsp;&nbsp;vector&lt;<span className="kw">int</span>&gt; <span className="fn">twoSum</span>(</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;vector&lt;<span className="kw">int</span>&gt;&amp; nums, <span className="kw">int</span> target) {'{'}</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;unordered_map&lt;<span className="kw">int</span>,<span className="kw">int</span>&gt; mp;</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">for</span> (<span className="kw">int</span> i=<span className="num">0</span>; i&lt;nums.size(); i++) {'{'}</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">int</span> rem = target - nums[i];</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> (mp.count(rem)) <span className="kw">return</span> {'{'}{'{'}mp[rem],i{'}'}{'}'};</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;mp[nums[i]] = i; {'}'}{'}'}</div>
                </div>
                <div className="t-verdict">
                  <div className="verdict-accepted">✓ Accepted</div>
                  <div className="verdict-time">12ms · 9.2MB</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stats-grid">
            <div className="stat-item"><div className="stat-num">2s</div><div className="stat-label">Execution time limit per test</div></div>
            <div className="stat-item"><div className="stat-num">&lt;200ms</div><div className="stat-label">Real-time code sync latency</div></div>
            <div className="stat-item"><div className="stat-num">100%</div><div className="stat-label">Sandboxed Docker isolation</div></div>
          </div>
        </div>

        {/* Features */}
        <section ref={scrollref} className="features">
          <div className="section-label">// capabilities</div>
          <h2 className="section-title">Everything you need to evaluate engineers</h2>
          <div className="features-grid">
            {[
              { icon: "🐳", title: "Docker-Powered Execution", desc: "C++ code runs inside isolated Docker containers with gcc, full sandbox security, and 2s time limits." },
              { icon: "⚡", title: "Real-Time Collaboration", desc: "Monaco Editor with Socket.io sync — both users see keystrokes instantly under 200ms latency." },
              { icon: "📹", title: "WebRTC Video Calls", desc: "Peer-to-peer video and audio via simple-peer, no third-party service dependency." },
              { icon: "🖥️", title: "Screen Sharing", desc: "Share your screen mid-interview using the browser's native getDisplayMedia API." },
              { icon: "📊", title: "Submission History", desc: "Every run is stored with verdict tracking — Accepted, WA, TLE, Compilation Error." },
              { icon: "🔐", title: "JWT Authentication", desc: "Secure room creation and candidate access with token-based authentication." },
            ].map((f,i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="how">
          <div className="section-label">// workflow</div>
          <h2 className="section-title">How it works</h2>
          <div className="steps">
            {[
              { n: "01", t: "Create an interview room", d: "Interviewer logs in, creates a room, and gets a unique session ID to share with the candidate." },
              { n: "02", t: "Candidate joins via link", d: "Candidate uses the room ID to join — no account needed. Video call starts automatically." },
              { n: "03", t: "Code collaboratively", d: "Both users edit code in real-time in the Monaco Editor. The interviewer selects a problem from the question bank." },
              { n: "04", t: "Run & get instant verdict", d: "Code is compiled with g++ inside Docker, run against test cases, and verdict returned in seconds." },
            ].map((s,i) => (
              <div className="step" key={i}>
                <div className="step-num">{s.n}</div>
                <div>
                  <div className="step-title">{s.t}</div>
                  <div className="step-desc">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <h2 className="cta-title">Ready to run your first interview?</h2>
          <p className="cta-sub">$ codebridge --start-session --role=interviewer</p>
          <a href="/signup" className="btn-primary" style={{display:"inline-block"}}>Create Free Account →</a>
        </section>

        <footer>
          <div className="footer-logo">Code<span>Bridge</span></div>
          <div className="footer-copy">© 2025 CodeBridge. Built for engineers, by engineers.</div>
        </footer>
        {showJoinModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200
    }}
  >
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        padding: "30px",
        borderRadius: "10px",
        width: "320px"
      }}
    >
      <h3 style={{marginBottom:"15px"}}>Join Interview Room</h3>

      <input
        placeholder="Enter Room Code"
        value={roomCode}
        onChange={(e)=>setRoomCode(e.target.value)}
        style={{
          width:"100%",
          padding:"10px",
          marginBottom:"15px",
          background:"var(--surface2)",
          border:"1px solid var(--border)",
          color:"var(--text)",
          borderRadius:"6px"
        }}
      />

      <div style={{display:"flex", gap:"10px"}}>
        <button
          className="btn-primary"
          style={{flex:1}}
          onClick={handleJoinRoom}
        >
          Join
        </button>

        <button
          className="btn-secondary"
          style={{flex:1}}
          onClick={()=>setShowJoinModal(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </>
  );
}