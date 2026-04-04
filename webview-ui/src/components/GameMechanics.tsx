import { useState } from 'react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  category: 'tasks' | 'agents' | 'clients' | 'revenue' | 'special';
}

interface GameState {
  level: number;
  xp: number;
  title: string;
  achievements: Achievement[];
  stats: {
    tasksCompleted: number;
    agentsHired: number;
    clientsGained: number;
    revenue: number;
    streak: number;
  };
}

const LS_GAME = 'pixeloffice_gamestate';

const LEVELS = [
  { level: 1, title: '🚀 Startup', minXP: 0, color: '#88ff88', perks: ['Basic Features', '1 Floor', '2 Agents Max'] },
  { level: 2, title: '🌱 Growing', minXP: 500, color: '#88ddff', perks: ['More Tasks', '2 Floors', '4 Agents Max'] },
  { level: 3, title: '🏢 Scale-up', minXP: 1500, color: '#ffdd44', perks: ['AI Reports', '3 Floors', '8 Agents Max'] },
  { level: 4, title: '🦄 Unicorn', minXP: 5000, color: '#ff88ff', perks: ['All Features', '4 Floors', 'Unlimited Agents'] },
];

const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  // Tasks
  { id: 'task_1', title: 'First Step', description: 'Complete your first task', icon: '📝', category: 'tasks' },
  { id: 'task_10', title: 'Getting Things Done', description: 'Complete 10 tasks', icon: '✅', category: 'tasks' },
  { id: 'task_50', title: 'Productivity Pro', description: 'Complete 50 tasks', icon: '🏆', category: 'tasks' },
  { id: 'task_100', title: 'Task Master', description: 'Complete 100 tasks', icon: '👑', category: 'tasks' },
  // Agents
  { id: 'agent_1', title: 'Team Lead', description: 'Hire your first agent', icon: '👤', category: 'agents' },
  { id: 'agent_5', title: 'Team Builder', description: 'Hire 5 agents', icon: '👥', category: 'agents' },
  { id: 'agent_10', title: 'Enterprise', description: 'Hire 10 agents', icon: '🏢', category: 'agents' },
  // Clients
  { id: 'client_1', title: 'First Client', description: 'Add your first client', icon: '🤝', category: 'clients' },
  { id: 'client_5', title: 'Client Builder', description: 'Work with 5 clients', icon: '📈', category: 'clients' },
  { id: 'client_10', title: 'Client Master', description: 'Work with 10 clients', icon: '💎', category: 'clients' },
  // Revenue
  { id: 'revenue_1k', title: 'First Dollar', description: 'Earn $1,000', icon: '💵', category: 'revenue' },
  { id: 'revenue_10k', title: 'Five Figures', description: 'Earn $10,000', icon: '💰', category: 'revenue' },
  { id: 'revenue_50k', title: 'High Roller', description: 'Earn $50,000', icon: '🤑', category: 'revenue' },
  // Special
  { id: 'streak_7', title: 'Consistent', description: '7-day streak', icon: '🔥', category: 'special' },
  { id: 'all_agents_active', title: 'Full House', description: 'All agents working simultaneously', icon: '🎯', category: 'special' },
];

function loadGameState(): GameState {
  try {
    const stored = localStorage.getItem(LS_GAME);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check achievements against current stats
      const stats = getCurrentStats();
      const achievements = ACHIEVEMENTS.map(a => {
        const existing = parsed.achievements?.find((ua: Achievement) => ua.id === a.id);
        return {
          ...a,
          unlocked: checkAchievement(a, stats),
          unlockedAt: existing?.unlockedAt || (checkAchievement(a, stats) ? new Date().toLocaleString() : undefined),
        };
      });
      return { ...parsed, achievements, stats };
    }
  } catch {}
  
  return {
    level: 1,
    xp: 0,
    title: LEVELS[0].title,
    achievements: ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
    stats: { tasksCompleted: 0, agentsHired: 0, clientsGained: 0, revenue: 0, streak: 0 },
  };
}

function getCurrentStats() {
  const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
  const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
  const clients = JSON.parse(localStorage.getItem('pixeloffice_clients') ?? '[]');
  const invoices = JSON.parse(localStorage.getItem('pixeloffice_invoices') ?? '[]');
  
  const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
  const paidRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.total, 0);
  
  return {
    tasksCompleted: completedTasks,
    agentsHired: agents.length,
    clientsGained: clients.length,
    revenue: paidRevenue,
    streak: 1, // Simplified for now
  };
}

