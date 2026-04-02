import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ScheduleSlot {
  startHour: number; // 0-23
  endHour: number;
  type: 'work' | 'lunch' | 'break' | 'meeting';
}

export interface AgentSchedule {
  agentId: string;
  slots: ScheduleSlot[];
}

export type DaySchedule = ScheduleSlot[];

const DEFAULT_SCHEDULE: DaySchedule = [
  { startHour: 9,  endHour: 13, type: 'work' },
  { startHour: 13, endHour: 14, type: 'lunch' },
  { startHour: 14, endHour: 16, type: 'work' },
  { startHour: 16, endHour: 16.5, type: 'break' },
  { startHour: 16.5, endHour: 18, type: 'work' },
];

const SLOT_COLORS: Record<string, string> = {
  work:    '#00ff88',
  lunch:   '#ffaa44',
  break:   '#44aaff',
  meeting: '#cc88ff',
};
const SLOT_ICONS: Record<string, string> = {
  work:    '💻',
  lunch:   '🍕',
  break:   '☕',
  meeting: '📋',
};
const SLOT_LABELS: Record<string, string> = {
  work:    'Work',
  lunch:   'Lunch',
  break:   'Break',
  meeting: 'Meeting',
};

const LS_SCHEDULE_KEY = 'pixeloffice_schedule';
function saveSchedule(s: DaySchedule) {
  try { localStorage.setItem(LS_SCHEDULE_KEY, JSON.stringify(s)); } catch {}
}

/** Get current slot for the given office hour */
export function getCurrentSlot(schedule: DaySchedule, officeHour: number): ScheduleSlot | null {
  return schedule.find(s => officeHour >= s.startHour && officeHour < s.endHour) ?? null;
}

/** Map slot type to agent status + zone */
export function slotToAgentState(slot: ScheduleSlot | null): { status: string; zone: string } {
  if (!slot) return { status: 'Working', zone: 'workspace' };
  switch (slot.type) {
    case 'work':    return { status: 'Working',    zone: 'workspace' };
    case 'lunch':   return { status: 'On Break',   zone: 'breakroom' };
    case 'break':   return { status: 'On Break',   zone: 'lounge' };
    case 'meeting': return { status: 'In Meeting', zone: 'conference' };
    default:        return { status: 'Working',    zone: 'workspace' };
  }
}

