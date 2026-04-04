import { useState } from 'react';

interface Floor {
  id: number;
  name: string;
  icon: string;
  color: string;
  borderColor: string;
  description: string;
  agents: number;
  maxAgents: number;
  features: string[];
  perks: string[];
}

interface OfficeBuilding {
  floors: Floor[];
  selectedFloor: number;
}

const LS_OFFICE = 'pixeloffice_building';

function loadBuilding(): OfficeBuilding {
  const stored = localStorage.getItem(LS_OFFICE);
  if (stored) return JSON.parse(stored);
  
  return {
    selectedFloor: 1,
    floors: [
      {
        id: 1,
        name: 'Ground Floor',
        icon: '🏢',
        color: '#0d1a0d',
        borderColor: '#00ff88',
        description: 'Main reception and lobby area',
        agents: 0,
        maxAgents: 2,
        features: ['Reception', 'Waiting Area', 'Front Desk'],
        perks: ['Basic Operations'],
      },
      {
        id: 2,
        name: 'HR & Operations',
        icon: '👔',
        color: '#0d0d1a',
        borderColor: '#66ddff',
        description: 'Human Resources and Management',
        agents: 0,
        maxAgents: 4,
        features: ['HR Department', 'Recruitment', 'Training Room'],
        perks: ['Agent Management', 'Hiring Bonuses'],
      },
      {
        id: 3,
        name: 'R&D Lab',
        icon: '🔬',
        color: '#1a0d1a',
        borderColor: '#ff88ff',
        description: 'Research and Development',
        agents: 0,
        maxAgents: 6,
        features: ['Lab Space', 'Innovation Lab', 'Tech Workshop'],
        perks: ['AI Speed +20%', 'Innovation XP +50%'],
      },
      {
        id: 4,
        name: 'Marketing Hub',
        icon: '📢',
        color: '#1a1a0d',
        borderColor: '#ffdd44',
        description: 'Marketing and Sales',
        agents: 0,
        maxAgents: 8,
        features: ['Creative Studio', 'Client Meeting Room', 'Showroom'],
        perks: ['Revenue +25%', 'Client Satisfaction +30%'],
      },
    ],
  };
}

export function FloorManager({ onClose }: { onClose: () => void }) {
  const [building, setBuilding] = useState<OfficeBuilding>(loadBuilding);

  const selectFloor = (id: number) => {
    const updated = { ...building, selectedFloor: id };
    setBuilding(updated);
    localStorage.setItem(LS_OFFICE, JSON.stringify(updated));
  };

  const getTotalAgents = () => building.floors.reduce((sum, f) => sum + f.agents, 0);
  const getMaxAgents = () => building.floors.reduce((sum, f) => sum + f.maxAgents, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 900, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🏗️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>4-Floor Office Building</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Expand your company headquarters</div>
          </div>
          <div style={{
            background: '#1a1a0a', border: '2px solid #ffdd44', padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: '18px' }}>👥</span>
            <span style={{ fontSize: '18px', color: '#ffdd44', fontWeight: 'bold' }}>
              {getTotalAgents()}/{getMaxAgents()}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Building Visual */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[4, 3, 2, 1].map(floorId => {
            const floor = building.floors.find(f => f.id === floorId)!;
            const isSelected = building.selectedFloor === floorId;
            
            return (
              <div
                key={floor.id}
                onClick={() => selectFloor(floorId)}
                style={{
                  width: 160,
                  background: floor.color,
                  border: `3px solid ${isSelected ? '#fff' : floor.borderColor}`,
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  opacity: isSelected ? 1 : 0.7,
                  boxShadow: isSelected ? `0 0 20px ${floor.borderColor}` : 'none',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: 8 }}>{floor.icon}</div>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{floor.name}</div>
                  <div style={{ fontSize: '12px', color: floor.borderColor }}>
                    Floor {floor.id}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floor Details */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {(() => {
            const selected = building.floors.find(f => f.id === building.selectedFloor)!;
            
            return (
              <div style={{
                background: selected.color,
                border: `3px solid ${selected.borderColor}`,
                padding: '24px',
              }}>
                {/* Floor Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: '64px' }}>{selected.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '28px', color: selected.borderColor, fontWeight: 'bold' }}>
                      Floor {selected.id}: {selected.name}
                    </div>
                    <div style={{ fontSize: '16px', color: '#8899aa' }}>
                      {selected.description}
                    </div>
                  </div>
                  <div style={{
                    background: '#0d0d1e',
                    border: `2px solid ${selected.borderColor}`,
                    padding: '12px 20px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '14px', color: '#667788' }}>Capacity</div>
                    <div style={{ fontSize: '24px', color: '#ffdd44', fontWeight: 'bold' }}>
                      {selected.agents}/{selected.maxAgents}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '18px', color: '#ffdd44', fontWeight: 'bold', marginBottom: 10 }}>
                    🏠 Floor Features
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selected.features.map((feature, idx) => (
                      <div key={idx} style={{
                        background: '#0d0d1e',
                        border: '1px solid #334466',
                        padding: '8px 14px',
                        fontSize: '14px',
                        color: '#fff',
                      }}>
                        ✓ {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Perks */}
                <div>
                  <div style={{ fontSize: '18px', color: '#00ff88', fontWeight: 'bold', marginBottom: 10 }}>
                    🎁 Floor Perks
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selected.perks.map((perk, idx) => (
                      <div key={idx} style={{
                        background: '#0a1a0a',
                        border: '2px solid #00ff88',
                        padding: '8px 14px',
                        fontSize: '14px',
                        color: '#00ff88',
                        fontWeight: 'bold',
                      }}>
                        ⭐ {perk}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floor Summary */}
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #334466' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', color: selected.borderColor }}>{selected.icon}</div>
                      <div style={{ fontSize: '14px', color: '#667788' }}>Floor</div>
                      <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>#{selected.id}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>👥</div>
                      <div style={{ fontSize: '14px', color: '#667788' }}>Agents</div>
                      <div style={{ fontSize: '18px', color: '#66ddff', fontWeight: 'bold' }}>{selected.agents}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>🏠</div>
                      <div style={{ fontSize: '14px', color: '#667788' }}>Rooms</div>
                      <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>{selected.features.length}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px' }}>🎁</div>
                      <div style={{ fontSize: '14px', color: '#667788' }}>Perks</div>
                      <div style={{ fontSize: '18px', color: '#00ff88', fontWeight: 'bold' }}>{selected.perks.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Building Overview */}
        <div style={{ background: '#0a0a18', borderTop: '2px solid #334466', padding: '16px 20px' }}>
          <div style={{ fontSize: '16px', color: '#667788', marginBottom: 10 }}>
            🏗️ Building Overview
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {building.floors.map(floor => (
              <div key={floor.id} style={{
                background: floor.id === building.selectedFloor ? floor.color : '#0d0d1e',
                border: `2px solid ${floor.borderColor}`,
                padding: '10px',
                textAlign: 'center',
                cursor: 'pointer',
              }} onClick={() => selectFloor(floor.id)}>
                <div style={{ fontSize: '20px' }}>{floor.icon}</div>
                <div style={{ fontSize: '13px', color: '#fff', fontWeight: 'bold' }}>{floor.name}</div>
                <div style={{ fontSize: '12px', color: '#667788' }}>Floor {floor.id}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#0a0a18', borderTop: '2px solid #334466', padding: '12px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#445566' }}>
            💡 Upgrade floors by reaching higher company levels!
          </div>
        </div>
      </div>
    </div>
  );
}
