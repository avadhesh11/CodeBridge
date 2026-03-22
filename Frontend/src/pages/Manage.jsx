import { useState } from "react";
import api from "../utils/api";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080c10;
    --surface: #0d1117;
    --surface2: #161b22;
    --surface3: #1c2128;
    --border: #21262d;
    --border2: #30363d;
    --green: #39d353;
    --green-dim: #1a4d2a;
    --cyan: #58d4f5;
    --amber: #f0a830;
    --amber-dim: rgba(240,168,48,0.12);
    --red: #f85149;
    --red-dim: rgba(248,81,73,0.12);
    --text: #e6edf3;
    --text-muted: #7d8590;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }

  /* ── TOP BAR ── */
  .topbar {
    height: 50px; display: flex; align-items: center;
    padding: 0 24px; gap: 16px;
    background: var(--surface); border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 50;
  }
  .logo { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 700; color: var(--green); }
  .logo span { color: var(--text-muted); }
  .sep { width: 1px; height: 18px; background: var(--border); }
  .breadcrumb { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
  .breadcrumb b { color: var(--text); }
  .spacer { flex: 1; }
  .topbar-pill {
    display: flex; align-items: center; gap: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--text-muted);
    background: var(--surface2); border: 1px solid var(--border); padding: 4px 12px; border-radius: 100px;
  }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: blink 2s infinite; }
  @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.3} }

  /* ── LAYOUT ── */
  .page { display: flex; height: calc(100vh - 50px); overflow: hidden; }

  /* ── LEFT: QUESTION LIST ── */
  .qlist-panel {
    width: 320px; flex-shrink: 0;
    background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
  }
  .qlist-header { padding: 20px 18px 16px; border-bottom: 1px solid var(--border); }
  .qlist-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-bottom: 12px; }
  .search-wrap { position: relative; }
  .search-input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 9px 12px 9px 34px; border-radius: 7px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; outline: none; transition: border-color 0.2s;
  }
  .search-input:focus { border-color: var(--green); }
  .search-input::placeholder { color: var(--text-muted); }
  .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.8rem; pointer-events: none; }
  .filter-row { display: flex; gap: 6px; margin-top: 10px; }
  .filter-btn {
    padding: 4px 10px; border-radius: 5px; font-size: 0.67rem; font-weight: 700;
    font-family: 'JetBrains Mono', monospace; cursor: pointer; border: 1px solid var(--border);
    background: transparent; color: var(--text-muted); transition: all 0.15s;
  }
  .filter-btn.all.active, .filter-btn.all:hover { background: var(--surface3); color: var(--text); border-color: var(--border2); }
  .filter-btn.easy.active { background: var(--green-dim); color: var(--green); border-color: var(--green); }
  .filter-btn.med.active  { background: var(--amber-dim); color: var(--amber); border-color: var(--amber); }
  .filter-btn.hard.active { background: var(--red-dim); color: var(--red); border-color: var(--red); }

  .qlist-body { flex: 1; overflow-y: auto; padding: 8px; }
  .qlist-body::-webkit-scrollbar { width: 3px; }
  .qlist-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .q-item {
    padding: 14px; border-radius: 8px; cursor: pointer; margin-bottom: 4px;
    border: 1px solid transparent; transition: all 0.15s; position: relative;
  }
  .q-item:hover { background: var(--surface2); border-color: var(--border); }
  .q-item.active { background: var(--surface2); border-color: var(--green); }
  .q-item-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .diff-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .dt-easy { background: var(--green-dim); color: var(--green); }
  .dt-med  { background: var(--amber-dim); color: var(--amber); }
  .dt-hard { background: var(--red-dim); color: var(--red); }
  .q-item-title { font-size: 0.875rem; font-weight: 700; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .q-item-meta { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--text-muted); display: flex; gap: 10px; }
  .q-item-del {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    opacity: 0; background: var(--red-dim); border: 1px solid rgba(248,81,73,0.3);
    color: var(--red); border-radius: 5px; padding: 3px 8px; font-size: 0.67rem;
    cursor: pointer; transition: opacity 0.15s; font-family: 'JetBrains Mono', monospace; font-weight: 700;
  }
  .q-item:hover .q-item-del { opacity: 1; }

  .qlist-footer { padding: 12px; border-top: 1px solid var(--border); }
  .new-q-btn {
    width: 100%; padding: 10px; background: var(--green); color: #000;
    border: none; border-radius: 8px; font-weight: 800; font-size: 0.85rem;
    cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .new-q-btn:hover { box-shadow: 0 0 20px rgba(57,211,83,0.3); }

  /* ── RIGHT: EDITOR PANEL ── */
  .editor-panel {
    flex: 1; display: flex; flex-direction: column; overflow: hidden;
  }
  .editor-topbar {
    height: 48px; display: flex; align-items: center; gap: 12px;
    padding: 0 24px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .editor-topbar-title { font-size: 0.875rem; font-weight: 800; flex: 1; }
  .save-btn {
    padding: 7px 20px; background: var(--green); color: #000; border: none;
    border-radius: 7px; font-weight: 800; font-size: 0.8rem; cursor: pointer;
    font-family: 'Syne', sans-serif; transition: all 0.15s;
  }
  .save-btn:hover { box-shadow: 0 0 14px rgba(57,211,83,0.35); }
  .discard-btn {
    padding: 7px 16px; background: transparent; color: var(--text-muted);
    border: 1px solid var(--border); border-radius: 7px; font-weight: 700;
    font-size: 0.8rem; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.15s;
  }
  .discard-btn:hover { border-color: var(--border2); color: var(--text); }

  .editor-body { flex: 1; overflow-y: auto; padding: 28px 32px; }
  .editor-body::-webkit-scrollbar { width: 4px; }
  .editor-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* FORM SECTIONS */
  .form-section { margin-bottom: 36px; }
  .fs-label {
    font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted);
    margin-bottom: 14px; display: flex; align-items: center; gap: 10px;
  }
  .fs-label::after { content:''; flex:1; height:1px; background: var(--border); }

  .form-row { display: grid; gap: 16px; margin-bottom: 16px; }
  .form-row-2 { grid-template-columns: 1fr 1fr; }
  .form-row-3 { grid-template-columns: 2fr 1fr 1fr; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.5px; }
  .field-input {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    padding: 10px 13px; border-radius: 7px; font-family: 'JetBrains Mono', monospace;
    font-size: 0.82rem; outline: none; transition: border-color 0.2s; width: 100%;
  }
  .field-input:focus { border-color: var(--green); }
  .field-input::placeholder { color: var(--text-muted); }
  .field-textarea { min-height: 90px; resize: vertical; line-height: 1.6; }
  .field-select { appearance: none; cursor: pointer; }

  /* DIFF RADIO */
  .diff-radio { display: flex; gap: 8px; }
  .diff-opt {
    flex: 1; padding: 10px; border-radius: 7px; border: 1px solid var(--border);
    background: transparent; cursor: pointer; text-align: center; transition: all 0.15s;
    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 700;
  }
  .diff-opt:hover { background: var(--surface2); }
  .diff-opt.easy.sel  { border-color: var(--green); background: var(--green-dim); color: var(--green); }
  .diff-opt.med.sel   { border-color: var(--amber); background: var(--amber-dim); color: var(--amber); }
  .diff-opt.hard.sel  { border-color: var(--red); background: var(--red-dim); color: var(--red); }

  /* TEST CASE BUILDER */
  .tc-grid { display: flex; flex-direction: column; gap: 10px; }
  .tc-card {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 9px;
    overflow: hidden; transition: border-color 0.15s;
  }
  .tc-card:hover { border-color: var(--border2); }
  .tc-card-header {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-bottom: 1px solid var(--border);
    background: var(--surface3);
  }
  .tc-num { font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; font-weight: 700; color: var(--text-muted); min-width: 60px; }
  .tc-type-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .tb-sample { background: rgba(88,212,245,0.1); color: var(--cyan); }
  .tb-hidden { background: rgba(240,168,48,0.1); color: var(--amber); }
  .tc-spacer { flex: 1; }
  .tc-del-btn {
    font-family: 'JetBrains Mono', monospace; font-size: 0.67rem; color: var(--red);
    background: var(--red-dim); border: 1px solid rgba(248,81,73,0.25); border-radius: 4px;
    padding: 3px 9px; cursor: pointer; transition: all 0.15s; font-weight: 700;
  }
  .tc-del-btn:hover { background: rgba(248,81,73,0.25); }
  .tc-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .tc-field { padding: 12px 14px; }
  .tc-field:first-child { border-right: 1px solid var(--border); }
  .tc-field-label { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .tc-field-input {
    width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--green);
    padding: 8px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem; outline: none; transition: border-color 0.2s; resize: vertical; min-height: 56px; line-height: 1.5;
  }
  .tc-field-input:focus { border-color: var(--green); }
  .tc-field-input::placeholder { color: var(--text-muted); }

  .tc-add-row { display: flex; gap: 8px; margin-top: 10px; }
  .tc-add-btn {
    flex: 1; padding: 9px; border-radius: 7px; border: 1px dashed var(--border);
    background: transparent; cursor: pointer; font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem; font-weight: 700; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .tc-add-sample { color: var(--cyan); }
  .tc-add-sample:hover { border-color: var(--cyan); background: rgba(88,212,245,0.06); }
  .tc-add-hidden { color: var(--amber); }
  .tc-add-hidden:hover { border-color: var(--amber); background: var(--amber-dim); }

  /* EMPTY STATE */
  .empty-state {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; color: var(--text-muted);
  }
  .empty-icon { font-size: 3rem; filter: grayscale(1) opacity(0.5); }
  .empty-title { font-size: 1.1rem; font-weight: 800; color: var(--text); }
  .empty-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; text-align: center; line-height: 1.6; }
  .empty-btn { margin-top: 8px; padding: 10px 24px; background: var(--green); color: #000; border: none; border-radius: 8px; font-weight: 800; font-size: 0.85rem; cursor: pointer; font-family: 'Syne', sans-serif; }

  /* CONFIRM DIALOG */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .dialog { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 380px; }
  .dialog-icon { font-size: 2rem; margin-bottom: 12px; }
  .dialog-title { font-size: 1.1rem; font-weight: 800; margin-bottom: 6px; }
  .dialog-sub { color: var(--text-muted); font-size: 0.85rem; font-family: 'JetBrains Mono', monospace; line-height: 1.6; margin-bottom: 24px; }
  .dialog-actions { display: flex; gap: 10px; }
  .dialog-cancel { flex: 1; padding: 10px; background: transparent; color: var(--text-muted); border: 1px solid var(--border); border-radius: 7px; cursor: pointer; font-weight: 700; font-family: 'Syne', sans-serif; }
  .dialog-confirm { flex: 1; padding: 10px; background: var(--red); color: #fff; border: none; border-radius: 7px; cursor: pointer; font-weight: 800; font-family: 'Syne', sans-serif; }

  /* SAVED TOAST */
  .toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 200;
    background: var(--green-dim); border: 1px solid var(--green); color: var(--green);
    padding: 12px 20px; border-radius: 9px; font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; gap: 8px;
    animation: slideUp 0.3s ease; box-shadow: 0 0 24px rgba(57,211,83,0.2);
  }
  @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
`;

// ── seed data ──────────────────────────────────────────────────────────────
const seedQuestions = [
  // {
  //   _id: "q1", tag: "Easy", title: "Two Sum",
  //   description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  //   constraints: "2 ≤ nums.length ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹",
  //   timelimit: 2,
  //   sampletcs: [{ input: "[2,7,11,15]\n9", output: "[0,1]" }, { input: "[3,2,4]\n6", output: "[1,2]" }],
  //   hiddentcs: [{ input: "[3,3]\n6", output: "[0,1]" }, { input: "[1,5,3,2]\n4", output: "[2,3]" }],
  // },
  // {
  //   _id: "q2", tag: "Easy", title: "Valid Parentheses",
  //   description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
  //   constraints: "1 ≤ s.length ≤ 10⁴",
  //   timelimit: 2,
  //   sampletcs: [{ input: "()", output: "true" }],
  //   hiddentcs: [{ input: "([)]", output: "false" }, { input: "{[]}", output: "true" }],
  // },
  // {
  //   _id: "q3", tag: "Medium", title: "Merge Intervals",
  //   description: "Given an array of intervals, merge all overlapping intervals and return an array of the non-overlapping intervals.",
  //   constraints: "1 ≤ intervals.length ≤ 10⁴",
  //   timelimit: 2,
  //   sampletcs: [{ input: "[[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" }],
  //   hiddentcs: [{ input: "[[1,4],[4,5]]", output: "[[1,5]]" }],
  // },
  // {
  //   _id: "q4", tag: "Hard", title: "LRU Cache",
  //   description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.",
  //   constraints: "1 ≤ capacity ≤ 3000",
  //   timelimit: 1,
  //   sampletcs: [{ input: "capacity=2\nput(1,1),put(2,2),get(1),put(3,3)", output: "1,-1" }],
  //   hiddentcs: [],
  // },
];

const blankQuestion = () => ({
  _id: null, tag: "Easy", title: "", description: "", constraints: "", timelimit: 2,
  sampletcs: [{ input: "", output: "" }],
  hiddentcs: [],
});

const diffClass = { Easy: "easy", Medium: "med", Hard: "hard" };
const diffColor = { Easy: "dt-easy", Medium: "dt-med", Hard: "dt-hard" };

export default function QuestionManager() {
  const navigate=useNavigate();

  const {roomID}=useParams();
  const [questions, setQuestions] = useState(seedQuestions);
  const [selected, setSelected] = useState(null); 
  const [form, setForm] = useState(blankQuestion());
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(false);

  const showToast = () => { setToast(true); setTimeout(() => setToast(false), 2500); };

  const filtered = questions.filter(q => {
    const matchDiff = filter === "All" || q.tag === filter;
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase());
    return matchDiff && matchSearch;
  });

const fetchQuestion=async()=>{
try {
  const res=await api("get",`question/private/${roomID}`);
  setQuestions(res.data.questions);
} catch (error) {
  console.error("error fetching questions:",error);
}
  };
const handleSaveQuestion=async()=>{
try {
  const res=await api("post",`question/add/${roomID}`,{
      title:form.title,
        description:form.description,
        constraints:form.constraints,
        sampletcs:form.sampletcs,
        hiddentcs:form.hiddentcs,
        tag:form.tag,
        timelimit:form.timelimit,
        qtype:"private",

  })
  window.location.reload();

} catch (error) {
  console.error("error adding questions:",error);
}
};
const saveRoom=async()=>{
try {
if(confirm("Save details?")){
navigate(`/code/${roomID}`);
}

} catch (error) {
  console.error("error saving room:",error);
}
};
useEffect(()=>{
fetchQuestion();
},[])
  const selectQuestion = (q) => {
    setSelected(q._id);
    setForm({ ...q, sampletcs: q.sampletcs.map(t => ({ ...t })), hiddentcs: q.hiddentcs.map(t => ({ ...t })) });
  };

  const startNew = () => {
    setSelected("new");
    setForm(blankQuestion());
  };

  const saveQuestion = () => {
    if (!form.title.trim()) return;
    if (selected === "new") {
      const newQ = { ...form, _id: "q" + Date.now() };
      setQuestions(prev => [...prev, newQ]);
      setSelected(newQ._id);
    } else {
      setQuestions(prev => prev.map(q => q._id === selected ? { ...form, _id: selected } : q));
    }
    showToast();
  };

  const deleteQuestion = (id) => {
    setQuestions(prev => prev.filter(q => q._id !== id));
    if (selected === id || selected === "new") { setSelected(null); }
    setDeleteTarget(null);
  };

  const updateField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateTC = (type, idx, field, val) => {
    setForm(f => {
      const arr = [...f[type]];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...f, [type]: arr };
    });
  };

  const addTC = (type) => setForm(f => ({ ...f, [type]: [...f[type], { input: "", output: "" }] }));

  const removeTC = (type, idx) => setForm(f => ({ ...f, [type]: f[type].filter((_, i) => i !== idx) }));

  const allTCs = [
    ...form.sampletcs.map((tc, i) => ({ tc, type: "sampletcs", i, label: "Sample" })),
    ...form.hiddentcs.map((tc, i) => ({ tc, type: "hiddentcs", i, label: "Hidden" })),
  ];

  return (
    <>
      <style>{css}</style>

      {/* TOP BAR */}
      <div className="topbar">
        <div className="logo">Code<span>Bridge</span></div>
        <div className="sep" />
        <div className="breadcrumb">Dashboard <span>›</span> <b>Question Manager</b></div>
        <div className="spacer" />
        <div className="topbar-pill"><div className="live-dot" />{questions.length} questions</div>
      </div>

      <div className="page">
        {/* ── LEFT PANEL ── */}
        <div className="qlist-panel">
          <div className="qlist-header">
            <div className="qlist-title">// question bank</div>
            <div className="search-wrap">
              <span className="search-icon">⌕</span>
              <input className="search-input" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-row">
              {["All", "Easy", "Medium", "Hard"].map(f => (
                <button
                  key={f}
                  className={`filter-btn ${diffClass[f] || "all"} ${filter === f ? "active" : ""}`}
                  onClick={() => setFilter(f)}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="qlist-body">
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 12px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem" }}>
                No questions found.
              </div>
            )}
            {filtered.map(q => (
              <div
                key={q._id}
                className={`q-item ${selected === q._id ? "active" : ""}`}
                onClick={() => selectQuestion(q)}
              >
                <div className="q-item-top">
                  <span className={`diff-tag ${diffColor[q.tag]}`}>{q.tag}</span>
                  <div className="q-item-title">{q.title}</div>
                </div>
                <div className="q-item-meta">
                  <span>⏱ {q.timelimit}s</span>
                  <span>📋 {q.sampletcs.length} sample</span>
                  <span>🔒 {q.hiddentcs.length} hidden</span>
                </div>
                <button className="q-item-del" onClick={e => { e.stopPropagation(); setDeleteTarget(q); }}>✕ del</button>
              </div>
            ))}
          </div>

          <div className="qlist-footer">
            <button className="new-q-btn" onClick={startNew}>
              <span style={{ fontSize: "1rem" }}>＋</span> New Question
            </button>
          </div>
           <div className="qlist-footer">
            <button className="new-q-btn" onClick={saveRoom}>
             Save room details
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="editor-panel">
          {selected === null ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-title">No question selected</div>
              <div className="empty-sub">Pick a question from the list<br />or create a brand new one.</div>
              <button className="empty-btn" onClick={startNew}>＋ New Question</button>
            </div>
          ) : (
            <>
              {/* Editor top bar */}
              <div className="editor-topbar">
                <div className="editor-topbar-title">
                  {selected === "new" ? "New Question" : form.title || "Untitled Question"}
                </div>
                <button className="discard-btn" onClick={() => setSelected(null)}>✕ Discard</button>
                <button className="save-btn" onClick={saveQuestion}>↓ Save Question</button>
              </div>

              <div className="editor-body">
                {/* ── BASIC INFO ── */}
                <div className="form-section">
                  <div className="fs-label">Basic Info</div>

                  <div className="form-row form-row-3" style={{ marginBottom: 16 }}>
                    <div className="field">
                      <div className="field-label">Title</div>
                      <input className="field-input" placeholder="e.g. Two Sum" value={form.title} onChange={e => updateField("title", e.target.value)} />
                    </div>
                    <div className="field">
                      <div className="field-label">Time Limit (sec)</div>
                      <input className="field-input" type="number" min={1} max={10} value={form.timelimit} onChange={e => updateField("timelimit", Number(e.target.value))} />
                    </div>
                    <div className="field">
                      <div className="field-label">Difficulty</div>
                      <div className="diff-radio">
                        {["easy", "medium", "hard"].map(d => (
                          <div
                            key={d}
                            className={`diff-opt ${diffClass[d]} ${form.tag === d ? "sel" : ""}`}
                            onClick={() => updateField("tag", d)}
                          >{d}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="field" style={{ marginBottom: 16 }}>
                    <div className="field-label">Description</div>
                    <textarea
                      className="field-input field-textarea"
                      placeholder="Describe the problem clearly. Include what the function should take as input and what it should return."
                      value={form.description}
                      onChange={e => updateField("description", e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <div className="field-label">Constraints</div>
                    <textarea
                      className="field-input field-textarea"
                      style={{ minHeight: 64 }}
                      placeholder={"1 ≤ nums.length ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹"}
                      value={form.constraints}
                      onChange={e => updateField("constraints", e.target.value)}
                    />
                  </div>
                </div>

                {/* ── TEST CASES ── */}
                <div className="form-section">
                  <div className="fs-label">Test Cases</div>

                  <div style={{ display: "flex", gap: 16, marginBottom: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--cyan)" }}>◆ Sample</span> — visible to candidate &nbsp;&nbsp;
                    <span style={{ color: "var(--amber)" }}>◆ Hidden</span> — used for final verdict
                  </div>

                  <div className="tc-grid">
                    {allTCs.map(({ tc, type, i, label }) => (
                      <div className="tc-card" key={`${type}-${i}`}>
                        <div className="tc-card-header">
                          <span className="tc-num">Case #{i + 1}</span>
                          <span className={`tc-type-badge ${label === "Sample" ? "tb-sample" : "tb-hidden"}`}>{label}</span>
                          <span className="tc-spacer" />
                          <button className="tc-del-btn" onClick={() => removeTC(type, i)}>✕ Remove</button>
                        </div>
                        <div className="tc-body">
                          <div className="tc-field">
                            <div className="tc-field-label">Input</div>
                            <textarea
                              className="tc-field-input"
                              placeholder={"nums = [2,7,11,15]\ntarget = 9"}
                              value={tc.input}
                              onChange={e => updateTC(type, i, "input", e.target.value)}
                            />
                          </div>
                          <div className="tc-field">
                            <div className="tc-field-label">Expected Output</div>
                            <textarea
                              className="tc-field-input"
                              placeholder={"[0,1]"}
                              value={tc.output}
                              onChange={e => updateTC(type, i, "output", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="tc-add-row">
                    <button className="tc-add-btn tc-add-sample" onClick={() => addTC("sampletcs")}>
                      ＋ Add Sample Test Case
                    </button>
                    <button className="tc-add-btn tc-add-hidden" onClick={() => addTC("hiddentcs")}>
                      ＋ Add Hidden Test Case
                    </button>
                  </div>
                </div>

                {/* ── SUMMARY ── */}
                <div className="form-section">
                  <div className="fs-label">Summary</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[
                      { label: "Difficulty", value: form.tag, color: form.tag === "Easy" ? "var(--green)" : form.tag === "Medium" ? "var(--amber)" : "var(--red)" },
                      { label: "Time Limit", value: `${form.timelimit}s`, color: "var(--text)" },
                      { label: "Sample TCs", value: form.sampletcs.length, color: "var(--cyan)" },
                      { label: "Hidden TCs", value: form.hiddentcs.length, color: "var(--amber)" },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 9, padding: "16px 18px" }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>{s.label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.3rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* bottom save */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingBottom: 12 }}>
                  <button className="discard-btn" onClick={() => setSelected(null)}>✕ Discard</button>
                  <button className="save-btn" onClick={handleSaveQuestion}>↓ Save Question</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DELETE CONFIRM DIALOG */}
      {deleteTarget && (
        <div className="overlay" onClick={() => setDeleteTarget(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-icon">🗑️</div>
            <div className="dialog-title">Delete "{deleteTarget.title}"?</div>
            <div className="dialog-sub">
              This will permanently remove the question and all {deleteTarget.sampletcs.length + deleteTarget.hiddentcs.length} test cases. This cannot be undone.
            </div>
            <div className="dialog-actions">
              <button className="dialog-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="dialog-confirm" onClick={() => deleteQuestion(deleteTarget._id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* SAVED TOAST */}
      {toast && <div className="toast">✓ Question saved successfully</div>}
    </>
  );
}