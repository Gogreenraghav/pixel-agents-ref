import { useState, useEffect } from 'react';

interface Floor {
  id: number;
  name: string;
  icon: string;
  color: string;
  borderColor: string;
  description: string;
  level: number; // Required company level
  maxAgents: number;
  features: string[];
  perks: string[];
  active: boolean;
}

interface OfficeBuilding {
  currentFloor: number;
  floors: Floor[];
  buildingLevel: number; // 1-5
}

const LS_OFFICE = 'pixeloffice_building';

const FLOOR_TEMPLATES: Floor[] = [
  {
    id: 1,
    name: 'Ground Floor',
    icon: '🏢',
    color: '#0d1a0d',
    borderColor: '#00ff88',
    description: 'Main reception, lobby, and waiting area. The heart of your operations.',
    level: 1,
    maxAgents: 2,
    features: ['Reception Desk', 'Waiting Area', 'Security'],
    perks: ['Basic Operations', 'First Impressions'],
    active: true,
  },
  {
    id: 2,
    name: 'HR & Operations',
    icon: '👔',
    color: '#0d0d1a',
    borderColor: '#66ddff',
    description: 'Human Resources, recruitment, and team management.',
    level: 1,
    maxAgents: 4,
    features: ['HR Office', 'Interview Room', 'Training Hall'],
    perks: ['Hiring +25%', 'Agent Loyalty +15%'],
    active: false,
  },
  {
    id: 3,
    name: 'R&D Lab',
    icon: '🔬',
    color: '#1a0d1a',
    borderColor: '#ff88ff',
    description: 'Research and Development - innovate and create!',
    level: 2,
    maxAgents: 6,
    features: ['Lab Space', 'Innovation Lab', 'Tech Workshop'],
    perks: ['AI Speed +20%', 'Innovation XP +50%'],
    active: false,
  },
  {
    id: 4,
    name: 'Marketing Hub',
    icon: '📢',
    color: '#1a1a0d',
    borderColor: '#ffdd44',
    description: 'Marketing, sales, and client acquisition.',
    level: 2,
    maxAgents: 8,
    features: ['Creative Studio', 'Meeting Room', 'Showroom'],
    perks: ['Revenue +25%', 'Client Satisfaction +30%'],
    active: false,
  },
];

function loadBuilding(): OfficeBuilding {
  const stored = localStorage.getItem(LS_OFFICE);
  if (stored) {
    const data = JSON.parse(stored);
    // Ensure all floors are loaded
    return {
      ...data,
      floors: FLOOR_TEMPLATES.map(template => {
        const existing = data.floors.find((f: Floor) => f.id === template.id);
        return existing ? { ...template, ...existing } : template;
      }),
    };
  }
  
  return {
    currentFloor: 1,
    buildingLevel: 1,
    floors: FLOOR_TEMPLATES,
  };
}

