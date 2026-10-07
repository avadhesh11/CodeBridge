import { useState, useEffect } from "react";
import api from "../utils/api";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";

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
  .auth-logo { position: relative; z-index: 1; font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 700; color: var(--green); cursor: pointer; }
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
  .auth-form-sub { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 32px; }
  .auth-form-sub a { color: var(--green); text-decoration: none; font-weight: 700; cursor: pointer; }

  /* FORM */
  .form-group { margin-bottom: 18px; width: 100%; }
  .form-label { display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 7px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-family: 'JetBrains Mono', monospace; }
  .form-input {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    color: var(--text); padding: 12px 14px; border-radius: 7px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.875rem;
    transition: border-color 0.2s; outline: none; box-sizing: border-box;
  }
  .form-input:focus { border-color: var(--green); }
  .form-input::placeholder { color: var(--text-muted); }

  .password-input-wrap {
    position: relative;
    width: 100%;
  }
  .password-input-wrap .form-input {
    padding-right: 42px;
  }
  .password-toggle-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.75rem;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }
  .password-toggle-btn:hover {
    color: var(--text);
  }

  .divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
  .divider-line { flex: 1; height: 1px; background: var(--border); }
  .divider-text { color: var(--text-muted); font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }

  .btn-full { width: 100%; padding: 14px; background: var(--green); color: #000; border: none; border-radius: 8px; font-weight: 800; font-size: 0.95rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; }
  .btn-full:hover:not(:disabled) { box-shadow: 0 0 24px rgba(57,211,83,0.35); transform: translateY(-1px); }
  
  .btn-github {
    width: 100%; padding: 12px; background: var(--surface2); color: var(--text);
    border: 1px solid var(--border); border-radius: 8px; font-weight: 700;
    font-size: 0.875rem; cursor: pointer; font-family: 'Syne', sans-serif;
    transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .btn-github:hover { border-color: var(--text-muted); background: #1c2128; transform: translateY(-1px); }

  .tab-switch { display: flex; gap: 0; margin-bottom: 32px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .tab-btn { flex: 1; padding: 11px; background: transparent; color: var(--text-muted); border: none; cursor: pointer; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.875rem; transition: all 0.2s; }
  .tab-btn.active { background: var(--green); color: #000; }
  .auth-error { background: rgba(248,81,73,0.12); border: 1px solid rgba(248,81,73,0.3); border-radius: 6px; padding: 10px 14px; color: var(--red); font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; margin-bottom: 18px; word-break: break-word; }

  @media (max-width: 860px) {
    .auth-page { grid-template-columns: 1fr; }
    .auth-left { display: none; }
    .auth-right { padding: 32px 20px; }
  }
`;

export default function AuthPage({ initialMode = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, fetchUser } = useAuth();

  const getInitialMode = () => {
    const searchParams = new URLSearchParams(location.search);
    if (location.pathname === "/signup" || searchParams.get("mode") === "signup" || initialMode === "signup") {
      return "signup";
    }
    return "login";
  };

  const [mode, setMode] = useState(getInitialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Sync mode with route changes
  useEffect(() => {
    if (location.pathname === "/signup") {
      setMode("signup");
    } else if (location.pathname === "/login") {
      setMode("login");
    }
  }, [location.pathname]);

  // Check for error parameter in URL (e.g. from GitHub OAuth error redirect)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const err = searchParams.get("error");
    if (err) {
      setErrorMsg(decodeURIComponent(err));
    }
  }, [location.search]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg("");
    window.history.replaceState({}, "", newMode === "signup" ? "/signup" : "/login");
  };

  const handleGithubAuth = () => {
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");
    window.location.href = `${backendUrl}/api/auth/github`;
  };

  const handleSignup = async () => {
    setErrorMsg("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      setErrorMsg("All fields (Name, Email, Password) are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api("post", "auth/signup", {
        name: trimmedName,
        email: trimmedEmail,
        password: password
      });
      if (res.status === 200 || res.status === 201) {
        if (res.data?.token) localStorage.setItem("token", res.data.token);
        if (res.data?.user) setUser(res.data.user);
        await fetchUser?.();
        navigate("/");
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || "Error occurred during sign up. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setErrorMsg("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setErrorMsg("Please enter both Email and Password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api("post", "auth/login", {
        email: trimmedEmail,
        password: password
      });
      if (res.status === 200 || res.status === 201) {
        if (res.data?.token) localStorage.setItem("token", res.data.token);
        if (res.data?.user) setUser(res.data.user);
        await fetchUser?.();
        navigate("/");
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const githubSvgIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page">
        {/* LEFT */}
        <div className="auth-left">
          <div className="auth-left-bg" />
          <div className="auth-left-glow" />
          <div className="auth-logo" onClick={() => navigate("/")}>
            Code<span>Bridge</span>
          </div>

          <div className="auth-left-content">
            <h2 className="auth-left-title">
              Where great engineers get hired.
            </h2>
            <p className="auth-left-sub">
              Real-time collaborative coding sessions, sandbox judging, and live candidate assessments.
            </p>
          </div>

          <div className="auth-terminal">
            <div className="auth-term-bar">
              <div className="td" style={{ background: "#ff5f57" }} />
              <div className="td" style={{ background: "#febc2e" }} />
              <div className="td" style={{ background: "#28c840" }} />
            </div>
            <div className="auth-term-body">
              <div><span className="tc">$ </span><span className="tg">codebridge</span> <span className="ty">--connect</span></div>
              <div><span className="tc">✓ Engine ready</span></div>
              <div><span className="tc">✓ server online</span></div>
              <div><span className="tc">✓ WebRTC peers available</span></div>
              <div><span className="tcyan">◉ Session active</span></div>
              <div><span className="tc">Ready for coding...</span><span className="tg" style={{ animation: "pulse 1s infinite" }}>█</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth-right">
          <div className="auth-form-wrap">
            <div className="tab-switch">
              <button
                type="button"
                className={`tab-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tab-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => switchMode("signup")}
              >
                Create Account
              </button>
            </div>

            {errorMsg && <div className="auth-error">{errorMsg}</div>}

            {mode === "login" ? (
              <>
                <h1 className="auth-form-title">Welcome back</h1>
                <p className="auth-form-sub">
                  Don't have an account? <a onClick={() => switchMode("signup")}>Sign up free</a>
                </p>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="form-input"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="password-input-wrap">
                    <input
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={submitting}
                  className="btn-full"
                  style={{ marginTop: 8, opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? "Signing in..." : "Sign In →"}
                </button>

                <div className="divider">
                  <div className="divider-line" /><div className="divider-text">or</div><div className="divider-line" />
                </div>
                <button
                  type="button"
                  onClick={handleGithubAuth}
                  className="btn-github"
                >
                  {githubSvgIcon}
                  Continue with GitHub
                </button>
              </>
            ) : (
              <>
                <h1 className="auth-form-title">Create account</h1>
                <p className="auth-form-sub">
                  Already have one? <a onClick={() => switchMode("login")}>Sign in</a>
                </p>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrorMsg(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    className="form-input"
                    type="text"
                    placeholder="John Doe"
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    className="form-input"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="password-input-wrap">
                    <input
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSignup}
                  disabled={submitting}
                  className="btn-full"
                  style={{ marginTop: 8, opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? "Creating Account..." : "Create Account →"}
                </button>

                <div className="divider">
                  <div className="divider-line" /><div className="divider-text">or</div><div className="divider-line" />
                </div>
                <button
                  type="button"
                  onClick={handleGithubAuth}
                  className="btn-github"
                >
                  {githubSvgIcon}
                  Continue with GitHub
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}