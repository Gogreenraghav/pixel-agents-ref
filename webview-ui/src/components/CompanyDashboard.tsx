import { useState } from 'react';
import { OrgChart } from './OrgChart.js';
import { CEOInbox } from './CEOInbox.js';

interface HiredAgent {
  id: string; name: string; role: string; dept: string; status: string;
  salary: number; currency: string; country: string; performance: number;
  level: number; tasksCompleted: number;
  aiConfig?: { provider: string; model: string; connected: boolean };
}
interface Task {
  id: string; agentId: string; agentName: string; type: string; title: string;
  status: 'todo' | 'running' | 'done' | 'failed'; createdAt: string; output?: string;
}
interface Props {
  agents: HiredAgent[]; companyBalance: number; companyRevenue: number; onClose: () => void;
}

const TASK_TYPES = ['Code', 'Research', 'Draft', 'Analysis', 'Sales Script', 'Design', 'Review'];
const LS_TASKS = 'pixeloffice_tasks';
const LS_OUTPUTS = 'pixeloffice_outputs';

function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(LS_TASKS) ?? 'null') ?? MOCK_TASKS; } catch { return MOCK_TASKS; }
}
function saveTasks(t: Task[]) { try { localStorage.setItem(LS_TASKS, JSON.stringify(t)); } catch {} }
function saveOutput(agentId: string, taskId: string, taskTitle: string, output: string) {
  try {
    const key = LS_OUTPUTS + '_' + agentId;
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]');
    existing.unshift({ taskId, taskTitle, output, date: new Date().toLocaleString() });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  } catch {}
}
const MOCK_TASKS: Task[] = [
  { id: 't1', agentId: '', agentName: 'Ravi (Developer)', type: 'Code', title: 'Build login API', status: 'done', createdAt: '2026-04-02 09:00', output: 'Login API completed with JWT auth.' },
  { id: 't2', agentId: '', agentName: 'Priya (Designer)', type: 'Design', title: 'Homepage mockup', status: 'running', createdAt: '2026-04-02 10:30' },
  { id: 't3', agentId: '', agentName: 'Amit (Analyst)', type: 'Research', title: 'Market analysis Q2', status: 'todo', createdAt: '2026-04-02 11:00' },
  { id: 't4', agentId: '', agentName: 'Sara (Marketing)', type: 'Draft', title: 'Email campaign copy', status: 'failed', createdAt: '2026-04-02 08:00' },
];

const COL_CFG = [
  { key: 'todo' as const,    label: '📌 TO DO',   bg: '#0d1a33', color: '#44aaff' },
  { key: 'running' as const, label: '⚡ RUNNING', bg: '#1a0e00', color: '#ffbb44' },
  { key: 'done' as const,    label: '✅ DONE',    bg: '#061a0d', color: '#33ffaa' },
  { key: 'failed' as const,  label: '❌ FAILED',  bg: '#1a0606', color: '#ff6666' },
];

const inp: React.CSSProperties = {
  background: '#0a0a14', color: '#aaddff', border: '2px solid #334466',
  fontFamily: 'monospace', fontSize: '17px', padding: '8px 10px', width: '100%', boxSizing: 'border-box',
};

