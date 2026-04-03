import { useState } from 'react';
import { loadAgentMemory, loadAgentSkills } from './CompanyDashboard.js';
import type { AgentMemory, AgentSkills } from './CompanyDashboard.js';

interface Props {
  agentId: string;
  agentName: string;
  agentRole: string;
  onClose: () => void;
}

const SKILL_COLORS: Record<string, string> = {
  'Code': '#00ff88', 'Research': '#66ddff', 'Design': '#ff88cc',
  'Draft': '#ffdd44', 'Analysis': '#cc88ff', 'Sales Script': '#ff8844', 'Review': '#44ffcc',
};


export function AgentMemoryViewer({ agentId, agentName, agentRole, onClose }: Props) {
  const [tab, setTab] = useState<'skills' | 'memory'>('skills');
  const [preview, setPreview] = useState<string | null>(null);

  const mem: AgentMemory | null = loadAgentMemory(agentId);
  const skills: AgentSkills = loadAgentSkills(agentId);
  const totalXP = Object.values(skills.xp).reduce((a, b) => a + b, 0);
  const xpToNext = 5 - (totalXP % 5);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 620, maxHeight: '85vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🧠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>{agentName}</div>
            <div style={{ fontSize: '17px', color: '#8899aa', fontWeight: 'bold' }}>{agentRole} · ⚡ LVL {skills.level} · {totalXP} XP total</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer', fontFamily: 'monospace' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #223355' }}>
          {(['skills', 'memory'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold',
              background: tab === t ? '#112233' : 'transparent',
              color: tab === t ? '#66ddff' : '#445566',
              border: 'none', borderBottom: tab === t ? '3px solid #66ddff' : '3px solid transparent',
              cursor: 'pointer',
            }}>
              {t === 'skills' ? '🎯 Skills & XP' : '🧠 Memory Log'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {tab === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Level Progress */}
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: '22px', color: '#ffee55', fontWeight: 'bold' }}>⚡ LEVEL {skills.level}</span>
                  <span style={{ fontSize: '18px', color: '#aabbcc', fontWeight: 'bold' }}>{xpToNext} XP to next level</span>
                </div>
                <div style={{ height: 18, background: '#111133', border: '2px solid #223355' }}>
                  <div style={{ height: '100%', width: `${((totalXP % 5) / 5) * 100}%`, background: 'linear-gradient(90deg, #ffee55, #ffaa00)', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: '16px', color: '#667788', marginTop: 6 }}>Total XP: {totalXP} · Tasks done: {mem?.totalTasks ?? 0}</div>
              </div>

              {/* Skill Bars */}
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: 16 }}>
                <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold', marginBottom: 14 }}>📊 Skill Breakdown</div>
                {Object.keys(SKILL_COLORS).map(skill => {
                  const xp = skills.xp[skill] ?? 0;
                  const maxXP = Math.max(...Object.values(skills.xp), 1);
                  const color = SKILL_COLORS[skill];
                  return (
                    <div key={skill} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '18px', color, fontWeight: 'bold' }}>{skill}</span>
                        <span style={{ fontSize: '18px', color: '#ffee55', fontWeight: 'bold' }}>{xp} XP</span>
                      </div>
                      <div style={{ height: 14, background: '#111133', border: `1px solid ${color}44` }}>
                        <div style={{ height: '100%', width: `${(xp / maxXP) * 100}%`, background: color, opacity: xp === 0 ? 0.15 : 1 }} />
                      </div>
                    </div>
                  );
                })}
                {Object.values(skills.xp).every(v => v === 0) && (
                  <div style={{ color: '#445566', fontSize: '17px', padding: '20px 0', textAlign: 'center' }}>No tasks completed yet. Assign tasks to grow skills!</div>
                )}
              </div>

              {/* Badges */}
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: 16 }}>
                <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold', marginBottom: 14 }}>🏅 Badges Earned</div>
                {skills.badges.length === 0 ? (
                  <div style={{ color: '#445566', fontSize: '17px' }}>No badges yet. Complete more tasks to unlock!</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {skills.badges.map(b => (
                      <div key={b} style={{ padding: '8px 16px', background: '#1a1a00', border: '2px solid #554400', color: '#ffdd44', fontSize: '18px', fontWeight: 'bold' }}>{b}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'memory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '18px', color: '#8899aa', marginBottom: 4 }}>
                🧠 {mem?.entries.length ?? 0} / 20 memory slots used · Last active: {mem?.lastActive ?? 'Never'}
              </div>
              {(!mem || mem.entries.length === 0) && (
                <div style={{ color: '#445566', fontSize: '17px', padding: '30px 0', textAlign: 'center' }}>No memories yet. Complete AI tasks to build memory!</div>
              )}
              {mem?.entries.map((e, i) => (
                <div key={i} style={{ background: '#0a0a18', border: '2px solid #223355', padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => setPreview(preview === String(i) ? null : String(i))}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '16px', color: '#ffcc00', fontWeight: 'bold', background: '#1a1a00', padding: '2px 10px', border: '1px solid #554400' }}>[{e.taskType}]</span>
                    <span style={{ fontSize: '15px', color: '#556677' }}>{e.date}</span>
                  </div>
                  <div style={{ fontSize: '19px', color: '#aaddff', fontWeight: 'bold', marginBottom: 4 }}>{e.taskTitle}</div>
                  <div style={{ fontSize: '15px', color: '#667788' }}>{e.output.slice(0, 80)}...</div>
                  {preview === String(i) && (
                    <div style={{ marginTop: 10, padding: 12, background: '#080f08', border: '2px solid #1a5a2a', fontSize: '15px', color: '#aaffaa', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {e.output}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
