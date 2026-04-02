import { useState } from 'react';

interface HiredAgent {
  id: string; name: string; role: string; dept: string; status: string;
  level: number; performance: number;
  aiConfig?: { provider: string; model: string; connected: boolean };
}

interface Props {
  agents: HiredAgent[];
}

// Role hierarchy — kaun kiske neeche hai
const HIERARCHY: Record<string, string[]> = {
  'CEO':       ['CTO', 'Manager', 'HR'],
  'CTO':       ['Developer', 'DevOps', 'QA'],
  'Manager':   ['Designer', 'Analyst', 'Sales', 'Marketing'],
  'HR':        ['Intern'],
  'Developer': [], 'DevOps': [], 'QA': [],
  'Designer':  [], 'Analyst': [], 'Sales': [], 'Marketing': [], 'Intern': [],
};

const ROLE_COLOR: Record<string, string> = {
  CEO: '#ffd700', CTO: '#00cfff', Manager: '#cc88ff', HR: '#ff88cc',
  Developer: '#00ff88', DevOps: '#44ffcc', QA: '#aaff00',
  Designer: '#ff88cc', Analyst: '#ffaa44', Sales: '#ff6688',
  Marketing: '#ff88ff', Intern: '#888899',
};

const STATUS_COLOR: Record<string, string> = {
  'Working': '#00ff88', 'In Meeting': '#ffaa44', 'On Break': '#6677aa', 'Idle': '#445566',
};

function OrgNode({ role, agents, depth }: { role: string; agents: HiredAgent[]; depth: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const roleAgents = agents.filter(a => a.role === role);
  const children = HIERARCHY[role] ?? [];
  const hasChildren = children.some(c => agents.some(a => a.role === c) || (HIERARCHY[c]?.length ?? 0) > 0);
  const color = ROLE_COLOR[role] ?? '#aaaaff';
  const isCEO = role === 'CEO';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: isCEO ? 220 : 180 }}>
      {/* Node box */}
      {roleAgents.length > 0 ? (
        roleAgents.map(agent => (
          <div key={agent.id} onClick={() => hasChildren && setCollapsed(v => !v)}
            style={{
              background: '#0d0d1e', border: `3px solid ${color}`,
              padding: isCEO ? '16px 24px' : '12px 18px',
              marginBottom: 6, cursor: hasChildren ? 'pointer' : 'default',
              boxShadow: isCEO ? `0 0 16px ${color}88` : `0 0 6px ${color}44`,
              minWidth: isCEO ? 200 : 160, textAlign: 'center',
              position: 'relative',
            }}>
            {isCEO && <div style={{ fontSize: '28px', marginBottom: 4 }}>👑</div>}
            <div style={{ fontSize: isCEO ? '22px' : '18px', color, fontWeight: 'bold' }}>{agent.name}</div>
            <div style={{ fontSize: isCEO ? '17px' : '15px', color: '#aabbcc', fontWeight: 'bold', marginTop: 3 }}>{agent.role}</div>
            <div style={{ fontSize: '14px', marginTop: 6, display: 'inline-block', padding: '2px 10px', background: (STATUS_COLOR[agent.status] ?? '#445566') + '33', border: `1px solid ${STATUS_COLOR[agent.status] ?? '#445566'}`, color: STATUS_COLOR[agent.status] ?? '#445566', fontWeight: 'bold' }}>
              {agent.status}
            </div>
            {agent.aiConfig && (
              <div style={{ fontSize: '13px', color: agent.aiConfig.connected ? '#00ff88' : '#ff4444', marginTop: 6 }}>
                🤖 {agent.aiConfig.provider}
              </div>
            )}
            {hasChildren && (
              <div style={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', fontSize: '16px', color: '#445566' }}>
                {collapsed ? '▼' : '▲'}
              </div>
            )}
          </div>
        ))
      ) : (
        // Empty role placeholder (dashed)
        <div style={{
          background: '#080812', border: `2px dashed ${color}44`,
          padding: '10px 16px', minWidth: 160, textAlign: 'center', marginBottom: 6,
        }}>
          <div style={{ fontSize: '15px', color: color + '66' }}>{role}</div>
          <div style={{ fontSize: '13px', color: '#334455' }}>Vacant</div>
        </div>
      )}

      {/* Children */}
      {!collapsed && children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Vertical line down */}
          <div style={{ width: 2, height: 24, background: '#334455' }} />
          {/* Horizontal bar */}
          {children.filter(c => agents.some(a => a.role === c) || true).length > 1 && (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 2, background: '#334455' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', paddingTop: 2 }}>
            {children.map(child => (
              <div key={child} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 2, height: 24, background: '#334455' }} />
                <OrgNode role={child} agents={agents} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgChart({ agents }: Props) {
  const hasCEO = agents.some(a => a.role === 'CEO');

  // Find roles not in hierarchy (unknown roles)
  const allKnownRoles = Object.keys(HIERARCHY);
  const unknownAgents = agents.filter(a => !allKnownRoles.includes(a.role));

  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'auto', padding: 20 }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(ROLE_COLOR).slice(0, 6).map(([role, color]) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, background: color, border: '2px solid ' + color }} />
            <span style={{ fontSize: '15px', color: '#aabbcc' }}>{role}</span>
          </div>
        ))}
        <div style={{ fontSize: '15px', color: '#445566' }}>· Click node to expand/collapse</div>
      </div>

      {agents.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#445566', fontSize: '18px', paddingTop: 60 }}>
          <div style={{ fontSize: '48px', marginBottom: 16 }}>🗂️</div>
          Hire agents to see the org chart.<br />
          <span style={{ fontSize: '16px', color: '#334455' }}>Start with a CEO to set the hierarchy.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 800 }}>
          {/* Company name bar */}
          <div style={{ marginBottom: 20, padding: '10px 40px', background: '#0d0d1e', border: '2px solid #334466', fontSize: '20px', color: '#66ddff', fontWeight: 'bold', letterSpacing: 3 }}>
            🏢 YOUR COMPANY
          </div>

          {/* Top-level: CEO first, then other top-level roles without parents */}
          {hasCEO ? (
            <OrgNode role="CEO" agents={agents} depth={0} />
          ) : (
            <>
              <div style={{ fontSize: '17px', color: '#ff8844', marginBottom: 16, fontWeight: 'bold' }}>
                ⚠ No CEO hired — hire a CEO to complete the hierarchy
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['CTO', 'Manager', 'HR'].filter(r => agents.some(a => a.role === r)).map(r => (
                  <OrgNode key={r} role={r} agents={agents} depth={0} />
                ))}
              </div>
              {/* Remaining agents */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
                {agents.filter(a => !['CEO','CTO','Manager','HR'].includes(a.role)).map(a => (
                  <OrgNode key={a.id} role={a.role} agents={[a]} depth={1} />
                ))}
              </div>
            </>
          )}

          {/* Unknown role agents */}
          {unknownAgents.length > 0 && (
            <div style={{ marginTop: 30, borderTop: '2px dashed #334455', paddingTop: 20, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: '#667788', marginBottom: 12 }}>Other Team Members</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {unknownAgents.map(a => (
                  <OrgNode key={a.id} role={a.role} agents={[a]} depth={2} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