function TaskBoard({ agents }: { agents: HiredAgent[] }) {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [_errorId, setErrorId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Code');
  const [newAgent, setNewAgent] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateTasks = (updater: (prev: Task[]) => Task[]) => {
    setTasks(prev => { const next = updater(prev); saveTasks(next); return next; });
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const agent = agents.find(a => a.id === newAgent);
    const agentName = agent?.name ?? 'Unassigned';
    const newTask: Task = { id: `t${Date.now()}`, agentId: newAgent, agentName, type: newType, title: newTitle, status: 'todo', createdAt: new Date().toLocaleString() };
    updateTasks(p => [newTask, ...p]);
    setNewTitle(''); setShowNew(false);
  };

  const runTaskWithAI = async (task: Task) => {
    const agent = agents.find(a => a.id === task.agentId);
    if (!agent?.aiConfig) { setErrorId(task.id); return; }
    setRunningId(task.id);
    setErrorId(null);
    updateTasks(p => p.map(t => t.id === task.id ? { ...t, status: 'running' } : t));

    const prompt = `You are ${agent.name}, a ${agent.role} at a company. Complete this task professionally and thoroughly:\n\nTask Type: ${task.type}\nTask: ${task.title}\n\nProvide a complete, professional output for this task. Be specific and practical.`;

    try {
      const cfg = agent.aiConfig as any;
      const res = await fetch((cfg.baseUrl ?? '').replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey ?? ''}` },
        body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 512 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const output = data.choices?.[0]?.message?.content ?? '(no output)';
      updateTasks(p => p.map(t => t.id === task.id ? { ...t, status: 'done', output } : t));
      saveOutput(task.agentId, task.id, task.title, output);
    } catch (e: any) {
      updateTasks(p => p.map(t => t.id === task.id ? { ...t, status: 'failed', output: e.message } : t));
      setErrorId(task.id);
    } finally { setRunningId(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#66ddff', fontSize: '20px', fontWeight: 'bold' }}>Total: {tasks.length} tasks</span>
        <button onClick={() => setShowNew(v => !v)} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', background: '#0d1a2a', color: '#66aaff', border: '2px solid #334466', cursor: 'pointer' }}>+ New Task</button>
      </div>

      {showNew && (
        <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={inp} placeholder="Task title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...inp, flex: 1 }} value={newType} onChange={e => setNewType(e.target.value)}>
              {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select style={{ ...inp, flex: 1 }} value={newAgent} onChange={e => setNewAgent(e.target.value)}>
              <option value="">Unassigned</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
            </select>
          </div>
          <button onClick={addTask} style={{ ...inp, cursor: 'pointer', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', fontSize: '18px', fontWeight: 'bold' }}>✓ Assign Task</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, flex: 1, overflow: 'hidden' }}>
        {COL_CFG.map(col => (
          <div key={col.key} style={{ background: col.bg, border: `2px solid ${col.color}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', fontSize: '22px', color: col.color, fontWeight: 'bold', letterSpacing: 1, borderBottom: `2px solid ${col.color}` }}>
              {col.label} ({tasks.filter(t => t.status === col.key).length})
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.filter(t => t.status === col.key).map(task => (
                <div key={task.id} onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  style={{ background: '#111128', border: `2px solid ${col.color}55`, padding: '12px 14px', cursor: 'pointer' }}>
                  <div style={{ fontSize: '18px', color: '#ffcc00', fontWeight: 'bold', marginBottom: 6 }}>[{task.type}]</div>
                  <div style={{ fontSize: '20px', color: '#aaddff', fontWeight: 'bold', lineHeight: 1.4 }}>{task.title}</div>
                  <div style={{ fontSize: '18px', color: '#55ffbb', fontWeight: 'bold', marginTop: 8 }}>{task.agentName}</div>
                  {/* Run / Delete buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {task.status === 'todo' && agents.find(a => a.id === task.agentId)?.aiConfig && (
                      <button onClick={e => { e.stopPropagation(); runTaskWithAI(task); }}
                        disabled={runningId === task.id}
                        style={{ flex: 1, padding: '6px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>
                        {runningId === task.id ? '⏳ Running...' : '▶ Run (AI)'}
                      </button>
                    )}
                    {task.status === 'failed' && agents.find(a => a.id === task.agentId)?.aiConfig && (
                      <button onClick={e => { e.stopPropagation(); updateTasks(p => p.map(t => t.id === task.id ? { ...t, status: 'todo', output: undefined } : t)); }}
                        style={{ flex: 1, padding: '6px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', background: '#1a0a0a', color: '#ffaa44', border: '2px solid #aa5500', cursor: 'pointer' }}>
                        🔄 Retry
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); updateTasks(p => p.filter(t => t.id !== task.id)); }}
                      style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: '15px', background: '#1a0808', color: '#ff4444', border: '2px solid #aa2222', cursor: 'pointer' }}>
                      🗑
                    </button>
                  </div>
                  {expandedId === task.id && task.output && (
                    <div style={{ marginTop: 10, padding: '10px', background: '#0a1a0a', border: '2px solid #1a7a3a', fontSize: '16px', color: '#aaffaa', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.output}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function loadAgentOutputs(agentId: string): Array<{name: string; size: string; date: string; content: string}> {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_OUTPUTS + '_' + agentId) ?? '[]');
    return raw.map((o: any) => ({
      name: `${o.taskTitle?.replace(/[^a-z0-9]/gi,'_').toLowerCase() ?? 'output'}_${o.date?.replace(/[^0-9]/g,'').slice(0,12) ?? Date.now()}.txt`,
      size: `${(o.output?.length / 1024).toFixed(1)} KB`,
      date: o.date,
      content: o.output,
    }));
  } catch { return []; }
}

function OutputFolders({ agents }: { agents: HiredAgent[] }) {
  const [sel, setSel] = useState<string | null>(agents[0]?.id ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0); void refresh;

  const agent = agents.find(a => a.id === sel);
  const files = agent ? loadAgentOutputs(agent.id) : [];

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      <div style={{ width: 200, borderRight: '2px solid #223355', overflowY: 'auto', background: '#080812' }}>
        <div style={{ padding: '12px 16px', borderBottom: '2px solid #223355', fontSize: '20px', color: '#66ddff', fontWeight: 'bold', letterSpacing: 2 }}>AGENTS</div>
        {agents.length === 0 && <div style={{ padding: '16px', color: '#667788', fontSize: '16px' }}>No agents hired</div>}
        {agents.map(a => (
          <div key={a.id} onClick={() => { setSel(a.id); setPreview(null); }} style={{
            padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #111133',
            background: sel === a.id ? '#112233' : 'transparent',
            borderLeft: sel === a.id ? '3px solid #44aaff' : '3px solid transparent',
          }}>
            <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold' }}>📁 {a.name}</div>
            <div style={{ fontSize: '17px', color: '#8899bb', fontWeight: 'bold', marginTop: 3 }}>{a.role}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {agent ? (
          <>
            <div style={{ padding: '12px 18px', borderBottom: '2px solid #223355', fontSize: '22px', color: '#66ddff', fontWeight: 'bold', background: '#0d0d1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📁 {agent.name} / {agent.role} — {files.length} files</span>
              <button onClick={() => setRefresh(r => r + 1)} style={{ padding: '4px 12px', fontFamily: 'monospace', fontSize: '15px', background: '#0d1a2a', color: '#66aaff', border: '2px solid #334466', cursor: 'pointer' }}>🔄</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map((f, i) => (
                <div key={i} style={{ background: '#0d0d1e', border: '2px solid #223355', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: '26px' }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '20px', color: '#aaddff', fontWeight: 'bold' }}>{f.name}</div>
                    <div style={{ fontSize: '16px', color: '#8899aa', marginTop: 4 }}>{f.date} · {f.size}</div>
                  </div>
                  <button onClick={() => setPreview(preview === f.name ? null : f.name)} style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '17px', fontWeight: 'bold', background: '#0d1a2a', color: '#88aaff', border: '2px solid #334466', cursor: 'pointer' }}>👁 View</button>
                  <button onClick={() => { const el = document.createElement('a'); el.href = 'data:text/plain,' + encodeURIComponent(f.content); el.download = f.name; el.click(); }} style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '17px', fontWeight: 'bold', background: '#0d2a0d', color: '#66ff88', border: '2px solid #336633', cursor: 'pointer' }}>⬇ Save</button>
                </div>
              ))}
              {preview && (
                <div style={{ background: '#080f08', border: '2px solid #1a5a2a', padding: '14px 16px' }}>
                  <div style={{ fontSize: '16px', color: '#557755', marginBottom: 8 }}>── {preview} ──</div>
                  <pre style={{ margin: 0, fontSize: '16px', color: '#aaffaa', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{files.find(f => f.name === preview)?.content}</pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#445566', fontSize: '18px' }}>Select an agent to view their output folder</div>
        )}
      </div>
    </div>
  );
}

const LS_SCRUM = 'pixeloffice_scrum_logs';
interface ScrumRow { agentName: string; role: string; yesterday: string; today: string; blockers: string; }
interface ScrumLog { date: string; rows: ScrumRow[]; summary?: string; }

function loadScrumLogs(): ScrumLog[] {
  try { return JSON.parse(localStorage.getItem(LS_SCRUM) ?? '[]'); } catch { return []; }
}

function ScrumBoard({ agents }: { agents: HiredAgent[] }) {
  const [logs, setLogs] = useState<ScrumLog[]>(loadScrumLogs);
  const [running, setRunning] = useState(false);
  const [activeLog, setActiveLog] = useState<ScrumLog | null>(logs[0] ?? null);
  const today = new Date().toLocaleDateString();
  const ceo = agents.find(a => a.role === 'CEO');

  const runScrum = async () => {
    if (running || agents.length === 0) return;
    setRunning(true);
    const rows: ScrumRow[] = [];

    // Each agent generates their standup via AI (or placeholder if no AI)
    for (const agent of agents) {
      if (agent.aiConfig) {
        try {
          const cfg = agent.aiConfig as any;
          const prompt = `You are ${agent.name}, a ${agent.role}. Give a brief daily standup in JSON format with keys: yesterday, today, blockers. Keep each under 10 words. JSON only, no markdown.`;
          const res = await fetch((cfg.baseUrl ?? '').replace(/\/$/, '') + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey ?? ''}` },
            body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 100 }),
          });
          const data = await res.json();
          const txt = data.choices?.[0]?.message?.content ?? '{}';
          const parsed = JSON.parse(txt.replace(/```json|```/g, '').trim());
          rows.push({ agentName: agent.name, role: agent.role, yesterday: parsed.yesterday ?? 'Completed tasks', today: parsed.today ?? 'Continuing work', blockers: parsed.blockers ?? 'None' });
        } catch {
          rows.push({ agentName: agent.name, role: agent.role, yesterday: 'Completed tasks', today: 'Continuing work', blockers: 'None' });
        }
      } else {
        rows.push({ agentName: agent.name, role: agent.role, yesterday: 'Completed assigned work', today: 'Working on new tasks', blockers: 'None' });
      }
    }

    // CEO summarizes if AI enabled
    let summary = '';
    if (ceo?.aiConfig) {
      try {
        const cfg = ceo.aiConfig as any;
        const standupText = rows.map(r => `${r.agentName} (${r.role}): Yesterday: ${r.yesterday}. Today: ${r.today}. Blockers: ${r.blockers}`).join('\n');
        const prompt = `You are ${ceo.name}, CEO. Summarize this team standup in 2-3 sentences and list any action items:\n${standupText}`;
        const res = await fetch((cfg.baseUrl ?? '').replace(/\/$/, '') + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey ?? ''}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 150 }),
        });
        const data = await res.json();
        summary = data.choices?.[0]?.message?.content ?? '';
      } catch { summary = 'CEO summary unavailable.'; }
    }

    const newLog: ScrumLog = { date: today, rows, summary };
    const newLogs = [newLog, ...logs.slice(0, 9)];
    setLogs(newLogs);
    setActiveLog(newLog);
    try { localStorage.setItem(LS_SCRUM, JSON.stringify(newLogs)); } catch {}
    setRunning(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold' }}>📅 Daily Standup — {today}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {logs.length > 1 && (
            <select onChange={e => setActiveLog(logs[parseInt(e.target.value)])} style={{ background: '#0a0a14', color: '#aaddff', border: '2px solid #334466', fontFamily: 'monospace', fontSize: '15px', padding: '6px' }}>
              {logs.map((l, i) => <option key={i} value={i}>📅 {l.date}</option>)}
            </select>
          )}
          <button onClick={runScrum} disabled={running || agents.length === 0} style={{ padding: '10px 20px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', background: running ? '#0a0a0a' : '#0a1a0a', color: running ? '#334455' : '#00ff88', border: '2px solid', borderColor: running ? '#222233' : '#00ff88', cursor: running ? 'wait' : 'pointer' }}>
            {running ? '⏳ Running Scrum...' : '▶ Run Scrum (AI)'}
          </button>
        </div>
      </div>

      {agents.length === 0 && <div style={{ color: '#667788', fontSize: '17px', padding: 20 }}>No agents hired. Hire agents to run scrum.</div>}

      {activeLog && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', background: '#0a0a18', border: '2px solid #223355' }}>
            {['Agent', 'Yesterday', 'Today', 'Blockers'].map(h => (
              <div key={h} style={{ padding: '12px 16px', fontSize: '20px', color: '#66ddff', fontWeight: 'bold', background: '#0a0a18', borderBottom: '2px solid #223355' }}>{h}</div>
            ))}
            {activeLog.rows.map((e, i) => (
              <>
                <div key={`a${i}`} style={{ padding: '14px 16px', background: i % 2 === 0 ? '#0d0d1a' : '#0a0a16', borderRight: '1px solid #223355' }}>
                  <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold' }}>{e.agentName}</div>
                  <div style={{ fontSize: '17px', color: '#88aacc', fontWeight: 'bold', marginTop: 4 }}>{e.role}</div>
                </div>
                <div key={`y${i}`} style={{ padding: '14px 16px', fontSize: '18px', color: '#99ccdd', background: i % 2 === 0 ? '#0d0d1a' : '#0a0a16', borderRight: '1px solid #223355', lineHeight: 1.6 }}>{e.yesterday}</div>
                <div key={`t${i}`} style={{ padding: '14px 16px', fontSize: '18px', color: '#88ffbb', background: i % 2 === 0 ? '#0d0d1a' : '#0a0a16', borderRight: '1px solid #223355', lineHeight: 1.6 }}>{e.today}</div>
                <div key={`b${i}`} style={{ padding: '14px 16px', fontSize: '20px', fontWeight: 'bold', color: e.blockers === 'None' ? '#55ccee' : '#ffaa44', background: i % 2 === 0 ? '#0d0d1a' : '#0a0a16', lineHeight: 1.6 }}>{e.blockers}</div>
              </>
            ))}
          </div>

          {activeLog.summary && (
            <div style={{ background: '#0a1a0a', border: '2px solid #1a7a3a', padding: '16px' }}>
              <div style={{ fontSize: '18px', color: '#ffd700', fontWeight: 'bold', marginBottom: 10 }}>👑 CEO Summary:</div>
              <div style={{ fontSize: '17px', color: '#aaffaa', lineHeight: 1.7 }}>{activeLog.summary}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Analytics({ agents, companyBalance, companyRevenue }: { agents: HiredAgent[]; companyBalance: number; companyRevenue: number }) {
  const maxPerf = Math.max(...agents.map(a => a.performance), 1);
  const deptCount: Record<string, number> = {};
  agents.forEach(a => { deptCount[a.dept] = (deptCount[a.dept] ?? 0) + 1; });

  const kpis = [
    { label: '💰 Balance', value: `$${companyBalance.toLocaleString()}`, color: '#00ff88' },
    { label: '📈 Revenue/day', value: `$${Math.round(companyRevenue / 30).toLocaleString()}`, color: '#66ddff' },
    { label: '👥 Headcount', value: String(agents.length), color: '#ffdd44' },
    { label: '✅ Tasks Done', value: String(agents.reduce((s, a) => s + (a.tasksCompleted ?? 0), 0)), color: '#ff88cc' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#0a0a16', border: '2px solid #223355', padding: '20px 22px' }}>
            <div style={{ fontSize: '18px', color: '#8899aa', fontWeight: 'bold', marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#0a0a16', border: '2px solid #223355', padding: '20px' }}>
        <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 16 }}>📊 Agent Performance</div>
        {agents.length === 0 && <div style={{ color: '#667788', fontSize: '17px' }}>No agents hired</div>}
        {agents.map(a => (
          <div key={a.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '20px', color: '#77ccff', fontWeight: 'bold' }}>{a.name} ({a.role})</span>
              <span style={{ fontSize: '22px', color: '#ffee55', fontWeight: 'bold' }}>{a.performance}%</span>
            </div>
            <div style={{ height: 22, background: '#111133', border: '2px solid #223355' }}>
              <div style={{ height: '100%', width: `${(a.performance / maxPerf) * 100}%`, background: a.performance >= 80 ? '#00ff88' : a.performance >= 50 ? '#ffaa44' : '#ff4444' }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#0a0a16', border: '2px solid #223355', padding: '20px' }}>
        <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 16 }}>🏢 Dept Distribution</div>
        {Object.entries(deptCount).map(([dept, count]) => (
          <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <span style={{ fontSize: '20px', color: '#88ddff', fontWeight: 'bold', width: 160 }}>{dept}</span>
            <div style={{ flex: 1, height: 20, background: '#111133', border: '2px solid #223355' }}>
              <div style={{ height: '100%', width: `${(count / agents.length) * 100}%`, background: '#2255cc' }} />
            </div>
            <span style={{ fontSize: '22px', color: '#ffee55', fontWeight: 'bold', width: 36 }}>{count}</span>
          </div>
        ))}
        {Object.keys(deptCount).length === 0 && <div style={{ color: '#667788', fontSize: '17px' }}>No agents hired</div>}
      </div>
    </div>
  );
}

function TeamGrid({ agents, onChat }: { agents: HiredAgent[]; onChat?: (id: string) => void }) {
  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {agents.length === 0 && (
        <div style={{ textAlign: 'center', color: '#445566', padding: 60, fontSize: '18px' }}>
          <div style={{ fontSize: '48px', marginBottom: 16 }}>👥</div>
          No agents hired yet.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14, padding: 4 }}>
        {agents.map(a => {
          const sc = a.status === 'Working' ? '#00ff88' : a.status === 'In Meeting' ? '#ffaa44' : '#6677aa';
          return (
            <div key={a.id} style={{ background: '#0d0d1e', border: '2px solid #223355', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: '32px' }}>👤</div>
                <div style={{ fontSize: '15px', padding: '4px 10px', background: sc + '33', border: `2px solid ${sc}`, color: sc, fontWeight: 'bold' }}>{a.status}</div>
              </div>
              <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: '19px', color: '#88eeff', fontWeight: 'bold', marginBottom: 4 }}>{a.role}</div>
              <div style={{ fontSize: '17px', color: '#88aabb', fontWeight: 'bold', marginBottom: 12 }}>{a.dept}</div>
              {a.aiConfig && (
                <div style={{ fontSize: '17px', color: a.aiConfig.connected ? '#00ff88' : '#ff4444', fontWeight: 'bold', marginBottom: 12 }}>
                  🤖 {a.aiConfig.provider} · {a.aiConfig.model}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {a.aiConfig && (
                  <button onClick={() => onChat?.(a.id)} style={{ flex: 1, padding: '8px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0d1a2a', color: '#88aaff', border: '2px solid #334466', cursor: 'pointer' }}>💬 Chat</button>
                )}
                <button style={{ flex: 1, padding: '8px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0d2a0d', color: '#66ff88', border: '2px solid #336633', cursor: 'pointer' }}>📋 Task</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompanyDashboard({ agents, companyBalance, companyRevenue, onClose }: Props) {
  const [tab, setTab] = useState<'tasks'|'folders'|'scrum'|'analytics'|'team'|'org'|'inbox'>('tasks');
  const tabs = [
    { key: 'tasks' as const, label: '📋 Task Board' },
    { key: 'folders' as const, label: '📁 Output Folders' },
    { key: 'scrum' as const, label: '🧑‍💼 Scrum' },
    { key: 'analytics' as const, label: '📈 Analytics' },
    { key: 'team' as const, label: '👥 Team' },
    { key: 'org' as const, label: '🗂️ Org Chart' },
    { key: 'inbox' as const, label: '👑 CEO Inbox' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--pixel-bg)', display: 'flex', flexDirection: 'column', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ background: 'var(--pixel-active-bg)', borderBottom: '2px solid var(--pixel-border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
        <span style={{ fontSize: '32px' }}>🏢</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--pixel-agent-text)', letterSpacing: 2 }}>COMPANY DASHBOARD</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 6, display: 'flex', gap: 28 }}>
            <span style={{ color: '#88ccff' }}>👥 {agents.length} agents</span>
            <span style={{ color: '#00ff88' }}>💰 ${companyBalance.toLocaleString()}</span>
            <span style={{ color: '#ffdd44' }}>📈 +${Math.round(companyRevenue / 30).toLocaleString()}/day</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', color: 'var(--pixel-text)', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', padding: '10px 20px', cursor: 'pointer' }}>✕ Close</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--pixel-border)', background: 'var(--pixel-bg)', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '14px 26px', fontFamily: 'monospace', fontSize: '19px',
            background: tab === t.key ? 'var(--pixel-active-bg)' : 'transparent',
            color: tab === t.key ? '#66ddff' : '#556677',
            border: 'none', borderBottom: tab === t.key ? '3px solid #66ddff' : '3px solid transparent',
            cursor: 'pointer', fontWeight: tab === t.key ? 'bold' : 'normal',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 20, background: 'var(--pixel-bg)' }}>
        {tab === 'tasks'     && <TaskBoard agents={agents} />}
        {tab === 'folders'   && <OutputFolders agents={agents} />}
        {tab === 'scrum'     && <ScrumBoard agents={agents} />}
        {tab === 'analytics' && <Analytics agents={agents} companyBalance={companyBalance} companyRevenue={companyRevenue} />}
        {tab === 'team'      && <TeamGrid agents={agents} />}
        {tab === 'org'       && <OrgChart agents={agents} />}
        {tab === 'inbox'     && <CEOInbox agents={agents} />}
      </div>
    </div>
  );
}
