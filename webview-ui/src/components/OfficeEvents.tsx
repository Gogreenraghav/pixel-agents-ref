import { useState, useEffect, useCallback } from 'react';

export interface OfficeEvent {
  id: string;
  type: 'meeting' | 'lunch' | 'client_visit' | 'fire_drill' | 'training';
  title: string;
  desc: string;
  icon: string;
  color: string;
  duration: number;   // seconds
  startedAt: number;  // timestamp
  affectedZone: string;
}

interface HiredAgent {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
}

interface Props {
  agents: HiredAgent[];
  onEventStart: (event: OfficeEvent) => void;
  onEventEnd: (event: OfficeEvent) => void;
  onAgentStatusChange: (id: string, status: string, zone: string) => void;
}

// Event templates
const EVENT_TEMPLATES = [
  {
    type: 'meeting' as const,
    title: 'TEAM MEETING',
    desc: 'All hands on deck! Staff gathering in conference room.',
    icon: '📋',
    color: '#44aaff',
    duration: 60,
    affectedZone: 'conference',
    minAgents: 2,
    weight: 40,
  },
  {
    type: 'lunch' as const,
    title: 'LUNCH BREAK',
    desc: 'Agents heading to break room for lunch.',
    icon: '🍕',
    color: '#ffaa44',
    duration: 45,
    affectedZone: 'breakroom',
    minAgents: 1,
    weight: 30,
  },
  {
    type: 'client_visit' as const,
    title: 'CLIENT VISIT',
    desc: 'Important client arriving! Best agents presenting.',
    icon: '🤝',
    color: '#ffdd44',
    duration: 90,
    affectedZone: 'conference',
    minAgents: 2,
    weight: 15,
  },
  {
    type: 'fire_drill' as const,
    title: 'FIRE DRILL',
    desc: 'Emergency drill! All staff moving to lounge.',
    icon: '🚨',
    color: '#ff4444',
    duration: 30,
    affectedZone: 'lounge',
    minAgents: 1,
    weight: 10,
  },
  {
    type: 'training' as const,
    title: 'SKILL TRAINING',
    desc: 'Agents boosting skills in conference room.',
    icon: '📚',
    color: '#aaffcc',
    duration: 75,
    affectedZone: 'conference',
    minAgents: 1,
    weight: 5,
  },
];

function pickEvent(agents: HiredAgent[]) {
  const possible = EVENT_TEMPLATES.filter(e => agents.length >= e.minAgents);
  if (possible.length === 0) return null;
  const totalWeight = possible.reduce((s, e) => s + e.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const tmpl of possible) {
    rand -= tmpl.weight;
    if (rand <= 0) return tmpl;
  }
  return possible[0];
}

