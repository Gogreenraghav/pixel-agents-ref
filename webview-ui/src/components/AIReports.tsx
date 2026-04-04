import { useState } from 'react';

interface Props {
  onClose: () => void;
  agents?: any[];
}

function getCEOConfig() {
  const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
  const ceo = agents.find((a: any) => a.name?.toLowerCase().includes('ceo') || a.role?.toLowerCase().includes('ceo'));
  return ceo?.aiConfig ?? null;
}

async function callAIReport(systemPrompt: string, userPrompt: string): Promise<string> {
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
  return data.choices?.[0]?.message?.content ?? 'No response from AI';
}

export function AIReports({ onClose }: Props) {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');

  const generateReport = async () => {
    setLoading(true);
    setReport('');
    setError('');

    try {
      // Gather data
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
📊 **[Period.toUpperCase()} REPORT**

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
      setError(err.message);
      setReport('');
    }

    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <div style={{ color: '#667788', fontSize: '15px' }}>Please configure AI Brain in Settings → AI Brain tab</div>
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
            💡 Reports are generated by AI based on your company data. Make sure AI Brain is configured.
          </div>
        </div>
      </div>
    </div>
  );
}
