import { useState,useEffect } from "react";
import api from "../utils/api";
import {useNavigate} from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080c10; --surface: #0d1117; --surface2: #161b22; --border: #21262d;
    --green: #39d353; --green-dim: #1a4d2a; --cyan: #58d4f5; --amber: #f0a830;
    --text: #e6edf3; --text-muted: #7d8590; --red: #f85149;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }

  .auth-page {
    min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr;
  }

  /* LEFT PANEL */
  .auth-left {
    background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 40px; position: relative; overflow: hidden;
  }
  .auth-left-bg {
    position: absolute; inset: 0;
    background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 40px 40px; opacity: 0.3;
  }
  .auth-left-glow {
    position: absolute; bottom: -100px; left: -100px;
    width: 500px; height: 500px;
    background: radial-gradient(ellipse, rgba(57,211,83,0.08) 0%, transparent 65%);
  }
  .auth-logo { position: relative; z-index: 1; font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 700; color: var(--green); }
  .auth-logo span { color: var(--text-muted); }
  .auth-left-content { position: relative; z-index: 1; }
  .auth-left-title { font-size: 2.4rem; font-weight: 800; line-height: 1.15; letter-spacing: -1.5px; margin-bottom: 16px; }
  .auth-left-sub { color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; line-height: 1.7; }
  .auth-terminal {
    position: relative; z-index: 1;
    background: var(--bg); border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  }
  .auth-term-bar { display: flex; gap: 7px; align-items: center; padding: 10px 14px; background: var(--surface2); border-bottom: 1px solid var(--border); }
  .td { width: 10px; height: 10px; border-radius: 50%; }
  .auth-term-body { padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; line-height: 2; }
  .tc { color: var(--text-muted); }
  .tg { color: var(--green); }
  .ty { color: var(--amber); }
  .tcyan { color: var(--cyan); }

  /* RIGHT PANEL */
  .auth-right {
    display: flex; align-items: center; justify-content: center; padding: 48px;
  }
  .auth-form-wrap { width: 100%; max-width: 400px; }
  .auth-form-title { font-size: 2rem; font-weight: 800; letter-spacing: -1px; margin-bottom: 6px; }
  .auth-form-sub { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 40px; }
  .auth-form-sub a { color: var(--green); text-decoration: none; }

  /* ROLE SELECTOR */
  .role-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
  .role-btn {
    padding: 14px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface); cursor: pointer; transition: all 0.2s; text-align: center;
  }
  .role-btn.active { border-color: var(--green); background: var(--green-dim); }
  .role-btn-icon { font-size: 1.5rem; margin-bottom: 6px; }
  .role-btn-label { font-size: 0.8rem; font-weight: 700; color: var(--text); }
  .role-btn-desc { font-size: 0.7rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

  /* FORM */
  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 7px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'JetBrains Mono', monospace; }
  .form-input {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    color: var(--text); padding: 12px 14px; border-radius: 7px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.875rem;
    transition: border-color 0.2s; outline: none;
  }
  .form-input:focus { border-color: var(--green); }
  .form-input::placeholder { color: var(--text-muted); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  .divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
  .divider-line { flex: 1; height: 1px; background: var(--border); }
  .divider-text { color: var(--text-muted); font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }

  .btn-full { width: 100%; padding: 14px; background: var(--green); color: #000; border: none; border-radius: 8px; font-weight: 800; font-size: 0.95rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .btn-full:hover { box-shadow: 0 0 24px rgba(57,211,83,0.35); }
  .btn-github { width: 100%; padding: 12px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; font-weight: 700; font-size: 0.875rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: border-color 0.2s; }
  .btn-github:hover { border-color: var(--text-muted); }

  .tab-switch { display: flex; gap: 0; margin-bottom: 36px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .tab-btn { flex: 1; padding: 11px; background: transparent; color: var(--text-muted); border: none; cursor: pointer; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.875rem; transition: all 0.2s; }
  .tab-btn.active { background: var(--green); color: #000; }
`;

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | signup
  const [role, setRole] = useState("interviewer");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
const navigate=useNavigate();
const [user,setUser]=useState();
const fetchUser = async () => {
  try {
    const res = await api("get","me");
     setUser(res.data.user);
  } catch (err) {
    console.log(err);
  }
};
useEffect(()=>{
  fetchUser();

},[]);
if(user){
  navigate("/");
}
const handleSignup=async()=>{
try {
  console.log(name);
  console.log(email);
  console.log(password);
  if(!name || !email || !password){
    alert("All fields are requried");
    return;
  }
  const res=await api("post","auth/signup",{
    name,email,password
  });
  if(res.status===200 || res.status===201){
    alert("Signup succesfull");
    navigate("/");
  }
} catch (error) {
  alert("Error occured in sign up");
  console.error("signup error:",error);
  window.location.reload();
}
  };
  const handleLogin=async()=>{
try {
  if( !email || !password){
    alert("All fields are requried");
    return;
  }
  const res=await api("post","auth/login",{
    email,password
  });
  if(res.status===200 || res.status===201){
    alert("Login succesfull");
    navigate("/");
  }
} catch (error) {
  alert("Error occured in login");
  console.error("Login error:",error);

}
  };
  return (
    <>
      <style>{styles}</style>
      <div className="auth-page">
        {/* LEFT */}
        <div className="auth-left">
          <div className="auth-left-bg" />
          <div className="auth-left-glow" />
          <div className="auth-logo">Code<span>Bridge</span></div>

          <div className="auth-left-content">
            <h2 className="auth-left-title">
              Where great engineers get hired.
            </h2>
            <p className="auth-left-sub">
              Real-time collaborative coding sessions,<br />
             
            </p>
          </div>

          <div className="auth-terminal">
            <div className="auth-term-bar">
              <div className="td" style={{background:"#ff5f57"}}/>
              <div className="td" style={{background:"#febc2e"}}/>
              <div className="td" style={{background:"#28c840"}}/>
            </div>
            <div className="auth-term-body">
              <div><span className="tc">$ </span><span className="tg">codebridge</span> <span className="ty">--connect</span></div>
              <div><span className="tc">✓ Engine ready</span></div>
              <div><span className="tc">✓ server online</span></div>
              <div><span className="tc">✓ WebRTC peers available</span></div>
              <div><span className="tcyan">◉ Session #4f2a started</span></div>
              <div><span className="tc">Waiting for candidate...</span><span className="tg" style={{animation:"pulse 1s infinite"}}>█</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth-right">
          <div className="auth-form-wrap">
            <div className="tab-switch">
              <button className={`tab-btn ${mode==="login"?"active":""}`} onClick={() => setMode("login")}>Sign In</button>
              <button className={`tab-btn ${mode==="signup"?"active":""}`} onClick={() => setMode("signup")}>Create Account</button>
            </div>

            {mode === "login" ? (
              <>
                <h1 className="auth-form-title">Welcome back</h1>
                <p className="auth-form-sub">Don't have an account? <a href="#" onClick={()=>setMode("signup")}>Sign up free</a></p>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input  onChange={e => setEmail(e.target.value)}  className="form-input" type="email" placeholder="you@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input  onChange={e => setPassword(e.target.value)}  t className="form-input" type="password" placeholder="••••••••••" />
                </div>

                <button onClick={handleLogin} className="btn-full" style={{marginTop:8}}>Sign In →</button>

                <div className="divider">
                  <div className="divider-line"/><div className="divider-text">or</div><div className="divider-line"/>
                </div>
                <button className="btn-github">⌘ Continue with GitHub</button>
              </>
            ) : (
              <>
                <h1 className="auth-form-title">Create account</h1>
                <p className="auth-form-sub">Already have one? <a href="#" onClick={()=>setMode("login")}>Sign in</a></p>

<div className="form-row">
  <div className="form-group">
    <label className="form-label">Name</label>
    <input 
      onChange={e => setName(e.target.value)} 
      className="form-input" 
      placeholder="Rahul" 
    />
  </div>
</div>

<div className="form-group">
  <label className="form-label">Email</label>
  <input 
    onChange={e => setEmail(e.target.value)} 
    className="form-input" 
    type="email" 
    placeholder="you@company.com" 
  />
</div>

<div className="form-group">
  <label className="form-label">Password</label>
  <input 
    onChange={e => setPassword(e.target.value)} 
    className="form-input" 
    type="password" 
    placeholder="Min. 8 characters" 
  />
</div>

<button onClick={handleSignup} className="btn-full">
  Create Account →
</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}