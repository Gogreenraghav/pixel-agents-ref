import { useState, useEffect } from 'react';

interface Unlockable {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'theme' | 'avatar' | 'badge' | 'effect' | 'frame';
  cost: number;
  unlocked: boolean;
  equipped?: boolean;
}

interface GameState {
  coins: number;
  unlocks: Unlockable[];
  equipped: {
    theme: string;
    avatar: string;
    badge: string;
    effect: string;
    frame: string;
  };
}

const LS_UNLOCK = 'pixeloffice_unlockables';

const INITIAL_UNLOCKABLES: Omit<Unlockable, 'unlocked' | 'equipped'>[] = [
  // Themes
  { id: 'theme_cyber', name: 'Cyberpunk', description: 'Neon pink & cyan theme', icon: '🌃', category: 'theme', cost: 500 },
  { id: 'theme_forest', name: 'Forest', description: 'Nature green & brown', icon: '🌲', category: 'theme', cost: 400 },
  { id: 'theme_ocean', name: 'Ocean', description: 'Blue waves theme', icon: '🌊', category: 'theme', cost: 400 },
  { id: 'theme_sunset', name: 'Sunset', description: 'Orange & purple theme', icon: '🌅', category: 'theme', cost: 600 },
  { id: 'theme_matrix', name: 'Matrix', description: 'Classic green terminal', icon: '💚', category: 'theme', cost: 800 },
  { id: 'theme_galaxy', name: 'Galaxy', description: 'Stars & space theme', icon: '🌌', category: 'theme', cost: 1000 },
  // Avatars
  { id: 'avatar_robot', name: 'Robot Agent', description: 'Cute robot avatar', icon: '🤖', category: 'avatar', cost: 300 },
  { id: 'avatar_ninja', name: 'Ninja', description: 'Stealthy ninja agent', icon: '🥷', category: 'avatar', cost: 350 },
  { id: 'avatar_alien', name: 'Alien', description: 'Space alien visitor', icon: '👽', category: 'avatar', cost: 500 },
  { id: 'avatar_wizard', name: 'Wizard', description: 'Magical wizard agent', icon: '🧙', category: 'avatar', cost: 450 },
  { id: 'avatar_astronaut', name: 'Astronaut', description: 'Space explorer', icon: '👨‍🚀', category: 'avatar', cost: 600 },
  // Badges
  { id: 'badge_fire', name: 'Fire Badge', description: 'On fire! 🔥', icon: '🔥', category: 'badge', cost: 200 },
  { id: 'badge_star', name: 'Star Badge', description: 'Superstar ⭐', icon: '⭐', category: 'badge', cost: 200 },
  { id: 'badge_diamond', name: 'Diamond Badge', description: 'Rare gem 💎', icon: '💎', category: 'badge', cost: 800 },
  { id: 'badge_crown', name: 'Crown Badge', description: 'Royal treatment 👑', icon: '👑', category: 'badge', cost: 1000 },
  // Effects
  { id: 'effect_sparkle', name: 'Sparkle', description: 'Sparkle particle effect', icon: '✨', category: 'effect', cost: 300 },
  { id: 'effect_glow', name: 'Glow', description: 'Neon glow effect', icon: '💫', category: 'effect', cost: 400 },
  { id: 'effect_rainbow', name: 'Rainbow', description: 'Colorful rainbow trail', icon: '🌈', category: 'effect', cost: 700 },
  { id: 'effect_fire', name: 'Fire Trail', description: 'Burning fire effect', icon: '🔥', category: 'effect', cost: 500 },
  // Frames
  { id: 'frame_gold', name: 'Gold Frame', description: 'Golden border', icon: '🟡', category: 'frame', cost: 400 },
  { id: 'frame_diamond', name: 'Diamond Frame', description: 'Sparkly border', icon: '🔷', category: 'frame', cost: 600 },
  { id: 'frame_flame', name: 'Flame Frame', description: 'Fire border', icon: '🟠', category: 'frame', cost: 500 },
];

function loadState(): GameState {
  try {
    const stored = localStorage.getItem(LS_UNLOCK);
    if (stored) return JSON.parse(stored);
  } catch {}
  
  return {
    coins: 100, // Starting coins
    unlocks: INITIAL_UNLOCKABLES.map(u => ({ ...u, unlocked: false, equipped: false })),
    equipped: { theme: 'default', avatar: 'default', badge: 'none', effect: 'none', frame: 'none' },
  };
}