function checkAchievement(a: Omit<Achievement, 'unlocked' | 'unlockedAt'>, stats: ReturnType<typeof getCurrentStats>): boolean {
  switch (a.id) {
    case 'task_1': return stats.tasksCompleted >= 1;
    case 'task_10': return stats.tasksCompleted >= 10;
    case 'task_50': return stats.tasksCompleted >= 50;
    case 'task_100': return stats.tasksCompleted >= 100;
    case 'agent_1': return stats.agentsHired >= 1;
    case 'agent_5': return stats.agentsHired >= 5;
    case 'agent_10': return stats.agentsHired >= 10;
    case 'client_1': return stats.clientsGained >= 1;
    case 'client_5': return stats.clientsGained >= 5;
    case 'client_10': return stats.clientsGained >= 10;
    case 'revenue_1k': return stats.revenue >= 1000;
    case 'revenue_10k': return stats.revenue >= 10000;
    case 'revenue_50k': return stats.revenue >= 50000;
    case 'streak_7': return stats.streak >= 7;
    default: return false;
  }
}

function getLevelInfo(level: number) {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
}

export function GameMechanics({ onClose }: { onClose: () => void }) {
  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const [activeTab, setActiveTab] = useState<'level' | 'achievements' | 'stats'>('level');

  const currentLevel = getLevelInfo(gameState.level);
  const nextLevel = getLevelInfo(gameState.level + 1);
  const xpProgress = nextLevel 
    ? ((gameState.xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 
    : 100;

  const unlockedAchievements = gameState.achievements.filter(a => a.unlocked);
  const lockedAchievements = gameState.achievements.filter(a => !a.unlocked);

  const refreshStats = () => {
    const stats = getCurrentStats();
    const achievements = ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: checkAchievement(a, stats),
      unlockedAt: gameState.achievements.find(ua => ua.id === a.id)?.unlockedAt || 
                  (checkAchievement(a, stats) ? new Date().toLocaleString() : undefined),
    }));
    
    // Check for level up
    let newLevel = 1;
    for (const lvl of LEVELS) {
      if (gameState.xp >= lvl.minXP) newLevel = lvl.level;
    }
    
    const newTitle = getLevelInfo(newLevel).title;
    
    const updated = {
      ...gameState,
      level: newLevel,
      title: newTitle,
      achievements,
      stats,
    };
    
    setGameState(updated);
    localStorage.setItem(LS_GAME, JSON.stringify(updated));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 800, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🎮</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Company Game</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Level up your company!</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #223355' }}>
          {(['level', 'achievements', 'stats'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold',
              background: activeTab === tab ? '#112233' : 'transparent',
              color: activeTab === tab ? '#66ddff' : '#445566',
              border: 'none', borderBottom: activeTab === tab ? '3px solid #66ddff' : '3px solid transparent',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {tab === 'level' ? '⭐ Level' : tab === 'achievements' ? `🏆 Achievements (${unlockedAchievements.length})` : '📊 Stats'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          
          {activeTab === 'level' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Current Level Card */}
              <div style={{ background: '#0a0a18', border: `3px solid ${currentLevel.color}`, padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: 10 }}>{currentLevel.title.includes('Startup') ? '🚀' : currentLevel.title.includes('Growing') ? '🌱' : currentLevel.title.includes('Scale-up') ? '🏢' : '🦄'}</div>
                <div style={{ fontSize: '36px', color: currentLevel.color, fontWeight: 'bold', marginBottom: 8 }}>{currentLevel.title}</div>
                <div style={{ fontSize: '18px', color: '#667788' }}>Level {gameState.level}</div>
                
                {nextLevel && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '15px', color: '#8899aa' }}>XP Progress</span>
                      <span style={{ fontSize: '15px', color: '#ffdd44', fontWeight: 'bold' }}>{gameState.xp} / {nextLevel.minXP}</span>
                    </div>
                    <div style={{ height: 12, background: '#111133', border: '1px solid #223355' }}>
                      <div style={{ height: '100%', width: `${Math.min(xpProgress, 100)}%`, background: currentLevel.color, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: '14px', color: '#667788', marginTop: 6 }}>
                      {nextLevel.minXP - gameState.xp} XP to {nextLevel.title}
                    </div>
                  </div>
                )}
              </div>

              {/* Level Upgrades */}
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px' }}>
                <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold', marginBottom: 12 }}>🎁 Unlock at Level {gameState.level}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {currentLevel.perks.map((perk, idx) => (
                    <div key={idx} style={{ background: '#0d0d1e', border: '2px solid #00ff88', padding: '10px 16px', fontSize: '16px', color: '#00ff88', fontWeight: 'bold' }}>
                      ✨ {perk}
                    </div>
                  ))}
                </div>
              </div>

              {/* XP Calculator */}
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px' }}>
                <div style={{ fontSize: '20px', color: '#ffdd44', fontWeight: 'bold', marginBottom: 12 }}>⚡ XP Sources (How to Earn)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div style={{ background: '#0d0d1e', padding: '12px', textAlign: 'center', border: '2px solid #223355' }}>
                    <div style={{ fontSize: '28px' }}>✅</div>
                    <div style={{ color: '#aabbcc', fontSize: '15px', fontWeight: 'bold' }}>Task Complete</div>
                    <div style={{ color: '#ffdd44', fontSize: '20px', fontWeight: 'bold' }}>+50 XP</div>
                  </div>
                  <div style={{ background: '#0d0d1e', padding: '12px', textAlign: 'center', border: '2px solid #223355' }}>
                    <div style={{ fontSize: '28px' }}>👤</div>
                    <div style={{ color: '#aabbcc', fontSize: '15px', fontWeight: 'bold' }}>Hire Agent</div>
                    <div style={{ color: '#ffdd44', fontSize: '20px', fontWeight: 'bold' }}>+100 XP</div>
                  </div>
                  <div style={{ background: '#0d0d1e', padding: '12px', textAlign: 'center', border: '2px solid #223355' }}>
                    <div style={{ fontSize: '28px' }}>🤝</div>
                    <div style={{ color: '#aabbcc', fontSize: '15px', fontWeight: 'bold' }}>New Client</div>
                    <div style={{ color: '#ffdd44', fontSize: '20px', fontWeight: 'bold' }}>+150 XP</div>
                  </div>
                  <div style={{ background: '#0d0d1e', padding: '12px', textAlign: 'center', border: '2px solid #223355' }}>
                    <div style={{ fontSize: '28px' }}>💰</div>
                    <div style={{ color: '#aabbcc', fontSize: '15px', fontWeight: 'bold' }}>$1K Revenue</div>
                    <div style={{ color: '#ffdd44', fontSize: '20px', fontWeight: 'bold' }}>+200 XP</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {unlockedAchievements.length > 0 && (
                <div>
                  <div style={{ fontSize: '18px', color: '#00ff88', fontWeight: 'bold', marginBottom: 10 }}>🏆 Unlocked ({unlockedAchievements.length})</div>
                  {unlockedAchievements.map(a => (
                    <div key={a.id} style={{ background: '#0a1a0a', border: '2px solid #00ff88', padding: '14px 16px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '32px' }}>{a.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '18px', color: '#00ff88', fontWeight: 'bold' }}>{a.title}</div>
                          <div style={{ fontSize: '15px', color: '#667788' }}>{a.description}</div>
                        </div>
                        <span style={{ fontSize: '14px', color: '#445566' }}>{a.unlockedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div>
                <div style={{ fontSize: '20px', color: '#667788', fontWeight: 'bold', marginBottom: 10 }}>🔒 Locked Achievements ({lockedAchievements.length})</div>
                {lockedAchievements.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#00ff88', fontSize: '16px' }}>
                    🎉 All achievements unlocked!
                  </div>
                ) : (
                  lockedAchievements.map(a => (
                    <div key={a.id} style={{ background: '#0a0a18', border: '2px solid #334466', padding: '14px 16px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '32px', filter: 'grayscale(100%)', opacity: 0.5 }}>{a.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '18px', color: '#667788', fontWeight: 'bold' }}>{a.title}</div>
                          <div style={{ fontSize: '15px', color: '#445566' }}>{a.description}</div>
                        </div>
                        <div style={{ background: '#1a1a2a', padding: '4px 10px', fontSize: '13px', color: '#445566' }}>🔒</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button onClick={refreshStats} style={{ padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>
                🔄 Refresh Stats from Data
              </button>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px' }}>✅</div>
                  <div style={{ fontSize: '28px', color: '#ffdd44', fontWeight: 'bold' }}>{gameState.stats.tasksCompleted}</div>
                  <div style={{ fontSize: '15px', color: '#667788' }}>Tasks Completed</div>
                </div>
                <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px' }}>👥</div>
                  <div style={{ fontSize: '28px', color: '#66ddff', fontWeight: 'bold' }}>{gameState.stats.agentsHired}</div>
                  <div style={{ fontSize: '15px', color: '#667788' }}>Agents Hired</div>
                </div>
                <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px' }}>🤝</div>
                  <div style={{ fontSize: '28px', color: '#ff8844', fontWeight: 'bold' }}>{gameState.stats.clientsGained}</div>
                  <div style={{ fontSize: '15px', color: '#667788' }}>Clients</div>
                </div>
                <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px' }}>💰</div>
                  <div style={{ fontSize: '28px', color: '#00ff88', fontWeight: 'bold' }}>${gameState.stats.revenue.toLocaleString()}</div>
                  <div style={{ fontSize: '15px', color: '#667788' }}>Revenue</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
