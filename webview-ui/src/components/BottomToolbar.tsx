import { useEffect, useRef, useState } from 'react';

import type { WorkspaceFolder } from '../hooks/useExtensionMessages.js';
import { vscode } from '../vscodeApi.js';
import { SettingsModal } from './SettingsModal.js';

interface BottomToolbarProps {
  onHireAgent?: (name: string, role: string, dept: string, salary: number, currency: string, country: string) => void;
  currentFloor?: number;
  onFloorChange?: (floor: number) => void;
  onStatsClick?: () => void;
  statsOpen?: boolean;
  onScheduleClick?: () => void;
  scheduleOpen?: boolean;
  isEditMode: boolean;
  onOpenClaude: () => void;
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
const COUNTRIES = [
  { name: 'Global', flag: '🌍', cur: 'USD', sym: '$' },
  { name: 'India', flag: '🇮🇳', cur: 'INR', sym: '₹' },
  { name: 'USA', flag: '🇺🇸', cur: 'USD', sym: '$' },
  { name: 'UK', flag: '🇬🇧', cur: 'GBP', sym: '£' },
  { name: 'Europe', flag: '🇪🇺', cur: 'EUR', sym: '€' },
  { name: 'Japan', flag: '🇯🇵', cur: 'JPY', sym: '¥' },
  { name: 'Russia', flag: '🇷🇺', cur: 'RUB', sym: '₽' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', INR: '₹', GBP: '£', EUR: '€', JPY: '¥', RUB: '₽',
};

// Base USD monthly salaries
const ROLE_SALARY: Record<string, number> = {
  CEO: 12000, CTO: 10000, Manager: 6000, Developer: 5000, Designer: 4500, QA: 4000,
  HR: 4000, Marketing: 4500, Sales: 4000, Analyst: 4500, DevOps: 5500, Intern: 1500,
};

// Conversion rates to USD (approx)
const FX_RATES: Record<string, number> = {
  USD: 1, INR: 84, GBP: 0.78, EUR: 0.92, JPY: 150, RUB: 90,
};

function HireDialog({ onClose, onHire }: { onClose: () => void; onHire: (name: string, role: string, dept: string, salary: number, currency: string, country: string) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Developer');
  const [dept, setDept] = useState('Engineering');
  const [country, setCountry] = useState('Global');
  const [currency, setCurrency] = useState('USD');
  const [salaryStr, setSalaryStr] = useState(String(ROLE_SALARY['Developer']));
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

  const handleHire = () => {
    const finalName = name.trim() || `Agent ${Math.floor(Math.random() * 1000)}`;
    const finalSalary = parseInt(salaryStr, 10) || 0;
    onHire(finalName, role, dept, finalSalary, currency, country);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px', background: 'var(--pixel-bg)', color: 'var(--pixel-text)',
    border: '2px solid var(--pixel-border)', fontFamily: 'monospace', fontSize: '18px', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
      background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)',
      boxShadow: 'var(--pixel-shadow)', width: 360, zIndex: 'var(--pixel-controls-z)',
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

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Name</label>
          <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Agent Name..." style={inputStyle} onKeyDown={e => { if (e.key === 'Enter') handleHire(); if (e.key === 'Escape') onClose(); }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
              {Object.keys(ROLE_SALARY).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Dept</label>
            <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
              {['Engineering', 'Design', 'Management', 'QA', 'Marketing', 'Sales', 'HR', 'Operations'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Location</label>
            <select value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}>
              {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          <div style={{ width: 80 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Curr</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
              {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Monthly Salary ({CURRENCY_SYMBOLS[currency] ?? currency})</label>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)' }}>
            <span style={{ padding: '0 8px', color: '#aaccff', fontSize: '18px' }}>{CURRENCY_SYMBOLS[currency] ?? '$'}</span>
            <input type="number" value={salaryStr} onChange={e => setSalaryStr(e.target.value)} style={{ ...inputStyle, border: 'none', flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') handleHire(); if (e.key === 'Escape') onClose(); }} />
          </div>
        </div>

        <button onClick={handleHire} onMouseEnter={() => setHovered('hire')} onMouseLeave={() => setHovered(null)} style={{
          marginTop: 4, padding: '8px', fontSize: '20px', background: hovered === 'hire' ? 'var(--pixel-agent-hover-bg)' : 'var(--pixel-agent-bg)',
          color: 'var(--pixel-agent-text)', border: '2px solid var(--pixel-agent-border)', cursor: 'pointer', fontFamily: 'monospace',
        }}>✓ Hire Agent</button>
      </div>
    </div>
  );
}

export function BottomToolbar({
  isEditMode,
  onOpenClaude,
  onToggleEditMode,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  workspaceFolders,
  externalAssetDirectories,
  onHireAgent,
  currentFloor = 0,
  onFloorChange,
  onStatsClick,
  statsOpen,
  onScheduleClick,
  scheduleOpen,
}: BottomToolbarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isBypassMenuOpen, setIsBypassMenuOpen] = useState(false);
  const [hoveredFolder, setHoveredFolder] = useState<number | null>(null);
  const [hoveredBypass, setHoveredBypass] = useState<number | null>(null);
  const [isHireOpen, setIsHireOpen] = useState(false);
  const [isFloorOpen, setIsFloorOpen] = useState(false);
  const folderPickerRef = useRef<HTMLDivElement>(null);
  const pendingBypassRef = useRef(false);

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

  const hasMultipleFolders = workspaceFolders.length > 1;

  const handleAgentClick = () => {
    setIsBypassMenuOpen(false);
    pendingBypassRef.current = false;
    if (hasMultipleFolders) {
      setIsFolderPickerOpen((v) => !v);
    } else {
      onOpenClaude();
    }
  };

  const handleAgentRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFolderPickerOpen(false);
    setIsBypassMenuOpen((v) => !v);
  };

  const handleFolderSelect = (folder: WorkspaceFolder) => {
    setIsFolderPickerOpen(false);
    const bypassPermissions = pendingBypassRef.current;
    pendingBypassRef.current = false;
    vscode.postMessage({ type: 'openClaude', folderPath: folder.path, bypassPermissions });
  };

  const handleBypassSelect = (bypassPermissions: boolean) => {
    setIsBypassMenuOpen(false);
    if (hasMultipleFolders) {
      pendingBypassRef.current = bypassPermissions;
      setIsFolderPickerOpen(true);
    } else {
      vscode.postMessage({ type: 'openClaude', bypassPermissions });
    }
  };

  const handleHire = (name: string, role: string, dept: string, salary: number, currency: string, country: string) => {
    onHireAgent?.(name, role, dept, salary, currency, country);
    setIsHireOpen(false);
  };

  return (
    <>
      <div style={panelStyle}>
        <div ref={folderPickerRef} style={{ position: 'relative' }}>
          <button
            onClick={handleAgentClick}
            onContextMenu={handleAgentRightClick}
            onMouseEnter={() => setHovered('agent')}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...btnBase,
              padding: '5px 12px',
              background:
                hovered === 'agent' || isFolderPickerOpen || isBypassMenuOpen
                  ? 'var(--pixel-agent-hover-bg)'
                  : 'var(--pixel-agent-bg)',
              border: '2px solid var(--pixel-agent-border)',
              color: 'var(--pixel-agent-text)',
            }}
          >
            + Agent
          </button>
          {isBypassMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: 4,
                background: 'var(--pixel-bg)',
                border: '2px solid var(--pixel-border)',
                borderRadius: 0,
                padding: 4,
                boxShadow: 'var(--pixel-shadow)',
                minWidth: 180,
                zIndex: 'var(--pixel-controls-z)',
              }}
            >
              <button
                onClick={() => handleBypassSelect(false)}
                onMouseEnter={() => setHoveredBypass(0)}
                onMouseLeave={() => setHoveredBypass(null)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 10px',
                  fontSize: '24px',
                  color: 'var(--pixel-text)',
                  background: hoveredBypass === 0 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                Normal
              </button>
              <div style={{ height: 1, margin: '4px 0', background: 'var(--pixel-border)' }} />
              <button
                onClick={() => handleBypassSelect(true)}
                onMouseEnter={() => setHoveredBypass(1)}
                onMouseLeave={() => setHoveredBypass(null)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 10px',
                  fontSize: '24px',
                  color: 'var(--pixel-warning-text)',
                  background: hoveredBypass === 1 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: 0,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '16px' }}>⚡</span> Bypass Permissions
              </button>
            </div>
          )}
          {isFolderPickerOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: 4,
                background: 'var(--pixel-bg)',
                border: '2px solid var(--pixel-border)',
                borderRadius: 0,
                boxShadow: 'var(--pixel-shadow)',
                minWidth: 160,
                zIndex: 'var(--pixel-controls-z)',
              }}
            >
              {workspaceFolders.map((folder, i) => (
                <button
                  key={folder.path}
                  onClick={() => handleFolderSelect(folder)}
                  onMouseEnter={() => setHoveredFolder(i)}
                  onMouseLeave={() => setHoveredFolder(null)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    fontSize: '22px',
                    color: 'var(--pixel-text)',
                    background: hoveredFolder === i ? 'var(--pixel-btn-hover-bg)' : 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>

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