export function Unlockables({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<GameState>(loadState);
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory' | 'equipped'>('shop');

  useEffect(() => {
    // Load coins from game state
    try {
      const gameData = localStorage.getItem('pixeloffice_gamestate');
      if (gameData) {
        const game = JSON.parse(gameData);
        // Add coins equivalent to 10% of XP
        const bonusCoins = Math.floor(game.xp / 100);
        if (bonusCoins > 0) {
          setState(prev => ({ ...prev, coins: prev.coins + bonusCoins }));
        }
      }
    } catch {}
  }, []);

  const saveState = (updated: GameState) => {
    setState(updated);
    localStorage.setItem(LS_UNLOCK, JSON.stringify(updated));
  };

  const purchase = (id: string) => {
    const item = state.unlocks.find(u => u.id === id);
    if (!item || state.coins < item.cost) return;
    
    const updated = {
      ...state,
      coins: state.coins - item.cost,
      unlocks: state.unlocks.map(u => u.id === id ? { ...u, unlocked: true } : u),
    };
    saveState(updated);
  };

  const equip = (id: string, category: Unlockable['category']) => {
    const item = state.unlocks.find(u => u.id === id);
    if (!item || !item.unlocked) return;
    
    // Apply theme immediately
    if (category === 'theme') {
      document.documentElement.style.setProperty('--pixel-bg', getThemeBg(id));
      document.documentElement.style.setProperty('--pixel-primary', getThemePrimary(id));
    }
    
    const updated = {
      ...state,
      equipped: { ...state.equipped, [category]: id },
      unlocks: state.unlocks.map(u => 
        u.category === category ? { ...u, equipped: u.id === id } : u
      ),
    };
    saveState(updated);
  };

  const unequip = (category: Unlockable['category']) => {
    const updated = {
      ...state,
      equipped: { ...state.equipped, [category]: category === 'theme' ? 'default' : 'none' },
      unlocks: state.unlocks.map(u => 
        u.category === category ? { ...u, equipped: false } : u
      ),
    };
    saveState(updated);
  };

  const getThemeBg = (id: string) => {
    const themes: Record<string, string> = {
      theme_cyber: '#0a0a1a',
      theme_forest: '#0a1a0a',
      theme_ocean: '#0a1a2a',
      theme_sunset: '#1a0a1a',
      theme_matrix: '#001100',
      theme_galaxy: '#0a0020',
    };
    return themes[id] || '#0d0d1e';
  };

  const getThemePrimary = (id: string) => {
    const themes: Record<string, string> = {
      theme_cyber: '#ff00ff',
      theme_forest: '#00ff00',
      theme_ocean: '#00aaff',
      theme_sunset: '#ff8800',
      theme_matrix: '#00ff00',
      theme_galaxy: '#aa66ff',
    };
    return themes[id] || '#66ddff';
  };

  const categories: { id: Unlockable['category']; label: string }[] = [
    { id: 'theme', label: '🎨 Themes' },
    { id: 'avatar', label: '😊 Avatars' },
    { id: 'badge', label: '🏅 Badges' },
    { id: 'effect', label: '✨ Effects' },
    { id: 'frame', label: '🖼️ Frames' },
  ];

  const [selectedCategory, setSelectedCategory] = useState<Unlockable['category']>('theme');

  const unlockedItems = state.unlocks.filter(u => u.unlocked);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 800, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🎁</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Unlockables Shop</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Customize your company with cosmetics</div>
          </div>
          <div style={{
            background: '#1a1a0a', border: '2px solid #ffdd44', padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: '20px' }}>🪙</span>
            <span style={{ fontSize: '20px', color: '#ffdd44', fontWeight: 'bold' }}>{state.coins}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #223355' }}>
          {([
            { id: 'shop', label: '🛒 Shop' },
            { id: 'inventory', label: `📦 Inventory (${unlockedItems.length})` },
            { id: 'equipped', label: '✨ Equipped' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          
          {activeTab === 'shop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Category Filter */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{
                    padding: '8px 16px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                    background: selectedCategory === cat.id ? '#2255aa' : '#0a0a18',
                    color: selectedCategory === cat.id ? '#fff' : '#667788',
                    border: `2px solid ${selectedCategory === cat.id ? '#66ddff' : '#334466'}`,
                    cursor: 'pointer',
                  }}>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {state.unlocks
                  .filter(u => u.category === selectedCategory)
                  .map(item => (
                    <div key={item.id} style={{
                      background: item.unlocked ? '#0a1a0a' : '#0a0a14',
                      border: `2px solid ${item.unlocked ? '#00ff88' : '#334466'}`,
                      padding: '16px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: 8, filter: item.unlocked ? 'none' : 'grayscale(100%)' }}>
                        {item.icon}
                      </div>
                      <div style={{ fontSize: '17px', color: item.unlocked ? '#00ff88' : '#fff', fontWeight: 'bold', marginBottom: 4 }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#667788', marginBottom: 12 }}>
                        {item.description}
                      </div>
                      
                      {item.unlocked ? (
                        <button
                          onClick={() => equip(item.id, item.category)}
                          style={{
                            width: '100%', padding: '8px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                            background: item.equipped ? '#335533' : '#0a2a0a',
                            color: item.equipped ? '#667788' : '#00ff88',
                            border: `2px solid ${item.equipped ? '#335533' : '#00ff88'}`,
                            cursor: 'pointer',
                          }}
                        >
                          {item.equipped ? '✅ Equipped' : '✨ Equip'}
                        </button>
                      ) : (
                        <button
                          onClick={() => purchase(item.id)}
                          disabled={state.coins < item.cost}
                          style={{
                            width: '100%', padding: '8px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                            background: state.coins >= item.cost ? '#1a1a0a' : '#111',
                            color: state.coins >= item.cost ? '#ffdd44' : '#444',
                            border: `2px solid ${state.coins >= item.cost ? '#ffdd44' : '#333'}`,
                            cursor: state.coins >= item.cost ? 'pointer' : 'not-allowed',
                          }}
                        >
                          🪙 {item.cost}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {unlockedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#667788' }}>
                  <div style={{ fontSize: '48px', marginBottom: 12 }}>📦</div>
                  <div style={{ fontSize: '18px' }}>No items unlocked yet!</div>
                  <div style={{ fontSize: '15px', marginTop: 8 }}>Visit the shop to purchase items</div>
                </div>
              ) : (
                unlockedItems.map(item => (
                  <div key={item.id} style={{
                    background: '#0a1a0a', border: '2px solid #00ff88',
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontSize: '36px' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '17px', color: '#00ff88', fontWeight: 'bold' }}>{item.name}</div>
                      <div style={{ fontSize: '14px', color: '#667788' }}>{item.description}</div>
                    </div>
                    <button
                      onClick={() => equip(item.id, item.category)}
                      style={{
                        padding: '8px 16px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                        background: item.equipped ? '#335533' : '#0a2a0a',
                        color: item.equipped ? '#667788' : '#00ff88',
                        border: `2px solid ${item.equipped ? '#335533' : '#00ff88'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {item.equipped ? '✅ Equipped' : '✨ Equip'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'equipped' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {categories.map(cat => {
                const equipped = state.equipped[cat.id];
                const item = state.unlocks.find(u => u.id === equipped);
                
                return (
                  <div key={cat.id} style={{
                    background: '#0a0a14', border: '2px solid #334466',
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ fontSize: '36px', width: 50, textAlign: 'center' }}>
                      {cat.id === 'theme' ? '🎨' : cat.id === 'avatar' ? '😊' : cat.id === 'badge' ? '🏅' : cat.id === 'effect' ? '✨' : '🖼️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: '#667788', marginBottom: 2 }}>{cat.label}</div>
                      <div style={{ fontSize: '17px', color: item ? '#66ddff' : '#445566', fontWeight: 'bold' }}>
                        {item ? item.name : 'None'}
                      </div>
                    </div>
                    {equipped !== 'default' && equipped !== 'none' && (
                      <button
                        onClick={() => unequip(cat.id)}
                        style={{
                          padding: '6px 12px', fontFamily: 'monospace', fontSize: '13px',
                          background: '#1a0a0a', color: '#ff6666', border: '2px solid #ff6666',
                          cursor: 'pointer',
                        }}
                      >
                        ❌ Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#0a0a18', borderTop: '2px solid #334466', padding: '12px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#445566' }}>
            💡 Earn coins by completing tasks, hiring agents, and gaining clients!
          </div>
        </div>
      </div>
    </div>
  );
}
