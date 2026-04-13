export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#080c10] flex flex-col items-center justify-center gap-7 overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap');
        @keyframes lb-bounce {
          0%, 60%, 100% { background: #1a4d2a; transform: scale(1); }
          30% { background: #39d353; transform: scale(1.35); }
        }
        .lb-dot { animation: lb-bounce 1.2s ease-in-out infinite; }
        .lb-dot:nth-child(2) { animation-delay: 0.18s; }
        .lb-dot:nth-child(3) { animation-delay: 0.36s; }
      `}</style>

      {/* grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(57,211,83,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(57,211,83,0.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px"
        }}
      />
      {/* glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(57,211,83,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 font-['JetBrains_Mono',monospace] text-2xl font-bold text-[#39d353] tracking-tight">
        Code<span className="text-[#3a3f47]">Bridge</span>
      </div>

      <div className="relative z-10 flex gap-2.5">
        <div className="lb-dot w-2 h-2 rounded-full" />
        <div className="lb-dot w-2 h-2 rounded-full" />
        <div className="lb-dot w-2 h-2 rounded-full" />
      </div>

      <div className="relative z-10 font-['JetBrains_Mono',monospace] text-[11px] text-[#3a3f47] tracking-[3px] uppercase">
        Loading
      </div>
    </div>
  );
}