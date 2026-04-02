import { useState } from 'react';

interface HiredAgent {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
  salary: number;
  currency: string;
  country: string;
  performance: number;
  level: number;
  tasksCompleted: number;
  aiConfig?: { provider: string; model: string; connected: boolean };
}

interface Task {
  id: string;
  agentId: string;
  agentName: string;
  type: string;
  title: string;
  status: 'todo' | 'running' | 'done' | 'failed';
  createdAt: string;
  output?: string;
}

interface ScrumEntry {
  agentName: string;
  role: string;
  yesterday: string;
  today: string;
  blockers: string;
  date: string;
}

interface Props {
  agents: HiredAgent[];
  companyBalance: number;
  companyRevenue: number;
  onClose: () => void;
}

const TASK_TYPES = ['Code', 'Research', 'Draft', 'Analysis', 'Sales Script', 'Design', 'Review'];

const MOCK_TASKS: Task[] = [
  { id: 't1', agentId: '', agentName: 'Ravi (Developer)', type: 'Code', title: 'Build login API', status: 'done', createdAt: '2026-04-02 09:00', output: 'Login API completed with JWT auth.' },
  { id: 't2', agentId: '', agentName: 'Priya (Designer)', type: 'Design', title: 'Homepage mockup', status: 'running', createdAt: '2026-04-02 10:30' },
  { id: 't3', agentId: '', agentName: 'Amit (Analyst)', type: 'Research', title: 'Market analysis Q2', status: 'todo', createdAt: '2026-04-02 11:00' },
  { id: 't4', agentId: '', agentName: 'Sara (Marketing)', type: 'Draft', title: 'Email campaign copy', status: 'failed', createdAt: '2026-04-02 08:00' },
];

const MOCK_SCRUM: ScrumEntry[] = [
  { agentName: 'Ravi', role: 'Developer', yesterday: 'Completed DB schema', today: 'Building login API', blockers: 'None', date: '2026-04-02' },
  { agentName: 'Priya', role: 'Designer', yesterday: 'Wireframes done', today: 'Homepage mockup', blockers: 'Waiting for copy', date: '2026-04-02' },
  { agentName: 'Amit', role: 'Analyst', yesterday: 'Competitor research', today: 'Market analysis', blockers: 'None', date: '2026-04-02' },
];

