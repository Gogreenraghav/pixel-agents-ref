import { useState, useRef, useEffect } from 'react';

interface AIConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  connected: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
}

interface Props {
  agentId: string;
  agentName: string;
  agentRole: string;
  aiConfig: AIConfig;
  onClose: () => void;
  onConfigUpdate?: (config: AIConfig) => void;
}

const PROVIDER_COLORS: Record<string, string> = {
  litellm:    '#00ccff',
  openai:     '#00ff88',
  groq:       '#ff8800',
  ollama:     '#cc88ff',
  openrouter: '#ff44aa',
  custom:     '#ffdd44',
};

const LS_CHAT_PREFIX = 'pixeloffice_chat_';

function loadChat(agentId: string): ChatMessage[] {
  try {
    const s = localStorage.getItem(LS_CHAT_PREFIX + agentId);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveChat(agentId: string, msgs: ChatMessage[]) {
  try { localStorage.setItem(LS_CHAT_PREFIX + agentId, JSON.stringify(msgs.slice(-50))); } catch {}
}

export function AgentChatPanel({ agentId, agentName, agentRole, aiConfig, onClose, onConfigUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChat(agentId));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [editUrl, setEditUrl] = useState(aiConfig.baseUrl);
  const [editKey, setEditKey] = useState(aiConfig.apiKey);
  const [editModel, setEditModel] = useState(aiConfig.model);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const SYSTEM_PROMPT = `You are ${agentName}, a ${agentRole} working in a pixel art office. You are a helpful, concise AI assistant. Answer questions in your professional capacity as a ${agentRole}. Keep responses under 150 words unless more detail is needed.`;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError('');

    const userMsg: ChatMessage = { role: 'user', content: text, ts: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    saveChat(agentId, newMsgs);
    setLoading(true);

    try {
      const apiMsgs = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...newMsgs.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ];

      const res = await fetch(aiConfig.baseUrl.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: apiMsgs,
          max_tokens: 256,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.substring(0, 80)}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? '(no response)';
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply, ts: Date.now() };
      const finalMsgs = [...newMsgs, assistantMsg];
      setMessages(finalMsgs);
      saveChat(agentId, finalMsgs);
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const res = await fetch(editUrl.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${editKey}` },
        body: JSON.stringify({ model: editModel, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }),
      });
      setTestStatus(res.ok ? 'ok' : 'fail');
    } catch { setTestStatus('fail'); }
  };

  const handleSaveConfig = () => {
    onConfigUpdate?.({ ...aiConfig, baseUrl: editUrl, apiKey: editKey, model: editModel, connected: testStatus === 'ok' });
    setShowConfig(false);
  };

  const providerColor = PROVIDER_COLORS[aiConfig.provider] ?? '#888888';

  const inputStyle: React.CSSProperties = {
    background: '#0a0a14', color: 'var(--pixel-text)', border: '2px solid #333366',
    fontFamily: 'monospace', fontSize: '15px', padding: '5px 8px', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 360, zIndex: 300,
      background: 'var(--pixel-agent-bg)', borderLeft: '2px solid var(--pixel-agent-border)',
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      boxShadow: '-4px 0 16px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--pixel-active-bg)', borderBottom: '2px solid var(--pixel-agent-border)',
        padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: '20px' }}>🤖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--pixel-agent-text)' }}>{agentName}</div>
          <div style={{ fontSize: '13px', color: providerColor }}>{aiConfig.provider.toUpperCase()} · {aiConfig.model}</div>
        </div>
        <button onClick={() => setShowConfig(v => !v)} style={{
          background: showConfig ? '#112233' : 'transparent', border: '1px solid #334466',
          color: '#aaccff', cursor: 'pointer', padding: '4px 8px', fontSize: '16px', fontFamily: 'monospace',
        }}>⚙</button>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'var(--pixel-text)', cursor: 'pointer', fontSize: '20px', padding: '0 4px',
        }}>✕</button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #222233', background: '#0d0d1a' }}>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: '13px', color: '#666688' }}>Base URL</label>
            <input style={inputStyle} value={editUrl} onChange={e => setEditUrl(e.target.value)} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: '13px', color: '#666688' }}>Model</label>
            <input style={inputStyle} value={editModel} onChange={e => setEditModel(e.target.value)} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '13px', color: '#666688' }}>API Key</label>
            <input type="password" style={inputStyle} value={editKey} onChange={e => setEditKey(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleTestConnection} style={{ flex: 1, padding: '5px', fontFamily: 'monospace', fontSize: '14px', background: '#112233', color: '#aaccff', border: '1px solid #334466', cursor: 'pointer' }}>
              {testStatus === 'testing' ? '...' : testStatus === 'ok' ? '✅ OK' : testStatus === 'fail' ? '❌ Fail' : 'Test'}
            </button>
            <button onClick={handleSaveConfig} style={{ flex: 1, padding: '5px', fontFamily: 'monospace', fontSize: '14px', background: '#112211', color: '#00ff88', border: '1px solid #00ff88', cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#334455', fontSize: '15px', marginTop: 40 }}>
            <div style={{ fontSize: '32px', marginBottom: 8 }}>💬</div>
            <div>Start chatting with {agentName}</div>
            <div style={{ fontSize: '13px', marginTop: 6, color: '#223344' }}>
              They are a {agentRole} powered by {aiConfig.model}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%', padding: '8px 12px',
              background: msg.role === 'user' ? '#112233' : '#0d1a0d',
              border: `1px solid ${msg.role === 'user' ? '#334466' : '#224422'}`,
              color: msg.role === 'user' ? '#aaccff' : '#aaffaa',
              fontSize: '15px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
            <div style={{ fontSize: '12px', color: '#333355', marginTop: 2 }}>
              {msg.role === 'user' ? 'You' : agentName} · {new Date(msg.ts).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ padding: '8px 12px', background: '#0d1a0d', border: '1px solid #224422', color: '#00ff88', fontSize: '15px' }}>
              ▌ thinking...
            </div>
          </div>
        )}
        {error && (
          <div style={{ padding: '6px 10px', background: '#1a0a0a', border: '1px solid #ff4444', color: '#ff8888', fontSize: '13px' }}>
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Clear history */}
      {messages.length > 0 && (
        <div style={{ padding: '4px 12px', borderTop: '1px solid #111122' }}>
          <button onClick={() => { setMessages([]); saveChat(agentId, []); }} style={{
            background: 'transparent', border: 'none', color: '#333355', cursor: 'pointer', fontSize: '13px', fontFamily: 'monospace',
          }}>🗑 Clear history</button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '2px solid var(--pixel-agent-border)', display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask anything... (Enter to send)"
          rows={2}
          style={{
            ...inputStyle, flex: 1, resize: 'none', fontSize: '15px',
            height: 60, padding: '8px',
          }}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
          padding: '0 12px', fontFamily: 'monospace', fontSize: '18px',
          background: loading || !input.trim() ? '#111122' : '#112211',
          color: loading || !input.trim() ? '#333344' : '#00ff88',
          border: '2px solid', borderColor: loading || !input.trim() ? '#222233' : '#00ff88',
          cursor: loading || !input.trim() ? 'default' : 'pointer', alignSelf: 'stretch',
        }}>▶</button>
      </div>
    </div>
  );
}
