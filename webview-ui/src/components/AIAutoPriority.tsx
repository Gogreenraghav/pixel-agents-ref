import { useState, useEffect } from 'react';

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

function saveCEOConfig(config: any) {
  const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
  const idx = agents.findIndex((a: any) => a.name?.toLowerCase().includes('ceo') || a.role?.toLowerCase().includes('ceo'));
  if (idx >= 0) {
    agents[idx].aiConfig = config;
    localStorage.setItem('pixeloffice_agents', JSON.stringify(agents));
  }
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const cfg = getCEOConfig();
  if (!cfg?.baseUrl || !cfg?.apiKey) {
    throw new Error('AI_NOT_CONFIGURED');
  }
  
  let url = (cfg.baseUrl ?? '').replace(/\/$/, '');
  
  if (cfg.provider === 'gemini') {
    const modelName = cfg.model || 'gemini-pro';
    const apiUrl = `${url}/v1beta/models/${modelName}:generateContent?key=${cfg.apiKey}`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { maxOutputTokens: 800 }
      }),
    });
    if (!res.ok) throw new Error(`AI API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } else if (cfg.provider === 'ollama') {
    const res = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model || 'llama3.2',
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false
      }),
    });
    if (!res.ok) throw new Error(`AI API error: ${res.status}`);
    const data = await res.json();
    return data.response ?? '';
  } else {
    const res = await fetch(`${url}/chat/completions`, {
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
}

export function AIAutoPriority({ onClose }: Props) {
  const [prioritized, setPrioritized] = useState<AIPrioritizedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  // autoPriority removed
  const [showConfig, setShowConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    model: 'gemini-2.0-flash',
  });

  const PROVIDERS = [
    { id: 'gemini', name: 'Gemini (Free!)', icon: '✨' },
    { id: 'openai', name: 'OpenAI', icon: '🤖' },
    { id: 'anthropic', name: 'Claude', icon: '🧠' },
    { id: 'groq', name: 'Groq (Fast)', icon: '⚡' },
    { id: 'ollama', name: 'Ollama', icon: '🖥️' },
    { id: 'custom', name: 'Custom', icon: '🔧' },
  ];

  useEffect(() => {
    const cfg = getCEOConfig();
    if (cfg) {
      setAiConfig({
        provider: cfg.provider || 'gemini',
        baseUrl: cfg.baseUrl || 'https://generativelanguage.googleapis.com',
        apiKey: cfg.apiKey || '',
        model: cfg.model || 'gemini-2.0-flash',
      });
    }
  }, []);

  const saveConfig = () => {
    if (!aiConfig.apiKey && aiConfig.provider !== 'ollama') {
      alert('Please enter an API Key');
      return;
    }
    const finalConfig = {
      provider: aiConfig.provider,
      baseUrl: aiConfig.baseUrl,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    };
    saveCEOConfig(finalConfig);
    setShowConfig(false);
    setError('');
  };

  const analyzeAndPrioritize = async () => {
    const cfg = getCEOConfig();
    if (!cfg?.baseUrl || !cfg?.apiKey) {
      setShowConfig(true);
      setError('AI not configured');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
      const pendingTasks = tasks.filter((t: any) => t.status !== 'done');

      const taskData = pendingTasks.slice(0, 15).map((t: any) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        deadline: t.deadline || 'No deadline',
        daysUntilDeadline: t.deadline ? Math.ceil((new Date(t.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999,
      }));

      const systemPrompt = `You are an expert project manager. Analyze tasks and assign priority scores 1-5 based on urgency and impact. Return ONLY valid JSON array.`;
      const userPrompt = `Analyze these tasks and assign priority scores:

**Tasks:**
${JSON.stringify(taskData, null, 2)}

**Priority Scoring:**
- 1 = Urgent (deadline < 2 days, critical impact)
- 2 = High (deadline < 5 days, important)
- 3 = Medium (deadline < 14 days)
- 4 = Low (deadline > 14 days, nice to have)
- 5 = Backlog (no deadline)

**Output (JSON only, no markdown):**
[
  {"id": "task_id", "priority": 1-5, "reason": "brief reason"}
]`;

      const response = await callAI(systemPrompt, userPrompt);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const priorities = JSON.parse(cleaned);

      const priorityMap: Map<string, { priority: number; reason: string }> = new Map(
        priorities.map((p: any) => [p.id, { priority: p.priority, reason: p.reason }])
      );

      const analyzed = pendingTasks.slice(0, 15).map((t: any) => {
        const pData = priorityMap.get(t.id) || { priority: 3, reason: 'Default priority' };
        return { ...t, aiPriority: pData.priority, aiReason: pData.reason };
      });

      analyzed.sort((a: any, b: any) => (a.aiPriority ?? 3) - (b.aiPriority ?? 3));
      setPrioritized(analyzed);
    } catch (err: any) {
      if (err.message === 'AI_NOT_CONFIGURED') {
        setShowConfig(true);
        setError('AI not configured');
      } else {
        setError(err.message);
      }
    }

    setLoading(false);
  };

  const applyPriorities = () => {
    const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
    const priorityMap = new Map(prioritized.map(t => [t.id, { aiPriority: t.aiPriority, aiReason: t.aiReason }]));

    const updated = tasks.map((t: any) => {
      const pData = priorityMap.get(t.id);
      if (pData) {
        return {
          ...t,
          aiPriority: pData.aiPriority ?? 3,
          aiReason: pData.aiReason ?? '',
          priority: (pData.aiPriority ?? 3) <= 2 ? 'high' : (pData.aiPriority ?? 3) === 3 ? 'medium' : 'low'
        };
      }
      return t;
    });

    localStorage.setItem('pixeloffice_tasks', JSON.stringify(updated));
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const getPriorityColor = (p?: number) => {
    if (p === 1) return '#ff4444';
    if (p === 2) return '#ff8844';
    if (p === 3) return '#ffdd44';
    if (p === 4) return '#88ff88';
    return '#66ddff';
  };

  const getPriorityLabel = (p?: number) => {
    if (p === 1) return '🔴 URGENT';
    if (p === 2) return '🟠 HIGH';
    if (p === 3) return '🟡 MEDIUM';
    if (p === 4) return '🟢 LOW';
    return '🔵 BACKLOG';
  };

  // AI Config Modal
  if (showConfig) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 500, background: '#0d0d1e',
          border: '2px solid #ff4444', fontFamily: 'monospace',
        }}>
          <div style={{ background: '#1a0505', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '2px solid #ff4444' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', color: '#ff4444', fontWeight: 'bold' }}>⚠️ AI Not Configured</div>
              <div style={{ fontSize: '14px', color: '#667788' }}>Configure AI to analyze priorities</div>
            </div>
            <button onClick={() => setShowConfig(false)} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>Provider</label>
              <select
                value={aiConfig.provider}
                onChange={e => {
                  let url = '', model = '';
                  switch(e.target.value) {
                    case 'gemini': url = 'https://generativelanguage.googleapis.com'; model = 'gemini-2.0-flash'; break;
                    case 'openai': url = 'https://api.openai.com/v1'; model = 'gpt-4o'; break;
                    case 'anthropic': url = 'https://api.anthropic.com/v1'; model = 'claude-sonnet-4-20250514'; break;
                    case 'groq': url = 'https://api.groq.com/openai/v1'; model = 'llama-3.1-70b-versatile'; break;
                    case 'ollama': url = 'http://localhost:11434'; model = 'llama3.2'; break;
                  }
                  setAiConfig({ ...aiConfig, provider: e.target.value, baseUrl: url, model: model });
                }}
                style={{ width: '100%', padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '14px' }}
              >
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>API URL</label>
              <input
                type="text"
                value={aiConfig.baseUrl}
                onChange={e => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                style={{ width: '100%', padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>
                API Key {aiConfig.provider === 'gemini' && <span style={{ color: '#00ff88' }}>(Get free: aistudio.google.com)</span>}
              </label>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                placeholder={aiConfig.provider === 'ollama' ? 'Not needed' : 'sk-... / AIza...'}
                style={{ width: '100%', padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>Model</label>
              <input
                type="text"
                value={aiConfig.model}
                onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                placeholder="gemini-2.0-flash, gpt-4o, etc."
                style={{ width: '100%', padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '14px' }}
              />
            </div>

            <button
              onClick={saveConfig}
              style={{
                width: '100%', padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                background: '#0a2a0a', color: '#00ff88', border: '2px solid #00ff88',
                cursor: 'pointer',
              }}
            >
              💾 Save Configuration
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <span style={{ fontSize: '28px' }}>🎯</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>AI Auto-Prioritization</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>AI analyzes tasks and assigns priority scores</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Controls */}
        <div style={{ padding: '16px 20px', borderBottom: '2px solid #223355', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={analyzeAndPrioritize}
            disabled={loading}
            style={{
              padding: '12px 24px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
              background: loading ? '#1a1a00' : '#0a1a0a',
              color: loading ? '#ffdd44' : '#00ff88',
              border: '2px solid #00ff88',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Analyzing...' : '🎯 Analyze Priorities'}
          </button>
          <div style={{ flex: 1 }} />
          {prioritized.length > 0 && (
            <button
              onClick={applyPriorities}
              disabled={applied}
              style={{
                padding: '10px 20px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                background: applied ? '#0a2a0a' : '#1a2a0a',
                color: applied ? '#00ff88' : '#ffdd44',
                border: `2px solid ${applied ? '#00ff88' : '#ffdd44'}`,
                cursor: applied ? 'not-allowed' : 'pointer',
              }}
            >
              {applied ? '✅ Applied!' : '💾 Apply Priorities'}
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '32px', marginBottom: 16 }}>⏳</div>
              <div style={{ color: '#ffdd44', fontSize: '18px' }}>AI is analyzing task priorities...</div>
              <div style={{ color: '#667788', fontSize: '15px', marginTop: 8 }}>Considering deadlines and impact</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', padding: 40, background: '#1a0606', border: '2px solid #ff4444' }}>
              <div style={{ fontSize: '32px', marginBottom: 16 }}>❌</div>
              <div style={{ color: '#ff4444', fontSize: '18px', marginBottom: 12 }}>{error}</div>
              <button
                onClick={() => setShowConfig(true)}
                style={{
                  padding: '10px 24px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                  background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88',
                  cursor: 'pointer',
                }}
              >
                ⚙️ Configure AI
              </button>
            </div>
          )}

          {!loading && prioritized.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: 60, color: '#445566' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>🎯</div>
              <div style={{ fontSize: '20px', marginBottom: 8 }}>No analysis yet</div>
              <div style={{ fontSize: '16px' }}>Click "Analyze Priorities" to let AI score your tasks</div>
            </div>
          )}

          {prioritized.map((task, idx) => (
            <div key={task.id} style={{
              background: '#0a0a18',
              border: `2px solid ${getPriorityColor(task.aiPriority)}`,
              padding: '14px 16px',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 36, height: 36,
                background: getPriorityColor(task.aiPriority),
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#000',
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', color: '#aaddff', fontWeight: 'bold', marginBottom: 4 }}>{task.title}</div>
                <div style={{ fontSize: '14px', color: '#667788' }}>
                  💬 {task.aiReason || 'No reason'}
                </div>
              </div>
              <div style={{
                padding: '6px 12px',
                background: getPriorityColor(task.aiPriority),
                color: '#000',
                fontSize: '13px',
                fontWeight: 'bold',
              }}>
                {getPriorityLabel(task.aiPriority)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '2px solid #223355', background: '#0a0a18' }}>
          <div style={{ fontSize: '14px', color: '#445566' }}>
            💡 AI considers deadlines and business impact to assign priority scores (1-5).
          </div>
        </div>
      </div>
    </div>
  );
}
