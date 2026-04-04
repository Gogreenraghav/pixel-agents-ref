import { useState, useEffect } from 'react';

interface Props {
  onClose: () => void;
  agents?: any[];
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

async function callAIReport(systemPrompt: string, userPrompt: string): Promise<string> {
  const cfg = getCEOConfig();
  if (!cfg?.baseUrl || !cfg?.apiKey) {
    throw new Error('AI_NOT_CONFIGURED');
  }
  
  let url = (cfg.baseUrl ?? '').replace(/\/$/, '');
  
  // Handle different provider API formats
  if (cfg.provider === 'gemini') {
    // Gemini uses different endpoint
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from AI';
  } else if (cfg.provider === 'ollama') {
    // Ollama uses different format
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
    return data.response ?? 'No response from AI';
  } else {
    // OpenAI-compatible format
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
    return data.choices?.[0]?.message?.content ?? 'No response from AI';
  }
}

export function AIReports({ onClose }: Props) {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    model: 'gemini-2.0-flash',
  });

  const PROVIDERS = [
    { id: 'gemini', name: 'Google Gemini (Free tier available!)', icon: '✨' },
    { id: 'openai', name: 'OpenAI (GPT-4, GPT-3.5)', icon: '🤖' },
    { id: 'anthropic', name: 'Anthropic (Claude)', icon: '🧠' },
    { id: 'groq', name: 'Groq (Fast, Free tier)', icon: '⚡' },
    { id: 'ollama', name: 'Ollama (Local Models)', icon: '🖥️' },
    { id: 'custom', name: 'Custom API URL', icon: '🔧' },
  ];

  const POPULAR_MODELS: Record<string, string[]> = {
    gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma-7b-it'],
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
    if (!aiConfig.apiKey) {
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

  const generateReport = async () => {
    const cfg = getCEOConfig();
    if (!cfg?.baseUrl || !cfg?.apiKey) {
      setShowConfig(true);
      setError('AI not configured');
      return;
    }

    setLoading(true);
    setReport('');
    setError('');

    try {
      const balance = parseInt(localStorage.getItem('pixeloffice_balance') ?? '50000');
      const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
      const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
      const clients = JSON.parse(localStorage.getItem('pixeloffice_clients') ?? '[]');
      const projects = JSON.parse(localStorage.getItem('pixeloffice_projects') ?? '[]');
      const invoices = JSON.parse(localStorage.getItem('pixeloffice_invoices') ?? '[]');

      const completedTasks = tasks.filter((t: any) => t.status === 'done');
      const pendingTasks = tasks.filter((t: any) => t.status !== 'done' && t.status !== 'running');
      const activeClients = clients.filter((c: any) => c.status === 'active');
      const paidInvoices = invoices.filter((i: any) => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((s: number, i: any) => s + i.total, 0);

      const systemPrompt = `You are a professional business analyst AI assistant for Pixel Office. Generate clear, concise company reports. Use emojis for headers. Keep reports actionable and professional.`;

      const userPrompt = `Generate a ${period} company status report for Pixel Office.

**Current Company Data:**
- Balance: $${balance.toLocaleString()}
- Total Agents: ${agents.length}
- Active Clients: ${activeClients.length}
- Tasks Completed: ${completedTasks.length}
- Tasks Pending: ${pendingTasks.length}
- Total Projects: ${projects.length}
- Total Revenue from Invoices: $${totalRevenue.toLocaleString()}

**Format:**
📊 **[${period.toUpperCase()} REPORT]**

💰 **Financial Summary**
- Current Balance: $X
- Revenue Generated: $X

👥 **Team Performance**
- Total Agents: X
- Tasks Completed: X
- Productivity: X%

📋 **Tasks Overview**
- Pending Tasks: X
- Completed This ${period}: X

🏢 **Client Status**
- Active Clients: X
- New Clients: X

🎯 **Key Recommendations**
[3 bullet points with actionable suggestions]

Keep it under 200 words. Be specific and actionable.`;

      const response = await callAIReport(systemPrompt, userPrompt);
      setReport(response);
    } catch (err: any) {
      if (err.message === 'AI_NOT_CONFIGURED') {
        setShowConfig(true);
        setError('AI not configured');
      } else {
        setError(err.message);
      }
      setReport('');
    }

    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>
                API URL {aiConfig.provider === 'ollama' && '(Local Server)'}
              </label>
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
                {aiConfig.provider === 'gemini' && <span style={{ color: '#00ff88', fontSize: '12px' }}> (Get free key: aistudio.google.com)</span>}
              </label>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                placeholder={aiConfig.provider === 'gemini' ? 'AIza...' : aiConfig.provider === 'ollama' ? 'Not needed for local' : 'sk-...'}
                style={{ width: '100%', padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px' }}
              />
            </div>

            {/* Model Selection - Dropdown + Custom Input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 6 }}>Model</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={models.includes(aiConfig.model) ? aiConfig.model : ''}
                  onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                  style={{ flex: 1, padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '14px' }}
                >
                  <option value="">-- Popular Models --</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="__custom__">Custom Model...</option>
                </select>
                {(!models.includes(aiConfig.model) || aiConfig.model === '') && (
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                    placeholder="Type model name..."
                    style={{ flex: 1, padding: '10px', background: '#0a0a18', color: '#fff', border: '1px solid #334466', fontFamily: 'monospace', fontSize: '14px' }}
                  />
                )}
              </div>
              {aiConfig.provider === 'gemini' && (
                <div style={{ marginTop: 8, fontSize: '12px', color: '#445566' }}>
                  💡 <strong style={{ color: '#ffdd44' }}>Recommended:</strong> gemini-2.0-flash (fast, free) or gemini-1.5-pro (powerful)
                </div>
              )}
              {aiConfig.provider === 'groq' && (
                <div style={{ marginTop: 8, fontSize: '12px', color: '#445566' }}>
                  💡 <strong style={{ color: '#ffdd44' }}>Recommended:</strong> llama-3.1-70b-versatile (fastest)
                </div>
              )}
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
        width: 800, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>AI Reports</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Generate intelligent company reports</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Controls */}
        <div style={{ padding: '16px 20px', borderBottom: '2px solid #223355', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['daily', 'weekly', 'monthly'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '8px 16px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold',
                  background: period === p ? '#112233' : '#0a0a14',
                  color: period === p ? '#66ddff' : '#667788',
                  border: `2px solid ${period === p ? '#66ddff' : '#334466'}`,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowConfig(true)}
            style={{
              padding: '8px 16px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
              background: '#1a1a1a', color: '#8899aa',
              border: '2px solid #334466',
              cursor: 'pointer',
            }}
          >
            ⚙️ AI Config
          </button>
          <button
            onClick={generateReport}
            disabled={loading}
            style={{
              padding: '10px 24px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
              background: loading ? '#1a1a00' : '#0a1a0a',
              color: loading ? '#ffdd44' : '#00ff88',
              border: '2px solid #00ff88',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Generating...' : '📊 Generate Report'}
          </button>
        </div>

        {/* Report Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '32px', marginBottom: 16 }}>⏳</div>
              <div style={{ color: '#ffdd44', fontSize: '18px' }}>AI is analyzing your company data...</div>
              <div style={{ color: '#667788', fontSize: '15px', marginTop: 8 }}>This may take 10-30 seconds</div>
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

          {!loading && !report && !error && (
            <div style={{ textAlign: 'center', padding: 60, color: '#445566' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: '20px', marginBottom: 8 }}>No report generated yet</div>
              <div style={{ fontSize: '16px' }}>Click "Generate Report" to create an AI-powered company report</div>
            </div>
          )}

          {report && !loading && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={copyToClipboard}
                style={{
                  position: 'absolute', top: 0, right: 0,
                  padding: '8px 16px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold',
                  background: copied ? '#0a1a0a' : '#0a0a14',
                  color: copied ? '#00ff88' : '#8899aa',
                  border: '2px solid #334466',
                  cursor: 'pointer',
                }}
              >
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
              <div style={{
                background: '#0a0a14', border: '2px solid #223355',
                padding: '20px', fontSize: '16px', lineHeight: 1.7,
                whiteSpace: 'pre-wrap', color: '#aaddff',
                fontFamily: 'monospace',
              }}>
                {report}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '2px solid #223355', background: '#0a0a18' }}>
          <div style={{ fontSize: '14px', color: '#445566' }}>
            💡 Reports are generated by AI based on your company data. Supports Gemini, OpenAI, Claude, Groq, Ollama, and custom APIs.
          </div>
        </div>
      </div>
    </div>
  );
}