function TaskBoard({ agents }: { agents: HiredAgent[] }) {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Code');
  const [newAgent, setNewAgent] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cols: Array<{ key: Task['status']; label: string; color: string; textColor: string }> = [
    { key: 'todo', label: '📌 TO DO', color: '#1a2a4a', textColor: '#66aaff' },
    { key: 'running', label: '⚡ RUNNING', color: '#2a1a00', textColor: '#ffaa33' },
    { key: 'done', label: '✅ DONE', color: '#0a2a14', textColor: '#33ff88' },
    { key: 'failed', label: '❌ FAILED', color: '#2a0a0a', textColor: '#ff5555' },
  ];

  const inputStyle: React.CSSProperties = {
    background: 'var(--pixel-bg)', color: 'var(--pixel-text)', border: '2px solid var(--pixel-border)',
    fontFamily: 'monospace', fontSize: '17px', padding: '7px 10px', width: '100%', boxSizing: 'border-box',
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const agentName = agents.find(a => a.id === newAgent)?.name ?? 'Unassigned';
    setTasks(prev => [...prev, {
      id: `t${Date.now()}`, agentId: newAgent, agentName,
      type: newType, title: newTitle, status: 'todo',
      createdAt: new Date().toLocaleString(),
    }]);
    setNewTitle(''); setShowNew(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#aaccff', fontSize: '16px' }}>Total: {tasks.length} tasks</span>
        <button onClick={() => setShowNew(v => !v)} style={{
          padding: '8px 18px', fontFamily: 'monospace', fontSize: '18px',
          background: 'var(--pixel-btn-bg)', color: 'var(--pixel-agent-text)', border: '2px solid var(--pixel-agent-border)', cursor: 'pointer',
        }}>+ New Task</button>
      </div>

      {showNew && (
        <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input style={inputStyle} placeholder="Task title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...inputStyle, flex: 1 }} value={newType} onChange={e => setNewType(e.target.value)}>
              {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select style={{ ...inputStyle, flex: 1 }} value={newAgent} onChange={e => setNewAgent(e.target.value)}>
              <option value="">Unassigned</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
            </select>
          </div>
          <button onClick={addTask} style={{ ...inputStyle, cursor: 'pointer', background: '#112211', color: '#00ff88', border: '2px solid #00ff88' }}>
            ✓ Add Task
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flex: 1, overflow: 'hidden' }}>
        {cols.map(col => (
          <div key={col.key} style={{ background: col.color + '33', border: `2px solid ${col.color}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '6px 10px', background: col.color, fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{col.label} ({tasks.filter(t => t.status === col.key).length})</div>
            <div style={{ overflowY: 'auto', flex: 1, padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.filter(t => t.status === col.key).map(task => (
                <div key={task.id} style={{ background: '#111128', border: '2px solid #334466', padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}>
                  <div style={{ fontSize: '19px', color: '#ffcc00', marginBottom: 8, fontWeight: 'bold', letterSpacing: 1 }}>[{task.type}]</div>
                  <div style={{ fontSize: '21px', color: '#aaddff', fontWeight: 'bold', lineHeight: 1.4 }}>{task.title}</div>
                  <div style={{ fontSize: '18px', color: '#88ffcc', marginTop: 8, fontWeight: 'bold' }}>{task.agentName}</div>
                  {expandedId === task.id && task.output && (
                    <div style={{ marginTop: 8, padding: '6px 8px', background: '#0a1a0a', border: '1px solid #1a5a2a', fontSize: '16px', color: '#aaffaa', lineHeight: 1.5 }}>
                      {task.output}
                    </div>
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

function OutputFolders({ agents }: { agents: HiredAgent[] }) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(agents[0]?.id ?? null);

  const mockFiles = (name: string) => [
    { name: `code_output_2026-04-02_09-15.txt`, size: '2.4 KB', date: '2026-04-02 09:15', content: `// Generated by ${name}\nfunction loginUser(email, password) {\n  // JWT auth implementation\n}` },
    { name: `research_2026-04-02_11-00.txt`, size: '5.1 KB', date: '2026-04-02 11:00', content: `Market Research Report\nQ2 2026 Analysis\n\nKey findings...` },
    { name: `draft_email_2026-04-01.txt`, size: '1.2 KB', date: '2026-04-01 14:30', content: `Subject: Q2 Campaign Launch\n\nDear customer...` },
  ];

  const agent = agents.find(a => a.id === selectedAgent);
  const files = agent ? mockFiles(agent.name) : [];
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Sidebar */}
      <div style={{ width: 180, borderRight: '2px solid #222244', overflowY: 'auto', background: '#080812' }}>
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #222244', fontSize: '15px', color: 'var(--pixel-text-dim)' }}>AGENTS</div>
        {agents.length === 0 && <div style={{ padding: '12px', color: '#334455', fontSize: '13px' }}>No agents hired yet</div>}
        {agents.map(a => (
          <div key={a.id} onClick={() => { setSelectedAgent(a.id); setPreviewFile(null); }} style={{
            padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #111133',
            background: selectedAgent === a.id ? '#112233' : 'transparent',
            borderLeft: selectedAgent === a.id ? '3px solid #2255aa' : '3px solid transparent',
          }}>
            <div style={{ fontSize: '17px', color: 'var(--pixel-agent-text)' }}>📁 {a.name}</div>
            <div style={{ fontSize: '15px', color: 'var(--pixel-text-dim)' }}>{a.role}</div>
          </div>
        ))}
      </div>

      {/* File list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {agent ? (
          <>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #222244', fontSize: '17px', color: 'var(--pixel-agent-text)', background: '#0d0d1a' }}>
              📁 {agent.name} / {agent.role} — {files.length} files
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((f, i) => (
                <div key={i} style={{ background: '#0a0a14', border: '1px solid #222244', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '20px' }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '17px', color: 'var(--pixel-text)' }}>{f.name}</div>
                    <div style={{ fontSize: '15px', color: 'var(--pixel-text-dim)', marginTop: 2 }}>{f.date} · {f.size}</div>
                  </div>
                  <button onClick={() => setPreviewFile(previewFile === f.name ? null : f.name)} style={{
                    padding: '4px 10px', fontFamily: 'monospace', fontSize: '13px',
                    background: '#0d1a2a', color: '#6699cc', border: '1px solid #334466', cursor: 'pointer',
                  }}>👁 View</button>
                  <button onClick={() => {
                    const el = document.createElement('a');
                    el.href = 'data:text/plain,' + encodeURIComponent(f.content);
                    el.download = f.name; el.click();
                  }} style={{
                    padding: '4px 10px', fontFamily: 'monospace', fontSize: '13px',
                    background: '#0d2a0d', color: '#66cc66', border: '1px solid #336633', cursor: 'pointer',
                  }}>⬇ Save</button>
                </div>
              ))}
              {previewFile && (
                <div style={{ background: '#080f08', border: '2px solid #1a5a2a', padding: '12px 14px', marginTop: 4 }}>
                  <div style={{ fontSize: '13px', color: '#557755', marginBottom: 8 }}>── {previewFile} ──</div>
                  <pre style={{ margin: 0, fontSize: '16px', color: '#aaffaa', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {files.find(f => f.name === previewFile)?.content}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#334455', fontSize: '16px' }}>
            Select an agent to view their output folder
          </div>
        )}
      </div>
    </div>
  );
}

function ScrumBoard({ agents }: { agents: HiredAgent[] }) {
  const [entries] = useState<ScrumEntry[]>(MOCK_SCRUM);
  const today = new Date().toLocaleDateString();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '18px', color: 'var(--pixel-agent-text)' }}>📅 Daily Standup — {today}</div>
        <button style={{
          padding: '6px 14px', fontFamily: 'monospace', fontSize: '15px',
          background: '#112211', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer',
        }}>▶ Run Scrum (AI)</button>
      </div>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', gap: 2, background: '#111133' }}>
        {['Agent', 'Yesterday', 'Today', 'Blockers'].map(h => (
          <div key={h} style={{ padding: '8px 12px', fontSize: '16px', color: 'var(--pixel-text-dim)', fontWeight: 'bold', background: '#0d0d1a' }}>{h}</div>
        ))}
      </div>

      {/* Agent rows */}
      {(agents.length > 0 ? agents.map(a => ({
        agentName: a.name, role: a.role,
        yesterday: 'Completed assigned tasks', today: 'Working on new assignments', blockers: 'None', date: today,
      })) : entries).map((e, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', gap: 2, background: i % 2 === 0 ? '#0a0a14' : '#080810' }}>
          <div style={{ padding: '10px 12px', borderRight: '1px solid #222244' }}>
            <div style={{ fontSize: '19px', color: '#ffffff', fontWeight: 'bold' }}>{e.agentName}</div>
            <div style={{ fontSize: '16px', color: '#88aacc' }}>{e.role}</div>
          </div>
          <div style={{ padding: '10px 12px', fontSize: '16px', color: 'var(--pixel-text-dim)', borderRight: '1px solid #222244', lineHeight: 1.5 }}>{e.yesterday}</div>
          <div style={{ padding: '10px 12px', fontSize: '16px', color: '#aaffaa', borderRight: '1px solid #222244', lineHeight: 1.5 }}>{e.today}</div>
          <div style={{ padding: '10px 12px', fontSize: '13px', color: e.blockers === 'None' ? '#445566' : '#ffaa44', lineHeight: 1.5 }}>{e.blockers}</div>
        </div>
      ))}

      {agents.length === 0 && entries.length === 0 && (
        <div style={{ textAlign: 'center', color: '#334455', padding: 40, fontSize: '15px' }}>No agents hired yet. Hire agents to run scrum.</div>
      )}
    </div>
  );
}

function Analytics({ agents, companyBalance, companyRevenue }: { agents: HiredAgent[]; companyBalance: number; companyRevenue: number }) {
  const maxPerf = Math.max(...agents.map(a => a.performance), 1);
  const deptCount: Record<string, number> = {};
  agents.forEach(a => { deptCount[a.dept] = (deptCount[a.dept] ?? 0) + 1; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%' }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: '💰 Balance', value: `$${companyBalance.toLocaleString()}`, color: '#00ff88' },
          { label: '📈 Revenue/day', value: `$${Math.round(companyRevenue / 30).toLocaleString()}`, color: '#aaccff' },
          { label: '👥 Headcount', value: agents.length, color: '#ffdd44' },
          { label: '✅ Tasks Done', value: agents.reduce((s, a) => s + (a.tasksCompleted ?? 0), 0), color: '#ff88cc' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)', padding: '16px 18px' }}>
            <div style={{ fontSize: '18px', color: '#8899aa', marginBottom: 10, fontWeight: 'bold' }}>{kpi.label}</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: kpi.color as string, textShadow: '0 0 8px currentColor' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Performance bar chart */}
      <div style={{ background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)', padding: '16px 18px' }}>
        <div style={{ fontSize: '20px', color: 'var(--pixel-agent-text)', marginBottom: 16, fontWeight: 'bold' }}>📊 Agent Performance</div>
        {agents.length === 0 && <div style={{ color: '#334455', fontSize: '14px' }}>No agents hired</div>}
        {agents.map(a => (
          <div key={a.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '16px', color: 'var(--pixel-text-dim)' }}>{a.name} ({a.role})</span>
              <span style={{ fontSize: '15px', color: 'var(--pixel-agent-text)' }}>{a.performance}%</span>
            </div>
            <div style={{ height: 20, background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)' }}>
              <div style={{
                height: '100%', width: `${(a.performance / maxPerf) * 100}%`,
                background: a.performance >= 80 ? '#00ff88' : a.performance >= 50 ? '#ffaa44' : '#ff4444',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Dept distribution */}
      <div style={{ background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)', padding: '16px 18px' }}>
        <div style={{ fontSize: '20px', color: 'var(--pixel-agent-text)', marginBottom: 16, fontWeight: 'bold' }}>🏢 Dept Distribution</div>
        {Object.entries(deptCount).map(([dept, count]) => (
          <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '16px', color: 'var(--pixel-text-dim)', width: 120 }}>{dept}</span>
            <div style={{ flex: 1, height: 12, background: '#111133', border: '1px solid #222244' }}>
              <div style={{ height: '100%', width: `${(count / agents.length) * 100}%`, background: '#2255aa' }} />
            </div>
            <span style={{ fontSize: '15px', color: 'var(--pixel-agent-text)', width: 20 }}>{count}</span>
          </div>
        ))}
        {Object.keys(deptCount).length === 0 && <div style={{ color: '#334455', fontSize: '14px' }}>No agents hired</div>}
      </div>
    </div>
  );
}

function TeamGrid({ agents, onChat }: { agents: HiredAgent[]; onChat?: (id: string) => void }) {
  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      {agents.length === 0 && (
        <div style={{ textAlign: 'center', color: '#334455', padding: 60, fontSize: '16px' }}>
          <div style={{ fontSize: '40px', marginBottom: 12 }}>👥</div>
          No agents hired yet. Use the Hire button to add team members.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, padding: 4 }}>
        {agents.map(a => {
          const statusColor = a.status === 'Working' ? '#00ff88' : a.status === 'In Meeting' ? '#ffaa44' : '#6677aa';
          return (
            <div key={a.id} style={{ background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: '28px' }}>👤</div>
                <div style={{ fontSize: '11px', padding: '2px 8px', background: statusColor + '22', border: `1px solid ${statusColor}`, color: statusColor }}>
                  {a.status}
                </div>
              </div>
              <div style={{ fontSize: '20px', color: '#ffffff', fontWeight: 'bold', marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: '17px', color: '#88ccff', marginBottom: 2 }}>{a.role}</div>
              <div style={{ fontSize: '16px', color: '#667788', marginBottom: 10 }}>{a.dept}</div>
              {a.aiConfig && (
                <div style={{ fontSize: '15px', color: a.aiConfig.connected ? '#00ff88' : '#ff4444', marginBottom: 10 }}>
                  🤖 {a.aiConfig.provider} · {a.aiConfig.model}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                {a.aiConfig && (
                  <button onClick={() => onChat?.(a.id)} style={{
                    flex: 1, padding: '5px', fontFamily: 'monospace', fontSize: '13px',
                    background: '#0d1a2a', color: '#6699cc', border: '1px solid #334466', cursor: 'pointer',
                  }}>💬 Chat</button>
                )}
                <button style={{
                  flex: 1, padding: '5px', fontFamily: 'monospace', fontSize: '13px',
                  background: '#0d2a0d', color: '#66cc66', border: '1px solid #336633', cursor: 'pointer',
                }}>📋 Task</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompanyDashboard({ agents, companyBalance, companyRevenue, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'folders' | 'scrum' | 'analytics' | 'team'>('tasks');

  const tabs: Array<{ key: typeof activeTab; label: string }> = [
    { key: 'tasks', label: '📋 Task Board' },
    { key: 'folders', label: '📁 Output Folders' },
    { key: 'scrum', label: '🧑‍💼 Scrum' },
    { key: 'analytics', label: '📈 Analytics' },
    { key: 'team', label: '👥 Team' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'var(--pixel-bg)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--pixel-active-bg)', borderBottom: '2px solid var(--pixel-border)',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
        boxShadow: 'var(--pixel-shadow)',
      }}>
        <span style={{ fontSize: '28px' }}>🏢</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--pixel-agent-text)', letterSpacing: 1 }}>COMPANY DASHBOARD</div>
          <div style={{ fontSize: '22px', marginTop: 6, fontWeight: 'bold', display: 'flex', gap: 24 }}>
            <span style={{ color: '#88ccff' }}>👥 {agents.length} agents</span>
            <span style={{ color: '#00ff88' }}>💰 ${companyBalance.toLocaleString()}</span>
            <span style={{ color: '#ffdd44' }}>📈 +${Math.round(companyRevenue / 30).toLocaleString()}/day</span>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', color: 'var(--pixel-text)',
          fontFamily: 'monospace', fontSize: '18px', padding: '8px 18px', cursor: 'pointer',
        }}>✕ Close</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--pixel-border)', background: 'var(--pixel-bg)', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '12px 24px', fontFamily: 'monospace', fontSize: '18px',
            background: activeTab === tab.key ? 'var(--pixel-active-bg)' : 'transparent',
            color: activeTab === tab.key ? 'var(--pixel-agent-text)' : 'var(--pixel-text-dim)',
            border: 'none', borderBottom: activeTab === tab.key ? '3px solid var(--pixel-agent-border)' : '3px solid transparent',
            cursor: 'pointer', fontWeight: activeTab === tab.key ? 'bold' : 'normal',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 20, background: 'var(--pixel-bg)' }}>
        {activeTab === 'tasks' && <TaskBoard agents={agents} />}
        {activeTab === 'folders' && <OutputFolders agents={agents} />}
        {activeTab === 'scrum' && <ScrumBoard agents={agents} />}
        {activeTab === 'analytics' && <Analytics agents={agents} companyBalance={companyBalance} companyRevenue={companyRevenue} />}
        {activeTab === 'team' && <TeamGrid agents={agents} />}
      </div>
    </div>
  );
}
