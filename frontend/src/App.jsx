import { useState, useRef, useEffect } from "react";
 
const API_BASE = "http://localhost:8000";
 
const tabs = [
  { id: "research", label: "Research", icon: "🔍" },
  { id: "stream",   label: "Live Stream", icon: "📡" },
  { id: "execute",  label: "Execute", icon: "⚡" },
  { id: "chat",     label: "Chat", icon: "💬" },
  { id: "docs",     label: "Documents", icon: "📚" },
];
 
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Syne:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Syne', sans-serif; background: #0a0a0f; color: #e8e6f0; min-height: 100vh; }
  .app { min-height: 100vh; background: #0a0a0f; display: flex; flex-direction: column; }
 
  .header { border-bottom: 1px solid #1e1e2e; padding: 1.25rem 2rem; display: flex; align-items: center; justify-content: space-between; background: #0d0d17; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #7c3aed, #2563eb); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .logo-text { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; color: #fff; }
  .logo-sub { font-size: 11px; color: #6b7280; font-family: 'JetBrains Mono', monospace; }
  .status-pill { display: flex; align-items: center; gap: 6px; background: #0f2a1a; border: 1px solid #166534; border-radius: 20px; padding: 4px 12px; font-size: 12px; color: #4ade80; font-family: 'JetBrains Mono', monospace; }
  .status-dot { width: 6px; height: 6px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
 
  .main { display: flex; flex: 1; height: calc(100vh - 65px); }
  .sidebar { width: 220px; border-right: 1px solid #1e1e2e; background: #0d0d17; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 4px; }
  .sidebar-label { font-size: 10px; letter-spacing: 1.5px; color: #4b5563; font-family: 'JetBrains Mono', monospace; padding: 0 8px; margin-bottom: 8px; text-transform: uppercase; }
  .tab-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; border: none; background: transparent; color: #6b7280; font-size: 14px; font-family: 'Syne', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.15s; text-align: left; width: 100%; }
  .tab-btn:hover { background: #1a1a2e; color: #d1d5db; }
  .tab-btn.active { background: #1e1b4b; color: #a78bfa; border-left: 2px solid #7c3aed; }
  .content { flex: 1; padding: 2rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem; }
 
  .panel { background: #0d0d17; border: 1px solid #1e1e2e; border-radius: 12px; overflow: hidden; }
  .panel-header { padding: 1rem 1.5rem; border-bottom: 1px solid #1e1e2e; display: flex; align-items: center; gap: 8px; }
  .panel-title { font-size: 14px; font-weight: 600; color: #e8e6f0; }
  .panel-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .field-label { font-size: 12px; color: #6b7280; font-family: 'JetBrains Mono', monospace; margin-bottom: 6px; letter-spacing: 0.3px; }
  textarea, input[type="text"] { width: 100%; background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px; color: #e8e6f0; font-size: 14px; font-family: 'Syne', sans-serif; outline: none; transition: border-color 0.15s; resize: vertical; }
  textarea:focus, input[type="text"]:focus { border-color: #7c3aed; }
  .row { display: flex; gap: 1rem; flex-wrap: wrap; }
  .field { flex: 1; min-width: 160px; }
  select { width: 100%; background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 8px; padding: 10px 12px; color: #e8e6f0; font-size: 14px; font-family: 'Syne', sans-serif; outline: none; cursor: pointer; }
  .toggle-row { display: flex; align-items: center; gap: 10px; }
  .toggle { width: 36px; height: 20px; background: #1e1e2e; border-radius: 10px; position: relative; cursor: pointer; transition: background 0.2s; border: none; flex-shrink: 0; }
  .toggle.on { background: #7c3aed; }
  .toggle::after { content: ''; position: absolute; width: 14px; height: 14px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: transform 0.2s; }
  .toggle.on::after { transform: translateX(16px); }
  .toggle-label { font-size: 13px; color: #9ca3af; }
  .run-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #7c3aed, #2563eb); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; font-family: 'Syne', sans-serif; cursor: pointer; transition: opacity 0.15s, transform 0.1s; align-self: flex-start; }
  .run-btn:hover { opacity: 0.9; }
  .run-btn:active { transform: scale(0.98); }
  .run-btn:disabled { opacity: 0.4; cursor: not-allowed; }
 
  .result-panel { background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 12px; overflow: hidden; }
  .result-header { padding: 0.875rem 1.5rem; border-bottom: 1px solid #1e1e2e; display: flex; align-items: center; justify-content: space-between; }
  .result-title { font-size: 13px; color: #6b7280; font-family: 'JetBrains Mono', monospace; }
  .badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
  .badge-success { background: #0f2a1a; color: #4ade80; border: 1px solid #166534; }
  .badge-error { background: #2a0f0f; color: #f87171; border: 1px solid #991b1b; }
  .badge-loading { background: #1e1b4b; color: #a78bfa; border: 1px solid #4c1d95; }
  .result-body { padding: 1.5rem; max-height: 900px; overflow-y: auto; }
  .meta-chip { font-size: 11px; color: #4b5563; font-family: 'JetBrains Mono', monospace; background: #1a1a2e; padding: 3px 8px; border-radius: 4px; }
 
  /* SOURCES HEADING */
  .sources-heading { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #7c3aed; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .sources-count { background: #1e1b4b; color: #a78bfa; font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid #4c1d95; }
 
  /* URL BLOCK */
  .url-block { margin-bottom: 24px; border: 1px solid #1e1e2e; border-radius: 12px; overflow: hidden; }
 
  /* URL card — LEFT aligned, number bhi left pe */
  .url-card { display: flex; align-items: flex-start; gap: 12px; background: #0d0d17; padding: 14px 16px; border-bottom: 1px solid #1e1e2e; text-decoration: none; transition: background 0.2s; justify-content: flex-start; }
  .url-card:hover { background: #0f0a1f; }
  .url-num { width: 28px; height: 28px; background: #1e1b4b; border: 1px solid #4c1d95; border-radius: 7px; color: #a78bfa; font-size: 12px; font-weight: 700; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  .url-info { flex: 1; min-width: 0; text-align: left; }
  .url-title { font-size: 14px; font-weight: 600; color: #e8e6f0; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; }
  .url-domain { font-size: 11px; color: #7c3aed; font-family: 'JetBrains Mono', monospace; display: block; text-align: left; }
  .url-full { font-size: 10px; color: #374151; font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; margin-top: 2px; text-align: left; }
  .url-open { background: #1e1b4b; border: 1px solid #4c1d95; border-radius: 6px; padding: 6px 14px; color: #a78bfa; font-size: 11px; font-family: 'JetBrains Mono', monospace; white-space: nowrap; flex-shrink: 0; transition: all 0.15s; text-decoration: none; align-self: center; margin-left: auto; }
  .url-open:hover { background: #2e2a6b; color: #c4b5fd; }
 
  /* Research section — center label, left-aligned text */
  .url-research { padding: 18px 20px; background: #080810; }
  .url-research-label { font-size: 10px; letter-spacing: 1.2px; color: #4b5563; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; margin-bottom: 12px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .url-research-text { font-size: 13px; line-height: 1.9; color: #c4ccd8; font-family: 'JetBrains Mono', monospace; white-space: pre-wrap; text-align: left; display: block; }
  .url-research-empty { font-size: 12px; color: #4b5563; font-family: 'JetBrains Mono', monospace; font-style: italic; text-align: center; display: block; padding: 8px 0; }
 
  .section-label { font-size: 11px; letter-spacing: 1px; color: #4b5563; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; margin-bottom: 8px; margin-top: 20px; }
  .steps-list { display: flex; flex-direction: column; gap: 6px; }
  .step-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b7280; font-family: 'JetBrains Mono', monospace; }
  .step-dot { width: 6px; height: 6px; background: #7c3aed; border-radius: 50%; flex-shrink: 0; }
 
  .stream-line { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; border-bottom: 1px solid #1a1a2e; font-size: 13px; font-family: 'JetBrains Mono', monospace; }
  .stream-type { font-size: 10px; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; margin-top: 2px; }
  .type-start { background: #1e1b4b; color: #a78bfa; }
  .type-searching { background: #0f2a1a; color: #4ade80; }
  .type-step { background: #1a1a0f; color: #fbbf24; }
  .type-report { background: #0f1a2a; color: #60a5fa; }
  .type-done { background: #0f2a1a; color: #4ade80; }
  .type-error { background: #2a0f0f; color: #f87171; }
  .stream-msg { color: #d1d5db; line-height: 1.5; }
 
  .chat-messages { display: flex; flex-direction: column; gap: 16px; max-height: 450px; overflow-y: auto; padding: 1.5rem; }
  .msg { display: flex; gap: 10px; align-items: flex-start; }
  .msg.user { flex-direction: row-reverse; }
  .msg-avatar { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .msg.user .msg-avatar { background: linear-gradient(135deg, #7c3aed, #2563eb); }
  .msg.agent .msg-avatar { background: #1e1e2e; }
  .msg-bubble { max-width: 75%; padding: 10px 14px; border-radius: 10px; font-size: 14px; line-height: 1.6; }
  .msg.user .msg-bubble { background: #1e1b4b; color: #e8e6f0; border-bottom-right-radius: 2px; }
  .msg.agent .msg-bubble { background: #1a1a2e; color: #d1d5db; border-bottom-left-radius: 2px; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
  .chat-input-row { display: flex; gap: 10px; padding: 1rem 1.5rem; border-top: 1px solid #1e1e2e; }
  .chat-input { flex: 1; background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 8px; padding: 10px 14px; color: #e8e6f0; font-size: 14px; font-family: 'Syne', sans-serif; outline: none; resize: none; height: 44px; }
  .chat-input:focus { border-color: #7c3aed; }
  .send-btn { background: #7c3aed; border: none; border-radius: 8px; padding: 0 16px; color: #fff; font-size: 18px; cursor: pointer; transition: opacity 0.15s; }
  .send-btn:hover { opacity: 0.85; }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-state { text-align: center; padding: 3rem; color: #374151; }
  .empty-icon { font-size: 36px; margin-bottom: 12px; }
  .empty-text { font-size: 14px; font-family: 'JetBrains Mono', monospace; }
  .upload-zone { border: 2px dashed #1e1e2e; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: border-color 0.2s; background: #0a0a0f; }
  .upload-zone:hover, .upload-zone.drag { border-color: #7c3aed; background: #0f0a1f; }
  .upload-icon { font-size: 32px; margin-bottom: 10px; }
  .upload-text { font-size: 14px; color: #6b7280; }
  .upload-sub { font-size: 12px; color: #374151; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
  .doc-card { background: #0d0d17; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .doc-info { display: flex; align-items: center; gap: 10px; }
  .doc-icon { font-size: 20px; }
  .doc-name { font-size: 14px; color: #d1d5db; font-weight: 500; }
  .doc-hash { font-size: 11px; color: #4b5563; font-family: 'JetBrains Mono', monospace; }
  .del-btn { background: #2a0f0f; border: 1px solid #991b1b; border-radius: 6px; padding: 4px 10px; color: #f87171; font-size: 12px; cursor: pointer; font-family: 'JetBrains Mono', monospace; }
  .type-tabs { display: flex; gap: 8px; margin-bottom: 1rem; }
  .type-tab { padding: 6px 14px; border-radius: 6px; border: 1px solid #1e1e2e; background: transparent; color: #6b7280; font-size: 13px; font-family: 'Syne', sans-serif; cursor: pointer; transition: all 0.15s; }
  .type-tab.active { background: #1e1b4b; color: #a78bfa; border-color: #4c1d95; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 2px; }
`;
 
// ── Helpers ──────────────────────────────────────
 
function getDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
}
 
// JSON string se clean text nikalo
function cleanText(raw) {
  if (!raw) return "";
  const t = raw.trim();
  if (t.startsWith("{")) {
    try {
      const p = JSON.parse(t);
      const val = p.summary || p.research || p.content || "";
      return val.replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
    } catch {
      // partial JSON — regex se nikalo
      const m = t.match(/"(?:summary|research|content)"\s*:\s*"([\s\S]*?)(?=",\s*"[a-z]|"\s*\})/);
      if (m) return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
    }
  }
  // Agar JSON array string hai
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t);
      return arr.map(a => a.research || a.summary || a.content || "").filter(Boolean).join("\n\n").trim();
    } catch {}
  }
  return t;
}
 
// Backend ki saari possible response structures handle karo
// url_reports → sources → report text — sab check karo
function buildList(data) {
  const seen = new Set();
  const result = [];
 
  // ── Priority 1: url_reports (har URL ki alag research) ──
  const urlReports = data.url_reports || data.urlReports || [];
  for (const r of urlReports) {
    if (!r?.url || seen.has(r.url)) continue;
    seen.add(r.url);
    result.push({
      url: r.url,
      title: r.title || getDomain(r.url),
      research: cleanText(r.research || r.summary || r.content || ""),
    });
  }
 
  // ── Priority 2: sources array ──
  for (const s of (data.sources || [])) {
    if (!s?.url || seen.has(s.url)) continue;
    seen.add(s.url);
    result.push({
      url: s.url,
      title: s.title || getDomain(s.url),
      research: cleanText(s.research || s.summary || s.content || ""),
    });
  }
 
  return result;
}
 
// Agar research empty hai — report text se us URL ka hissa nikalo
function getSnippet(report, url, title, allUrls, idx) {
  if (!report) return "";
  const domain = getDomain(url);
 
  // URL directly mention ho
  let pos = report.indexOf(url);
  if (pos === -1) pos = report.indexOf(domain);
  if (pos === -1 && title) pos = report.indexOf(title.split(" ")[0]);
 
  if (pos !== -1) {
    const start = Math.max(0, report.lastIndexOf("\n\n", pos));
    const others = allUrls
      .filter((_, i) => i !== idx)
      .map(u => report.indexOf(u.url) > pos ? report.indexOf(u.url) : report.indexOf(getDomain(u.url)))
      .filter(p => p > pos)
      .sort((a, b) => a - b);
    const end = others.length > 0
      ? Math.min(others[0], pos + 900)
      : Math.min(report.length, pos + 900);
    const chunk = report.slice(start, end).trim();
    if (chunk.length > 50) return chunk;
  }
 
  // Fallback: equal divide
  const n = allUrls.length || 1;
  const size = Math.floor(report.length / n);
  return report.slice(idx * size, Math.min(report.length, (idx + 1) * size)).trim();
}
 
// ══════════════════════════════════════════════════
// COMPONENT: URL (left) → Research (neeche) — ek ek
// ══════════════════════════════════════════════════
function UrlResearchList({ data }) {
  const list = buildList(data);
  if (!list.length) return null;
 
  return (
    <div>
      <div className="sources-heading">
        🔗 Research Sources
        <span className="sources-count">{list.length} sources</span>
      </div>
 
      {list.map((item, i) => {
        // Alag research chahiye — agar source mein nahi toh report se nikalo
        const text = item.research || getSnippet(data.report, item.url, item.title, list, i);
 
        return (
          <div className="url-block" key={i}>
 
            {/* URL — LEFT ALIGNED */}
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="url-card">
              <div className="url-num">{i + 1}</div>
              <div className="url-info">
                <div className="url-title">{item.title}</div>
                <span className="url-domain">{getDomain(item.url)}</span>
                <span className="url-full">{item.url}</span>
              </div>
              <span className="url-open">↗ Open</span>
            </a>
 
            {/* Research — neeche, label center, text left */}
            <div className="url-research">
              <div className="url-research-label">📋 Research from this source</div>
              {text
                ? <pre className="url-research-text">{text}</pre>
                : <span className="url-research-empty">Is source se koi research nahi mili.</span>
              }
            </div>
 
          </div>
        );
      })}
    </div>
  );
}
 
function getDocIcon(f) {
  return { pdf: "📄", docx: "📝", doc: "📝", txt: "📃", csv: "📊" }[f?.split(".").pop()?.toLowerCase()] || "📁";
}
 
// ══════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════
export default function App() {
  const [activeTab, setActiveTab]           = useState("research");
  const [loading, setLoading]               = useState(false);
  const [researchQuery, setResearchQuery]   = useState("");
  const [researchDeep, setResearchDeep]     = useState(true);
  const [researchLang, setResearchLang]     = useState("english");
  const [researchResult, setResearchResult] = useState(null);
  const [streamQuery, setStreamQuery]       = useState("");
  const [streamLang, setStreamLang]         = useState("english");
  const [streamEvents, setStreamEvents]     = useState([]);
  const [streaming, setStreaming]           = useState(false);
  const [execTask, setExecTask]             = useState("");
  const [execCode, setExecCode]             = useState("");
  const [execResearch, setExecResearch]     = useState(false);
  const [execResult, setExecResult]         = useState(null);
  const [chatInput, setChatInput]           = useState("");
  const [chatHistory, setChatHistory]       = useState([]);
  const chatEndRef                          = useRef(null);
  const [docType, setDocType]               = useState("permanent");
  const [docs, setDocs]                     = useState([]);
  const [docLoading, setDocLoading]         = useState(false);
  const [docMsg, setDocMsg]                 = useState(null);
  const [dragOver, setDragOver]             = useState(false);
  const fileInputRef                        = useRef(null);
 
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);
  useEffect(() => { if (activeTab === "docs") loadDocs(); }, [activeTab]);
 
  async function loadDocs() {
    try { const r = await fetch(`${API_BASE}/docs/list`); const d = await r.json(); setDocs(d.documents || []); } catch {}
  }
 
  async function uploadFile(file) {
    if (!file) return;
    setDocLoading(true); setDocMsg(null);
    const form = new FormData(); form.append("file", file);
    const url = docType === "permanent" ? `${API_BASE}/docs/upload` : `${API_BASE}/docs/upload/temp`;
    if (docType === "temp") form.append("session_id", "default");
    try {
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) { setDocMsg({ ok: true, text: `✅ "${data.filename}" uploaded! ${data.chunks} chunks.` }); if (docType === "permanent") loadDocs(); }
      else { setDocMsg({ ok: false, text: `❌ ${data.detail?.error || "Upload failed"}` }); }
    } catch (e) { setDocMsg({ ok: false, text: `❌ ${e.message}` }); }
    setDocLoading(false);
  }
 
  async function deleteDoc(hash) {
    try { await fetch(`${API_BASE}/docs/${hash}`, { method: "DELETE" }); loadDocs(); } catch {}
  }
 
  async function runResearch() {
    if (!researchQuery.trim()) return;
    setLoading(true); setResearchResult(null);
    try {
      const res = await fetch(`${API_BASE}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery, deep_search: researchDeep, language: researchLang }),
      });
      const data = await res.json();
      // Console mein check karo ke backend kya return karta hai
      console.log("API Response:", JSON.stringify(data).slice(0, 500));
      setResearchResult({ ok: res.ok, data });
    } catch (e) { setResearchResult({ ok: false, data: { detail: { error: e.message } } }); }
    setLoading(false);
  }
 
  async function runStream() {
    if (!streamQuery.trim() || streaming) return;
    setStreaming(true); setStreamEvents([]);
    try {
      const res = await fetch(`${API_BASE}/research/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: streamQuery, deep_search: true, language: streamLang }),
      });
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) { try { setStreamEvents(prev => [...prev, JSON.parse(line.slice(6))]); } catch {} }
        }
      }
    } catch (e) { setStreamEvents(prev => [...prev, { type: "error", msg: e.message }]); }
    setStreaming(false);
  }
 
  async function runExecute() {
    if (!execTask.trim()) return;
    setLoading(true); setExecResult(null);
    try {
      const res = await fetch(`${API_BASE}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: execTask, code: execCode || undefined, research_first: execResearch }),
      });
      setExecResult({ ok: res.ok, data: await res.json() });
    } catch (e) { setExecResult({ ok: false, data: { detail: { error: e.message } } }); }
    setLoading(false);
  }
 
  async function sendChat() {
    if (!chatInput.trim() || loading) return;
    const msg = chatInput.trim(); setChatInput("");
    const history = chatHistory.map(m => ({ role: m.role, content: m.content }));
    setChatHistory(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history, session_id: "default" }),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, {
        role: "agent",
        content: res.ok ? data.response : `Error: ${data.detail?.error || "Unknown"}`,
        sources: data.sources,
        time: data.time_seconds,
      }]);
    } catch (e) { setChatHistory(prev => [...prev, { role: "agent", content: `Error: ${e.message}` }]); }
    setLoading(false);
  }
 
  return (
    <>
      <style>{styles}</style>
      <div className="app">
 
        <header className="header">
          <div className="logo">
            <div className="logo-icon">🤖</div>
            <div>
              <div className="logo-text">AI Research Agent</div>
              <div className="logo-sub">Groq · LangGraph · Tavily · RAG</div>
            </div>
          </div>
          <div className="status-pill"><div className="status-dot" />localhost:8000</div>
        </header>
 
        <div className="main">
          <aside className="sidebar">
            <div className="sidebar-label">Navigation</div>
            {tabs.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </aside>
 
          <main className="content">
 
            {/* ═══ RESEARCH ═══ */}
            {activeTab === "research" && (<>
              <div className="panel">
                <div className="panel-header"><span>🔍</span><span className="panel-title">Deep Research</span></div>
                <div className="panel-body">
                  <div>
                    <div className="field-label">QUERY</div>
                    <textarea rows={3} placeholder="Pakistan economy 2025, AI trends..."
                      value={researchQuery}
                      onChange={e => setResearchQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && e.ctrlKey && runResearch()} />
                  </div>
                  <div className="row">
                    <div className="field">
                      <div className="field-label">LANGUAGE</div>
                      <select value={researchLang} onChange={e => setResearchLang(e.target.value)}>
                        <option value="english">English</option>
                        <option value="urdu">Urdu</option>
                        <option value="urdu_english">Urdu + English</option>
                      </select>
                    </div>
                    <div className="field" style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                      <div className="toggle-row">
                        <button className={`toggle ${researchDeep ? "on" : ""}`} onClick={() => setResearchDeep(v => !v)} />
                        <span className="toggle-label">Deep Search</span>
                      </div>
                    </div>
                  </div>
                  <button className="run-btn" onClick={runResearch} disabled={loading || !researchQuery.trim()}>
                    {loading ? <><div className="spinner" /> Researching...</> : <>🔍 Run Research</>}
                  </button>
                </div>
              </div>
 
              {researchResult && (
                <div className="result-panel">
                  <div className="result-header">
                    <span className="result-title">output // research_report</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {researchResult.data.time_seconds && <span className="meta-chip">{researchResult.data.time_seconds}s</span>}
                      {researchResult.data.total_sources > 0 && <span className="meta-chip">{researchResult.data.total_sources} sources</span>}
                      <span className={`badge ${researchResult.ok ? "badge-success" : "badge-error"}`}>
                        {researchResult.ok ? "success" : "error"}
                      </span>
                    </div>
                  </div>
                  <div className="result-body">
                    {researchResult.ok ? (
                      <UrlResearchList data={researchResult.data} />
                    ) : (
                      <pre style={{ color: "#f87171", fontSize: 13, fontFamily: "monospace" }}>
                        {JSON.stringify(researchResult.data.detail || researchResult.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </>)}
 
            {/* ═══ STREAM ═══ */}
            {activeTab === "stream" && (<>
              <div className="panel">
                <div className="panel-header"><span>📡</span><span className="panel-title">Live Stream Research</span></div>
                <div className="panel-body">
                  <div><div className="field-label">QUERY</div><textarea rows={2} placeholder="Real-time research query..." value={streamQuery} onChange={e => setStreamQuery(e.target.value)} /></div>
                  <div className="field">
                    <div className="field-label">LANGUAGE</div>
                    <select value={streamLang} onChange={e => setStreamLang(e.target.value)}>
                      <option value="english">English</option>
                      <option value="urdu">Urdu</option>
                      <option value="urdu_english">Urdu + English</option>
                    </select>
                  </div>
                  <button className="run-btn" onClick={runStream} disabled={streaming || !streamQuery.trim()}>
                    {streaming ? <><div className="spinner" /> Streaming...</> : <>📡 Start Stream</>}
                  </button>
                </div>
              </div>
              <div className="result-panel">
                <div className="result-header">
                  <span className="result-title">output // live_stream</span>
                  {streaming && <span className="badge badge-loading">● streaming</span>}
                </div>
                <div className="result-body">
                  {streamEvents.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📡</div><div className="empty-text">Stream events yahan aayenge...</div></div>
                    : streamEvents.map((ev, i) => (
                      <div className="stream-line" key={i}>
                        <span className={`stream-type type-${ev.type}`}>{ev.type}</span>
                        <span className="stream-msg">{ev.msg || ev.content || (ev.steps && ev.steps.join(" → ")) || JSON.stringify(ev)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </>)}
 
            {/* ═══ EXECUTE ═══ */}
            {activeTab === "execute" && (<>
              <div className="panel">
                <div className="panel-header"><span>⚡</span><span className="panel-title">Code Executor</span></div>
                <div className="panel-body">
                  <div><div className="field-label">TASK DESCRIPTION</div><textarea rows={2} placeholder="Python mein fibonacci banao..." value={execTask} onChange={e => setExecTask(e.target.value)} /></div>
                  <div><div className="field-label">CODE (optional)</div><textarea rows={5} placeholder="# Python code yahan paste karo..." value={execCode} onChange={e => setExecCode(e.target.value)} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }} /></div>
                  <div className="toggle-row">
                    <button className={`toggle ${execResearch ? "on" : ""}`} onClick={() => setExecResearch(v => !v)} />
                    <span className="toggle-label">Research first</span>
                  </div>
                  <button className="run-btn" onClick={runExecute} disabled={loading || !execTask.trim()}>
                    {loading ? <><div className="spinner" /> Executing...</> : <>⚡ Execute</>}
                  </button>
                </div>
              </div>
              {execResult && (
                <div className="result-panel">
                  <div className="result-header">
                    <span className="result-title">output // execution_result</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {execResult.data.time_seconds && <span className="meta-chip">{execResult.data.time_seconds}s</span>}
                      <span className={`badge ${execResult.ok ? "badge-success" : "badge-error"}`}>{execResult.ok ? "success" : "error"}</span>
                    </div>
                  </div>
                  <div className="result-body">
                    <pre style={{ color: execResult.ok ? "#d1d5db" : "#f87171", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                      {execResult.ok ? execResult.data.result : JSON.stringify(execResult.data.detail || execResult.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>)}
 
            {/* ═══ CHAT ═══ */}
            {activeTab === "chat" && (
              <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div className="panel-header">
                  <span>💬</span><span className="panel-title">Chat with Agent</span>
                  {chatHistory.length > 0 && (
                    <button onClick={() => setChatHistory([])} style={{ marginLeft: "auto", background: "transparent", border: "1px solid #1e1e2e", borderRadius: 6, padding: "4px 10px", color: "#6b7280", fontSize: 12, cursor: "pointer", fontFamily: "'JetBrains Mono',monospace" }}>clear</button>
                  )}
                </div>
                <div className="chat-messages">
                  {chatHistory.length === 0
                    ? <div className="empty-state"><div className="empty-icon">💬</div><div className="empty-text">Agent se kuch bhi pucho...</div></div>
                    : chatHistory.map((m, i) => (
                      <div className={`msg ${m.role}`} key={i}>
                        <div className="msg-avatar">{m.role === "user" ? "👤" : "🤖"}</div>
                        <div className="msg-bubble">
                          {m.content}
                          {m.time && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6, fontFamily: "'JetBrains Mono',monospace" }}>{m.time}s</div>}
                        </div>
                      </div>
                    ))}
                  {loading && (
                    <div className="msg agent">
                      <div className="msg-avatar">🤖</div>
                      <div className="msg-bubble" style={{ color: "#6b7280" }}>
                        <div className="spinner" style={{ borderTopColor: "#7c3aed", borderColor: "rgba(124,58,237,0.3)" }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="chat-input-row">
                  <textarea className="chat-input" placeholder="Kuch bhi pucho... (Enter = send)"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} />
                  <button className="send-btn" onClick={sendChat} disabled={loading || !chatInput.trim()}>➤</button>
                </div>
              </div>
            )}
 
            {/* ═══ DOCUMENTS ═══ */}
            {activeTab === "docs" && (<>
              <div className="panel">
                <div className="panel-header"><span>📚</span><span className="panel-title">Document Knowledge Base</span></div>
                <div className="panel-body">
                  <div className="type-tabs">
                    <button className={`type-tab ${docType === "permanent" ? "active" : ""}`} onClick={() => setDocType("permanent")}>💾 Permanent</button>
                    <button className={`type-tab ${docType === "temp" ? "active" : ""}`} onClick={() => setDocType("temp")}>⚡ Temporary</button>
                  </div>
                  <div className={`upload-zone ${dragOver ? "drag" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); uploadFile(e.dataTransfer.files[0]); }}>
                    <div className="upload-icon">{docLoading ? "⏳" : "📂"}</div>
                    <div className="upload-text">{docLoading ? "Uploading..." : "Click ya drag & drop"}</div>
                    <div className="upload-sub">PDF · DOCX · TXT · CSV</div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.csv" style={{ display: "none" }} onChange={e => uploadFile(e.target.files[0])} />
                  </div>
                  {docMsg && (
                    <div style={{ padding: "10px 14px", borderRadius: 8, background: docMsg.ok ? "#0f2a1a" : "#2a0f0f", border: `1px solid ${docMsg.ok ? "#166534" : "#991b1b"}`, fontSize: 13, color: docMsg.ok ? "#4ade80" : "#f87171", fontFamily: "'JetBrains Mono',monospace" }}>
                      {docMsg.text}
                    </div>
                  )}
                </div>
              </div>
              <div className="result-panel">
                <div className="result-header">
                  <span className="result-title">knowledge_base // documents</span>
                  <span className="meta-chip">{docs.length} docs</span>
                </div>
                <div className="result-body">
                  {docs.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-text">Koi document nahi</div></div>
                    : docs.map((d, i) => (
                      <div className="doc-card" key={i}>
                        <div className="doc-info">
                          <span className="doc-icon">{getDocIcon(d.filename)}</span>
                          <div><div className="doc-name">{d.filename}</div><div className="doc-hash">{d.doc_hash}</div></div>
                        </div>
                        <button className="del-btn" onClick={() => deleteDoc(d.doc_hash)}>delete</button>
                      </div>
                    ))}
                </div>
              </div>
            </>)}
 
          </main>
        </div>
      </div>
    </>
  );
}