export function FloorManager({ onClose }: { 
  onClose: () => void;
}) {
  const [building, setBuilding] = useState<OfficeBuilding>(loadBuilding);
  const [activeTab, setActiveTab] = useState<'view' | 'upgrade' | 'build'>('view');

  useEffect(() => {
    // Load company level from game state
    try {
      const gameData = localStorage.getItem('pixeloffice_gamestate');
      if (gameData) {
        const game = JSON.parse(gameData);
        setBuilding(prev => ({
          ...prev,
          buildingLevel: game.level || 1,
        }));
      }
    } catch {}
  }, []);

  const saveBuilding = (updated: OfficeBuilding) => {
    setBuilding(updated);
    localStorage.setItem(LS_OFFICE, JSON.stringify(updated));
  };

  const selectFloor = (id: number) => {
    const updated = { ...building, currentFloor: id };
    saveBuilding(updated);
  };

  const activateFloor = (id: number) => {
    const floor = building.floors.find(f => f.id === id);
    if (!floor) return;
    
    // Check if player has reached required level
    const gameData = localStorage.getItem('pixeloffice_gamestate');
    const currentLevel = gameData ? JSON.parse(gameData).level || 1 : 1;
    
    if (currentLevel < floor.level) {
      alert(`Floor ${floor.name} requires Company Level ${floor.level}!\nCurrent: Level ${currentLevel}`);
      return;
    }
    
    const updated = {
      ...building,
      floors: building.floors.map(f => f.id === id ? { ...f, active: true } : f),
    };
    saveBuilding(updated);
  };

  const getCurrentLevel = () => {
    const gameData = localStorage.getItem('pixeloffice_gamestate');
    return gameData ? JSON.parse(gameData).level || 1 : 1;
  };

  const currentLevel = getCurrentLevel();
  const activeFloors = building.floors.filter(f => f.active);
  const availableFloors = building.floors.filter(f => !f.active);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 900, maxHeight: '92vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🏗️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>4-Floor Office Building</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>
              Level {currentLevel} Company · {activeFloors.length}/4 Floors Active
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #223355' }}>
          {([
            { id: 'view', label: '🏢 View Floors' },
            { id: 'build', label: '🔨 Build/Unlock' },
            { id: 'upgrade', label: '⬆️ Upgrade' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
              background: activeTab === tab.id ? '#112233' : 'transparent',
              color: activeTab === tab.id ? '#66ddff' : '#445566',
              border: 'none', borderBottom: activeTab === tab.id ? '3px solid #66ddff' : '3px solid transparent',
              cursor: 'pointer',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          
          {activeTab === 'view' && (
            <div>
              {/* Building Visual */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
                {[4, 3, 2, 1].map(floorId => {
                  const floor = building.floors.find(f => f.id === floorId)!;
                  const isSelected = building.currentFloor === floorId;
                  const isActive = floor.active;
                  
                  return (
                    <div
                      key={floor.id}
                      onClick={() => isActive && selectFloor(floorId)}
                      style={{
                        width: 140,
                        background: isActive ? floor.color : '#111',
                        border: `3px solid ${isActive ? (isSelected ? '#fff' : floor.borderColor) : '#333'}`,
                        padding: '10px',
                        cursor: isActive ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                        opacity: isActive ? (isSelected ? 1 : 0.85) : 0.4,
                        boxShadow: isSelected ? `0 0 20px ${floor.borderColor}` : 'none',
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: 6, filter: isActive ? 'none' : 'grayscale(100%)' }}>
                          {isActive ? floor.icon : '🔒'}
                        </div>
                        <div style={{ fontSize: '13px', color: isActive ? '#fff' : '#555', fontWeight: 'bold' }}>
                          {floor.name}
                        </div>
                        <div style={{ fontSize: '11px', color: floor.borderColor }}>
                          {isActive ? 'Active' : `Lv.${floor.level}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Floor Details */}
              {(() => {
                const selected = building.floors.find(f => f.id === building.currentFloor)!;
                
                return (
                  <div style={{
                    background: selected.color,
                    border: `3px solid ${selected.borderColor}`,
                    padding: '20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <div style={{ fontSize: '56px' }}>{selected.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '24px', color: selected.borderColor, fontWeight: 'bold' }}>
                          {selected.name}
                        </div>
                        <div style={{ fontSize: '15px', color: '#8899aa' }}>
                          {selected.description}
                        </div>
                      </div>
                      <div style={{
                        background: '#0d0d1e',
                        border: `2px solid ${selected.borderColor}`,
                        padding: '10px 16px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '12px', color: '#667788' }}>Status</div>
                        <div style={{ fontSize: '18px', color: selected.active ? '#00ff88' : '#ff6666', fontWeight: 'bold' }}>
                          {selected.active ? '✅ Active' : '🔒 Locked'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Features */}
                      <div>
                        <div style={{ fontSize: '16px', color: '#ffdd44', fontWeight: 'bold', marginBottom: 8 }}>🏠 Features</div>
                        {selected.features.map((f, i) => (
                          <div key={i} style={{ color: '#aabbcc', fontSize: '14px', marginBottom: 4 }}>
                            ✓ {f}
                          </div>
                        ))}
                      </div>
                      
                      {/* Perks */}
                      <div>
                        <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 'bold', marginBottom: 8 }}>🎁 Perks</div>
                        {selected.perks.map((p, i) => (
                          <div key={i} style={{ color: '#00ff88', fontSize: '14px', marginBottom: 4 }}>
                            ⭐ {p}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #334466' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '20px' }}>👥</div>
                          <div style={{ color: '#667788', fontSize: '12px' }}>Capacity</div>
                          <div style={{ color: '#ffdd44', fontSize: '18px', fontWeight: 'bold' }}>{selected.maxAgents}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '20px' }}>🏠</div>
                          <div style={{ color: '#667788', fontSize: '12px' }}>Rooms</div>
                          <div style={{ color: '#66ddff', fontSize: '18px', fontWeight: 'bold' }}>{selected.features.length}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '20px' }}>⬆️</div>
                          <div style={{ color: '#667788', fontSize: '12px' }}>Required Level</div>
                          <div style={{ color: '#ff88ff', fontSize: '18px', fontWeight: 'bold' }}>{selected.level}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'build' && (
            <div>
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px', marginBottom: 16 }}>
                <div style={{ fontSize: '18px', color: '#66ddff', marginBottom: 8 }}>
                  🔓 Unlock New Floors
                </div>
                <div style={{ fontSize: '14px', color: '#667788' }}>
                  Reach the required company level to unlock floors. Each floor adds new capabilities!
                </div>
              </div>

              {/* Locked Floors */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {availableFloors.map(floor => {
                  const canUnlock = currentLevel >= floor.level;
                  
                  return (
                    <div key={floor.id} style={{
                      background: canUnlock ? '#0a1a0a' : '#0a0a14',
                      border: `2px solid ${canUnlock ? '#00ff88' : '#334466'}`,
                      padding: '16px',
                      opacity: canUnlock ? 1 : 0.6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: '40px' }}>{canUnlock ? floor.icon : '🔒'}</div>
                        <div>
                          <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>{floor.name}</div>
                          <div style={{ fontSize: '14px', color: '#667788' }}>
                            Required: Level {floor.level}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '14px', color: '#556677', marginBottom: 12 }}>
                        {floor.description}
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '13px', color: '#ffdd44', marginBottom: 4 }}>Perks:</div>
                        {floor.perks.map((p, i) => (
                          <div key={i} style={{ fontSize: '13px', color: '#00ff88' }}>⭐ {p}</div>
                        ))}
                      </div>

                      {canUnlock ? (
                        <button
                          onClick={() => activateFloor(floor.id)}
                          style={{
                            width: '100%', padding: '10px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold',
                            background: '#0a2a0a', color: '#00ff88', border: '2px solid #00ff88',
                            cursor: 'pointer',
                          }}
                        >
                          🔓 Unlock Floor
                        </button>
                      ) : (
                        <div style={{
                          width: '100%', padding: '10px', textAlign: 'center',
                          background: '#111', color: '#555', fontSize: '15px', fontWeight: 'bold',
                        }}>
                          🔒 Need Level {floor.level} (You have {currentLevel})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {availableFloors.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#667788' }}>
                  <div style={{ fontSize: '48px', marginBottom: 12 }}>🎉</div>
                  <div style={{ fontSize: '20px', color: '#00ff88' }}>All Floors Unlocked!</div>
                  <div style={{ fontSize: '14px', marginTop: 8 }}>You're managing all 4 floors!</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upgrade' && (
            <div>
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px', marginBottom: 16 }}>
                <div style={{ fontSize: '18px', color: '#ffdd44', marginBottom: 8 }}>
                  ⬆️ Building Upgrades
                </div>
                <div style={{ fontSize: '14px', color: '#667788' }}>
                  Upgrade your building to increase capacity and unlock new features.
                </div>
              </div>

              {/* Current Status */}
              <div style={{ background: '#0a1a1a', border: '2px solid #66ddff', padding: '16px', marginBottom: 16 }}>
                <div style={{ fontSize: '16px', color: '#66ddff', marginBottom: 12 }}>📊 Current Building Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px' }}>🏢</div>
                    <div style={{ color: '#667788', fontSize: '12px' }}>Building Level</div>
                    <div style={{ color: '#ffdd44', fontSize: '20px', fontWeight: 'bold' }}>{building.buildingLevel}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px' }}>👥</div>
                    <div style={{ color: '#667788', fontSize: '12px' }}>Active Floors</div>
                    <div style={{ color: '#00ff88', fontSize: '20px', fontWeight: 'bold' }}>{activeFloors.length}/4</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px' }}>🏠</div>
                    <div style={{ color: '#667788', fontSize: '12px' }}>Total Rooms</div>
                    <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                      {activeFloors.reduce((sum, f) => sum + f.features.length, 0)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px' }}>⭐</div>
                    <div style={{ color: '#667788', fontSize: '12px' }}>Max Agents</div>
                    <div style={{ color: '#ff88ff', fontSize: '20px', fontWeight: 'bold' }}>
                      {activeFloors.reduce((sum, f) => sum + f.maxAgents, 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade Options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { level: 2, name: 'Standard Building', xp: 500, perks: '+2 Agent Capacity', color: '#66ddff' },
                  { level: 3, name: 'Premium Building', xp: 1500, perks: '+4 Agent Capacity, Faster AI', color: '#ffdd44' },
                  { level: 4, name: 'Corporate Tower', xp: 4000, perks: '+6 Capacity, Double Revenue', color: '#ff88ff' },
                  { level: 5, name: 'Sky Tower', xp: 8000, perks: '+10 Capacity, All Bonuses', color: '#ff6666' },
                ].map(upgrade => {
                  const isCurrent = building.buildingLevel >= upgrade.level;
                  const isNext = building.buildingLevel === upgrade.level - 1;
                  const canUpgrade = isNext && currentLevel >= upgrade.level;
                  
                  return (
                    <div key={upgrade.level} style={{
                      background: '#0a0a18',
                      border: `2px solid ${isCurrent ? '#00ff88' : upgrade.color}`,
                      padding: '16px',
                      opacity: isCurrent || canUpgrade ? 1 : 0.5,
                    }}>
                      <div style={{ fontSize: '20px', color: upgrade.color, fontWeight: 'bold', marginBottom: 8 }}>
                        Level {upgrade.level}: {upgrade.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#667788', marginBottom: 12 }}>
                        ⭐ {upgrade.perks}
                      </div>
                      
                      {isCurrent ? (
                        <div style={{ padding: '8px', textAlign: 'center', background: '#0a2a0a', color: '#00ff88', fontSize: '14px', fontWeight: 'bold' }}>
                          ✅ Current
                        </div>
                      ) : isNext ? (
                        <button
                          style={{
                            width: '100%', padding: '8px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                            background: canUpgrade ? '#0a2a0a' : '#111',
                            color: canUpgrade ? '#00ff88' : '#555',
                            border: `2px solid ${canUpgrade ? '#00ff88' : '#333'}`,
                            cursor: canUpgrade ? 'pointer' : 'not-allowed',
                          }}
                          onClick={() => {
                            if (canUpgrade) {
                              saveBuilding({ ...building, buildingLevel: upgrade.level });
                            }
                          }}
                        >
                          {canUpgrade ? `⬆️ Upgrade (${upgrade.xp} XP)` : `🔒 Need Lv.${upgrade.level}`}
                        </button>
                      ) : (
                        <div style={{ padding: '8px', textAlign: 'center', background: '#111', color: '#444', fontSize: '14px', fontWeight: 'bold' }}>
                          🔒 Need Level {upgrade.level - 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#0a0a18', borderTop: '2px solid #334466', padding: '12px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#445566' }}>
            💡 Complete tasks and level up to unlock more floors! Current: Level {currentLevel}
          </div>
        </div>
      </div>
    </div>
  );
}
