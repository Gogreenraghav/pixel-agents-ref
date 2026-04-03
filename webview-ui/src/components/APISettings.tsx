import { useState } from 'react';

interface Props {
  onClose: () => void;
}

const BASE_URL = 'http://69.62.83.21:8766';

const ENDPOINTS = [
  { key: 'GET /api/status', method: 'GET', desc: 'Check if Pixel Office API is running', params: [] },
  { key: 'GET /api/balance', method: 'GET', desc: 'Get current company balance', params: [] },
  { key: 'GET /api/agents', method: 'GET', desc: 'List all hired agents', params: [] },
  { key: 'GET /api/tasks', method: 'GET', desc: 'List all tasks on the board', params: [] },
  { key: 'GET /api/clients', method: 'GET', desc: 'List all clients', params: [] },
  { key: 'GET /api/projects', method: 'GET', desc: 'List all projects', params: [] },
];

function callEndpoint(key: string, _method: string, setResult: (r: string) => void) {
  setResult('⏳ Loading...');
  const path = key.split(' ')[1];
  
  // Since we're in browser, we simulate API calls using localStorage
  try {
    let data: any = {};
    if (path === '/api/status') {
      data = { status: 'ok', version: '1.0', timestamp: new Date().toISOString() };
    } else if (path === '/api/balance') {
      const bal = localStorage.getItem('pixeloffice_balance') ?? '50000';
      data = { balance: parseInt(bal), currency: 'USD' };
    } else if (path === '/api/agents') {
      const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
      data = { count: agents.length, agents };
    } else if (path === '/api/tasks') {
      const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
      data = { count: tasks.length, tasks };
    } else if (path === '/api/clients') {
      const clients = JSON.parse(localStorage.getItem('pixeloffice_clients') ?? '[]');
      data = { count: clients.length, clients };
    } else if (path === '/api/projects') {
      const projects = JSON.parse(localStorage.getItem('pixeloffice_projects') ?? '[]');
      data = { count: projects.length, projects };
    }
    setResult(JSON.stringify(data, null, 2));
  } catch (e: any) {
    setResult(JSON.stringify({ error: e.message }, null, 2));
  }
}

export function APISettings({ onClose }: Props) {
  const [selected, setSelected] = useState(ENDPOINTS[0]);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(`${BASE_URL}${selected.key.split(' ')[1]}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 800, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🌐</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>API Endpoints</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Query Pixel Office data from external tools</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', gap: 16 }}>
          {/* Sidebar - Endpoints */}
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '16px', color: '#8899aa', marginBottom: 4 }}>Available Endpoints:</div>
            {ENDPOINTS.map(ep => (
              <div key={ep.key} onClick={() => { setSelected(ep); setResult(''); }}
                style={{ background: selected.key === ep.key ? '#112233' : '#0a0a18', border: `2px solid ${selected.key === ep.key ? '#66ddff' : '#334466'}`, padding: '10px 14px', cursor: 'pointer' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: selected.key === ep.key ? '#00ff88' : '#66ddff', marginBottom: 4 }}>
                  {ep.key}
                </div>
                <div style={{ fontSize: '13px', color: '#667788' }}>{ep.desc}</div>
              </div>
            ))}
          </div>

          {/* Main - Details + Result */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Endpoint Info */}
            <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '14px 16px' }}>
              <div style={{ fontSize: '18px', color: '#ffdd44', fontWeight: 'bold', marginBottom: 8 }}>{selected.method} {selected.key.split(' ')[1]}</div>
              <div style={{ fontSize: '15px', color: '#aaddff' }}>{selected.desc}</div>
            </div>

            {/* URL Box */}
            <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '12px 14px' }}>
              <div style={{ fontSize: '14px', color: '#667788', marginBottom: 6 }}>Full URL:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={`${BASE_URL}${selected.key.split(' ')[1]}`} readOnly
                  style={{ flex: 1, background: '#0a0a14', color: '#aaddff', border: '2px solid #334466', fontFamily: 'monospace', fontSize: '14px', padding: '8px 10px', boxSizing: 'border-box' }} />
                <button onClick={copyUrl} style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', background: copied ? '#0a1a0a' : '#0a0a14', color: copied ? '#00ff88' : '#8899aa', border: '2px solid #334466', cursor: 'pointer' }}>
                  {copied ? '✅' : '📋'} Copy
                </button>
              </div>
            </div>

            {/* Try It */}
            <button onClick={() => callEndpoint(selected.key, selected.method, setResult)} style={{ padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>
              ▶ Try It (in-browser demo)
            </button>

            {/* Result */}
            {result && (
              <div style={{ flex: 1, background: '#080810', border: '2px solid #223355', padding: '12px', overflow: 'auto', maxHeight: 300 }}>
                <div style={{ fontSize: '14px', color: '#667788', marginBottom: 8 }}>Response:</div>
                <pre style={{ margin: 0, fontSize: '13px', color: '#aaffaa', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {result}
                </pre>
              </div>
            )}

            {/* Note */}
            <div style={{ background: '#0a0a18', border: '1px solid #223355', padding: '10px 14px' }}>
              <div style={{ fontSize: '14px', color: '#667788' }}>
                💡 <span style={{ color: '#ffee55' }}>Note:</span> This is a browser-based demo. For full API support from external tools (Zapier, Make, etc.), you would need a backend server. The data shown here comes from localStorage.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
