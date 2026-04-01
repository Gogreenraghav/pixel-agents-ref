import { useEffect, useRef, useState } from 'react';

import type { WorkspaceFolder } from '../hooks/useExtensionMessages.js';
import { vscode } from '../vscodeApi.js';
import { SettingsModal } from './SettingsModal.js';

interface BottomToolbarProps {
  onHireAgent?: (name: string, role: string, dept: string) => void;
  currentFloor?: number;
  onFloorChange?: (floor: number) => void;
  onStatsClick?: () => void;
  statsOpen?: boolean;
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
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dialogStyle: React.CSSProperties = {
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  boxShadow: 'var(--pixel-shadow)',
  minWidth: 280,
  fontFamily: 'inherit',
};

const dialogTitleStyle: React.CSSProperties = {
  background: 'var(--pixel-active-bg)',
  borderBottom: '2px solid var(--pixel-border)',
  padding: '8px 12px',
  fontSize: '22px',
  color: 'var(--pixel-text)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const dialogBodyStyle: React.CSSProperties = {
  padding: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '18px',
  color: 'var(--pixel-text)',
  marginBottom: '6px',
};


const dialogBtnsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 8,
};

const DEFAULT_ROLES = ['CEO', 'CTO', 'Manager', 'Developer', 'Designer', 'QA', 'Sales Manager', 'Advocate', 'HR Manager', 'DevOps', 'Data Analyst', 'Product Manager'];
const DEFAULT_DEPTS = ['Engineering', 'Design', 'QA', 'Management', 'Marketing', 'Operations', 'Sales', 'HR', 'Data', 'Product'];

// ── HireDialog component ───────────────────────────────────────────────────
function HireDialog({ onClose, onHire }: { onClose: () => void; onHire: (name: string, role: string, dept: string) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Developer');
  const [dept, setDept] = useState('Engineering');
  const [customRole, setCustomRole] = useState('');
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const finalRole = showCustomRole ? customRole.trim() || 'Custom' : role;

  const handleHire = () => {
    const finalName = name.trim() || `Agent_${Date.now().toString(36).slice(-4).toUpperCase()}`;
    onHire(finalName, finalRole, dept);
    onClose();
  };

  const fieldBg = '#1a1a3a';
  const fieldBorder = 'var(--pixel-border)';
  const fieldColor = 'var(--pixel-text)';

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: fieldBg,
    border: `2px solid ${fieldBorder}`,
    borderRadius: 0,
    color: fieldColor,
    fontSize: '21px',
    padding: '6px 8px',
    fontFamily: 'inherit',
    outline: 'none',
    marginBottom: '10px',
    boxSizing: 'border-box',
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...dialogStyle, minWidth: 300 }}>
        <div style={dialogTitleStyle}>
          <span>👤 Hire Agent</span>
          <button onClick={onClose} style={{ ...btnBase, padding: '2px 8px', fontSize: '18px' }}>✕</button>
        </div>
        <div style={dialogBodyStyle}>

          {/* Name */}
          <label style={labelStyle}>Agent Name</label>
          <input
            ref={inputRef}
            style={fieldStyle}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter agent name..."
            onKeyDown={e => { if (e.key === 'Enter') handleHire(); if (e.key === 'Escape') onClose(); }}
          />

          {/* Role */}
          <label style={labelStyle}>Role</label>
          {!showCustomRole ? (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <select
                style={{ ...fieldStyle, marginBottom: 0, flex: 1 }}
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                {DEFAULT_ROLES.map(r => (
                  <option key={r} value={r} style={{ background: '#1a1a3a', color: '#fff' }}>{r}</option>
                ))}
              </select>
              <button
                onClick={() => setShowCustomRole(true)}
                title="Add custom role"
                style={{
                  ...btnBase,
                  padding: '4px 10px',
                  fontSize: '20px',
                  border: '2px solid var(--pixel-border)',
                  color: 'var(--pixel-text)',
                  flexShrink: 0,
                }}
              >+ New</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                style={{ ...fieldStyle, marginBottom: 0, flex: 1 }}
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                placeholder="Type custom role..."
                autoFocus
              />
              <button
                onClick={() => setShowCustomRole(false)}
                title="Use existing roles"
                style={{
                  ...btnBase,
                  padding: '4px 10px',
                  fontSize: '20px',
                  border: '2px solid var(--pixel-border)',
                  color: 'var(--pixel-text)',
                  flexShrink: 0,
                }}
              >List</button>
            </div>
          )}

          {/* Department */}
          <label style={labelStyle}>Department</label>
          <select
            style={fieldStyle}
            value={dept}
            onChange={e => setDept(e.target.value)}
          >
            {DEFAULT_DEPTS.map(d => (
              <option key={d} value={d} style={{ background: '#1a1a3a', color: '#fff' }}>{d}</option>
            ))}
          </select>

          {/* Preview */}
          <div style={{
            background: '#0d0d2a',
            border: '2px solid var(--pixel-border)',
            padding: '6px 10px',
            marginBottom: 10,
            fontSize: '19px',
            color: 'var(--pixel-text-dim)',
          }}>
            <span style={{ color: 'var(--pixel-text)' }}>{name.trim() || '(name)'}</span>
            {' · '}
            <span style={{ color: 'var(--pixel-agent-text)' }}>{finalRole}</span>
            {' · '}
            <span style={{ color: 'var(--pixel-text-dim)' }}>{dept}</span>
          </div>

          <div style={dialogBtnsStyle}>
            <button
              onClick={handleHire}
              onMouseEnter={() => setHovered('hire')}
              onMouseLeave={() => setHovered(null)}
              style={{
                ...btnBase,
                flex: 1,
                background: hovered === 'hire' ? 'var(--pixel-agent-hover-bg)' : 'var(--pixel-agent-bg)',
                border: '2px solid var(--pixel-agent-border)',
                color: 'var(--pixel-agent-text)',
                fontSize: '20px',
              }}
            >
              ✓ Hire
            </button>
            <button
              onClick={onClose}
              onMouseEnter={() => setHovered('cancel')}
              onMouseLeave={() => setHovered(null)}
              style={{
                ...btnBase,
                flex: 1,
                background: hovered === 'cancel' ? 'var(--pixel-btn-hover-bg)' : btnBase.background,
                fontSize: '20px',
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
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

  const handleHire = (name: string, role: string, dept: string) => {
    if (onHireAgent) onHireAgent(name, role, dept);
  };

  return (
    <>
      {isHireOpen && (
        <HireDialog
          onClose={() => setIsHireOpen(false)}
          onHire={handleHire}
        />
      )}
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
        <button
          onClick={() => setIsHireOpen(true)}
          onMouseEnter={() => setHovered('hire')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            padding: '5px 12px',
            background:
              hovered === 'hire'
                ? 'var(--pixel-agent-hover-bg)'
                : 'var(--pixel-agent-bg)',
            border: '2px solid var(--pixel-agent-border)',
            color: 'var(--pixel-agent-text)',
          }}
          title="Hire a new agent with a role"
        >
          👤 Hire
        </button>

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
