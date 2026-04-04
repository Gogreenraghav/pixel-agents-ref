import { useState } from 'react';

export function FloorManager({ onClose }: { onClose: () => void }) {
  
  const [selectedFloor, setSelectedFloor] = useState(1);

  const floors = [
    { id: 1, name: 'Ground Floor', icon: '🏢', color: '#00ff88', desc: 'Main reception and lobby' },
    { id: 2, name: 'HR & Operations', icon: '👔', color: '#66ddff', desc: 'Human Resources' },
    { id: 3, name: 'R&D Lab', icon: '🔬', color: '#ff88ff', desc: 'Research & Development' },
    { id: 4, name: 'Marketing Hub', icon: '📢', color: '#ffdd44', desc: 'Marketing & Sales' },
  ];

  try {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          background: '#0d0d1e',
          border: '2px solid #334466',
          fontFamily: 'monospace',
          overflow: 'auto',
        }}>
          {/* Header */}
          <div style={{
            background: '#0a0a18',
            borderBottom: '2px solid #334466',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <span style={{ fontSize: '28px' }}>🏗️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>
                4-Floor Office Building
              </div>
              <div style={{ fontSize: '14px', color: '#667788' }}>
                Level 1 Company
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ff6666',
                fontSize: '22px',
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Floor Visual */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: '20px',
          }}>
            {[4, 3, 2, 1].map(floorId => {
              const floor = floors.find(f => f.id === floorId);
              if (!floor) return null;
              const isSelected = selectedFloor === floorId;

              return (
                <div
                  key={floor.id}
                  onClick={() => setSelectedFloor(floorId)}
                  style={{
                    width: 120,
                    padding: '12px 8px',
                    background: floor.color + '20',
                    border: '3px solid ' + floor.color,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s',
                    opacity: isSelected ? 1 : 0.7,
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: 4 }}>{floor.icon}</div>
                  <div style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>{floor.name}</div>
                  <div style={{ fontSize: '10px', color: floor.color }}>Floor {floor.id}</div>
                </div>
              );
            })}
          </div>

          {/* Floor Info */}
          <div style={{ padding: '0 20px 20px' }}>
            {(() => {
              const current = floors.find(f => f.id === selectedFloor);
              if (!current) return null;

              return (
                <div style={{
                  background: '#0a0a18',
                  border: '2px solid ' + current.color,
                  padding: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: '48px' }}>{current.icon}</div>
                    <div>
                      <div style={{ fontSize: '22px', color: current.color, fontWeight: 'bold' }}>
                        {current.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#667788' }}>
                        {current.desc}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div style={{ textAlign: 'center', background: '#0d0d1e', padding: 12 }}>
                      <div style={{ fontSize: '20px' }}>👥</div>
                      <div style={{ color: '#667788', fontSize: '12px' }}>Capacity</div>
                      <div style={{ color: '#ffdd44', fontSize: '18px', fontWeight: 'bold' }}>
                        {current.id === 1 ? 2 : current.id === 2 ? 4 : current.id === 3 ? 6 : 8}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', background: '#0d0d1e', padding: 12 }}>
                      <div style={{ fontSize: '20px' }}>🏠</div>
                      <div style={{ color: '#667788', fontSize: '12px' }}>Rooms</div>
                      <div style={{ color: '#66ddff', fontSize: '18px', fontWeight: 'bold' }}>3</div>
                    </div>
                    <div style={{ textAlign: 'center', background: '#0d0d1e', padding: 12 }}>
                      <div style={{ fontSize: '20px' }}>⬆️</div>
                      <div style={{ color: '#667788', fontSize: '12px' }}>Level</div>
                      <div style={{ color: '#ff88ff', fontSize: '18px', fontWeight: 'bold' }}>{current.id <= 2 ? 1 : 2}</div>
                    </div>
                    <div style={{ textAlign: 'center', background: '#0d0d1e', padding: 12 }}>
                      <div style={{ fontSize: '20px' }}>⭐</div>
                      <div style={{ color: '#667788', fontSize: '12px' }}>Perks</div>
                      <div style={{ color: '#00ff88', fontSize: '18px', fontWeight: 'bold' }}>
                        {current.id === 1 ? 'Basic' : current.id === 2 ? '+25%' : current.id === 3 ? '+20% AI' : '+25% Rev'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0d0d1e',
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: '#ff4444' }}>
          <div>Error in Floor Manager</div>
          <button onClick={onClose} style={{ marginTop: 20 }}>Close</button>
        </div>
      </div>
    );
  }
}
