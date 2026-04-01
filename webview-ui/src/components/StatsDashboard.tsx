import type { OfficeEvent } from './OfficeEvents.js';
import { useState, useEffect } from 'react';

export const ROLE_SALARY: Record<string, number> = {
  CEO:       12000,
  CTO:       10000,
  Manager:    6000,
  Developer:  5000,
  Designer:   4500,
  QA:         4000,
  HR:         4000,
  Marketing:  4500,
  Sales:      4000,
  Analyst:    4500,
  DevOps:     5500,
  Intern:     1500,
};

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#00ff88',
  Design:      '#ff88cc',
  Management:  '#cc88ff',
  QA:          '#aaff00',
  Marketing:   '#ffaa44',
  Sales:       '#44aaff',
  HR:          '#ff6666',
  Operations:  '#ffdd44',
};

const STATUS_COLORS: Record<string, string> = {
  Working:    '#00ff88',
  'On Break': '#ffaa44',
  'In Meeting':'#44aaff',
  Idle:       '#888888',
};

interface HiredAgent {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
  hireDate: string;
  zone?: string;
  salary?: number;
  currency?: string;
  country?: string;
  performance?: number;
  level?: number;
}

interface Props {
  agents: HiredAgent[];
  currentFloor: number;
  onClose: () => void;
  onPromote: (id: string) => void;
  onFire: (id: string) => void;
  activeEvent?: OfficeEvent | null;
  eventLog?: OfficeEvent[];
  onTriggerEvent?: (type?: string) => void;
  eventTemplates?: Array<{ type: string; title: string; icon: string; color: string; desc: string; duration: number }>;
  autoEvents?: boolean;
  onAutoEventsChange?: (v: boolean) => void;
}

const FLOOR_CAPACITY = 10;
const FLOOR_NAMES = ['Ground', 'Floor 1', 'Floor 2', 'Floor 3'];
const ZONE_TO_FLOOR: Record<string, number> = {
  workspace: 0,
  lounge: 0,
  washroom: 0,
  conference: 1,
  breakroom: 2,
  workspace2: 3,
};

function PixelProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max === 0 ? 0 : Math.round((value / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <div style={{
        flex: 1, height: 12, background: '#11111a',
        border: '1px solid #333344', position: 'relative',
        boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.8)'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${pct}%`, background: color,
          borderRight: pct > 0 ? '1px solid rgba(255,255,255,0.4)' : 'none',
          transition: 'width 0.4s',
        }} />
      </div>
      <span style={{ fontSize: '18px', color: '#aaaaaa', minWidth: 36, textAlign: 'right', fontWeight: 'bold' }}>
        {value}/{max}
      </span>
    </div>
  );
}

