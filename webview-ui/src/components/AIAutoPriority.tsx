import { useState } from 'react';

interface AIPrioritizedTask {
  id: string;
  title: string;
  type: string;
  agentId: string;
  agentName: string;
  status: string;
  priority: string;
  deadline?: string;
  createdAt: string;
  aiPriority?: number;
  aiReason?: string;
}

interface Props {
  onClose: () => void;
}

function getCEOConfig() {
  const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
  const ceo = agents.find((a: any) => a.name?.toLowerCase().includes('ceo') || a.role?.toLowerCase().includes('ceo'));
  return ceo?.aiConfig ?? null;
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const cfg = getCEOConfig();
  if (!cfg?.baseUrl || !cfg?.apiKey) {
    throw new Error('AI not configured. Please set up AI Brain in Settings.');
  }
  
  const res = await fetch((cfg.baseUrl ?? '').replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey ?? ''}` },
    body: JSON.stringify({ 
      model: cfg.model, 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 
      max_tokens: 800 
    }),
  });
  
  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export function AIAutoPriority({ onClose }: Props) {
  const [prioritized, setPrioritized] = useState<AIPrioritizedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [autoPriority, setAutoPriority] = useState(true);

  const analyzeAndPrioritize = async () => {
    setLoading(true);
    setError('');
    setApplied(false);

    try {
      // Gather tasks
      const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
      const pendingTasks = tasks.filter((t: any) => t.status === 'todo' || t.status === 'in-progress');

      const prompt = `Analyze these tasks and assign priority scores (1=highest, 5=lowest). Return ONLY a JSON array.

**Tasks:**
${JSON.stringify(pendingTasks.map((t: any) => ({
  id: t.id,
  title: t.title,
  type: t.type,
  status: t.status,
  agentName: t.agentName,
  deadline: t.deadline || 'No deadline',
  createdAt: t.createdAt
})), null, 2)}

**Rules for Priority:**
- Priority 1 (🔴): Urgent deadlines, high-impact tasks, blocked tasks
- Priority 2 (🟠): Important but flexible deadline
- Priority 3 (🟡): Normal priority, can wait 1-2 days
- Priority 4 (🟢): Low priority, nice to have
- Priority 5 (🔵): Can be deprioritized

**Output Format (JSON only, no markdown):**
[
  {
    "id": "task_id",
    "priority": 1/2/3/4/5,
    "reason": "Why this priority (1 sentence)"
  }
]`;

      const response = await callAI(
        'You are an expert project manager. Analyze tasks and assign smart priorities based on urgency, importance, and deadlines. Return ONLY valid JSON.',
        prompt
      );

      const cleaned = response.replace(/```json|```/g, '').trim();
      const priorityData = JSON.parse(cleaned);

      // Merge with tasks
      const prioritizedTasks: AIPrioritizedTask[] = pendingTasks.map((t: any) => {
        const pData = priorityData.find((p: any) => p.id === t.id);
        return {
          ...t,
          aiPriority: pData?.priority ?? 3,
          aiReason: pData?.reason ?? 'Medium priority',
        };
      }).sort((a: any, b: any) => (a.aiPriority ?? 3) - (b.aiPriority ?? 3));

      setPrioritized(prioritizedTasks);
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  const applyPriorities = () => {
    const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
    
    const priorityLabels: Record<number, string> = {
      1: 'urgent',
      2: 'high',
      3: 'medium',
      4: 'low',
      5: 'backlog'
    };

    const updated = tasks.map((t: any) => {
      const pTask = prioritized.find((p: any) => p.id === t.id);
      if (pTask) {
        return { 
          ...t, 
          priority: priorityLabels[pTask.aiPriority ?? 3] || 'medium',
          aiPriority: pTask.aiPriority 
        };
      }
      return t;
    });

    localStorage.setItem('pixeloffice_tasks', JSON.stringify(updated));
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const priorityColor = (p?: number) => 
    p === 1 ? '#ff4444' : p === 2 ? '#ff8844' : p === 3 ? '#ffdd44' : p === 4 ? '#00ff88' : '#66ddff';

  const priorityLabel = (p?: number) => 
    p === 1 ? '🔴 URGENT' : p === 2 ? '🟠 HIGH' : p === 3 ? '🟡 MEDIUM' : p === 4 ? '🟢 LOW' : '🔵 BACKLOG';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 850, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🎯</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Auto-Prioritization</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>AI automatically prioritizes your tasks</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Controls */}
        <div style={{ padding: '16px 20px', borderBottom: '2px solid #223355', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={analyzeAndPrioritize}
            disabled={loading}
            style={{
              padding: '12px 28px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
              background: loading ? '#1a1a00' : '#0a1a0a',
              color: loading ? '#ffdd44' : '#00ff88',
              border: '2px solid #00ff88',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Analyzing...' : '🎯 Analyze & Prioritize'}
          </button>
          
          {prioritized.length > 0 && (
            <button
              onClick={applyPriorities}
              disabled={applied}
              style={{
                padding: '12px 28px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                background: applied ? '#0a1a0a' : '#1a1a00',
                color: applied ? '#00ff88' : '#ffdd44',
                border: '2px solid #ffdd44',
                cursor: applied ? 'not-allowed' : 'pointer',
              }}
            >
              {applied ? '✅ Applied!' : '💾 Apply Priorities'}
            </button>
          )}
          
          <div style={{ flex: 1 }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '15px', color: '#667788' }}>Auto-sort:</span>
            <button
              onClick={() => setAutoPriority(v => !v)}
              style={{
                padding: '6px 16px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                background: autoPriority ? '#0a1a0a' : '#1a0606',
                color: autoPriority ? '#00ff88' : '#ff4444',
                border: `2px solid ${autoPriority ? '#00ff88' : '#ff4444'}`,
                cursor: 'pointer',
              }}
            >
              {autoPriority ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Legend */}
        {prioritized.length > 0 && (
          <div style={{ padding: '12px 20px', borderBottom: '2px solid #223355', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: '#667788' }}>Priority Legend:</span>
            <span style={{ fontSize: '14px', color: '#ff4444' }}>🔴 1 = Urgent</span>
            <span style={{ fontSize: '14px', color: '#ff8844' }}>🟠 2 = High</span>
            <span style={{ fontSize: '14px', color: '#ffdd44' }}>🟡 3 = Medium</span>
            <span style={{ fontSize: '14px', color: '#00ff88' }}>🟢 4 = Low</span>
            <span style={{ fontSize: '14px', color: '#66ddff' }}>🔵 5 = Backlog</span>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>🤖</div>
              <div style={{ color: '#ffdd44', fontSize: '18px', marginBottom: 8 }}>AI is analyzing task priorities...</div>
              <div style={{ color: '#667788', fontSize: '15px' }}>Considering deadlines, importance, and impact</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', padding: 40, background: '#1a0606', border: '2px solid #ff4444' }}>
              <div style={{ fontSize: '32px', marginBottom: 16 }}>❌</div>
              <div style={{ color: '#ff4444', fontSize: '18px', marginBottom: 12 }}>{error}</div>
              <div style={{ color: '#667788', fontSize: '15px' }}>Please configure AI Brain in Settings → AI Brain tab</div>
            </div>
          )}

          {!loading && prioritized.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: 60, color: '#445566' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>🎯</div>
              <div style={{ fontSize: '20px', marginBottom: 8 }}>No analysis yet</div>
              <div style={{ fontSize: '16px', marginBottom: 16 }}>Click "Analyze & Prioritize" to let AI score your tasks</div>
              <div style={{ fontSize: '14px', color: '#556677' }}>
                AI will consider deadlines, importance, and business impact.
              </div>
            </div>
          )}

          {prioritized.map((task) => (
            <div key={task.id} style={{
              background: '#0a0a18', 
              border: `2px solid ${priorityColor(task.aiPriority)}`,
              padding: '14px 16px', marginBottom: 10,
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <div style={{
                width: 36, height: 36, 
                background: priorityColor(task.aiPriority) + '33',
                border: `2px solid ${priorityColor(task.aiPriority)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: 'bold', color: priorityColor(task.aiPriority),
                flexShrink: 0,
              }}>
                {task.aiPriority}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: '17px', color: '#aaddff', fontWeight: 'bold' }}>{task.title}</span>
                  <span style={{ fontSize: '12px', background: '#112233', padding: '2px 8px', color: '#66ddff' }}>{task.type}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#667788', marginBottom: 6 }}>
                  👤 {task.agentName || 'Unassigned'}
                </div>
                <div style={{ fontSize: '14px', color: priorityColor(task.aiPriority), fontStyle: 'italic' }}>
                  💬 {task.aiReason}
                </div>
              </div>
              
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: priorityColor(task.aiPriority), marginBottom: 4 }}>
                  {priorityLabel(task.aiPriority)}
                </div>
                {task.deadline && (
                  <div style={{ fontSize: '13px', color: '#667788' }}>
                    📅 {task.deadline}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '2px solid #223355', background: '#0a0a18' }}>
          <div style={{ fontSize: '14px', color: '#445566' }}>
            💡 AI analyzes urgency, deadlines, and business impact to suggest optimal task order.
          </div>
        </div>
      </div>
    </div>
  );
}
