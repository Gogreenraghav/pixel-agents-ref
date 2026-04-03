import { useState } from 'react';

interface Webhook {
  id: string;
  url: string;
  name: string;
  events: string[];
  active: boolean;
}

interface Props {
  onClose: () => void;
}

const LS_WEBHOOKS = 'pixeloffice_webhooks';
const EVENT_TYPES = [
  { key: 'task_completed', label: '✅ Task Completed', icon: '📋' },
  { key: 'client_added', label: '🏢 New Client', icon: '👤' },
  { key: 'project_created', label: '📁 Project Created', icon: '📋' },
  { key: 'chat_message', label: '💬 Group Chat Message', icon: '💬' },
  { key: 'agent_hired', label: '🧑‍💼 Agent Hired', icon: '👔' },
  { key: 'balance_low', label: '⚠️ Balance Low (<$5k)', icon: '💰' },
];

function loadWebhooks(): Webhook[] {
  try { return JSON.parse(localStorage.getItem(LS_WEBHOOKS) ?? '[]'); } catch { return []; }
}
function saveWebhooks(ws: Webhook[]) {
  try { localStorage.setItem(LS_WEBHOOKS, JSON.stringify(ws)); } catch {}
}

export function triggerWebhook(event: string, data: Record<string, any>) {
  const webhooks = loadWebhooks().filter(w => w.active && w.events.includes(event));
  webhooks.forEach(wh => {
    fetch(wh.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
    }).catch(err => console.error('Webhook failed:', wh.name, err));
  });
}

export function WebhookSettings({ onClose }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(loadWebhooks);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] });
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({});
  const [notif, setNotif] = useState('');

  const save = (ws: Webhook[]) => { setWebhooks(ws); saveWebhooks(ws); };

  const addWebhook = () => {
    if (!form.name || !form.url) return;
    const newWh: Webhook = { id: `wh_${Date.now()}`, name: form.name, url: form.url, events: form.events, active: true };
    save([...webhooks, newWh]);
    setForm({ name: '', url: '', events: [] });
    setShowAdd(false);
    setNotif('Webhook added!');
    setTimeout(() => setNotif(''), 2000);
  };

  const toggleActive = (id: string) => {
    save(webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  const removeWebhook = (id: string) => {
    save(webhooks.filter(w => w.id !== id));
  };

  const toggleEvent = (key: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(key) ? f.events.filter(e => e !== key) : [...f.events, key],
    }));
  };

  const testWebhook = async (wh: Webhook) => {
    setTestStatus(s => ({ ...s, [wh.id]: 'testing' }));
    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', data: { message: 'Pixel Office webhook test!' }, timestamp: new Date().toISOString() }),
      });
      setTestStatus(s => ({ ...s, [wh.id]: res.ok ? 'ok' : 'fail' }));
    } catch {
      setTestStatus(s => ({ ...s, [wh.id]: 'fail' }));
    }
    setTimeout(() => setTestStatus(s => ({ ...s, [wh.id]: 'idle' })), 3000);
  };

  const inp: React.CSSProperties = {
    background: '#0a0a14', color: '#aaddff', border: '2px solid #334466',
    fontFamily: 'monospace', fontSize: '16px', padding: '8px 10px', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 600, maxHeight: '85vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>🔗</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Webhook Settings</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Connect external services (Slack, Discord, etc.)</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {notif && (
            <div style={{ background: '#0a1a0a', border: '2px solid #00ff88', padding: '10px 14px', color: '#00ff88', fontSize: '16px', fontWeight: 'bold' }}>
              ✅ {notif}
            </div>
          )}

          {/* Webhook List */}
          {webhooks.map(wh => (
            <div key={wh.id} style={{ background: '#0a0a18', border: `2px solid ${wh.active ? '#334466' : '#223333'}`, padding: '14px 16px', opacity: wh.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold', marginBottom: 4 }}>{wh.name}</div>
                  <div style={{ fontSize: '14px', color: '#667788', wordBreak: 'break-all' }}>{wh.url}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => testWebhook(wh)} style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', background: testStatus[wh.id] === 'ok' ? '#0a1a0a' : testStatus[wh.id] === 'fail' ? '#1a0606' : '#0a0a14', color: testStatus[wh.id] === 'ok' ? '#00ff88' : testStatus[wh.id] === 'fail' ? '#ff4444' : '#8899aa', border: '2px solid', cursor: 'pointer' }}>
                    {testStatus[wh.id] === 'testing' ? '⏳' : testStatus[wh.id] === 'ok' ? '✅' : testStatus[wh.id] === 'fail' ? '❌' : '🧪'} Test
                  </button>
                  <button onClick={() => toggleActive(wh.id)} style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', background: wh.active ? '#0a1a0a' : '#1a0606', color: wh.active ? '#00ff88' : '#ff4444', border: '2px solid', cursor: 'pointer' }}>
                    {wh.active ? '🟢 ON' : '🔴 OFF'}
                  </button>
                  <button onClick={() => removeWebhook(wh.id)} style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: '14px', background: '#1a0606', color: '#ff4444', border: '2px solid #441111', cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EVENT_TYPES.map(e => (
                  <span key={e.key} style={{ fontSize: '13px', padding: '2px 8px', background: wh.events.includes(e.key) ? '#1a1a00' : '#111', border: '1px solid', borderColor: wh.events.includes(e.key) ? '#554400' : '#223', color: wh.events.includes(e.key) ? '#ffdd44' : '#445', fontWeight: 'bold' }}>
                    {e.icon} {e.label}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {webhooks.length === 0 && !showAdd && (
            <div style={{ textAlign: 'center', color: '#445566', fontSize: '17px', padding: '30px' }}>
              No webhooks configured.<br/>Add one to connect external services!
            </div>
          )}

          {/* Add Form */}
          {showAdd && (
            <div style={{ background: '#0d0d1e', border: '2px solid #334466', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold' }}>➕ Add Webhook</div>
              <input placeholder="Webhook Name (e.g., Slack Alerts)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
              <input placeholder="Webhook URL (e.g., https://hooks.slack.com/...)" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} style={inp} />
              <div>
                <div style={{ fontSize: '16px', color: '#8899aa', marginBottom: 8 }}>Trigger Events:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EVENT_TYPES.map(e => (
                    <button key={e.key} onClick={() => toggleEvent(e.key)} style={{ fontSize: '14px', padding: '6px 12px', fontFamily: 'monospace', fontWeight: 'bold', background: form.events.includes(e.key) ? '#1a1a00' : '#0a0a14', color: form.events.includes(e.key) ? '#ffdd44' : '#556677', border: `2px solid ${form.events.includes(e.key) ? '#554400' : '#223355'}`, cursor: 'pointer' }}>
                      {form.events.includes(e.key) ? '✅' : '⬜'} {e.icon} {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addWebhook} style={{ flex: 1, padding: 10, fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>✅ Add Webhook</button>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 10, fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#1a0606', color: '#ff6666', border: '2px solid #331111', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {!showAdd && (
            <button onClick={() => setShowAdd(true)} style={{ padding: '12px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>
              ➕ Add Webhook
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