export function useOfficeEvents({ agents, onEventStart, onEventEnd, onAgentStatusChange }: Props) {
  const [activeEvent, setActiveEvent] = useState<OfficeEvent | null>(null);
  const [lastEventTime, setLastEventTime] = useState(Date.now());

  const triggerEvent = useCallback(() => {
    if (activeEvent) return; // Already running
    if (agents.length === 0) return;

    const tmpl = pickEvent(agents);
    if (!tmpl) return;

    const event: OfficeEvent = {
      id: `evt_${Date.now()}`,
      type: tmpl.type,
      title: tmpl.title,
      desc: tmpl.desc,
      icon: tmpl.icon,
      color: tmpl.color,
      duration: tmpl.duration,
      startedAt: Date.now(),
      affectedZone: tmpl.affectedZone,
    };

    // Move agents to the event zone
    const eventStatus =
      tmpl.type === 'meeting' ? 'In Meeting'
      : tmpl.type === 'lunch' ? 'On Break'
      : tmpl.type === 'client_visit' ? 'In Meeting'
      : tmpl.type === 'fire_drill' ? 'On Break'
      : 'Working';

    // Affect a subset of agents (50-80%)
    const count = Math.max(1, Math.floor(agents.length * (0.5 + Math.random() * 0.3)));
    const shuffled = [...agents].sort(() => Math.random() - 0.5).slice(0, count);
    for (const a of shuffled) {
      onAgentStatusChange(a.id, eventStatus, tmpl.affectedZone);
    }

    setActiveEvent(event);
    setLastEventTime(Date.now());
    onEventStart(event);

    // Auto-end after duration
    setTimeout(() => {
      setActiveEvent(null);
      onEventEnd(event);
      // Restore agents to working
      for (const a of shuffled) {
        onAgentStatusChange(a.id, 'Working', 'workspace');
      }
    }, tmpl.duration * 1000);
  }, [activeEvent, agents, onEventStart, onEventEnd, onAgentStatusChange]);

  // Schedule events: every 2-4 minutes
  useEffect(() => {
    const CHECK_INTERVAL = 15000; // check every 15s
    const MIN_BETWEEN = 120000;   // min 2 min between events

    const t = setInterval(() => {
      const elapsed = Date.now() - lastEventTime;
      if (!activeEvent && elapsed > MIN_BETWEEN) {
        // 20% chance each check = roughly every 75s on average after 2 min cooldown
        if (Math.random() < 0.20) {
          triggerEvent();
        }
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(t);
  }, [activeEvent, lastEventTime, triggerEvent]);

  return { activeEvent, triggerEvent };
}

// ── Event Notification Banner ────────────────────────────────────────────────
export function EventBanner({ event, onDismiss }: { event: OfficeEvent | null; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState('');

  useEffect(() => {
    if (event && event.id !== shown) {
      setVisible(true);
      setShown(event.id);
      // Auto hide after 5s
      const t = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(t);
    } else if (!event) {
      setVisible(false);
    }
  }, [event, shown]);

  if (!visible || !event) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 500,
      background: 'var(--pixel-bg)',
      border: `3px solid ${event.color}`,
      boxShadow: `0 0 20px ${event.color}44, var(--pixel-shadow)`,
      padding: '10px 20px',
      fontFamily: 'monospace',
      minWidth: 320,
      textAlign: 'center',
    }}>
      {/* Blinking top bar */}
      <div style={{
        background: event.color,
        margin: '-10px -20px 10px -20px',
        padding: '4px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 16, fontWeight: 'bold', color: '#000', letterSpacing: 2 }}>
          ◉ OFFICE EVENT
        </span>
        <button
          onClick={() => { setVisible(false); onDismiss(); }}
          style={{
            background: 'rgba(0,0,0,0.3)', border: 'none', color: '#000',
            fontSize: 14, cursor: 'pointer', fontWeight: 'bold', padding: '0 4px'
          }}
        >✕</button>
      </div>

      <div style={{ fontSize: 32, marginBottom: 6 }}>{event.icon}</div>
      <div style={{ fontSize: 20, color: event.color, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 }}>
        {event.title}
      </div>
      <div style={{ fontSize: 16, color: '#cccccc', lineHeight: 1.5 }}>
        {event.desc}
      </div>
      <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
        Duration: {event.duration}s
      </div>
    </div>
  );
}

// ── Event Log (in Stats panel) ───────────────────────────────────────────────
export function EventLogEntry({ event, isActive }: { event: OfficeEvent; isActive: boolean }) {
  const elapsed = Math.round((Date.now() - event.startedAt) / 1000);
  const remaining = Math.max(0, event.duration - elapsed);

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px dashed #333344',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: isActive ? '#111a22' : 'transparent',
    }}>
      <span style={{ fontSize: 22 }}>{event.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: event.color, fontWeight: 'bold', fontSize: 17 }}>{event.title}</div>
        <div style={{ color: '#888', fontSize: 14 }}>
          {isActive ? `⏱ ${remaining}s remaining` : '✓ Completed'}
        </div>
      </div>
      {isActive && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: event.color,
          boxShadow: `0 0 6px ${event.color}`,
          animation: 'pulse 1s infinite',
        }} />
      )}
    </div>
  );
}
