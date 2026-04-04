import { useEffect, useState } from 'react';

interface KeyboardShortcutsProps {
  onDashboard?: () => void;
  onSettings?: () => void;
  onGame?: () => void;
}

export function KeyboardShortcuts({
  onDashboard,
  onSettings,
  onGame,
}: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();
      
      // Toggle help with ?
      if (key === '?') {
        setShowHelp(prev => !prev);
        return;
      }
      
      // Close help with Escape
      if (key === 'escape') {
        setShowHelp(false);
        return;
      }
      
      // Handle shortcuts
      switch (key) {
        case 'd':
          onDashboard?.();
          break;
        case 's':
          onSettings?.();
          break;
        case 'g':
          onGame?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDashboard, onSettings, onGame]);

  if (!showHelp) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={() => setShowHelp(false)}
    >
      <div
        style={{
          background: 'var(--pixel-bg)',
          border: '3px solid #66ddff',
          padding: '20px 30px',
          borderRadius: 0,
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ffffff',
          minWidth: '280px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ color: '#66ddff', fontSize: '18px', marginBottom: '12px', textAlign: 'center' }}>
          ⌨️ Keyboard Shortcuts
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#ffdd44', fontWeight: 'bold' }}>?</span>
          <span style={{ marginLeft: '10px' }}>Toggle This Help</span>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#ffdd44', fontWeight: 'bold' }}>ESC</span>
          <span style={{ marginLeft: '10px' }}>Close Help/Dialogs</span>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#ffdd44', fontWeight: 'bold' }}>D</span>
          <span style={{ marginLeft: '10px' }}>Dashboard</span>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#ffdd44', fontWeight: 'bold' }}>S</span>
          <span style={{ marginLeft: '10px' }}>Settings</span>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#ffdd44', fontWeight: 'bold' }}>G</span>
          <span style={{ marginLeft: '10px' }}>Game/Mechanics</span>
        </div>
        
        <div style={{ marginTop: '12px', borderTop: '1px solid #333', paddingTop: '10px' }}>
          <span style={{ color: '#888', fontSize: '12px' }}>Press ESC or click outside to close</span>
        </div>
      </div>
    </div>
  );
}
