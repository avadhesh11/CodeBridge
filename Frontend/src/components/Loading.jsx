const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap');

  .lb-root {
    position: fixed; inset: 0; z-index: 9999;
    background: #080c10;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 28px; overflow: hidden;
  }
  .lb-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(57,211,83,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(57,211,83,0.05) 1px, transparent 1px);
    background-size: 44px 44px;
    pointer-events: none;
  }
  .lb-glow {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 300px; height: 200px;
    background: radial-gradient(ellipse, rgba(57,211,83,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .lb-logo {
    position: relative; z-index: 1;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.5rem; font-weight: 700;
    color: #39d353; letter-spacing: -0.5px;
  }
  .lb-logo span { color: #3a3f47; }
  .lb-dots {
    position: relative; z-index: 1;
    display: flex; gap: 10px;
  }
  .lb-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #1a4d2a;
    animation: lb-bounce 1.2s ease-in-out infinite;
  }
  .lb-dot:nth-child(2) { animation-delay: 0.18s; }
  .lb-dot:nth-child(3) { animation-delay: 0.36s; }
  @keyframes lb-bounce {
    0%, 60%, 100% { background: #1a4d2a; transform: scale(1); }
    30%            { background: #39d353; transform: scale(1.35); }
  }
  .lb-text {
    position: relative; z-index: 1;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem; color: #3a3f47;
    letter-spacing: 2px; text-transform: uppercase;
  }
`;

export default function LoadingScreen() {
  return (
    <>
      <style>{css}</style>
      <div className="lb-root">
        <div className="lb-grid" />
        <div className="lb-glow" />
        <div className="lb-logo">Code<span>Bridge</span></div>
        <div className="lb-dots">
          <div className="lb-dot" />
          <div className="lb-dot" />
          <div className="lb-dot" />
        </div>
        <div className="lb-text">Loading</div>
      </div>
    </>
  );
}