function hourLabel(h: number) {
  const hh = Math.floor(h);
  const mm = h % 1 === 0.5 ? '30' : '00';
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const display = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return `${display}:${mm} ${ampm}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface HiredAgentBasic {
  id: string;
  name: string;
  role: string;
}

interface Props {
  onClose: () => void;
  officeHour: number;
  onOfficeHourChange: (h: number) => void;
  clockAuto?: boolean;
  onClockAutoChange?: (v: boolean) => void;
  clockSpeed?: number;
  onClockSpeedChange?: (v: number) => void;
  schedule: DaySchedule;
  onScheduleChange: (s: DaySchedule) => void;
  agents?: HiredAgentBasic[];
  agentSchedules?: Record<string, DaySchedule>;
  onAgentScheduleChange?: (agentId: string, s: DaySchedule) => void;
}

const HOUR_OPTIONS = [
  6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5,
  12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5,
  17, 17.5, 18, 18.5, 19, 19.5, 20,
];

export function SchedulePanel({ onClose, officeHour, onOfficeHourChange, clockAuto = true, onClockAutoChange, clockSpeed = 1, onClockSpeedChange, schedule, onScheduleChange, agents = [], agentSchedules = {}, onAgentScheduleChange }: Props) {
  const [addMode, setAddMode] = useState(false);
  const [newSlot, setNewSlot] = useState<ScheduleSlot>({ startHour: 9, endHour: 10, type: 'work' });
  const [activeTab, setActiveTab] = useState<'global' | 'agents' | 'clock'>('global');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentAddMode, setAgentAddMode] = useState(false);
  const [agentNewSlot, setAgentNewSlot] = useState<ScheduleSlot>({ startHour: 9, endHour: 10, type: 'work' });

  const currentSlot = getCurrentSlot(schedule, officeHour);

  const inputStyle: React.CSSProperties = {
    background: '#0a0a14', color: '#ffdd44', border: '2px solid #333366',
    fontFamily: 'monospace', fontSize: '16px', padding: '4px 8px',
  };
  const sectionHead: React.CSSProperties = {
    background: '#111133', borderBottom: '1px solid #333355',
    padding: '5px 12px', fontSize: '16px', color: '#8888cc',
    fontFamily: 'monospace', letterSpacing: 1, fontWeight: 'bold',
  };
  const btnBase: React.CSSProperties = {
    fontFamily: 'monospace', fontSize: '15px', cursor: 'pointer', border: '2px solid',
    padding: '3px 10px', background: '#111122',
  };

  const handleDeleteSlot = (i: number) => {
    const next = schedule.filter((_, idx) => idx !== i);
    onScheduleChange(next);
    saveSchedule(next);
  };

  const handleAddSlot = () => {
    if (newSlot.endHour <= newSlot.startHour) return;
    const next = [...schedule, newSlot].sort((a, b) => a.startHour - b.startHour);
    onScheduleChange(next);
    saveSchedule(next);
    setAddMode(false);
    setNewSlot({ startHour: 9, endHour: 10, type: 'work' });
  };

  const handleReset = () => {
    onScheduleChange(DEFAULT_SCHEDULE);
    saveSchedule(DEFAULT_SCHEDULE);
  };

  // Timeline bar: 6am to 20pm = 14 hours
  const BAR_START = 6;
  const BAR_END = 20;
  const BAR_RANGE = BAR_END - BAR_START;

  return (
    <div style={{
      background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)',
      boxShadow: 'var(--pixel-shadow)', width: 400,
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--pixel-active-bg)', borderBottom: '2px solid var(--pixel-agent-border)',
        padding: '6px 10px', fontSize: '20px', color: 'var(--pixel-agent-text)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
      }}>
        <span>🕐 Work Schedule</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--pixel-text)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--pixel-agent-border)', background: '#0d0d1a', flexShrink: 0 }}>
        {([['global','🗓 Global'], ['agents','👥 Per-Agent'], ['clock','⏰ Clock']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '6px 4px', fontFamily: 'monospace', fontSize: '15px', cursor: 'pointer', border: 'none',
            borderBottom: activeTab === tab ? '2px solid var(--pixel-agent-border)' : '2px solid transparent',
            background: activeTab === tab ? 'var(--pixel-active-bg)' : 'transparent',
            color: activeTab === tab ? 'var(--pixel-agent-text)' : '#555577',
          }}>{label}</button>
        ))}
      </div>

      {/* ═══ CLOCK TAB ════════════════════════════════════════════════════════ */}
      {activeTab === 'clock' && (
        <div style={{ padding: '12px' }}>
          <div style={{ ...sectionHead, margin: '0 -12px 10px', padding: '5px 12px' }}>⏰ OFFICE CLOCK</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ color: '#aaaacc', fontSize: '16px' }}>Time:</span>
            <span style={{ color: '#ffdd44', fontSize: '26px', fontWeight: 'bold' }}>{hourLabel(officeHour)}</span>
            {currentSlot && <span style={{ color: SLOT_COLORS[currentSlot.type], fontSize: '18px' }}>{SLOT_ICONS[currentSlot.type]} {SLOT_LABELS[currentSlot.type]}</span>}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#666688', fontSize: '15px', display: 'block', marginBottom: 6 }}>Set Time Manually:</label>
            <select value={officeHour} onChange={e => onOfficeHourChange(parseFloat(e.target.value))} style={{ ...inputStyle, width: '100%' }}>
              {HOUR_OPTIONS.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '8px 10px', background: '#0a0a14', border: '1px solid #222233' }}>
            <span style={{ color: '#aaaacc', fontSize: '16px' }}>Auto-Advance Clock</span>
            <button onClick={() => onClockAutoChange?.(!clockAuto)} style={{
              padding: '4px 16px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', border: '2px solid',
              background: clockAuto ? '#112211' : '#221111',
              color: clockAuto ? '#00ff88' : '#ff4444',
              borderColor: clockAuto ? '#00ff88' : '#ff4444',
            }}>{clockAuto ? 'ON' : 'OFF'}</button>
          </div>
          {clockAuto && (
            <div>
              <label style={{ color: '#666688', fontSize: '15px', display: 'block', marginBottom: 6 }}>Clock Speed:</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 5, 10, 30, 60].map(s => (
                  <button key={s} onClick={() => onClockSpeedChange?.(s)} style={{
                    flex: 1, padding: '6px 4px', fontFamily: 'monospace', fontSize: '15px', cursor: 'pointer', border: '2px solid',
                    background: clockSpeed === s ? '#112211' : '#0a0a14',
                    color: clockSpeed === s ? '#00ff88' : '#555577',
                    borderColor: clockSpeed === s ? '#00ff88' : '#333344',
                  }}>{s === 1 ? '1x' : `${s}x`}</button>
                ))}
              </div>
              <div style={{ color: '#444466', fontSize: '13px', marginTop: 6 }}>
                {clockSpeed === 1 ? '1 real sec = 1 office min' : `1 real sec = ${clockSpeed} office mins`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ GLOBAL SCHEDULE TAB ══════════════════════════════════════════════ */}
      {activeTab === 'global' && <div>
      {/* Timeline bar */}
      <div style={{ ...sectionHead }}>📅 DAY TIMELINE</div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #222233' }}>
        <div style={{ position: 'relative', height: 32, background: '#0a0a14', border: '1px solid #222233' }}>
          {schedule.map((slot, i) => {
            const left = Math.max(0, ((slot.startHour - BAR_START) / BAR_RANGE) * 100);
            const width = Math.min(100 - left, ((slot.endHour - slot.startHour) / BAR_RANGE) * 100);
            return (
              <div key={i} title={`${SLOT_LABELS[slot.type]}: ${hourLabel(slot.startHour)}-${hourLabel(slot.endHour)}`}
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${left}%`, width: `${width}%`,
                  background: SLOT_COLORS[slot.type] + '88',
                  borderRight: `1px solid ${SLOT_COLORS[slot.type]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', overflow: 'hidden',
                }}
              >{SLOT_ICONS[slot.type]}</div>
            );
          })}
          {/* Current time marker */}
          {officeHour >= BAR_START && officeHour <= BAR_END && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${((officeHour - BAR_START) / BAR_RANGE) * 100}%`,
              width: 2, background: '#ffffff', zIndex: 2,
            }} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, color: '#444466', fontSize: '13px' }}>
          <span>6 AM</span><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>8 PM</span>
        </div>
      </div>

      {/* Schedule slots */}
      <div style={{ ...sectionHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📋 SCHEDULE SLOTS</span>
        <button onClick={() => setAddMode(v => !v)} style={{ ...btnBase, borderColor: '#00ff88', color: '#00ff88', fontSize: '14px' }}>
          {addMode ? '✕ Cancel' : '+ Add Slot'}
        </button>
      </div>

      {/* Add new slot form */}
      {addMode && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #222233', background: '#0d0d1a' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <select value={newSlot.type} onChange={e => setNewSlot(p => ({ ...p, type: e.target.value as ScheduleSlot['type'] }))} style={inputStyle}>
              {Object.entries(SLOT_LABELS).map(([k, v]) => <option key={k} value={k}>{SLOT_ICONS[k]} {v}</option>)}
            </select>
            <select value={newSlot.startHour} onChange={e => setNewSlot(p => ({ ...p, startHour: parseFloat(e.target.value) }))} style={inputStyle}>
              {HOUR_OPTIONS.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
            <span style={{ color: '#666688' }}>→</span>
            <select value={newSlot.endHour} onChange={e => setNewSlot(p => ({ ...p, endHour: parseFloat(e.target.value) }))} style={inputStyle}>
              {HOUR_OPTIONS.filter(h => h > newSlot.startHour).map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </div>
          <button onClick={handleAddSlot} style={{ ...btnBase, borderColor: '#00ff88', color: '#00ff88', width: '100%', padding: '6px' }}>
            ✓ Add Slot
          </button>
        </div>
      )}

      {/* Slot list */}
      <div style={{ flex: 1 }}>
        {schedule.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#446688', fontSize: '16px' }}>No slots — agents wander freely</div>
        ) : (
          schedule.map((slot, i) => {
            const isActive = currentSlot === slot;
            return (
              <div key={i} style={{
                padding: '8px 12px', borderBottom: '1px dashed #222233',
                display: 'flex', alignItems: 'center', gap: 10,
                background: isActive ? '#111a11' : 'transparent',
                borderLeft: isActive ? `3px solid ${SLOT_COLORS[slot.type]}` : '3px solid transparent',
              }}>
                <span style={{ fontSize: '20px' }}>{SLOT_ICONS[slot.type]}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: SLOT_COLORS[slot.type], fontWeight: 'bold', fontSize: '17px' }}>
                    {SLOT_LABELS[slot.type].toUpperCase()}
                  </span>
                  {isActive && <span style={{ color: '#00ff88', fontSize: '13px', marginLeft: 6 }}>◀ NOW</span>}
                  <div style={{ color: '#666688', fontSize: '15px' }}>
                    {hourLabel(slot.startHour)} → {hourLabel(slot.endHour)}
                  </div>
                </div>
                <button onClick={() => handleDeleteSlot(i)} style={{ ...btnBase, borderColor: '#ff4444', color: '#ff4444', fontSize: '14px' }}>✕</button>
              </div>
            );
          })
        )}
      </div>

      {/* Legend + reset */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #222233', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(SLOT_LABELS).map(([k, v]) => (
          <span key={k} style={{ color: SLOT_COLORS[k], fontSize: '14px' }}>{SLOT_ICONS[k]} {v}</span>
        ))}
        <button onClick={handleReset} style={{ ...btnBase, borderColor: '#444466', color: '#666688', marginLeft: 'auto', fontSize: '13px' }}>↺ Reset</button>
      </div>
      </div>}

      {/* ═══ PER-AGENT TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'agents' && (
        <div>
          <div style={{ ...sectionHead, margin: 0 }}>👥 PER-AGENT SCHEDULE</div>
          {agents.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#446688', fontFamily: 'monospace', fontSize: '16px' }}>
              No agents hired yet. Hire agents first.
            </div>
          ) : (
            <div>
              {/* Agent selector */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #222233' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {agents.map(a => {
                    const hasCustom = agentSchedules[a.id] && agentSchedules[a.id].length > 0;
                    return (
                      <button key={a.id} onClick={() => { setSelectedAgentId(a.id); setAgentAddMode(false); }} style={{
                        padding: '4px 10px', fontFamily: 'monospace', fontSize: '15px', cursor: 'pointer', border: '2px solid',
                        background: selectedAgentId === a.id ? 'var(--pixel-active-bg)' : '#0d0d1a',
                        color: selectedAgentId === a.id ? 'var(--pixel-agent-text)' : hasCustom ? '#aaccff' : '#555577',
                        borderColor: selectedAgentId === a.id ? 'var(--pixel-agent-border)' : hasCustom ? '#446688' : '#333344',
                      }}>
                        {hasCustom ? '★ ' : ''}{a.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected agent schedule */}
              {selectedAgentId && (() => {
                const agent = agents.find(a => a.id === selectedAgentId);
                const agentSched = agentSchedules[selectedAgentId] ?? [];
                const isUsingGlobal = agentSched.length === 0;

                const handleAgentAddSlot = () => {
                  if (agentNewSlot.endHour <= agentNewSlot.startHour) return;
                  const next = [...agentSched, agentNewSlot].sort((a, b) => a.startHour - b.startHour);
                  onAgentScheduleChange?.(selectedAgentId, next);
                  setAgentAddMode(false);
                };
                const handleAgentDeleteSlot = (i: number) => {
                  onAgentScheduleChange?.(selectedAgentId, agentSched.filter((_, idx) => idx !== i));
                };
                const handleAgentReset = () => {
                  onAgentScheduleChange?.(selectedAgentId, []);
                };

                return (
                  <div>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #222233', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ color: 'var(--pixel-agent-text)', fontSize: '18px', fontWeight: 'bold' }}>{agent?.name}</span>
                        <span style={{ color: '#666688', fontSize: '14px', marginLeft: 8 }}>{agent?.role}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!agentAddMode && <button onClick={() => setAgentAddMode(true)} style={{ ...btnBase, borderColor: '#00ff88', color: '#00ff88', fontSize: '14px' }}>+ Add</button>}
                        {!isUsingGlobal && <button onClick={handleAgentReset} style={{ ...btnBase, borderColor: '#ff4444', color: '#ff4444', fontSize: '14px' }}>↺ Use Global</button>}
                      </div>
                    </div>

                    {isUsingGlobal && (
                      <div style={{ padding: '10px 12px', color: '#446688', fontSize: '15px', fontFamily: 'monospace', borderBottom: '1px solid #222233' }}>
                        📋 Using global schedule. Add slots to override for this agent.
                      </div>
                    )}

                    {agentAddMode && (
                      <div style={{ padding: '10px 12px', borderBottom: '1px solid #222233', background: '#0d0d1a' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                          <select value={agentNewSlot.type} onChange={e => setAgentNewSlot(p => ({ ...p, type: e.target.value as ScheduleSlot['type'] }))} style={inputStyle}>
                            {Object.entries(SLOT_LABELS).map(([k, v]) => <option key={k} value={k}>{SLOT_ICONS[k]} {v}</option>)}
                          </select>
                          <select value={agentNewSlot.startHour} onChange={e => setAgentNewSlot(p => ({ ...p, startHour: parseFloat(e.target.value) }))} style={inputStyle}>
                            {HOUR_OPTIONS.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
                          </select>
                          <span style={{ color: '#666688' }}>→</span>
                          <select value={agentNewSlot.endHour} onChange={e => setAgentNewSlot(p => ({ ...p, endHour: parseFloat(e.target.value) }))} style={inputStyle}>
                            {HOUR_OPTIONS.filter(h => h > agentNewSlot.startHour).map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={handleAgentAddSlot} style={{ ...btnBase, borderColor: '#00ff88', color: '#00ff88', flex: 1, padding: '6px' }}>✓ Add</button>
                          <button onClick={() => setAgentAddMode(false)} style={{ ...btnBase, borderColor: '#ff4444', color: '#ff4444', padding: '6px 12px' }}>✕</button>
                        </div>
                      </div>
                    )}

                    {agentSched.map((slot, i) => {
                      const isNow = getCurrentSlot(agentSched, officeHour) === slot;
                      return (
                        <div key={i} style={{
                          padding: '8px 12px', borderBottom: '1px dashed #222233',
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: isNow ? '#111a11' : 'transparent',
                          borderLeft: isNow ? `3px solid ${SLOT_COLORS[slot.type]}` : '3px solid transparent',
                        }}>
                          <span style={{ fontSize: '18px' }}>{SLOT_ICONS[slot.type]}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: SLOT_COLORS[slot.type], fontWeight: 'bold', fontSize: '16px' }}>{SLOT_LABELS[slot.type].toUpperCase()}</span>
                            {isNow && <span style={{ color: '#00ff88', fontSize: '13px', marginLeft: 6 }}>◀ NOW</span>}
                            <div style={{ color: '#666688', fontSize: '14px' }}>{hourLabel(slot.startHour)} → {hourLabel(slot.endHour)}</div>
                          </div>
                          <button onClick={() => handleAgentDeleteSlot(i)} style={{ ...btnBase, borderColor: '#ff4444', color: '#ff4444', fontSize: '14px' }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
