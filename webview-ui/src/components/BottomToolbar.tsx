import { useEffect, useRef, useState } from 'react';

import type { WorkspaceFolder } from '../hooks/useExtensionMessages.js';
import { SettingsModal } from './SettingsModal.js';

interface BottomToolbarProps {
  onHireAgent?: (name: string, role: string, dept: string, salary: number, currency: string, country: string, aiConfig?: any) => void;
  currentFloor?: number;
  onFloorChange?: (floor: number) => void;
  onStatsClick?: () => void;
  statsOpen?: boolean;
  onScheduleClick?: () => void;
  scheduleOpen?: boolean;
  onDashboardClick?: () => void;
  onGroupChatClick?: () => void;
  onWebhookClick?: () => void;
  onAPIClick?: () => void;
  onFinanceClick?: () => void;
  onMessagingClick?: () => void;
  onReportsClick?: () => void;
  onSuggestionsClick?: () => void;
  onPriorityClick?: () => void;
  onGameClick?: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  alwaysShowOverlay: boolean;
  onToggleAlwaysShowOverlay: () => void;
  workspaceFolders: WorkspaceFolder[];
  externalAssetDirectories: string[];
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: 10,
  zIndex: 'var(--pixel-controls-z)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  padding: '4px 6px',
  boxShadow: 'var(--pixel-shadow)',
};

const btnBase: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '24px',
  color: 'var(--pixel-text)',
  background: 'var(--pixel-btn-bg)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'var(--pixel-active-bg)',
  border: '2px solid var(--pixel-accent)',
};

// ── Hire Dialog styles ─────────────────────────────────────────────────────
















// ── HireDialog component ───────────────────────────────────────────────────




// Base USD monthly salaries


// Conversion rates to USD (approx)










