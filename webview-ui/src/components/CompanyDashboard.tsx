import { useState, useEffect } from 'react';
import { OrgChart } from './OrgChart.js';
import { CEOInbox } from './CEOInbox.js';

// ─── Agent Memory System ───────────────────────────────────────────────────
export interface AgentMemoryEntry {
  taskId: string; taskTitle: string; taskType: string;
  output: string; date: string; agentName: string; role: string;
}
export interface AgentMemory {
  agentId: string; agentName: string; role: string;
  entries: AgentMemoryEntry[];
  totalTasks: number; lastActive: string;
}
const LS_MEM_PREFIX = 'pixeloffice_memory_';

export function loadAgentMemory(agentId: string): AgentMemory | null {
  try { return JSON.parse(localStorage.getItem(LS_MEM_PREFIX + agentId) ?? 'null'); } catch { return null; }
}
export function saveAgentMemory(mem: AgentMemory) {
  try { localStorage.setItem(LS_MEM_PREFIX + mem.agentId, JSON.stringify(mem)); } catch {}
}
export function addMemoryEntry(agentId: string, agentName: string, role: string, entry: Omit<AgentMemoryEntry, 'agentName' | 'role'>) {
  const existing = loadAgentMemory(agentId) ?? { agentId, agentName, role, entries: [], totalTasks: 0, lastActive: '' };
  existing.entries = [{ ...entry, agentName, role }, ...existing.entries].slice(0, 20); // keep last 20
  existing.totalTasks = (existing.totalTasks ?? 0) + 1;
  existing.lastActive = new Date().toLocaleString();
  saveAgentMemory(existing);
}
export function getMemoryContext(agentId: string): string {
  const mem = loadAgentMemory(agentId);
  if (!mem || mem.entries.length === 0) return '';
  const recent = mem.entries.slice(0, 5);
  return `\n\n[YOUR MEMORY — Last ${recent.length} tasks you completed:\n${recent.map((e, i) => `${i + 1}. [${e.taskType}] ${e.taskTitle} → ${e.output.slice(0, 80)}...`).join('\n')}]\n`;
}

