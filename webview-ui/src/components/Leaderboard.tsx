import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  title: string;
  xp: number;
  tasksCompleted: number;
  revenue: number;
  agents: number;
  rank?: number;
}

interface CompanyData {
  id: string;
  name: string;
  level: number;
  xp: number;
  tasksCompleted: number;
  revenue: number;
  agents: number;
  lastUpdated: string;
}

const LS_COMPANY_DATA = 'pixeloffice_company_data';

// Mock global leaderboard data (in real app, this would come from server)
const MOCK_LEADERBOARD: Omit<LeaderboardEntry, 'rank'>[] = [
  { id: 'sys_1', name: 'TechCorp Global', level: 4, title: '🦄 Unicorn', xp: 8500, tasksCompleted: 245, revenue: 125000, agents: 18 },
  { id: 'sys_2', name: 'StartupXYZ', level: 4, title: '🦄 Unicorn', xp: 7200, tasksCompleted: 198, revenue: 98000, agents: 15 },
  { id: 'sys_3', name: 'DevMasters', level: 3, title: '🏢 Scale-up', xp: 4200, tasksCompleted: 156, revenue: 67000, agents: 12 },
  { id: 'sys_4', name: 'CodeFactory', level: 3, title: '🏢 Scale-up', xp: 3800, tasksCompleted: 142, revenue: 55000, agents: 10 },
  { id: 'sys_5', name: 'PixelSoft', level: 3, title: '🏢 Scale-up', xp: 2900, tasksCompleted: 118, revenue: 42000, agents: 9 },
  { id: 'sys_6', name: 'CloudNine', level: 2, title: '🌱 Growing', xp: 1800, tasksCompleted: 89, revenue: 28000, agents: 7 },
  { id: 'sys_7', name: 'DataFlow Inc', level: 2, title: '🌱 Growing', xp: 1200, tasksCompleted: 67, revenue: 19000, agents: 5 },
  { id: 'sys_8', name: 'ByteWorks', level: 2, title: '🌱 Growing', xp: 950, tasksCompleted: 52, revenue: 14000, agents: 4 },
  { id: 'sys_9', name: 'QuickDevs', level: 1, title: '🚀 Startup', xp: 450, tasksCompleted: 28, revenue: 6500, agents: 3 },
  { id: 'sys_10', name: 'NewCo', level: 1, title: '🚀 Startup', xp: 200, tasksCompleted: 15, revenue: 3200, agents: 2 },
];

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'global' | 'xp' | 'tasks' | 'revenue' | 'agents'>('global');
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load user's company data
    try {
      const stored = localStorage.getItem('pixeloffice_gamestate');
      if (stored) {
        const game = JSON.parse(stored);
        const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
        const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
        const invoices = JSON.parse(localStorage.getItem('pixeloffice_invoices') ?? '[]');
        
        const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
        const paidRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.total, 0);
        
        const myData: CompanyData = {
          id: 'my_company',
          name: 'My Company',
          level: game.level || 1,
          xp: game.xp || 0,
          tasksCompleted: completedTasks,
          revenue: paidRevenue,
          agents: agents.length,
          lastUpdated: new Date().toISOString(),
        };
        
        setCompanyData(myData);
        localStorage.setItem(LS_COMPANY_DATA, JSON.stringify(myData));
      }
    } catch {}

    // Generate leaderboard with user data
    const fullLeaderboard = generateLeaderboard();
    setLeaderboard(fullLeaderboard);
    
    // Find user's rank
    const rank = fullLeaderboard.findIndex(e => e.id === 'my_company') + 1;
    setUserRank(rank > 0 ? rank : null);
  };

  const generateLeaderboard = (): LeaderboardEntry[] => {
    // Get user's data
    let userXP = 0, userTasks = 0, userRevenue = 0, userAgents = 0, userLevel = 1, userTitle = '🚀 Startup';
    try {
      const game = JSON.parse(localStorage.getItem('pixeloffice_gamestate') ?? '{}');
      userXP = game.xp || 0;
      userLevel = game.level || 1;
      userTitle = game.title || '🚀 Startup';
      
      const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
      userTasks = tasks.filter((t: any) => t.status === 'done').length;
      
      const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
      userAgents = agents.length;
      
      const invoices = JSON.parse(localStorage.getItem('pixeloffice_invoices') ?? '[]');
      userRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.total, 0);
    } catch {}

    // Create combined leaderboard
    const allEntries = [
      ...MOCK_LEADERBOARD,
      {
        id: 'my_company',
        name: '🏆 My Company',
        level: userLevel,
        title: userTitle,
        xp: userXP,
        tasksCompleted: userTasks,
        revenue: userRevenue,
        agents: userAgents,
      },
    ];

    // Sort based on active tab
    let sorted: typeof allEntries;
    switch (activeTab) {
      case 'xp':
        sorted = [...allEntries].sort((a, b) => b.xp - a.xp);
        break;
      case 'tasks':
        sorted = [...allEntries].sort((a, b) => b.tasksCompleted - a.tasksCompleted);
        break;
      case 'revenue':
        sorted = [...allEntries].sort((a, b) => b.revenue - a.revenue);
        break;
      case 'agents':
        sorted = [...allEntries].sort((a, b) => b.agents - a.agents);
        break;
      default:
        sorted = [...allEntries].sort((a, b) => b.xp - a.xp);
    }

    // Add ranks
    return sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: '#ffdd44' };
    if (rank === 2) return { emoji: '🥈', color: '#cccccc' };
    if (rank === 3) return { emoji: '🥉', color: '#cd7f32' };
    return { emoji: `#${rank}`, color: '#667788' };
  };

  const getLevelColor = (level: number) => {
    const colors = { 1: '#88ff88', 2: '#88ddff', 3: '#ffdd44', 4: '#ff88ff' };
    return colors[level as keyof typeof colors] || '#88ff88';
  };

  const sortedByCategory = () => {
    return [...leaderboard].sort((a, b) => {
      switch (activeTab) {
        case 'xp': return b.xp - a.xp;
        case 'tasks': return b.tasksCompleted - a.tasksCompleted;
        case 'revenue': return b.revenue - a.revenue;
        case 'agents': return b.agents - a.agents;
        default: return b.xp - a.xp;
      }
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 850, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🏆</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Global Leaderboard</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Compete with companies worldwide!</div>
          </div>
          {userRank && (
            <div style={{
              background: '#1a1a0a', border: '2px solid #ffdd44', padding: '10px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '14px', color: '#667788' }}>Your Rank</div>
              <div style={{ fontSize: '28px', color: '#ffdd44', fontWeight: 'bold' }}>#{userRank}</div>
            </div>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #223355' }}>
          {([
            { id: 'global', label: '🌐 Global (XP)' },
            { id: 'xp', label: '⭐ XP Rank' },
            { id: 'tasks', label: '✅ Tasks' },
            { id: 'revenue', label: '💰 Revenue' },
            { id: 'agents', label: '👥 Agents' },
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
          
          {/* Top 3 Special Display */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {sortedByCategory().slice(0, 3).map((entry, idx) => {
              const rankInfo = getRankBadge(idx + 1);
              return (
                <div key={entry.id} style={{
                  background: idx === 0 ? '#1a1a0a' : '#0a0a18',
                  border: `3px solid ${rankInfo.color}`,
                  padding: '16px', textAlign: 'center',
                  transform: idx === 0 ? 'scale(1.05)' : 'none',
                }}>
                  <div style={{ fontSize: '36px', marginBottom: 8 }}>{rankInfo.emoji}</div>
                  <div style={{ fontSize: '18px', color: entry.id === 'my_company' ? '#00ff88' : '#fff', fontWeight: 'bold', marginBottom: 4 }}>
                    {entry.name}
                  </div>
                  <div style={{ fontSize: '14px', color: getLevelColor(entry.level), marginBottom: 8 }}>
                    {entry.title}
                  </div>
                  <div style={{ fontSize: '20px', color: '#ffdd44', fontWeight: 'bold' }}>
                    {activeTab === 'xp' ? `${entry.xp.toLocaleString()} XP` :
                     activeTab === 'tasks' ? `${entry.tasksCompleted} tasks` :
                     activeTab === 'revenue' ? `$${entry.revenue.toLocaleString()}` :
                     activeTab === 'agents' ? `${entry.agents} agents` :
                     `${entry.xp.toLocaleString()} XP`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Rankings Table */}
          <div style={{ background: '#0a0a18', border: '2px solid #334466' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 80px 100px 100px',
              padding: '12px 16px', background: '#0d0d1e', borderBottom: '2px solid #334466',
              fontSize: '15px', fontWeight: 'bold',
            }}>
              <div style={{ color: '#ffdd44' }}>🏆 Rank</div>
              <div style={{ color: '#66ddff' }}>🏢 Company</div>
              <div style={{ color: '#ff88ff' }}>⭐ Level</div>
              <div style={{ color: '#00ff88', textAlign: 'right' }}>
                {activeTab === 'xp' ? '⚡ XP' : activeTab === 'tasks' ? '✅ Tasks' : activeTab === 'revenue' ? '💰 Revenue' : activeTab === 'agents' ? '👥 Agents' : '⚡ XP'}
              </div>
              <div style={{ color: '#ff8844', textAlign: 'right' }}>📊 Status</div>
            </div>

            {/* Table Rows */}
            {sortedByCategory().map((entry) => {
              const rankInfo = getRankBadge(entry.rank || 0);
              const isUser = entry.id === 'my_company';
              
              return (
                <div key={entry.id} style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr 80px 100px 100px',
                  padding: '14px 16px', borderBottom: '1px solid #1a1a2a',
                  background: isUser ? '#0a1a0a' : 'transparent',
                  borderLeft: isUser ? '4px solid #00ff88' : '4px solid transparent',
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: rankInfo.color }}>
                    {entry.rank && entry.rank <= 3 ? getRankBadge(entry.rank).emoji : `#${entry.rank}`}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', color: isUser ? '#00ff88' : '#fff', fontWeight: 'bold' }}>
                      {entry.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#445566' }}>
                      Lv.{entry.level}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      background: getLevelColor(entry.level),
                      color: '#000',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      {entry.level}
                    </span>
                  </div>
                  <div style={{ fontSize: '16px', color: '#ffdd44', fontWeight: 'bold', textAlign: 'right' }}>
                    {activeTab === 'xp' ? entry.xp.toLocaleString() :
                     activeTab === 'tasks' ? entry.tasksCompleted :
                     activeTab === 'revenue' ? `$${(entry.revenue / 1000).toFixed(0)}K` :
                     activeTab === 'agents' ? entry.agents :
                     entry.xp.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '14px', color: '#667788', textAlign: 'right' }}>
                    {entry.title}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div style={{ marginTop: 16, padding: '12px', background: '#0a0a18', border: '1px solid #334466' }}>
            <div style={{ fontSize: '14px', color: '#667788' }}>
              💡 <strong style={{ color: '#66ddff' }}>Tips to rank higher:</strong>
              <ul style={{ margin: '8px 0 0 20px', padding: 0, color: '#556677' }}>
                <li>Complete tasks to earn XP (+50 per task)</li>
                <li>Hire agents to grow your team (+100 XP)</li>
                <li>Gain clients for more revenue (+150 XP)</li>
                <li>Get paid invoices for revenue bonus (+200 XP per $1K)</li>
              </ul>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ background: '#0a0a18', borderTop: '2px solid #334466', padding: '12px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#445566' }}>
            🕐 Last updated: {companyData ? new Date(companyData.lastUpdated).toLocaleString() : 'Just now'}
            {' · '}
            <button onClick={loadData} style={{
              background: 'transparent', border: 'none', color: '#66ddff', cursor: 'pointer', fontSize: '14px',
            }}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
