import { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  agentName: string;
  agentId: string;
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
        generationConfig: { maxOutputTokens: 1000 }
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
        max_tokens: 1000 
      }),
    });
    if (!res.ok) throw new Error(`AI API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
}

export function AITaskSuggestions({ onClose }: Props) {
  const [suggestions, setSuggestions] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    model: 'gemini-2.0-flash',
  });

  const PROVIDERS = [
    { id: 'gemini', name: 'Google Gemini (Free tier!)', icon: '✨' },
    { id: 'openai', name: 'OpenAI (GPT-4, GPT-3.5)', icon: '🤖' },
    { id: 'anthropic', name: 'Anthropic (Claude)', icon: '🧠' },
    { id: 'groq', name: 'Groq (Fast, Free tier)', icon: '⚡' },
    { id: 'ollama', name: 'Ollama (Local Models)', icon: '🖥️' },
    { id: 'custom', name: 'Custom API URL', icon: '🔧' },
  ];

  const POPULAR_MODELS: Record<string, string[]> = {
    gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    ollama: ['llama3.2', 'llama3', 'mistral', 'codellama', 'phi3'],
    custom: [],
  };

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

  const generateSuggestions = async () => {
    const cfg = getCEOConfig();
    if (!cfg?.baseUrl || !cfg?.apiKey) {
      setShowConfig(true);
      setError('AI not configured');
      return;
    }

    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
      const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
      const skills = JSON.parse(localStorage.getItem('pixeloffice_skills') ?? '{}');

      const pendingTasks = tasks.filter((t: any) => t.status === 'todo' || t.status === 'in-progress');

      const agentSummaries = agents.map((a: any) => {
        const agentSkills = skills[`pixeloffice_skills_${a.id}`] || {};
        return {
          id: a.id,
          name: a.name,
          role: a.role,
          dept: a.dept,
          xp: agentSkills.xp || 0,
          skills: Object.entries(agentSkills.skills || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([k]: any) => k),
        };
      });

      const prompt = `Analyze pending tasks and suggest the best agent for each. Return ONLY a JSON array.

**Available Agents:**
${JSON.stringify(agentSummaries, null, 2)}

**Pending Tasks:**
${JSON.stringify(pendingTasks.slice(0, 10).map((t: any) => ({ id: t.id, title: t.title, type: t.type })), null, 2)}

**Output Format (JSON array only, no markdown):**
[
  {
    "id": "task_id",
    "title": "Task Title",
    "type": "Code/Design/Research/etc",
    "priority": "high/medium/low",
    "reason": "Why this agent should do this task (1 sentence)",
    "agentName": "Agent Name",
    "agentId": "agent_id"
  }
]

Select max 5 most important tasks. Consider agent skills, workload, and task type match.`;

      const response = await callAI(
        'You are an expert project manager. Analyze tasks and match them to the best agents based on skills and workload. Return ONLY valid JSON array.',
        prompt
      );

      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setSuggestions(parsed);
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

  const applySuggestion = (task: Task) => {
    setApplyingId(task.id);
    
    const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
    const updated = tasks.map((t: any) => 
      t.id === task.id ? { ...t, agentId: task.agentId, agentName: task.agentName } : t
    );
    localStorage.setItem('pixeloffice_tasks', JSON.stringify(updated));

    setSuggestions(prev => prev.filter(s => s.id !== task.id));
    
    setTimeout(() => setApplyingId(null), 500);
  };

  const priorityColor = (p: string) => p === 'high' ? '#ff4444' : p === 'medium' ? '#ffdd44' : '#00ff88';
  const priorityBadge = (p: string) => p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢';

  // AI Config Modal
  if (showConfig) {
    const models = POPULAR_MODELS[aiConfig.provider as keyof typeof POPULAR_MODELS] || [];
    
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 550, maxHeight: '90vh', background: '#0d0d1e',
          border: '2px solid #ff4444', fontFamily: 'monospace', overflow: 'auto',
        }}>
          <div style={{ background: '#1a0505', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '2px solid #ff4444', position: 'sticky', top: 0 }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', color: '#ff4444', fontWeight: 'bold' }}>⚠️ AI Not Configured</div>
              <div style={{ fontSize: '14px', color: '#667788' }}>Set up your AI Brain to use this feature</div>
            </div>
            <button onClick={() => setShowConfig(false)} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ padding: 20 }}>
            {/* Provider Selection */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>AI Provider</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {PROVIDERS.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      let defaultUrl = '';
                      let defaultModel = '';
                      switch(p.id) {
                        case 'gemini': defaultUrl = 'https://generativelanguage.googleapis.com'; defaultModel = 'gemini-2.0-flash'; break;
                        case 'openai': defaultUrl = 'https://api.openai.com/v1'; defaultModel = 'gpt-4o'; break;
                        case 'anthropic': defaultUrl = 'https://api.anthropic.com/v1'; defaultModel = 'claude-sonnet-4-20250514'; break;
                        case 'groq': defaultUrl = 'https://api.groq.com/openai/v1'; defaultModel = 'llama-3.1-70b-versatile'; break;
                        case 'ollama': defaultUrl = 'http://localhost:11434'; defaultModel = 'llama3.2'; break;
                        default: defaultModel = 'gpt-4';
                      }
                      setAiConfig({ ...aiConfig, provider: p.id, baseUrl: defaultUrl, model: defaultModel });
                    }}
                    style={{
                      padding: '10px', cursor: 'pointer',
                      background: aiConfig.provider === p.id ? '#1a2a3a' : '#0a0a18',
                      border: `2px solid ${aiConfig.provider === p.id ? '#66ddff' : '#334466'}`,
                      color: aiConfig.provider === p.id ? '#66ddff' : '#667788',
                      fontSize: '13px', fontWeight: 'bold',
                    }}
                  >
                    {p.icon} {p.name}
                  </div>
                ))}
              </div>
            </div>

            {/* API URL */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>API URL</label>
              <input
                type="text"
                value={aiConfig.baseUrl}
                onChange={e => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                style={{ width: '100%', padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px' }}
              />
            </div>

            {/* API Key */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>
                API Key 
                {aiConfig.provider === 'gemini' && <span style={{ color: '#00ff88', fontSize: '12px' }}> (Get free: aistudio.google.com)</span>}
                {aiConfig.provider === 'ollama' && <span style={{ color: '#667788', fontSize: '12px' }}> (Not needed)</span>}
              </label>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                placeholder={aiConfig.provider === 'gemini' ? 'AIza...' : aiConfig.provider === 'ollama' ? 'Not needed' : 'sk-...'}
                style={{ width: '100%', padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px' }}
              />
            </div>

            {/* Model - Free Form */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>Model (Any model name works!)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={models.includes(aiConfig.model) ? aiConfig.model : ''}
                  onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                  style={{ flex: 1, padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '14px' }}
                >
                  <option value="">-- Popular Models --</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="__custom__">Type Custom Model...</option>
                </select>
                {(!models.includes(aiConfig.model) || aiConfig.model === '') && (
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                    placeholder="Type any model name..."
                    style={{ flex: 1, padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '14px' }}
                  />
                )}
              </div>
            </div>

            <button
              onClick={saveConfig}
              style={{
                width: '100%', padding: '14px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
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
        width: 850, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Smart Task Suggestions</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>AI recommends best agent for each task</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Controls */}
        <div style={{ padding: '16px 20px', borderBottom: '2px solid #223355', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={generateSuggestions}
            disabled={loading}
            style={{
              padding: '12px 28px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
              background: loading ? '#1a1a00' : '#0a1a0a',
              color: loading ? '#ffdd44' : '#00ff88',
              border: '2px solid #00ff88',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Analyzing...' : '🧠 Get Suggestions'}
          </button>
          <div style={{ flex: 1 }} />
          {suggestions.length > 0 && (
            <div style={{ fontSize: '15px', color: '#667788' }}>{suggestions.length} suggestions</div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>🤖</div>
              <div style={{ color: '#ffdd44', fontSize: '18px', marginBottom: 8 }}>AI is analyzing tasks and agents...</div>
              <div style={{ color: '#667788', fontSize: '15px' }}>Matching skills, workload, and priorities</div>
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

          {!loading && suggestions.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: 60, color: '#445566' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>💡</div>
              <div style={{ fontSize: '20px', marginBottom: 8 }}>No suggestions yet</div>
              <div style={{ fontSize: '16px', marginBottom: 16 }}>Click "Get Suggestions" to let AI analyze your tasks</div>
              <div style={{ fontSize: '14px', color: '#556677' }}>
                AI will match pending tasks with the best available agent based on skills and workload.
              </div>
            </div>
          )}

          {suggestions.map((task, idx) => (
            <div key={task.id} style={{
              background: '#0a0a18', border: `2px solid ${priorityColor(task.priority)}`,
              padding: '16px 20px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: '20px', color: priorityColor(task.priority) }}>{priorityBadge(task.priority)}</span>
                    <span style={{ fontSize: '14px', background: '#112233', padding: '2px 10px', color: '#66ddff' }}>{task.type}</span>
                    <span style={{ fontSize: '14px', color: '#667788' }}>#{idx + 1}</span>
                  </div>
                  <div style={{ fontSize: '18px', color: '#aaddff', fontWeight: 'bold' }}>{task.title}</div>
                </div>
                <button
                  onClick={() => applySuggestion(task)}
                  disabled={applyingId === task.id}
                  style={{
                    padding: '8px 16px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                    background: applyingId === task.id ? '#1a1a00' : '#0a1a0a',
                    color: applyingId === task.id ? '#ffdd44' : '#00ff88',
                    border: '2px solid #00ff88',
                    cursor: applyingId === task.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {applyingId === task.id ? '⏳' : '✅'} {applyingId === task.id ? 'Applied!' : 'Assign'}
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '16px' }}>👤</span>
                  <span style={{ fontSize: '16px', color: '#66ddff', fontWeight: 'bold' }}>{task.agentName}</span>
                </div>
              </div>
              
              <div style={{ fontSize: '15px', color: '#667788', fontStyle: 'italic' }}>
                💬 "{task.reason}"
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '2px solid #223355', background: '#0a0a18' }}>
          <div style={{ fontSize: '14px', color: '#445566' }}>
            💡 Supports Gemini, OpenAI, Claude, Groq, Ollama. Any model name works!
          </div>
        </div>
      </div>
    </div>
  );
}