// ─── Agent Skill System ────────────────────────────────────────────────────
export interface AgentSkills {
  agentId: string;
  xp: Record<string, number>; // taskType → XP points
  level: number;
  badges: string[];
}
const LS_SKILL_PREFIX = 'pixeloffice_skills_';
const SKILL_BADGES: Record<string, { threshold: number; badge: string }[]> = {
  'Code':        [{ threshold: 3, badge: '🥉 Jr Dev' }, { threshold: 8, badge: '🥈 Sr Dev' }, { threshold: 15, badge: '🥇 Tech Lead' }],
  'Research':    [{ threshold: 3, badge: '🔍 Analyst' }, { threshold: 8, badge: '📊 Researcher' }, { threshold: 15, badge: '🧠 Expert' }],
  'Design':      [{ threshold: 3, badge: '🎨 Jr Designer' }, { threshold: 8, badge: '✏️ Designer' }, { threshold: 15, badge: '🏆 Art Director' }],
  'Draft':       [{ threshold: 3, badge: '📝 Copywriter' }, { threshold: 8, badge: '✍️ Writer' }, { threshold: 15, badge: '📖 Content Lead' }],
  'Analysis':    [{ threshold: 3, badge: '📈 Analyst' }, { threshold: 8, badge: '📉 Strategist' }, { threshold: 15, badge: '💡 Insight Lead' }],
  'Sales Script':[{ threshold: 3, badge: '📞 SDR' }, { threshold: 8, badge: '💼 AE' }, { threshold: 15, badge: '🏅 Sales Lead' }],
  'Review':      [{ threshold: 3, badge: '👁️ Reviewer' }, { threshold: 8, badge: '✅ QA Lead' }, { threshold: 15, badge: '🎯 QA Master' }],
};
export function loadAgentSkills(agentId: string): AgentSkills {
  try { return JSON.parse(localStorage.getItem(LS_SKILL_PREFIX + agentId) ?? 'null') ?? { agentId, xp: {}, level: 1, badges: [] }; }
  catch { return { agentId, xp: {}, level: 1, badges: [] }; }
}
export function awardSkillXP(agentId: string, taskType: string): AgentSkills {
  const skills = loadAgentSkills(agentId);
  skills.xp[taskType] = (skills.xp[taskType] ?? 0) + 1;
  // Check for new badges
  const defs = SKILL_BADGES[taskType] ?? [];
  const newBadges = defs.filter(d => skills.xp[taskType] >= d.threshold && !skills.badges.includes(d.badge)).map(d => d.badge);
  skills.badges = [...new Set([...skills.badges, ...newBadges])];
  // Level = total XP / 5 + 1
  const totalXP = Object.values(skills.xp).reduce((a, b) => a + b, 0);
  skills.level = Math.floor(totalXP / 5) + 1;
  try { localStorage.setItem(LS_SKILL_PREFIX + agentId, JSON.stringify(skills)); } catch {}
  return skills;
}
// ──────────────────────────────────────────────────────────────────────────

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
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [autopilotPaused, setAutopilotPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ceo = agents.find(a => a.role === 'CEO');

  // Auto-run loop: every 30s, if enabled, check for todo tasks
  useEffect(() => {
    if (!autopilotEnabled || autopilotPaused) return;
    const interval = setInterval(async () => {
      const todoTasks = tasks.filter(t => t.status === 'todo');
      for (const task of todoTasks) {
        if (runningId || autopilotPaused) break;
        await runTaskWithAI(task, true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [autopilotEnabled, autopilotPaused, tasks, runningId]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [activeGoal, setActiveGoal] = useState<any>(JSON.parse(localStorage.getItem('pixeloffice_company_goal') || 'null'));

  const setCompanyGoal = () => {
    const goal = { title: goalTitle, desc: goalDesc, createdAt: new Date().toLocaleString() };
    localStorage.setItem('pixeloffice_company_goal', JSON.stringify(goal));
    setActiveGoal(goal);
    setShowGoalModal(false);
  };

  const generateTasks = async () => {
    if (!activeGoal || !ceo) return;
    setRunningId('generating');
    const prompt = `Goal: ${activeGoal.title}\nDescription: ${activeGoal.desc}\nAgents: ${agents.map(a => `${a.name} (${a.role})`).join(', ')}\n\nBreak this goal into 5 tasks. Output as a JSON list of objects: { title, type, targetAgentId, priority }. Use only valid agent IDs from list: ${agents.map(a => a.id).join(', ')}. JSON only.`;
    
    try {
      const cfg = ceo.aiConfig as any;
      const res = await fetch((cfg.baseUrl ?? '').replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey ?? ''}` },
        body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 500 }),
      });
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content ?? '[]';
      const parsed = JSON.parse(txt.replace(/```json|```/g, '').trim());
      
      const newTasks: Task[] = parsed.map((p: any) => ({
        id: `t${Date.now()}_${Math.random()}`,
        agentId: p.targetAgentId ?? '',
        agentName: agents.find(a => a.id === p.targetAgentId)?.name ?? 'Unassigned',
        type: p.type ?? 'Code',
        title: p.title,
        status: 'todo',
        createdAt: new Date().toLocaleString()
      }));
      updateTasks(p => [...newTasks, ...p]);
    } catch (e) {
      console.error('Goal generation failed', e);
    } finally { setRunningId(null); }
  };

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

  const runTaskWithAI = async (task: Task, auto = false) => {
    const agent = agents.find(a => a.id === task.agentId);
    if (!agent?.aiConfig) { if (!auto) setErrorId(task.id); return; }
    setRunningId(task.id);
    setErrorId(null);
    updateTasks(p => p.map(t => t.id === task.id ? { ...t, status: 'running' } : t));

    const memCtx = getMemoryContext(task.agentId);
    const prompt = `You are ${agent.name}, a ${agent.role} at a company. Complete this task professionally and thoroughly:${memCtx}\n\nTask Type: ${task.type}\nTask: ${task.title}\n\nProvide a complete, professional output for this task. Be specific and practical.`;

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

      // 🧠 Save to Agent Memory
      addMemoryEntry(task.agentId, agent.name, agent.role, {
        taskId: task.id, taskTitle: task.title, taskType: task.type,
        output, date: new Date().toLocaleString(),
      });

      // 🎯 Award Skill XP
      awardSkillXP(task.agentId, task.type);

      // Feedback to CEO
      const inboxKey = 'pixeloffice_ceo_inbox';
      const inbox = JSON.parse(localStorage.getItem(inboxKey) ?? '[]');
      inbox.unshift({ id: `msg_${Date.now()}`, subject: `Task Auto-Completed: ${task.title}`, body: `Agent ${agent.name} completed task: ${task.title}\n\nOutput preview:\n${output.slice(0, 100)}...`, from: 'System', date: new Date().toLocaleString() });
      localStorage.setItem(inboxKey, JSON.stringify(inbox.slice(0, 100)));
      
    } catch (e: any) {
      updateTasks(p => p.map(t => t.id === task.id ? { ...t, status: 'failed', output: e.message } : t));
      if (!auto) setErrorId(task.id);
    } finally { setRunningId(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#66ddff', fontSize: '20px', fontWeight: 'bold' }}>Total: {tasks.length} tasks</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowGoalModal(true)} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', background: '#1a1a33', color: '#ffee55', border: '2px solid #334466', cursor: 'pointer' }}>🎯 Set Goal</button>
          <button onClick={generateTasks} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', background: '#220033', color: '#ff66ff', border: '2px solid #551155', cursor: 'pointer' }}>🤖 Autopilot Tasks</button>
          <button onClick={() => setAutopilotEnabled(!autopilotEnabled)} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', background: autopilotEnabled ? '#061a0d' : '#1a0606', color: autopilotEnabled ? '#33ffaa' : '#ff6666', border: '2px solid', cursor: 'pointer' }}>{autopilotEnabled ? '🟢 ON' : '🔴 OFF'} Auto-Run</button>
          {autopilotEnabled && (
            <button onClick={() => setAutopilotPaused(!autopilotPaused)} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', background: autopilotPaused ? '#1a1a00' : '#0d1a2a', color: autopilotPaused ? '#ffee55' : '#66aaff', border: '2px solid', cursor: 'pointer' }}>{autopilotPaused ? '⏸️ PAUSED' : '▶️ RUNNING'}</button>
          )}
          <button onClick={() => setShowNew(v => !v)} style={{ padding: '8px 18px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', background: '#0d1a2a', color: '#66aaff', border: '2px solid #334466', cursor: 'pointer' }}>+ New Task</button>
        </div>
      </div>

      {activeGoal && (
        <div style={{ background: '#0d1a2a', border: '2px solid #44aaff', padding: '16px', marginBottom: 20 }}>
          <div style={{ color: '#44aaff', fontSize: '16px', fontWeight: 'bold', marginBottom: 6 }}>🎯 CURRENT COMPANY GOAL</div>
          <div style={{ color: '#aaddff', fontSize: '20px', fontWeight: 'bold' }}>{activeGoal.title}</div>
          <div style={{ color: '#8899aa', fontSize: '16px', marginTop: 4 }}>{activeGoal.desc}</div>
        </div>
      )}

      {showGoalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#0d0d1e', border: '2px solid #334466', padding: 24, width: 400 }}>
            <div style={{ color: '#66ddff', fontSize: '22px', fontWeight: 'bold', marginBottom: 20 }}>🎯 Set Company Goal</div>
            <input placeholder="Goal Title" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} style={{ ...inp, marginBottom: 12 }} />
            <textarea placeholder="Description" value={goalDesc} onChange={e => setGoalDesc(e.target.value)} style={{ ...inp, height: 100, marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowGoalModal(false)} style={{ flex: 1, padding: 10, background: '#1a0606', color: '#ff6666', border: '2px solid #331111', cursor: 'pointer' }}>Cancel</button>
              <button onClick={setCompanyGoal} style={{ flex: 1, padding: 10, background: '#061a0d', color: '#33ffaa', border: '2px solid #113322', cursor: 'pointer' }}>Set Goal</button>
            </div>
          </div>
        </div>
      )}

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 14, padding: 4 }}>
        {agents.map(a => {
          const sc = a.status === 'Working' ? '#00ff88' : a.status === 'In Meeting' ? '#ffaa44' : '#6677aa';
          const skills = loadAgentSkills(a.id);
          const totalXP = Object.values(skills.xp).reduce((s, v) => s + v, 0);
          const topSkill = Object.entries(skills.xp).sort((x, y) => y[1] - x[1])[0];
          return (
            <div key={a.id} style={{ background: '#0d0d1e', border: '2px solid #223355', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: '32px' }}>👤</div>
                <div style={{ fontSize: '15px', padding: '4px 10px', background: sc + '33', border: `2px solid ${sc}`, color: sc, fontWeight: 'bold' }}>{a.status}</div>
              </div>
              <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 2 }}>{a.name}</div>
              <div style={{ fontSize: '19px', color: '#88eeff', fontWeight: 'bold', marginBottom: 2 }}>{a.role}</div>
              <div style={{ fontSize: '17px', color: '#88aabb', fontWeight: 'bold', marginBottom: 10 }}>{a.dept}</div>

              {/* Skill XP Bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '16px', color: '#ffee55', fontWeight: 'bold' }}>⚡ LVL {skills.level}</span>
                  <span style={{ fontSize: '16px', color: '#aabbcc', fontWeight: 'bold' }}>{totalXP} XP</span>
                </div>
                <div style={{ height: 10, background: '#111133', border: '1px solid #223355' }}>
                  <div style={{ height: '100%', width: `${Math.min((totalXP % 5) / 5 * 100, 100)}%`, background: '#ffee55' }} />
                </div>
                {topSkill && <div style={{ fontSize: '15px', color: '#aabbcc', marginTop: 4 }}>Top: {topSkill[0]} ({topSkill[1]} tasks)</div>}
              </div>

              {/* Badges */}
              {skills.badges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {skills.badges.map(b => (
                    <span key={b} style={{ fontSize: '13px', padding: '2px 8px', background: '#1a1a00', border: '1px solid #554400', color: '#ffdd44', fontWeight: 'bold' }}>{b}</span>
                  ))}
                </div>
              )}

              {a.aiConfig && (
                <div style={{ fontSize: '17px', color: a.aiConfig.connected ? '#00ff88' : '#ff4444', fontWeight: 'bold', marginBottom: 10 }}>
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
