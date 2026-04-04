import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BottomToolbar } from './components/BottomToolbar.js';
import { StatsDashboard, ROLE_SALARY } from './components/StatsDashboard.js';
import { useOfficeEvents, EventBanner } from './components/OfficeEvents.js';
import { AgentChatPanel } from './components/AgentChatPanel.js';
import { AgentTooltip } from './components/AgentTooltip.js';
import { AgentMemoryViewer } from './components/AgentMemoryViewer.js';
import { GroupChat } from './components/GroupChat.js';
import { WebhookSettings } from './components/WebhookSettings.js';
import { APISettings } from './components/APISettings.js';
import { FinancePanel } from './components/FinancePanel.js';
import { MessagingSettings } from './components/MessagingSettings.js';
import { AIReports } from './components/AIReports.js';
import { AITaskSuggestions } from './components/AITaskSuggestions.js';
import { AIAutoPriority } from './components/AIAutoPriority.js';
import { GameMechanics } from './components/GameMechanics.js';
import { EmailSettings } from './components/EmailSettings.js';
import { Unlockables } from './components/Unlockables.js';
import { Leaderboard } from './components/Leaderboard.js';
import { FloorManager } from './components/FloorManager.js';

// @ts-ignore - prevent tree-shaking
window.__FLOOR_MANAGER__ = FloorManager;
import { CompanyDashboard } from './components/CompanyDashboard.js';
import { SchedulePanel, getCurrentSlot, slotToAgentState } from './components/SchedulePanel.js';
import type { DaySchedule } from './components/SchedulePanel.js';
import type { OfficeEvent } from './components/OfficeEvents.js';
import { DebugView } from './components/DebugView.js';
import { ZoomControls } from './components/ZoomControls.js';
import { PULSE_ANIMATION_DURATION_SEC } from './constants.js';
import { useEditorActions } from './hooks/useEditorActions.js';
import { useEditorKeyboard } from './hooks/useEditorKeyboard.js';
import { useExtensionMessages } from './hooks/useExtensionMessages.js';
import { OfficeCanvas } from './office/components/OfficeCanvas.js';
import { DEFAULT_AREA_LABELS, FLOOR2_AREA_LABELS, FLOOR3_AREA_LABELS, FLOOR4_AREA_LABELS } from './office/engine/renderer.js';
import type { AreaLabel } from './office/engine/renderer.js';
import { ToolOverlay } from './office/components/ToolOverlay.js';
import { EditorState } from './office/editor/editorState.js';
import { EditorToolbar } from './office/editor/EditorToolbar.js';
import { OfficeState } from './office/engine/officeState.js';
import { isRotatable } from './office/layout/furnitureCatalog.js';
import { EditTool } from './office/types.js';
import { isBrowserRuntime } from './runtime.js';
import { vscode } from './vscodeApi.js';

// Game state lives outside React — updated imperatively by message handlers
const officeStateRef = { current: null as OfficeState | null };
const editorState = new EditorState();

function getOfficeState(): OfficeState {
  if (!officeStateRef.current) {
    officeStateRef.current = new OfficeState();
  }
  return officeStateRef.current;
}

// ── Hired Agents Store (Paperclip) ──────────────────────────────────────────
interface AIConfig {
  provider: string;      // 'litellm' | 'ollama' | 'openai' | 'groq' | 'anthropic' | 'custom'
  baseUrl: string;
  apiKey: string;
  model: string;
  connected: boolean;    // last test result
  lastTested?: string;
}

interface HiredAgent {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
  hireDate: string;
  zone?: string;
  pixelCharId?: number;
  salary: number;
  currency: string;
  country: string;
  performance: number;  // 0-100
  level: number;        // 1=Junior, 2=Mid, 3=Senior, 4=Lead
  tasksCompleted: number;
  aiConfig?: AIConfig;  // optional AI provider config
}

interface HireHistoryEntry {
  id: string;
  agentName: string;
  role: string;
  dept: string;
  salary: number;
  currency: string;
  country: string;
  action: 'hired' | 'fired';
  date: string;
  aiProvider?: string;
}