const AI_PROVIDERS = [
  { id: 'none', name: 'No AI (NPC)', url: '', defaultModel: '' },
  { id: 'litellm', name: 'LiteLLM Proxy', url: '', defaultModel: 'gpt-4o' },
  { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  { id: 'groq', name: 'Groq', url: 'https://api.groq.com/openai/v1', defaultModel: 'llama3-70b-8192' },
  { id: 'ollama', name: 'Ollama (Local)', url: 'http://localhost:11434/v1', defaultModel: 'llama3' },
  { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.5-sonnet' },
  { id: 'custom', name: 'Custom (OpenAI compat)', url: 'https://', defaultModel: '' },
];


const COUNTRIES = [
  { name: 'Global', flag: '🌍', cur: 'USD', sym: '$' },
  { name: 'India', flag: '🇮🇳', cur: 'INR', sym: '₹' },
  { name: 'USA', flag: '🇺🇸', cur: 'USD', sym: '$' },
  { name: 'UK', flag: '🇬🇧', cur: 'GBP', sym: '£' },
  { name: 'Europe', flag: '🇪🇺', cur: 'EUR', sym: '€' },
  { name: 'Japan', flag: '🇯🇵', cur: 'JPY', sym: '¥' },
  { name: 'Russia', flag: '🇷🇺', cur: 'RUB', sym: '₽' },
];
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', INR: '₹', GBP: '£', EUR: '€', JPY: '¥', RUB: '₽' };
const ROLE_SALARY: Record<string, number> = { CEO: 12000, CTO: 10000, Manager: 6000, Developer: 5000, Designer: 4500, QA: 4000, HR: 4000, Marketing: 4500, Sales: 4000, Analyst: 4500, DevOps: 5500, Intern: 1500 };
const FX_RATES: Record<string, number> = { USD: 1, INR: 84, GBP: 0.78, EUR: 0.92, JPY: 150, RUB: 90 };
function HireDialog({ onClose, onHire }: { onClose: () => void; onHire: (name: string, role: string, dept: string, salary: number, currency: string, country: string, aiConfig?: any) => void }) {
  const [tab, setTab] = useState<'profile' | 'ai'>('profile');
  
  // Profile state
  const [name, setName] = useState('');
  const [role, setRole] = useState('Developer');
  const [dept, setDept] = useState('Engineering');
  const [country, setCountry] = useState('Global');
  const [currency, setCurrency] = useState('USD');
  const [salaryStr, setSalaryStr] = useState(String(ROLE_SALARY['Developer']));
  
  // AI state
  const [aiProvider, setAiProvider] = useState('none');
  const [aiUrl, setAiUrl] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const baseUsd = ROLE_SALARY[role] ?? 4000;
    const rate = FX_RATES[currency] ?? 1;
    setSalaryStr(String(Math.round(baseUsd * rate)));
  }, [role, currency]);

  useEffect(() => {
    const c = COUNTRIES.find(x => x.name === country);
    if (c) setCurrency(c.cur);
  }, [country]);

  useEffect(() => {
    const p = AI_PROVIDERS.find(x => x.id === aiProvider);
    if (p && p.id !== 'none' && p.id !== 'custom') {
      setAiUrl(p.url);
      setAiModel(p.defaultModel);
    }
    setTestStatus('idle');
  }, [aiProvider]);

  const handleTestConnection = async () => {
    if (aiProvider === 'none') return;
    setTestStatus('testing');
    try {
      const res = await fetch(aiUrl.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiKey}`
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: 'user', content: 'Reply with "OK"' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        setTestStatus('success');
        setTestMsg('Connection OK!');
      } else {
        const err = await res.text();
        setTestStatus('error');
        setTestMsg(`HTTP ${res.status}: ${err.substring(0, 40)}`);
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMsg(e.message || 'Network error / CORS');
    }
  };

  const handleHire = () => {
    const finalName = name.trim() || `Agent ${Math.floor(Math.random() * 1000)}`;
    const finalSalary = parseInt(salaryStr, 10) || 0;
    
    let config = undefined;
    if (aiProvider !== 'none') {
      config = {
        provider: aiProvider,
        baseUrl: aiUrl,
        apiKey: aiKey,
        model: aiModel,
        connected: testStatus === 'success',
      };
    }
    
    onHire(finalName, role, dept, finalSalary, currency, country, config);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px', background: 'var(--pixel-bg)', color: 'var(--pixel-text)',
    border: '2px solid var(--pixel-border)', fontFamily: 'monospace', fontSize: '16px', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
      background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)',
      boxShadow: 'var(--pixel-shadow)', width: 380, zIndex: 'var(--pixel-controls-z)',
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
    }}>
      <div style={{
        background: 'var(--pixel-active-bg)', borderBottom: '2px solid var(--pixel-agent-border)',
        padding: '6px 10px', fontSize: '20px', color: 'var(--pixel-agent-text)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>👤 Hire Agent</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--pixel-text)', fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}>✕</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid var(--pixel-border)', background: '#0a0a14' }}>
        <button onClick={() => setTab('profile')} style={{
          flex: 1, padding: '8px', fontFamily: 'monospace', fontSize: '16px', cursor: 'pointer', border: 'none',
          background: tab === 'profile' ? 'var(--pixel-active-bg)' : 'transparent',
          color: tab === 'profile' ? 'var(--pixel-agent-text)' : '#555577',
          borderBottom: tab === 'profile' ? '2px solid var(--pixel-agent-border)' : '2px solid transparent',
        }}>📝 Profile</button>
        <button onClick={() => setTab('ai')} style={{
          flex: 1, padding: '8px', fontFamily: 'monospace', fontSize: '16px', cursor: 'pointer', border: 'none',
          background: tab === 'ai' ? 'var(--pixel-active-bg)' : 'transparent',
          color: tab === 'ai' ? 'var(--pixel-agent-text)' : '#555577',
          borderBottom: tab === 'ai' ? '2px solid var(--pixel-agent-border)' : '2px solid transparent',
        }}>🤖 AI Brain</button>
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
        {tab === 'profile' && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>Name</label>
              <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Agent Name..." style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                  {Object.keys(ROLE_SALARY).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>Dept</label>
                <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
                  {['Engineering', 'Design', 'Management', 'QA', 'Marketing', 'Sales', 'HR', 'Operations'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>Location</label>
                <select value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}>
                  {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
                </select>
              </div>
              <div style={{ width: 80 }}>
                <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>Curr</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                  {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>Monthly Salary ({CURRENCY_SYMBOLS[currency] ?? currency})</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)' }}>
                <span style={{ padding: '0 8px', color: '#aaccff', fontSize: '18px' }}>{CURRENCY_SYMBOLS[currency] ?? '$'}</span>
                <input type="number" value={salaryStr} onChange={e => setSalaryStr(e.target.value)} style={{ ...inputStyle, border: 'none', flex: 1 }} />
              </div>
            </div>
          </>
        )}

        {tab === 'ai' && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>AI Provider</label>
              <select value={aiProvider} onChange={e => setAiProvider(e.target.value)} style={inputStyle}>
                {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {aiProvider !== 'none' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>Base URL</label>
                  <input type="text" value={aiUrl} onChange={e => setAiUrl(e.target.value)} style={inputStyle} placeholder="https://api.openai.com/v1" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>Model Name</label>
                  <input type="text" value={aiModel} onChange={e => setAiModel(e.target.value)} style={inputStyle} placeholder="gpt-4o" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '15px' }}>API Key (Saved locally)</label>
                  <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} style={inputStyle} placeholder="sk-..." />
                  {aiProvider === 'litellm' && <div style={{ fontSize: '13px', color: '#6688aa', marginTop: 4 }}>Master key: sk-letese-master-2026</div>}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <button onClick={handleTestConnection} disabled={testStatus === 'testing'} style={{
                    padding: '6px 12px', fontFamily: 'monospace', fontSize: '15px', cursor: testStatus === 'testing' ? 'wait' : 'pointer',
                    background: '#112233', color: '#aaccff', border: '2px solid #334466',
                  }}>
                    {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                  <span style={{ 
                    fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    color: testStatus === 'success' ? '#00ff88' : testStatus === 'error' ? '#ff4444' : '#666688'
                  }}>
                    {testStatus === 'idle' ? 'Not tested' : testStatus === 'testing' ? '...' : testMsg}
                  </span>
                </div>
              </>
            )}
          </>
        )}

        <button onClick={handleHire} onMouseEnter={() => setHovered('hire')} onMouseLeave={() => setHovered(null)} style={{
          marginTop: 8, padding: '8px', fontSize: '20px', background: hovered === 'hire' ? 'var(--pixel-agent-hover-bg)' : 'var(--pixel-agent-bg)',
          color: 'var(--pixel-agent-text)', border: '2px solid var(--pixel-agent-border)', cursor: 'pointer', fontFamily: 'monospace',
        }}>✓ Hire Agent</button>
      </div>
    </div>
  );
}

export function BottomToolbar({
  isEditMode,
  onToggleEditMode,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  externalAssetDirectories,
  onHireAgent,
  currentFloor = 0,
  onFloorChange,
  onStatsClick,
  statsOpen,
  onScheduleClick,
  scheduleOpen,
  onDashboardClick,
  onGroupChatClick,
  onWebhookClick,
  onAPIClick,
  onFinanceClick,
  onMessagingClick,
  onReportsClick,
  onSuggestionsClick,
  onPriorityClick,
  onGameClick,
}: BottomToolbarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isBypassMenuOpen, setIsBypassMenuOpen] = useState(false);
  const [isHireOpen, setIsHireOpen] = useState(false);
  const [isFloorOpen, setIsFloorOpen] = useState(false);
  const folderPickerRef = useRef<HTMLDivElement>(null);

  // Close folder picker / bypass menu on outside click
  useEffect(() => {
    if (!isFolderPickerOpen && !isBypassMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) {
        setIsFolderPickerOpen(false);
        setIsBypassMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isFolderPickerOpen, isBypassMenuOpen]);






  const handleHire = (name: string, role: string, dept: string, salary: number, currency: string, country: string, aiConfig?: any) => {
    onHireAgent?.(name, role, dept, salary, currency, country, aiConfig);
    setIsHireOpen(false);
  };

  return (
    <>
      <div style={panelStyle}>

        {/* HIRE AGENT button */}
        <div style={{ position: 'relative' }}>
          {isHireOpen && (
            <HireDialog
              onClose={() => setIsHireOpen(false)}
              onHire={handleHire}
            />
          )}
          <button
            onClick={() => setIsHireOpen((v) => !v)}
            onMouseEnter={() => setHovered('hire')}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...btnBase,
              padding: '5px 12px',
              background:
                isHireOpen
                  ? 'var(--pixel-active-bg)'
                  : hovered === 'hire'
                  ? 'var(--pixel-agent-hover-bg)'
                  : 'var(--pixel-agent-bg)',
              border: '2px solid var(--pixel-agent-border)',
              color: 'var(--pixel-agent-text)',
            }}
            title="Hire a new agent with a role"
          >
            👤 Hire
          </button>
        </div>

        {/* STATS button */}
        <button
          onClick={onStatsClick}
          onMouseEnter={() => setHovered('stats')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            padding: '5px 12px',
            background: statsOpen ? 'var(--pixel-active-bg)' : hovered === 'stats' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
            color: statsOpen ? 'var(--pixel-agent-text)' : 'var(--pixel-text-dim)',
            border: statsOpen ? '2px solid var(--pixel-agent-border)' : btnBase.border,
          }}
          title="View office stats"
        >
          📊 Stats
        </button>

        {/* DASHBOARD button */}
        <button
          onClick={onDashboardClick}
          onMouseEnter={() => setHovered('dashboard')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background: hovered === 'dashboard' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="Company Dashboard"
        >
          🏢 Dashboard
        </button>

        {/* GROUP CHAT button */}
        <button
          onClick={onGroupChatClick}
          onMouseEnter={() => setHovered('groupchat')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background: hovered === 'groupchat' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="Team Group Chat"
        >
          💬 Chat
        </button>

        {/* SCHEDULE button */}
        <button
          onClick={onScheduleClick}
          onMouseEnter={() => setHovered('schedule')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            padding: '5px 12px',
            background: scheduleOpen ? 'var(--pixel-active-bg)' : hovered === 'schedule' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
            color: scheduleOpen ? 'var(--pixel-agent-text)' : 'var(--pixel-text-dim)',
            border: scheduleOpen ? '2px solid var(--pixel-agent-border)' : btnBase.border,
          }}
          title="Set work schedule"
        >
          🕐 Schedule
        </button>

        {/* FLOOR SELECTOR */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsFloorOpen(v => !v)}
            onMouseEnter={() => setHovered('floor')}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...btnBase,
              padding: '5px 12px',
              background: isFloorOpen || hovered === 'floor'
                ? 'var(--pixel-btn-hover-bg)'
                : btnBase.background,
            }}
            title="Switch floor"
          >
            {currentFloor === 0 ? '🏢 Ground' : `🏢 Floor ${currentFloor}`}
          </button>
          {isFloorOpen && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: 4,
              background: 'var(--pixel-bg)',
              border: '2px solid var(--pixel-border)',
              borderRadius: 0,
              boxShadow: 'var(--pixel-shadow)',
              minWidth: 140,
              zIndex: 'var(--pixel-controls-z)',
            }}>
              {[
                { label: '🏢 Ground Floor', desc: 'Working Area + Lounge' },
                { label: '🏢 Floor 1',      desc: 'Conference Room' },
                { label: '🏢 Floor 2',      desc: 'Break Room' },
                { label: '🏢 Floor 3',      desc: 'Double Working Area' },
              ].map((f, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onFloorChange?.(i);
                    setIsFloorOpen(false);
                  }}
                  onMouseEnter={() => setHovered(`floor-${i}`)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    fontSize: '21px',
                    color: currentFloor === i ? 'var(--pixel-agent-text)' : 'var(--pixel-text)',
                    background: currentFloor === i
                      ? 'var(--pixel-active-bg)'
                      : hovered === `floor-${i}` ? 'var(--pixel-btn-hover-bg)' : 'transparent',
                    border: 'none',
                    borderBottom: i < 2 ? '1px solid var(--pixel-border)' : 'none',
                    borderRadius: 0,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div>{f.label}</div>
                  <div style={{ fontSize: '16px', color: 'var(--pixel-text-dim)', marginTop: 2 }}>{f.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => window.open('./multi-floor.html', '_blank')}
          onMouseEnter={() => setHovered('multifloor')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background: hovered === 'multifloor' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="View all floors"
        >
          ⊞ All Floors
        </button>

        <button
          onClick={onToggleEditMode}
          onMouseEnter={() => setHovered('edit')}
          onMouseLeave={() => setHovered(null)}
          style={
            isEditMode
              ? { ...btnActive }
              : {
                  ...btnBase,
                  background: hovered === 'edit' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
                }
          }
          title="Edit office layout"
        >
          Layout
        </button>

        {/* WEBHOOK button */}
        <button
          onClick={onWebhookClick}
          onMouseEnter={() => setHovered('webhook')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'webhook' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="Webhook Settings"
        >
          🔗 Webhooks
        </button>

        {/* API button */}
        <button
          onClick={onAPIClick}
          onMouseEnter={() => setHovered('api')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'api' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="API Endpoints"
        >
          🌐 API
        </button>

        {/* FINANCE button */}
        <button
          onClick={onFinanceClick}
          onMouseEnter={() => setHovered('finance')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'finance' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="Finance Dashboard"
        >
          📊 Finance
        </button>

        {/* MESSAGING button */}
        <button
          onClick={onMessagingClick}
          onMouseEnter={() => setHovered('messaging')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'messaging' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="Messaging (Telegram/WhatsApp)"
        >
          📱 Connect
        </button>

        {/* AI REPORTS button */}
        <button
          onClick={onReportsClick}
          onMouseEnter={() => setHovered('reports')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'reports' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="AI Reports"
        >
          🤖 Reports
        </button>

        {/* AI SUGGESTIONS button */}
        <button
          onClick={onSuggestionsClick}
          onMouseEnter={() => setHovered('suggestions')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'suggestions' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="AI Task Suggestions"
        >
          💡 Ideas
        </button>

        {/* AI PRIORITY button */}
        <button
          onClick={onPriorityClick}
          onMouseEnter={() => setHovered('priority')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'priority' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="AI Auto-Prioritization"
        >
          🎯 Priority
        </button>

        {/* GAME button */}
        <button
          onClick={onGameClick}
          onMouseEnter={() => setHovered('game')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            background:
              hovered === 'game' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
          }}
          title="Game Mechanics"
        >
          🎮 Game
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsSettingsOpen((v) => !v)}
            onMouseEnter={() => setHovered('settings')}
            onMouseLeave={() => setHovered(null)}
            style={
              isSettingsOpen
                ? { ...btnActive }
                : {
                    ...btnBase,
                    background:
                      hovered === 'settings' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
                  }
            }
            title="Settings"
          >
            Settings
          </button>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            isDebugMode={isDebugMode}
            onToggleDebugMode={onToggleDebugMode}
            alwaysShowOverlay={alwaysShowOverlay}
            onToggleAlwaysShowOverlay={onToggleAlwaysShowOverlay}
            externalAssetDirectories={externalAssetDirectories}
          />
        </div>
      </div>
    </>
  );
}
