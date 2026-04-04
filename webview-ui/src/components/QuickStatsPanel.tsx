interface QuickStatsPanelProps {
  agentCount: number;
  balance: number;
  floor: number;
}

export function QuickStatsPanel({ agentCount, balance, floor }: QuickStatsPanelProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        background: 'rgba(20, 20, 35, 0.9)',
        border: '2px solid #66ddff',
        padding: '8px 12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        zIndex: 999,
        borderRadius: 0,
        display: 'flex',
        gap: '12px',
      }}
    >
      <div title="Agents">
        <span style={{ color: '#66ddff' }}>👥</span>{' '}
        <span style={{ color: '#ffdd44' }}>{agentCount}</span>
      </div>
      <div title="Balance">
        <span style={{ color: '#66ddff' }}>💰</span>{' '}
        <span style={{ color: balance >= 0 ? '#00ff88' : '#ff6666' }}>
          ${balance.toLocaleString()}
        </span>
      </div>
      <div title="Current Floor">
        <span style={{ color: '#66ddff' }}>🏢</span>{' '}
        <span style={{ color: '#ffdd44' }}>F{floor + 1}</span>
      </div>
    </div>
  );
}