function loadHistoryFromStorage(): HireHistoryEntry[] {
  try { const r = localStorage.getItem(LS_HISTORY_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveHistoryToStorage(h: HireHistoryEntry[]) {
  try { localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(h.slice(0, 50))); } catch {}
}

const LS_AGENTS_KEY = 'pixeloffice_agents';
const LS_HISTORY_KEY = 'pixeloffice_hire_history';

function loadAgentsFromStorage(): HiredAgent[] {
  try {
    const raw = localStorage.getItem(LS_AGENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAgentsToStorage(agents: HiredAgent[]) {
  try { localStorage.setItem(LS_AGENTS_KEY, JSON.stringify(agents)); } catch { /* ignore */ }
}

const hiredAgentsStore: HiredAgent[] = loadAgentsFromStorage();
let hiredAgentsListeners: (() => void)[] = [];

function addHiredAgent(agent: HiredAgent) {
  hiredAgentsStore.push(agent);
  saveAgentsToStorage(hiredAgentsStore);
  hiredAgentsListeners.forEach(l => l());
}

function removeHiredAgent(id: string) {
  const idx = hiredAgentsStore.findIndex(a => a.id === id);
  if (idx >= 0) hiredAgentsStore.splice(idx, 1);
  saveAgentsToStorage(hiredAgentsStore);
  hiredAgentsListeners.forEach(l => l());
}

function updateHiredAgent(id: string, patch: Partial<HiredAgent>) {
  const agent = hiredAgentsStore.find(a => a.id === id);
  if (agent) Object.assign(agent, patch);
  saveAgentsToStorage(hiredAgentsStore);
  hiredAgentsListeners.forEach(l => l());
}

const STATUSES = ['Working', 'Working', 'Working', 'Idle', 'In Meeting', 'On Break'];
const STATUS_ZONES: Record<string, string> = {
  'Working':    'workspace',
  'Idle':       'workspace',
  'In Meeting': 'workspace',   // meeting in working area on ground floor
  'On Break':   'cafeteria',   // break → lounge (right room)
};

function randomStatus() {
  return STATUSES[Math.floor(Math.random() * STATUSES.length)];
}

// Rotate statuses every 10 seconds + update agent zone
setInterval(() => {
  hiredAgentsStore.forEach(a => {
    if (Math.random() < 0.35) {
      a.status = randomStatus();
      a.zone = STATUS_ZONES[a.status] ?? 'workspace';
      // Update the pixel character's zone if we can find it
      if (a.pixelCharId !== undefined) {
        const os = officeStateRef.current;
        if (os) {
          const ch = os.characters.get(a.pixelCharId);
          if (ch) {
            (ch as { agentZone?: string }).agentZone = a.zone;
            // Always clear path so agent re-routes to new zone immediately
            ch.path = [];
            ch.wanderTimer = 0;  // trigger immediate wander decision
            ch.isActive = false; // stand up from desk, start wandering to zone
          }
        }
      }
    }
  });
  hiredAgentsListeners.forEach(l => l());
}, 10000);

function useHiredAgents() {
  const [list, setList] = useState<HiredAgent[]>([...hiredAgentsStore]);
  useEffect(() => {
    const update = () => setList([...hiredAgentsStore]);
    hiredAgentsListeners.push(update);
    return () => { hiredAgentsListeners = hiredAgentsListeners.filter(l => l !== update); };
  }, []);
  return list;
}

// ── Role Colors ──────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  CEO: '#ffd700', CTO: '#00cfff', Manager: '#cc88ff',
  Developer: '#00ff88', Designer: '#ff88cc', QA: '#aaff00',
};

// ── Agent List Panel ─────────────────────────────────────────────────────────
function AgentListPanel({ agents, onSelect, selectedId }: {
  agents: HiredAgent[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  if (agents.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 10, right: 10, zIndex: 50,
      background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)',
      boxShadow: 'var(--pixel-shadow)', minWidth: 200, maxWidth: 240,
      maxHeight: '70vh', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: 'var(--pixel-active-bg)', borderBottom: '2px solid var(--pixel-border)',
        padding: '6px 10px', fontSize: '20px', color: 'var(--pixel-text)',
      }}>
        👥 Team ({agents.length})
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {agents.map(a => (
          <div
            key={a.id}
            onClick={() => onSelect(a.id)}
            onMouseEnter={() => setHovered(a.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: '7px 10px', cursor: 'pointer',
              borderBottom: '1px solid var(--pixel-border)',
              background: selectedId === a.id
                ? 'var(--pixel-active-bg)'
                : hovered === a.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            <span style={{ fontSize: '21px', color: 'var(--pixel-text)' }}>{a.name}</span>
            <span style={{ fontSize: '18px', color: ROLE_COLORS[a.role] || '#aaaaff' }}>
              {a.role} · {a.dept}
            </span>
            <span style={{ fontSize: '16px', color: a.status === 'Working' ? '#00ff88' : a.status === 'In Meeting' ? '#ffd700' : a.status === 'On Break' ? '#ff9966' : '#aaaaaa' }}>
              ● {a.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Agent Detail Panel ───────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  Global: '🌍', India: '🇮🇳', USA: '🇺🇸', UK: '🇬🇧', Europe: '🇪🇺', Japan: '🇯🇵', Russia: '🇷🇺'
};
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', INR: '₹', GBP: '£', EUR: '€', JPY: '¥', RUB: '₽',
};

const LEVEL_NAMES = ['Junior', 'Mid', 'Senior', 'Lead', 'Principal'];

function AgentDetailPanel({ agent, onClose, onFire, onPromote, onDemote, onChat, onMemory }: {
  agent: HiredAgent;
  onClose: () => void;
  onFire: (id: string) => void;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  onChat?: (id: string) => void;
  onMemory?: (id: string) => void;
}) {
  const [confirmFire, setConfirmFire] = useState(false);
  const levelName = LEVEL_NAMES[(agent.level ?? 1) - 1] ?? 'Junior';
  const perfColor = (agent.performance ?? 60) >= 80 ? '#00ff88' : (agent.performance ?? 60) >= 50 ? '#ffaa44' : '#ff4444';
  const btnStyle: React.CSSProperties = {
    flex: 1, padding: '4px 0', fontSize: '18px',
    background: 'var(--pixel-btn-bg)', color: 'var(--pixel-text)',
    border: '2px solid var(--pixel-border)', borderRadius: 0, cursor: 'pointer',
  };
  return (
    <div style={{
      position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
      zIndex: 60, background: 'var(--pixel-bg)',
      border: '2px solid var(--pixel-agent-border)',
      boxShadow: 'var(--pixel-shadow)', minWidth: 270,
    }}>
      <div style={{
        background: 'var(--pixel-agent-bg)', borderBottom: '2px solid var(--pixel-agent-border)',
        padding: '6px 10px', fontSize: '20px', color: 'var(--pixel-agent-text)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>👤 {agent.name}</span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'var(--pixel-text)',
          fontSize: '20px', cursor: 'pointer', padding: '0 4px',
        }}>✕</button>
      </div>
      <div style={{ padding: '10px 14px', fontSize: '19px', lineHeight: 1.9, fontFamily: 'monospace' }}>
        <div><span style={{ color: 'var(--pixel-text-dim)' }}>Role: </span>
          <span style={{ color: ROLE_COLORS[agent.role] || '#aaaaff' }}>{agent.role}</span></div>
        <div><span style={{ color: 'var(--pixel-text-dim)' }}>Level: </span>
          <span style={{ color: '#ffdd44' }}>{levelName}</span>
          <span style={{ color: '#444', fontSize: 15 }}> (L{agent.level ?? 1})</span></div>
        <div><span style={{ color: 'var(--pixel-text-dim)' }}>Location: </span>
          <span>{FLAGS[agent.country ?? 'Global'] ?? '🌍'} {agent.country ?? 'Global'}</span></div>
        <div><span style={{ color: 'var(--pixel-text-dim)' }}>Dept: </span>
          <span>{agent.dept}</span></div>
        {agent.aiConfig && (
          <div><span style={{ color: 'var(--pixel-text-dim)' }}>AI Brain: </span>
            <span style={{ color: agent.aiConfig.connected ? '#00ff88' : '#ff4444' }}>
              {agent.aiConfig.connected ? '🤖 ' : '⚠ '}{agent.aiConfig.provider}
            </span>
          </div>
        )}
        <div><span style={{ color: 'var(--pixel-text-dim)' }}>Status: </span>
          <span style={{ color: agent.status === 'Working' ? '#00ff88' : agent.status === 'In Meeting' ? '#ffd700' : agent.status === 'On Break' ? '#ff9966' : '#aaaaaa' }}>
            {agent.status}</span></div>
        <div><span style={{ color: 'var(--pixel-text-dim)' }}>Salary: </span>
          <span style={{ color: '#ffdd44' }}>{CURRENCY_SYMBOLS[agent.currency ?? 'USD'] ?? '$'}{(agent.salary ?? 4000).toLocaleString()}/mo</span>
          <span style={{ color: '#666', fontSize: 14 }}> ({agent.currency ?? 'USD'})</span></div>
        <div><span style={{ color: 'var(--pixel-text-dim)' }}>Tasks: </span>
          <span style={{ color: '#aaccff' }}>{agent.tasksCompleted ?? 0}</span></div>
        <div><span style={{ color: 'var(--pixel-text-dim)' }}>Hired: </span>
          <span>{agent.hireDate}</span></div>

        {/* Performance bar */}
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: 'var(--pixel-text-dim)', fontSize: 17 }}>Performance</span>
            <span style={{ color: perfColor, fontSize: 17 }}>{agent.performance ?? 60}%</span>
          </div>
          <div style={{ height: 7, background: '#1a1a2e', border: '1px solid #333' }}>
            <div style={{ height: '100%', width: `${agent.performance ?? 60}%`, background: perfColor, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Promote / Demote */}
        {agent.aiConfig && onChat && (
          <button onClick={() => onChat(agent.id)} style={{
            ...btnStyle, width: '100%', marginTop: 10, marginBottom: 4, background: '#0a0a14', color: '#aaccff', borderColor: '#334466'
          }}>💬 Chat with Agent</button>
        )}
        <button onClick={() => onMemory?.(agent.id)} style={{
          ...btnStyle, width: '100%', marginTop: 0, marginBottom: -4, background: '#0a1a0a', color: '#44ffaa', borderColor: '#226644'
        }}>🧠 View Memory & Skills</button>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button
            onClick={() => onPromote(agent.id)}
            disabled={(agent.level ?? 1) >= 5}
            style={{ ...btnStyle, opacity: (agent.level ?? 1) >= 5 ? 0.4 : 1 }}
          >⬆ Promote</button>
          <button
            onClick={() => onDemote(agent.id)}
            disabled={(agent.level ?? 1) <= 1}
            style={{ ...btnStyle, opacity: (agent.level ?? 1) <= 1 ? 0.4 : 1 }}
          >⬇ Demote</button>
        </div>

        {/* Fire */}
        <div style={{ marginTop: 6 }}>
          {!confirmFire ? (
            <button onClick={() => setConfirmFire(true)} style={{
              width: '100%', padding: '5px', fontSize: '19px',
              background: 'var(--pixel-danger-bg)', color: '#fff',
              border: '2px solid #ff4444', borderRadius: 0, cursor: 'pointer',
            }}>🔥 Fire Agent</button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onFire(agent.id)} style={{
                flex: 1, padding: '5px', fontSize: '19px',
                background: 'var(--pixel-danger-bg)', color: '#fff',
                border: '2px solid #ff4444', borderRadius: 0, cursor: 'pointer',
              }}>Yes, Fire</button>
              <button onClick={() => setConfirmFire(false)} style={{
                flex: 1, padding: '5px', fontSize: '19px',
                background: 'var(--pixel-btn-bg)', color: 'var(--pixel-text)',
                border: '2px solid var(--pixel-border)', borderRadius: 0, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Global hire event listener ────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('pixeloffice:hire', (e: Event) => {
    const { name, role, dept } = (e as CustomEvent).detail;
    addHiredAgent({
      id: `hire_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      name, role, dept,
      status: 'Working',
      hireDate: new Date().toLocaleDateString(),
      salary: ROLE_SALARY[role] ?? 4000,
      currency: 'USD',
      country: 'Global',
      performance: 60 + Math.floor(Math.random() * 25),
      level: 1,
      tasksCompleted: 0,
    });
  });
}

const actionBarBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '22px',
  background: 'var(--pixel-btn-bg)',
  color: 'var(--pixel-text-dim)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
};

const actionBarBtnDisabled: React.CSSProperties = {
  ...actionBarBtnStyle,
  opacity: 'var(--pixel-btn-disabled-opacity)',
  cursor: 'default',
};

function EditActionBar({
  editor,
  editorState: es,
}: {
  editor: ReturnType<typeof useEditorActions>;
  editorState: EditorState;
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const undoDisabled = es.undoStack.length === 0;
  const redoDisabled = es.redoStack.length === 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--pixel-controls-z)',
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        borderRadius: 0,
        padding: '4px 8px',
        boxShadow: 'var(--pixel-shadow)',
      }}
    >
      <button
        style={undoDisabled ? actionBarBtnDisabled : actionBarBtnStyle}
        onClick={undoDisabled ? undefined : editor.handleUndo}
        title="Undo (Ctrl+Z)"
      >
        Undo
      </button>
      <button
        style={redoDisabled ? actionBarBtnDisabled : actionBarBtnStyle}
        onClick={redoDisabled ? undefined : editor.handleRedo}
        title="Redo (Ctrl+Y)"
      >
        Redo
      </button>
      <button style={actionBarBtnStyle} onClick={editor.handleSave} title="Save layout">
        Save
      </button>
      {!showResetConfirm ? (
        <button
          style={actionBarBtnStyle}
          onClick={() => setShowResetConfirm(true)}
          title="Reset to last saved layout"
        >
          Reset
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '22px', color: 'var(--pixel-reset-text)' }}>Reset?</span>
          <button
            style={{ ...actionBarBtnStyle, background: 'var(--pixel-danger-bg)', color: '#fff' }}
            onClick={() => {
              setShowResetConfirm(false);
              editor.handleReset();
            }}
          >
            Yes
          </button>
          <button style={actionBarBtnStyle} onClick={() => setShowResetConfirm(false)}>
            No
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  // Browser runtime (dev or static dist): dispatch mock messages after the
  // useExtensionMessages listener has been registered.
  useEffect(() => {
    if (isBrowserRuntime) {
      void import('./browserMock.js').then(async ({ initBrowserMock, dispatchMockMessages }) => { await initBrowserMock(); dispatchMockMessages(); });
    }
  }, []);

  const editor = useEditorActions(getOfficeState, editorState);

  const isEditDirty = useCallback(
    () => editor.isEditMode && editor.isDirty,
    [editor.isEditMode, editor.isDirty],
  );

  const {
    agents,
    selectedAgent,
    agentTools,
    agentStatuses,
    subagentTools,
    subagentCharacters,
    layoutReady,
    layoutWasReset,
    loadedAssets,
    workspaceFolders,
    externalAssetDirectories,
  } = useExtensionMessages(getOfficeState, editor.setLastSavedLayout, isEditDirty);

  // ── Paperclip State ────────────────────────────────────────────────────────
  const hiredAgents = useHiredAgents();
  const [selectedHiredId, setSelectedHiredId] = useState<string | null>(null);

  // ── Floor state ───────────────────────────────────────────────
  // URL param: ?floor=N loads that floor automatically
  const urlFloorParam = parseInt(new URLSearchParams(window.location.search).get('floor') ?? '0', 10);
  const isEmbedMode = new URLSearchParams(window.location.search).get('embed') === '1';
  const [currentFloor, setCurrentFloor] = useState(isNaN(urlFloorParam) ? 0 : urlFloorParam);
  const [statsOpen, setStatsOpen] = useState(false);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [floorOpen, setFloorOpen] = useState(false);
  const [memoryAgentId, setMemoryAgentId] = useState<string | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [hireHistory, setHireHistory] = useState<HireHistoryEntry[]>(() => loadHistoryFromStorage());
  // ── Game Economy ─────────────────────────────────────────────────────────
  const LS_BALANCE_KEY = 'pixeloffice_balance';
  const LS_BUDGET_KEY  = 'pixeloffice_dept_budgets';
  const STARTING_BALANCE = 50000;

  const [companyBalance, setCompanyBalance] = useState<number>(() => {
    try { const s = localStorage.getItem(LS_BALANCE_KEY); return s ? parseFloat(s) : STARTING_BALANCE; } catch { return STARTING_BALANCE; }
  });
  const [deptBudgets, setDeptBudgets] = useState<Record<string, number>>(() => {
    try { const s = localStorage.getItem(LS_BUDGET_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  // ── Schedule System ─────────────────────────────────────────────────────
  const LS_SCHED_KEY = 'pixeloffice_schedule';
  const DEFAULT_SCHED: DaySchedule = [
    { startHour: 9,  endHour: 13,  type: 'work' },
    { startHour: 13, endHour: 14,  type: 'lunch' },
    { startHour: 14, endHour: 16,  type: 'work' },
    { startHour: 16, endHour: 16.5, type: 'break' },
    { startHour: 16.5, endHour: 18, type: 'work' },
  ];
  const [schedule, setSchedule] = useState<DaySchedule>(() => {
    try { const s = localStorage.getItem(LS_SCHED_KEY); return s ? JSON.parse(s) : DEFAULT_SCHED; } catch { return DEFAULT_SCHED; }
  });
  const [officeHour, setOfficeHour] = useState<number>(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [clockAuto, setClockAuto] = useState(true);        // auto-advance clock
  const [clockSpeed, setClockSpeed] = useState(1);          // 1=real, 2=2x, 5=5x, 10=10x
  // Per-agent schedules: agentId -> DaySchedule (overrides global if set)
  const LS_AGENT_SCHED_KEY = 'pixeloffice_agent_schedules';
  const [agentSchedules, setAgentSchedules] = useState<Record<string, DaySchedule>>(() => {
    try { const s = localStorage.getItem(LS_AGENT_SCHED_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  // Auto-advance office clock: 1 real second = clockSpeed office minutes
  useEffect(() => {
    if (!clockAuto) return;
    const t = setInterval(() => {
      setOfficeHour(prev => {
        const next = prev + clockSpeed / 60;
        return next >= 24 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [clockAuto, clockSpeed]);

  // Revenue: each working agent generates $200-$400/day (~$6k-$12k/mo)
  // Deduct payroll each "tick" (every 60s = simulated day)
  const FX_RATES_DEFAULT: Record<string, number> = { USD: 1, INR: 84, GBP: 0.78, EUR: 0.92, JPY: 150, RUB: 90 };

  const [autoEvents, setAutoEvents] = useState(true);
  const [eventLog, setEventLog] = useState<OfficeEvent[]>([]);
  const [dismissedEvent, setDismissedEvent] = useState(false);

  // ── Washroom occupancy ────────────────────────────────────────
  const [washroomOccupied, setWashroomOccupied] = useState(false);
  const [_washroomOccupant, setWashroomOccupant] = useState<string | null>(null);

  // When an agent's status changes to 'On Break', simulate washroom visit
  // Washroom is on all floors, bottom-right area
  useEffect(() => {
    const interval = setInterval(() => {
      const onBreak = hiredAgents.filter(a => a.status === 'On Break');
      if (onBreak.length > 0 && !washroomOccupied && Math.random() < 0.3) {
        const agent = onBreak[Math.floor(Math.random() * onBreak.length)];
        setWashroomOccupied(true);
        setWashroomOccupant(agent.name);
        // Auto-clear after 15-30 seconds
        setTimeout(() => {
          setWashroomOccupied(false);
          setWashroomOccupant(null);
        }, 15000 + Math.random() * 15000);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [hiredAgents, washroomOccupied]);

  // Area labels — update based on floor + washroom status
  const areaLabels = useMemo((): AreaLabel[] => {
    const baseLabels = currentFloor === 0
      ? [...DEFAULT_AREA_LABELS]
      : currentFloor === 1
        ? [...FLOOR2_AREA_LABELS]
        : currentFloor === 2
          ? [...FLOOR3_AREA_LABELS]
          : [...FLOOR4_AREA_LABELS];

    // Update washroom label based on occupancy
    return baseLabels.map(l =>
      l.label === 'WASHROOM'
        ? {
            ...l,
            label: washroomOccupied
              ? `WASHROOM [OCCUPIED]`
              : 'WASHROOM [FREE]',
            color: washroomOccupied ? '#ff6666' : '#aaffdd',
          }
        : l
    );
  }, [currentFloor, washroomOccupied]);
  const FLOOR_FILES = ['floor-0.json', 'floor-1.json', 'floor-2.json', 'floor-3.json'];

  const loadFloorFile = useCallback(async (floor: number) => {
    try {
      const base = window.location.href.replace(/\/[^/]*$/, '/');
      const resp = await fetch(`${base}assets/${FLOOR_FILES[floor]}?t=${Date.now()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const layout = await resp.json() as { version: number };
      if (layout.version === 1) {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'layoutLoaded', layout }
        }));
      }
    } catch (e) {
      console.warn('[FloorSwitch] Failed to load floor', floor, e);
    }
  }, []);

  // Always reload floor-0 after assets are ready (fixes washroom not showing on refresh)
  // Also re-spawn all persisted hired agents into the pixel engine
  useEffect(() => {
    if (!layoutReady) return;
    const t = setTimeout(() => {
      void loadFloorFile(urlFloorParam || 0);
      // Re-create pixel characters for all agents loaded from localStorage
      hiredAgentsStore.forEach(agent => {
        if (agent.pixelCharId !== undefined) {
          window.dispatchEvent(new MessageEvent('message', {
            data: {
              type: 'agentCreated',
              id: agent.pixelCharId,
              folderName: `${agent.name} (${agent.role})`,
              palette: Math.floor(Math.random() * 6),
              hueShift: Math.floor(Math.random() * 360),
            }
          }));
        }
      });
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutReady]);

  const handleFloorChange = useCallback(async (floor: number) => {
    if (floor === currentFloor) return;
    setCurrentFloor(floor);
    try { localStorage.setItem('pixeloffice_floor', String(floor)); } catch { /* ignore */ }
    await loadFloorFile(floor);
  }, [currentFloor, loadFloorFile]);
  const selectedHiredAgent = hiredAgents.find(a => a.id === selectedHiredId) ?? null;

  const handleHireAgent = useCallback((name: string, role: string, dept: string, salary: number, currency: string, country: string, aiConfig?: AIConfig) => {
    // Dispatch to Pixel Agents engine — use a numeric-friendly id
    const numericId = Date.now();
    const agentId = `hired_${numericId}`;
    window.dispatchEvent(new MessageEvent('message', {
      data: {
        type: 'agentCreated',
        id: numericId,
        folderName: `${name} (${role})`,
        palette: Math.floor(Math.random() * 6),
        hueShift: Math.floor(Math.random() * 360),
      }
    }));
    // Add to our list, recording the pixel char id
    addHiredAgent({
      id: agentId,
      name, role, dept,
      status: 'Working',
      zone: 'workspace',
      hireDate: new Date().toLocaleDateString(),
      pixelCharId: numericId,
      salary,
      currency,
      country,
      performance: 60 + Math.floor(Math.random() * 25),
      level: 1,
      tasksCompleted: 0,
      aiConfig,
    });
  }, []);

  const handleAgentStatusChange = useCallback((id: string, status: string, zone: string) => {
    updateHiredAgent(id, { status, zone });
  }, []);

  const handlePromoteAgent = useCallback((id: string) => {
    const agent = hiredAgentsStore.find(a => a.id === id);
    if (!agent || (agent.level ?? 1) >= 5) return;
    const newLevel = (agent.level ?? 1) + 1;
    const raise = Math.round((agent.salary ?? 4000) * 0.15);
    updateHiredAgent(id, { level: newLevel, salary: (agent.salary ?? 4000) + raise });
  }, []);

  const handleDemoteAgent = useCallback((id: string) => {
    const agent = hiredAgentsStore.find(a => a.id === id);
    if (!agent || (agent.level ?? 1) <= 1) return;
    const newLevel = (agent.level ?? 1) - 1;
    const cut = Math.round((agent.salary ?? 4000) * 0.10);
    updateHiredAgent(id, { level: newLevel, salary: Math.max(1500, (agent.salary ?? 4000) - cut) });
  }, []);

  // ── Office Events ────────────────────────────────────────────────────────────
  const { activeEvent, triggerEvent, EVENT_TEMPLATES } = useOfficeEvents({
    autoEvents,
    agents: hiredAgents,
    onEventStart: (evt) => {
      setEventLog(prev => [evt, ...prev.slice(0, 9)]);
      setDismissedEvent(false);
    },
    onEventEnd: (_evt) => { /* already handled in hook */ },
    onAgentStatusChange: handleAgentStatusChange,
  });

  // ── Game Loop: Revenue + Payroll tick every 60s ─────────────────────────
  useEffect(() => {
    const TICK_MS = 60000; // 60s = 1 simulated work-day
    const t = setInterval(() => {
      setCompanyBalance(prev => {
        const agents = hiredAgentsStore;
        // Revenue: working agents generate value
        const revenue = agents.reduce((sum, a) => {
          if (a.status === 'Working') return sum + 250 + (a.performance ?? 60) * 2;
          if (a.status === 'In Meeting') return sum + 150;
          return sum + 50;
        }, 0);
        // Payroll cost per tick (monthly / 30 days)
        const payroll = agents.reduce((sum, a) => {
          const salUSD = (a.salary ?? 4000) / (FX_RATES_DEFAULT[a.currency ?? 'USD'] ?? 1);
          return sum + salUSD / 30;
        }, 0);
        const newBalance = prev + revenue - payroll;
        try { localStorage.setItem(LS_BALANCE_KEY, String(newBalance)); } catch {}
        return newBalance;
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, []);

  // ── Dept budget handler ───────────────────────────────────────────────────
  const handleDeptBudgetChange = useCallback((dept: string, budget: number) => {
    setDeptBudgets(prev => {
      const next = { ...prev, [dept]: budget };
      try { localStorage.setItem(LS_BUDGET_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Compute monthly revenue for display (based on current agent status)
  const monthlyRevenue = hiredAgents.reduce((sum, a) => {
    if (a.status === 'Working') return sum + (250 + (a.performance ?? 60) * 2) * 30;
    if (a.status === 'In Meeting') return sum + 150 * 30;
    return sum + 50 * 30;
  }, 0);

  // Enforce schedule: per-agent or global, every 30 office-minutes
  useEffect(() => {
    if (activeEvent) return; // Office event overrides schedule
    hiredAgentsStore.forEach(a => {
      const agentSched = agentSchedules[a.id];
      const activeSched = agentSched && agentSched.length > 0 ? agentSched : schedule;
      const slot = getCurrentSlot(activeSched, officeHour);
      const { status, zone } = slotToAgentState(slot);
      if (a.status !== status || a.zone !== zone) {
        handleAgentStatusChange(a.id, status, zone);
      }
    });
  }, [Math.floor(officeHour * 2), schedule, agentSchedules, activeEvent]);

  // Performance drift + tasks completed every 30s
  useEffect(() => {
    const t = setInterval(() => {
      for (const agent of hiredAgentsStore) {
        // Performance drifts ±3 based on status
        const drift = agent.status === 'Working' ? Math.floor(Math.random() * 5) - 1
                    : agent.status === 'In Meeting' ? Math.floor(Math.random() * 3) - 1
                    : agent.status === 'On Break' ? -Math.floor(Math.random() * 3)
                    : -1;
        const newPerf = Math.min(100, Math.max(10, (agent.performance ?? 60) + drift));
        const newTasks = agent.status === 'Working'
          ? (agent.tasksCompleted ?? 0) + Math.floor(Math.random() * 2)
          : (agent.tasksCompleted ?? 0);
        updateHiredAgent(agent.id, { performance: newPerf, tasksCompleted: newTasks });
      }
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const handleUpdateAgentAI = useCallback((agentId: string, aiConfig: any) => {
    updateHiredAgent(agentId, { aiConfig });
  }, []);

  const handleFireAgent = useCallback((id: string) => {
    // Find pixelCharId BEFORE removing from store
    const agent = hiredAgentsStore.find(a => a.id === id);
    if (agent) {
      setHireHistory(prev => {
        const entry: HireHistoryEntry = { id, agentName: agent.name, role: agent.role, dept: agent.dept, salary: agent.salary, currency: agent.currency, country: agent.country, action: 'fired', date: new Date().toLocaleString() };
        const updated = [entry, ...prev];
        saveHistoryToStorage(updated);
        return updated;
      });
    }
    const pixelId = agent?.pixelCharId;
    removeHiredAgent(id);
    setSelectedHiredId(null);
    // Dispatch agentClosed with NUMERIC id so engine removes the character
    if (pixelId !== undefined) {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'agentClosed', id: pixelId }
      }));
    }
  }, []);

  // Show migration notice once layout reset is detected
  const [migrationNoticeDismissed, setMigrationNoticeDismissed] = useState(false);
  const showMigrationNotice = layoutWasReset && !migrationNoticeDismissed;

  const [isDebugMode, setIsDebugMode] = useState(false);
  const [alwaysShowOverlay, setAlwaysShowOverlay] = useState(false);

  const handleToggleDebugMode = useCallback(() => setIsDebugMode((prev) => !prev), []);
  const handleToggleAlwaysShowOverlay = useCallback(
    () => setAlwaysShowOverlay((prev) => !prev),
    [],
  );

  const handleSelectAgent = useCallback((id: number) => {
    vscode.postMessage({ type: 'focusAgent', id });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  const [editorTickForKeyboard, setEditorTickForKeyboard] = useState(0);
  useEditorKeyboard(
    editor.isEditMode,
    editorState,
    editor.handleDeleteSelected,
    editor.handleRotateSelected,
    editor.handleToggleState,
    editor.handleUndo,
    editor.handleRedo,
    useCallback(() => setEditorTickForKeyboard((n) => n + 1), []),
    editor.handleToggleEditMode,
  );

  const handleCloseAgent = useCallback((id: number) => {
    vscode.postMessage({ type: 'closeAgent', id });
  }, []);

  const handleClick = useCallback((agentId: number) => {
    const os = getOfficeState();
    const meta = os.subagentMeta.get(agentId);
    const focusId = meta ? meta.parentAgentId : agentId;
    vscode.postMessage({ type: 'focusAgent', id: focusId });
  }, []);

  const officeState = getOfficeState();

  void editorTickForKeyboard;

  const showRotateHint =
    editor.isEditMode &&
    (() => {
      if (editorState.selectedFurnitureUid) {
        const item = officeState
          .getLayout()
          .furniture.find((f) => f.uid === editorState.selectedFurnitureUid);
        if (item && isRotatable(item.type)) return true;
      }
      if (
        editorState.activeTool === EditTool.FURNITURE_PLACE &&
        isRotatable(editorState.selectedFurnitureType)
      ) {
        return true;
      }
      return false;
    })();

  if (!layoutReady) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--vscode-foreground)',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <style>{`
        @keyframes pixel-agents-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pixel-agents-pulse { animation: pixel-agents-pulse ${PULSE_ANIMATION_DURATION_SEC}s ease-in-out infinite; }
        .pixel-agents-migration-btn:hover { filter: brightness(0.8); }
      `}</style>

      <OfficeCanvas
        officeState={officeState}
        onClick={handleClick}
        isEditMode={editor.isEditMode}
        areaLabels={areaLabels}
        editorState={editorState}
        onEditorTileAction={editor.handleEditorTileAction}
        onEditorEraseAction={editor.handleEditorEraseAction}
        onEditorSelectionChange={editor.handleEditorSelectionChange}
        onDeleteSelected={editor.handleDeleteSelected}
        onRotateSelected={editor.handleRotateSelected}
        onDragMove={editor.handleDragMove}
        editorTick={editor.editorTick}
        zoom={editor.zoom}
        onZoomChange={editor.handleZoomChange}
        panRef={editor.panRef}
      />

      {!isDebugMode && <ZoomControls zoom={editor.zoom} onZoomChange={editor.handleZoomChange} />}

      {/* Vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--pixel-vignette)',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      />

      {/* ── Company Dashboard ────────────────────────────────── */}
      {dashboardOpen && (
        <CompanyDashboard
          agents={hiredAgents}
          companyBalance={companyBalance}
          companyRevenue={monthlyRevenue}
          onClose={() => setDashboardOpen(false)}
        />
      )}

      {/* ── Agent Chat Panel ──────────────────────────────────── */}
      {chatAgentId && (() => {
        const chatAgent = hiredAgents.find(a => a.id === chatAgentId);
        if (!chatAgent || !chatAgent.aiConfig) return null;
        return (
          <AgentChatPanel
            agentId={chatAgent.id}
            agentName={chatAgent.name}
            agentRole={chatAgent.role}
            aiConfig={chatAgent.aiConfig}
            onClose={() => setChatAgentId(null)}
            onConfigUpdate={(cfg) => handleUpdateAgentAI(chatAgentId, cfg)}
          />
        );
      })()}

      {/* ── Company Balance HUD ─────────────────────────────── */}
      {!isEmbedMode && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 45,
          background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)',
          padding: '4px 12px', fontFamily: 'monospace', fontSize: '18px',
          display: 'flex', gap: 16, alignItems: 'center',
          boxShadow: 'var(--pixel-shadow)', pointerEvents: 'none',
        }}>
          <span style={{ color: companyBalance >= 0 ? '#00ff88' : '#ff4444' }}>
            💰 ${Math.round(companyBalance).toLocaleString()}
          </span>
          <span style={{ color: '#aaccff' }}>
            📈 +${Math.round(monthlyRevenue / 30).toLocaleString()}/day
          </span>
        </div>
      )}

      {/* Paperclip: Agent List Panel */}
      <AgentListPanel
        agents={hiredAgents}
        onSelect={(id) => setSelectedHiredId(prev => prev === id ? null : id)}
        selectedId={selectedHiredId}
      />

      {/* Paperclip: Agent Detail Panel */}
      {selectedHiredAgent && (
        <AgentDetailPanel
          agent={selectedHiredAgent}
          onPromote={handlePromoteAgent}
          onDemote={handleDemoteAgent}
          onClose={() => setSelectedHiredId(null)}
          onFire={handleFireAgent}
          onChat={(id) => { setSelectedHiredId(null); setChatAgentId(id); }}
          onMemory={(id) => { setSelectedHiredId(null); setMemoryAgentId(id); }}
        />
      )}

      {/* Memory Viewer */}
      {memoryAgentId && (() => {
        const a = hiredAgents.find(x => x.id === memoryAgentId);
        if (!a) return null;
        return <AgentMemoryViewer agentId={a.id} agentName={a.name} agentRole={a.role} onClose={() => setMemoryAgentId(null)} />;
      })()}

      {/* Group Chat */}
      {groupChatOpen && (
        <GroupChat
          agents={hiredAgents}
          ceoName={hiredAgents.find(a => a.role === 'CEO')?.name ?? 'CEO'}
          onClose={() => setGroupChatOpen(false)}
        />
      )}

      {/* Webhook Settings */}
      {webhookOpen && (
        <WebhookSettings onClose={() => setWebhookOpen(false)} />
      )}

      {/* API Settings */}
      {apiOpen && (
        <APISettings onClose={() => setApiOpen(false)} />
      )}

      {/* Finance Panel */}
      {financeOpen && (
        <FinancePanel onClose={() => setFinanceOpen(false)} />
      )}

      {/* Messaging Settings */}
      {messagingOpen && (
        <MessagingSettings onClose={() => setMessagingOpen(false)} />
      )}

      {/* AI Reports */}
      {reportsOpen && (
        <AIReports onClose={() => setReportsOpen(false)} />
      )}

      {/* AI Task Suggestions */}
      {suggestionsOpen && (
        <AITaskSuggestions onClose={() => setSuggestionsOpen(false)} />
      )}

      {/* AI Auto Priority */}
      {priorityOpen && (
        <AIAutoPriority onClose={() => setPriorityOpen(false)} />
      )}

      {/* Game Mechanics */}
      {gameOpen && (
        <GameMechanics onClose={() => setGameOpen(false)} />
      )}

      {/* Email Settings */}
      {emailOpen && (
        <EmailSettings onClose={() => setEmailOpen(false)} />
      )}

      {/* Unlockables Shop */}
      {unlockOpen && (
        <Unlockables onClose={() => setUnlockOpen(false)} />
      )}

      {/* Leaderboard */}
      {leaderboardOpen && (
        <Leaderboard onClose={() => setLeaderboardOpen(false)} />
      )}

      {/* Floor Manager */}
      {floorOpen && (
        <FloorManager onClose={() => setFloorOpen(false)} />
      )}

      {!isEmbedMode && statsOpen && <StatsDashboard agents={hiredAgents} currentFloor={currentFloor} onClose={() => setStatsOpen(false)} onPromote={handlePromoteAgent} onFire={handleFireAgent} activeEvent={activeEvent} eventLog={eventLog} onTriggerEvent={triggerEvent} eventTemplates={EVENT_TEMPLATES} autoEvents={autoEvents} companyBalance={companyBalance} companyRevenue={monthlyRevenue} deptBudgets={deptBudgets} onDeptBudgetChange={handleDeptBudgetChange} hireHistory={hireHistory} onAutoEventsChange={setAutoEvents} />}

      {/* Office Event Banner */}
      {!isEmbedMode && !dismissedEvent && (
        <EventBanner event={activeEvent} onDismiss={() => setDismissedEvent(true)} />
      )}
      {!isEmbedMode && scheduleOpen && (
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 200, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          <SchedulePanel
            onClose={() => setScheduleOpen(false)}
            officeHour={officeHour}
            onOfficeHourChange={h => setOfficeHour(h)}
            clockAuto={clockAuto}
            onClockAutoChange={setClockAuto}
            clockSpeed={clockSpeed}
            onClockSpeedChange={setClockSpeed}
            schedule={schedule}
            onScheduleChange={s => { setSchedule(s); try { localStorage.setItem('pixeloffice_schedule', JSON.stringify(s)); } catch {} }}
            agents={hiredAgents}
            agentSchedules={agentSchedules}
            onAgentScheduleChange={(agentId, s) => {
              setAgentSchedules(prev => {
                const next = { ...prev, [agentId]: s };
                try { localStorage.setItem(LS_AGENT_SCHED_KEY, JSON.stringify(next)); } catch {}
                return next;
              });
            }}
          />
        </div>
      )}
      {!isEmbedMode && <BottomToolbar
        className="bottom-toolbar"
        isEditMode={editor.isEditMode}
        onToggleEditMode={editor.handleToggleEditMode}
        isDebugMode={isDebugMode}
        onToggleDebugMode={handleToggleDebugMode}
        alwaysShowOverlay={alwaysShowOverlay}
        onToggleAlwaysShowOverlay={handleToggleAlwaysShowOverlay}
        workspaceFolders={workspaceFolders}
        externalAssetDirectories={externalAssetDirectories}
        onHireAgent={handleHireAgent}
        currentFloor={currentFloor}
        onFloorChange={handleFloorChange}
        onStatsClick={() => setStatsOpen(v => !v)}
        statsOpen={statsOpen}
        onScheduleClick={() => setScheduleOpen(v => !v)}
        scheduleOpen={scheduleOpen}
        onGroupChatClick={() => setGroupChatOpen(v => !v)}
        onWebhookClick={() => setWebhookOpen(v => !v)}
        onAPIClick={() => setApiOpen(v => !v)}
        onFinanceClick={() => setFinanceOpen(v => !v)}
        onMessagingClick={() => setMessagingOpen(v => !v)}
        onReportsClick={() => setReportsOpen(v => !v)}
        onSuggestionsClick={() => setSuggestionsOpen(v => !v)}
        onPriorityClick={() => setPriorityOpen(v => !v)}
        onGameClick={() => setGameOpen(v => !v)}
        onEmailClick={() => setEmailOpen(v => !v)}
        onUnlockClick={() => setUnlockOpen(v => !v)}
        onLeaderboardClick={() => setLeaderboardOpen(v => !v)}
        onFloorClick={() => setFloorOpen(v => !v)}
        onDashboardClick={() => setDashboardOpen(v => !v)}
      /> }

      {editor.isEditMode && editor.isDirty && (
        <EditActionBar editor={editor} editorState={editorState} />
      )}

      {showRotateHint && (
        <div
          style={{
            position: 'absolute',
            top: editor.isDirty ? 52 : 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 49,
            background: 'var(--pixel-hint-bg)',
            color: '#fff',
            fontSize: '20px',
            padding: '3px 8px',
            borderRadius: 0,
            border: '2px solid var(--pixel-accent)',
            boxShadow: 'var(--pixel-shadow)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Rotate (R)
        </div>
      )}

      {editor.isEditMode &&
        (() => {
          const selUid = editorState.selectedFurnitureUid;
          const selColor = selUid
            ? (officeState.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null)
            : null;
          return (
            <EditorToolbar
              activeTool={editorState.activeTool}
              selectedTileType={editorState.selectedTileType}
              selectedFurnitureType={editorState.selectedFurnitureType}
              selectedFurnitureUid={selUid}
              selectedFurnitureColor={selColor}
              floorColor={editorState.floorColor}
              wallColor={editorState.wallColor}
              selectedWallSet={editorState.selectedWallSet}
              onToolChange={editor.handleToolChange}
              onTileTypeChange={editor.handleTileTypeChange}
              onFloorColorChange={editor.handleFloorColorChange}
              onWallColorChange={editor.handleWallColorChange}
              onWallSetChange={editor.handleWallSetChange}
              onSelectedFurnitureColorChange={editor.handleSelectedFurnitureColorChange}
              onFurnitureTypeChange={editor.handleFurnitureTypeChange}
              loadedAssets={loadedAssets}
            />
          );
        })()}

      {!isDebugMode && (
        <ToolOverlay
          officeState={officeState}
          agents={agents}
          agentTools={agentTools}
          subagentCharacters={subagentCharacters}
          containerRef={containerRef}
          zoom={editor.zoom}
          panRef={editor.panRef}
          onCloseAgent={handleCloseAgent}
          alwaysShowOverlay={alwaysShowOverlay}
        />
      )}

      {/* Agent Tooltip - shows on hover */}
      {!isDebugMode && (
        <AgentTooltip
          officeState={officeState}
          agents={hiredAgents}
          containerRef={containerRef}
          zoom={editor.zoom}
          panRef={editor.panRef}
        />
      )}

      {isDebugMode && (
        <DebugView
          agents={agents}
          selectedAgent={selectedAgent}
          agentTools={agentTools}
          agentStatuses={agentStatuses}
          subagentTools={subagentTools}
          onSelectAgent={handleSelectAgent}
        />
      )}

      {showMigrationNotice && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setMigrationNoticeDismissed(true)}
        >
          <div
            style={{
              background: 'var(--pixel-bg)',
              border: '2px solid var(--pixel-border)',
              borderRadius: 0,
              padding: '24px 32px',
              maxWidth: 620,
              boxShadow: 'var(--pixel-shadow)',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '40px', marginBottom: 12, color: 'var(--pixel-accent)' }}>
              We owe you an apology!
            </div>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>
              We've just migrated to fully open-source assets, all built from scratch with love.
              Unfortunately, this means your previous layout had to be reset.
            </p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>
              We're really sorry about that.
            </p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text)', margin: '0 0 12px 0' }}>
              The good news? This was a one-time thing, and it paves the way for some genuinely
              exciting updates ahead.
            </p>
            <p style={{ fontSize: '26px', color: 'var(--pixel-text-dim)', margin: '0 0 20px 0' }}>
              Stay tuned, and thanks for using Pixel Agents!
            </p>
            <button
              className="pixel-agents-migration-btn"
              style={{
                padding: '6px 24px 8px',
                fontSize: '30px',
                background: 'var(--pixel-accent)',
                color: '#fff',
                border: '2px solid var(--pixel-accent)',
                borderRadius: 0,
                cursor: 'pointer',
                boxShadow: 'var(--pixel-shadow)',
              }}
              onClick={() => setMigrationNoticeDismissed(true)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