export function StatsDashboard({ agents, currentFloor, onClose, onPromote, onFire, activeEvent, eventLog = [], onTriggerEvent, eventTemplates = [], autoEvents = true, onAutoEventsChange }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payroll' | 'rankings' | 'events'>('overview');
  const [selectedEventType, setSelectedEventType] = useState<string>('random');
  const DEFAULT_FX_RATES: Record<string, number> = { USD: 1, INR: 84, GBP: 0.78, EUR: 0.92, JPY: 150, RUB: 90 };
  const [fxRates, setFxRatesRaw] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('pixeloffice_fx_rates');
      if (saved) return { ...DEFAULT_FX_RATES, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return DEFAULT_FX_RATES;
  });
  const setFxRates = (updater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    setFxRatesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem('pixeloffice_fx_rates', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const [, setTick] = useState(0);

  // Live update every 5s
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // ─── CALCULATIONS ────────────────────────────────────────────────────────
  const totalAgents = agents.length;
  const monthlyCost = agents.reduce((sum, a) => { const sal = a.salary ?? ROLE_SALARY[a.role] ?? 4000; const rate = fxRates[a.currency ?? 'USD'] ?? 1; return sum + sal / rate; }, 0);
  const avgSalary = totalAgents > 0 ? Math.round(monthlyCost / totalAgents) : 0;

  const productivity = totalAgents === 0 ? 0 : Math.round(
    (agents.reduce((sum, a) => {
      if (a.status === 'Working') return sum + 1;
      if (a.status === 'In Meeting') return sum + 0.8;
      if (a.status === 'On Break') return sum + 0.3;
      return sum;
    }, 0) / totalAgents) * 100
  );
  const prodColor = productivity >= 70 ? '#00ff88' : productivity >= 40 ? '#ffaa44' : '#ff4444';

  const floorCounts = [0, 0, 0, 0];
  for (const a of agents) {
    const f = ZONE_TO_FLOOR[a.zone ?? 'workspace'] ?? 0;
    if (f < 4) floorCounts[f]++;
  }

  const deptMap: Record<string, { count: number, cost: number }> = {};
  for (const a of agents) {
    if (!deptMap[a.dept]) deptMap[a.dept] = { count: 0, cost: 0 };
    deptMap[a.dept].count += 1;
    deptMap[a.dept].cost += (a.salary ?? ROLE_SALARY[a.role] ?? 4000) / (fxRates[a.currency ?? 'USD'] ?? 1);
  }
  const depts = Object.entries(deptMap).sort((x, y) => y[1].count - x[1].count);
  const deptsByCost = Object.entries(deptMap).sort((x, y) => y[1].cost - x[1].cost);

  const statusMap: Record<string, number> = {};
  for (const a of agents) {
    statusMap[a.status] = (statusMap[a.status] ?? 0) + 1;
  }

  // Rankings
  const sortedAgents = [...agents].sort((a, b) => (b.performance ?? 60) - (a.performance ?? 60));
  const top3 = sortedAgents.slice(0, 3);
  const bottom3 = sortedAgents.slice(-3).reverse().filter(a => !top3.includes(a)); // Ensure no overlap if < 6 agents

  // ─── STYLES ──────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: 'absolute', bottom: 54, left: 10, zIndex: 100,
    background: 'var(--pixel-bg)', border: '2px solid var(--pixel-agent-border)',
    boxShadow: 'var(--pixel-shadow)', width: 420, maxHeight: '75vh',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'monospace', color: 'var(--pixel-text)',
  };

  const headerStyle: React.CSSProperties = {
    background: 'var(--pixel-agent-bg)', borderBottom: '2px solid var(--pixel-agent-border)',
    padding: '6px 12px', fontSize: '22px', color: 'var(--pixel-agent-text)', fontWeight: 'bold',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };

  const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1, background: isActive ? 'var(--pixel-active-bg)' : 'var(--pixel-agent-bg)',
    color: isActive ? '#ffffff' : '#888899', fontWeight: 'bold',
    border: '2px solid var(--pixel-agent-border)',
    borderBottom: isActive ? '2px solid var(--pixel-active-bg)' : '2px solid var(--pixel-agent-border)',
    padding: '6px 0', fontSize: '19px', cursor: 'pointer', fontFamily: 'monospace',
    marginBottom: '-2px', zIndex: isActive ? 2 : 1, transition: '0.1s',
  });

  const sectionHead: React.CSSProperties = {
    background: '#222233', borderTop: '1px solid #333344', borderBottom: '1px solid #333344',
    padding: '4px 12px', fontSize: '19px', color: '#ffffff', fontWeight: 'bold',
    marginTop: 12, letterSpacing: '1px', textTransform: 'uppercase',
  };

  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 12px', fontSize: '20px',
  };

  const labelStyle: React.CSSProperties = { color: '#88aaff', fontWeight: 'bold' };
  const valStyle: React.CSSProperties = { color: '#ffffff', fontWeight: 'bold' };

  // ─── RANK ROW COMPONENT ──────────────────────────────────────────────────
  const RankRow = ({ agent, action }: { agent: HiredAgent, action: 'promote' | 'fire' }) => {
    const pColor = (agent.performance ?? 60) >= 80 ? '#00ff88' : (agent.performance ?? 60) >= 50 ? '#ffaa44' : '#ff4444';
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px dashed #333344'
      }}>
        <div>
          <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '20px' }}>
            {agent.name} <span style={{ color: '#ffdd44', fontSize: '17px' }}>[L{agent.level ?? 1}]</span>
          </div>
          <div style={{ color: pColor, fontSize: '17px', marginTop: 2 }}>
            Perf: {agent.performance ?? 60}% | Dept: {agent.dept}
          </div>
        </div>
        <button
          onClick={() => action === 'promote' ? onPromote(agent.id) : onFire(agent.id)}
          style={{
            background: action === 'promote' ? '#114422' : '#441111',
            color: action === 'promote' ? '#00ff88' : '#ff6666',
            border: `2px solid ${action === 'promote' ? '#00ff88' : '#ff4444'}`,
            padding: '4px 8px', fontSize: '17px', fontWeight: 'bold', fontFamily: 'monospace',
            cursor: 'pointer', boxShadow: '2px 2px 0 rgba(0,0,0,0.5)'
          }}
        >
          {action === 'promote' ? '⬆ PROMOTE' : '🔥 FIRE'}
        </button>
      </div>
    );
  };

  return (
    <div style={panelStyle} className="pixel-scrollbar">
      {/* Header */}
      <div style={headerStyle}>
        <span>📊 Office Stats</span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'var(--pixel-text)',
          fontSize: '22px', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold'
        }}>✕</button>
      </div>

      {/* Tabs Row */}
      <div style={{
        display: 'flex', gap: 4, padding: '8px 10px 0',
        background: 'var(--pixel-bg)', borderBottom: '2px solid var(--pixel-agent-border)'
      }}>
        <button onClick={() => setActiveTab('overview')} style={tabBtnStyle(activeTab === 'overview')}>OVERVIEW</button>
        <button onClick={() => setActiveTab('payroll')} style={tabBtnStyle(activeTab === 'payroll')}>PAYROLL</button>
        <button onClick={() => setActiveTab('rankings')} style={tabBtnStyle(activeTab === 'rankings')}>RANKINGS</button>
        <button onClick={() => setActiveTab('events')} style={tabBtnStyle(activeTab === 'events')}>EVENTS</button>
        <button onClick={() => setActiveTab('fx' as 'overview')} style={tabBtnStyle(activeTab === ('fx' as 'overview'))}>💱 FX</button>
      </div>

      {/* Content Area */}
      <div style={{ paddingBottom: 12, minHeight: 300, maxHeight: '55vh', background: 'var(--pixel-active-bg)', overflowY: 'auto', overflowX: 'hidden' }}>
        
        {/* ================== OVERVIEW TAB ================== */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ ...sectionHead, marginTop: 0, borderTop: 'none' }}>Live Metrics</div>
            <div style={row}><span style={labelStyle}>Total Agents</span> <span style={valStyle}>{totalAgents}</span></div>
            <div style={row}><span style={labelStyle}>Active Depts</span> <span style={valStyle}>{depts.length}</span></div>
            <div style={row}><span style={labelStyle}>Monthly Burn</span> <span style={{ color: '#ffdd44', fontWeight: 'bold' }}>${monthlyCost.toLocaleString()}</span></div>
            
            <div style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px' }}>
                <span style={labelStyle}>Productivity</span>
                <span style={{ color: prodColor, fontWeight: 'bold' }}>{productivity}%</span>
              </div>
              <PixelProgressBar value={productivity} max={100} color={prodColor} />
            </div>

            {totalAgents === 0 && (
              <div style={{
                padding: '20px 12px', textAlign: 'center',
                fontFamily: 'monospace', fontSize: '18px',
                border: '1px dashed #333344', margin: '12px',
                color: '#446688', background: '#111122',
              }}>
                <div style={{ fontSize: '28px', marginBottom: 8 }}>🏢</div>
                <div style={{ color: '#88aaff' }}>OFFICE IS EMPTY</div>
                <div style={{ color: '#446688', fontSize: '16px', marginTop: 6 }}>Click [👤 Hire] to add your first agent</div>
              </div>
            )}
            <div style={sectionHead}>Agent Status</div>
            {Object.entries(STATUS_COLORS).map(([status, color]) => {
              const count = statusMap[status] ?? 0;
              return (
                <div key={status} style={row}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cccccc', fontWeight: 'bold' }}>
                    <span style={{ width: 10, height: 10, background: color, border: '1px solid rgba(0,0,0,0.5)', display: 'inline-block' }} />
                    {status.toUpperCase()}
                  </span>
                  <span style={{ color: count > 0 ? color : '#666', fontWeight: 'bold' }}>{count}</span>
                </div>
              );
            })}

            <div style={sectionHead}>Floor Occupancy</div>
            {FLOOR_NAMES.map((name, i) => (
              <div key={i} style={{ padding: '6px 12px', opacity: currentFloor === i ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px' }}>
                  <span style={{ color: currentFloor === i ? '#ffffff' : '#88aaff', fontWeight: 'bold' }}>
                    {currentFloor === i ? '▶ ' : '  '}{name.toUpperCase()}
                  </span>
                </div>
                <PixelProgressBar value={floorCounts[i]} max={FLOOR_CAPACITY} color='#4488ff' />
              </div>
            ))}
          </div>
        )}

        {/* ================== PAYROLL TAB ================== */}
        {activeTab === 'payroll' && (
          <div>
            <div style={{ ...sectionHead, marginTop: 0, borderTop: 'none' }}>Company Budget</div>
            <div style={row}>
              <span style={labelStyle}>Total Run-Rate</span>
              <span style={{ color: '#ffdd44', fontWeight: 'bold' }}>${monthlyCost.toLocaleString()}/mo</span>
            </div>
            <div style={row}>
              <span style={labelStyle}>Average Salary</span>
              <span style={{ color: '#aaffcc', fontWeight: 'bold' }}>${avgSalary.toLocaleString()}</span>
            </div>

            <div style={sectionHead}>Department Breakdown</div>
            {deptsByCost.length === 0 ? (
              <div style={{
                padding: '20px 12px', textAlign: 'center',
                fontFamily: 'monospace', fontSize: '18px',
                border: '1px dashed #333344', margin: '12px',
                color: '#446644', background: '#111a11',
              }}>
                <div style={{ fontSize: '24px', marginBottom: 8 }}>[$]</div>
                <div style={{ color: '#aaffcc' }}>NO DEPARTMENTS YET</div>
                <div style={{ color: '#446644', fontSize: '16px', marginTop: 6 }}>Hire agents to see payroll data</div>
              </div>
            ) : (
              deptsByCost.map(([dept, data]) => (
                <div key={dept} style={{ padding: '6px 12px', borderBottom: '1px dashed #333344' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: DEPT_COLORS[dept] ?? '#888', fontWeight: 'bold', fontSize: '20px' }}>
                      {dept.toUpperCase()}
                    </span>
                    <span style={{ color: '#ffdd44', fontWeight: 'bold', fontSize: '20px' }}>
                      ${data.cost.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: '#888899', fontSize: '17px', fontWeight: 'bold' }}>
                    {data.count} Agent{data.count !== 1 ? 's' : ''} | Avg: ${Math.round(data.cost/data.count).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================== RANKINGS TAB ================== */}
        {activeTab === 'rankings' && (
          <div>
            <div style={{ ...sectionHead, marginTop: 0, borderTop: 'none', background: '#113322', color: '#00ff88' }}>
              🏆 Top Performers
            </div>
            {top3.length === 0 ? (
              <div style={{
                padding: '20px 12px', textAlign: 'center',
                fontFamily: 'monospace', fontSize: '18px',
                border: '1px dashed #224422', margin: '12px',
                color: '#446644', background: '#111a11',
              }}>
                <div style={{ fontSize: '24px', marginBottom: 8 }}>🏆</div>
                <div style={{ color: '#aaffcc' }}>NO RANKINGS YET</div>
                <div style={{ color: '#446644', fontSize: '16px', marginTop: 6 }}>Hire agents to see leaderboard</div>
              </div>
            ) : (
              top3.map(a => <RankRow key={a.id} agent={a} action="promote" />)
            )}

            <div style={{ ...sectionHead, background: '#331111', color: '#ff4444', marginTop: 12 }}>
              ⚠️ Bottom Performers
            </div>
            {bottom3.length === 0 ? (
              <div style={{
                padding: '20px 12px', textAlign: 'center',
                fontFamily: 'monospace', fontSize: '18px',
                border: '1px dashed #442222', margin: '12px',
                color: '#664444', background: '#1a1111',
              }}>
                <div style={{ fontSize: '24px', marginBottom: 8 }}>✅</div>
                <div style={{ color: '#ffaaaa' }}>ALL AGENTS PERFORMING WELL</div>
                <div style={{ color: '#664444', fontSize: '16px', marginTop: 6 }}>No underperformers detected</div>
              </div>
            ) : (
              bottom3.map(a => <RankRow key={a.id} agent={a} action="fire" />)
            )}
          </div>
        )}

        {/* ================== EVENTS TAB ================== */}
        {activeTab === 'events' && (
          <div>
            <div style={{ ...sectionHead, marginTop: 0, borderTop: 'none', background: activeEvent ? '#1a1122' : '#111122', color: activeEvent ? '#cc88ff' : '#ffffff' }}>
              {activeEvent ? `⚡ ${activeEvent.title} IN PROGRESS` : '📅 OFFICE EVENTS'}
            </div>

            {/* Auto-events toggle */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #333344', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '17px', color: '#aaaaaa' }}>⚙ Auto Events</span>
              <button
                onClick={() => onAutoEventsChange?.(!autoEvents)}
                style={{
                  padding: '4px 16px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                  background: autoEvents ? '#112211' : '#221111',
                  color: autoEvents ? '#00ff88' : '#ff4444',
                  border: `2px solid ${autoEvents ? '#00ff88' : '#ff4444'}`,
                  cursor: 'pointer', letterSpacing: 1,
                }}
              >
                {autoEvents ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Manual trigger: type selector + button */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #333344', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Event type picker */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedEventType('random')}
                  style={{
                    padding: '4px 10px', fontFamily: 'monospace', fontSize: '16px',
                    background: selectedEventType === 'random' ? '#223322' : '#111122',
                    color: selectedEventType === 'random' ? '#aaffcc' : '#557755',
                    border: `2px solid ${selectedEventType === 'random' ? '#00ff88' : '#333344'}`,
                    cursor: 'pointer',
                  }}
                >🎲 Random</button>
                {eventTemplates.map(tmpl => (
                  <button
                    key={tmpl.type}
                    onClick={() => setSelectedEventType(tmpl.type)}
                    style={{
                      padding: '4px 10px', fontFamily: 'monospace', fontSize: '16px',
                      background: selectedEventType === tmpl.type ? '#1a1122' : '#111122',
                      color: selectedEventType === tmpl.type ? tmpl.color : '#666677',
                      border: `2px solid ${selectedEventType === tmpl.type ? tmpl.color : '#333344'}`,
                      cursor: 'pointer',
                    }}
                  >{tmpl.icon} {tmpl.title.split(' ')[0]}</button>
                ))}
              </div>
              {/* Trigger button */}
              <button
                onClick={() => onTriggerEvent?.(selectedEventType === 'random' ? undefined : selectedEventType)}
                disabled={!!activeEvent}
                style={{
                  width: '100%', padding: '8px', fontFamily: 'monospace',
                  fontSize: '18px', fontWeight: 'bold',
                  background: activeEvent ? '#1a1a1a' : '#112211',
                  color: activeEvent ? '#444' : '#00ff88',
                  border: `2px solid ${activeEvent ? '#333' : '#00ff88'}`,
                  cursor: activeEvent ? 'not-allowed' : 'pointer',
                  letterSpacing: 1,
                }}
              >
                {activeEvent ? `⏳ EVENT RUNNING... (${activeEvent.icon})` : `▶ TRIGGER ${selectedEventType === 'random' ? 'RANDOM' : (eventTemplates.find(t => t.type === selectedEventType)?.title ?? 'EVENT')}`}
              </button>
            </div>

            {/* Active event status */}
            {activeEvent && (
              <div style={{
                margin: '10px 12px', padding: '10px',
                border: `2px solid ${activeEvent.color}`,
                background: '#111a22',
              }}>
                <div style={{ fontSize: '22px', marginBottom: 4 }}>{activeEvent.icon} <span style={{ color: activeEvent.color, fontWeight: 'bold' }}>{activeEvent.title}</span></div>
                <div style={{ color: '#cccccc', fontSize: '17px' }}>{activeEvent.desc}</div>
              </div>
            )}

            {/* Event history */}
            <div style={{ ...sectionHead }}>Event History</div>
            {eventLog.length === 0 ? (
              <div style={{
                padding: '20px 12px', textAlign: 'center',
                fontFamily: 'monospace', fontSize: '18px',
                border: '1px dashed #333344', margin: '12px',
                color: '#446688', background: '#111122',
              }}>
                <div style={{ fontSize: '24px', marginBottom: 8 }}>📅</div>
                <div style={{ color: '#88aaff' }}>NO EVENTS YET</div>
                <div style={{ color: '#446688', fontSize: '16px', marginTop: 6 }}>Events trigger automatically every ~3 mins</div>
              </div>
            ) : (
              eventLog.map((evt, i) => (
                <div key={evt.id} style={{
                  padding: '8px 12px', borderBottom: '1px dashed #333344',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: i === 0 && activeEvent?.id === evt.id ? '#111a22' : 'transparent',
                }}>
                  <span style={{ fontSize: '22px' }}>{evt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: evt.color, fontWeight: 'bold', fontSize: '17px' }}>{evt.title}</div>
                    <div style={{ color: '#888', fontSize: '14px' }}>
                      {i === 0 && activeEvent?.id === evt.id ? '⏱ Running...' : '✓ Completed'}
                    </div>
                  </div>
                  {i === 0 && activeEvent?.id === evt.id && (
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: evt.color }} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ================== FX RATES TAB ================== */}
        {activeTab === ('fx' as 'overview') && (
          <div>
            <div style={{ ...sectionHead, marginTop: 0, borderTop: 'none' }}>
              💱 EXCHANGE RATES (to USD)
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '15px', color: '#666688', marginBottom: 10 }}>
                Set today's rates manually. Stats Dashboard converts all salaries to USD using these values.
              </div>
              {Object.entries(fxRates).filter(([cur]) => cur !== 'USD').map(([cur, rate]) => (
                <div key={cur} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '18px', color: '#aaccff', width: 36 }}>{cur}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '15px', color: '#555577', flex: 1 }}>
                    {cur === 'INR' ? '₹' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : cur === 'JPY' ? '¥' : cur === 'RUB' ? '₽' : cur}
                    1 USD =
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > 0) setFxRates(prev => ({ ...prev, [cur]: v }));
                    }}
                    style={{
                      width: 100, padding: '5px 8px',
                      background: '#0a0a14', color: '#ffdd44',
                      border: '2px solid #333366', fontFamily: 'monospace',
                      fontSize: '18px', textAlign: 'right',
                    }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: '16px', color: '#666688' }}>
                    {cur === 'INR' ? '₹' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : cur === 'JPY' ? '¥' : cur === 'RUB' ? '₽' : ''}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '8px 10px', background: '#0d0d1a', border: '1px solid #333344', fontFamily: 'monospace', fontSize: '15px', color: '#556688' }}>
                💡 Example: 1 USD = {fxRates.INR ?? 84} INR &nbsp;|&nbsp; 1 USD = {fxRates.GBP ?? 0.78} GBP
              </div>
              <button
                onClick={() => { localStorage.removeItem('pixeloffice_fx_rates'); setFxRates({ USD: 1, INR: 84, GBP: 0.78, EUR: 0.92, JPY: 150, RUB: 90 }); }}
                style={{
                  marginTop: 12, width: '100%', padding: '7px', fontFamily: 'monospace',
                  fontSize: '16px', background: '#111122', color: '#888899',
                  border: '2px solid #333344', cursor: 'pointer',
                }}
              >↺ Reset to Defaults</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
