import { useState, useRef } from 'react';

interface HiredAgent {
  id: string; name: string; role: string; dept: string;
  aiConfig?: { provider: string; baseUrl?: string; apiKey?: string; model: string; connected: boolean };
}

interface InboxMessage {
  id: string;
  from: string;        // 'Owner' or agent name
  to: string;          // 'CEO' or agent name
  subject: string;
  body: string;
  type: 'task' | 'file' | 'report' | 'message';
  fileName?: string;
  fileContent?: string;
  timestamp: string;
  read: boolean;
  aiResponse?: string;  // CEO's AI reply
  forwarded?: boolean;  // CEO ne forward kiya
  forwardedTo?: string;
}

const LS_INBOX = 'pixeloffice_ceo_inbox';

function loadInbox(): InboxMessage[] {
  try { return JSON.parse(localStorage.getItem(LS_INBOX) ?? '[]'); } catch { return []; }
}
function saveInbox(msgs: InboxMessage[]) {
  try { localStorage.setItem(LS_INBOX, JSON.stringify(msgs.slice(-100))); } catch {}
}

interface Props {
  agents: HiredAgent[];
}

export function CEOInbox({ agents }: Props) {
  const [messages, setMessages] = useState<InboxMessage[]>(loadInbox);
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeType, setComposeType] = useState<'task' | 'message' | 'file'>('task');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ceo = agents.find(a => a.role === 'CEO');
  const unread = messages.filter(m => !m.read).length;

  const save = (msgs: InboxMessage[]) => { setMessages(msgs); saveInbox(msgs); };

  const sendToCEO = () => {
    if (!composeSubject.trim() && !composeBody.trim()) return;
    const msg: InboxMessage = {
      id: `msg_${Date.now()}`,
      from: 'Owner (You)',
      to: 'CEO',
      subject: composeSubject || '(No subject)',
      body: composeBody,
      type: composeType,
      fileName: fileName || undefined,
      fileContent: fileContent || undefined,
      timestamp: new Date().toLocaleString(),
      read: false,
    };
    save([msg, ...messages]);
    setShowCompose(false);
    setComposeSubject(''); setComposeBody(''); setFileName(''); setFileContent('');
    setSelected(msg);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setFileContent(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const markRead = (msg: InboxMessage) => {
    const updated = messages.map(m => m.id === msg.id ? { ...m, read: true } : m);
    save(updated);
    setSelected({ ...msg, read: true });
  };

  const askCEOAI = async (msg: InboxMessage) => {
    if (!ceo?.aiConfig) return;
    setAiLoading(msg.id);
    const prompt = `You are ${ceo.name}, the CEO of this company. You received this from your owner:\n\nSubject: ${msg.subject}\n${msg.body}${msg.fileContent ? `\n\nAttached file (${msg.fileName}):\n${msg.fileContent.slice(0, 2000)}` : ''}\n\nRespond as CEO: acknowledge, analyze, and decide how to handle it. Keep it under 150 words.`;
    try {
      const res = await fetch((ceo.aiConfig.baseUrl ?? '').replace(/\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ceo.aiConfig.apiKey}` },
        body: JSON.stringify({ model: ceo.aiConfig.model, messages: [{ role: 'user', content: prompt }], max_tokens: 200 }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? '(no response)';
      const updated = messages.map(m => m.id === msg.id ? { ...m, aiResponse: reply, forwarded: false } : m);
      save(updated);
      setSelected(prev => prev?.id === msg.id ? { ...prev, aiResponse: reply } : prev);
    } catch (e: any) {
      const updated = messages.map(m => m.id === msg.id ? { ...m, aiResponse: `Error: ${e.message}` } : m);
      save(updated);
    } finally { setAiLoading(null); }
  };

  const forwardToAgent = (msg: InboxMessage, agentName: string) => {
    const fwd: InboxMessage = {
      id: `fwd_${Date.now()}`,
      from: ceo?.name ?? 'CEO',
      to: agentName,
      subject: `FWD: ${msg.subject}`,
      body: `CEO forwarded this to you.\n\nOriginal message:\n${msg.body}`,
      type: 'task',
      fileName: msg.fileName,
      fileContent: msg.fileContent,
      timestamp: new Date().toLocaleString(),
      read: false,
    };
    const updated = messages.map(m => m.id === msg.id ? { ...m, forwarded: true, forwardedTo: agentName } : m);
    save([fwd, ...updated]);
    setSelected(prev => prev?.id === msg.id ? { ...prev, forwarded: true, forwardedTo: agentName } : prev);
  };

  const inp: React.CSSProperties = {
    background: '#0a0a14', color: '#aaddff', border: '2px solid #334466',
    fontFamily: 'monospace', fontSize: '16px', padding: '8px 10px', width: '100%', boxSizing: 'border-box',
  };

  const typeColor: Record<string, string> = { task: '#ffcc00', file: '#88aaff', report: '#00ffaa', message: '#cc88ff' };

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Sidebar — message list */}
      <div style={{ width: 280, borderRight: '2px solid #223355', display: 'flex', flexDirection: 'column', background: '#080812' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '2px solid #223355', background: '#0d0d1a' }}>
          <div style={{ fontSize: '20px', color: '#ffd700', fontWeight: 'bold' }}>
            👑 CEO Inbox {unread > 0 && <span style={{ fontSize: '16px', background: '#ff4444', color: '#fff', padding: '2px 8px', marginLeft: 8 }}>{unread}</span>}
          </div>
          {ceo ? (
            <div style={{ fontSize: '15px', color: '#66ddff', marginTop: 4 }}>{ceo.name} · {ceo.aiConfig ? '🤖 AI Ready' : '⚠ No AI'}</div>
          ) : (
            <div style={{ fontSize: '14px', color: '#ff8844', marginTop: 4 }}>⚠ No CEO hired yet</div>
          )}
        </div>

        <button onClick={() => setShowCompose(v => !v)} style={{
          margin: '10px 12px', padding: '10px', fontFamily: 'monospace', fontSize: '17px', fontWeight: 'bold',
          background: '#0d1a2a', color: '#66aaff', border: '2px solid #334466', cursor: 'pointer',
        }}>✉ Send to CEO</button>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {messages.length === 0 && (
            <div style={{ padding: '20px 16px', color: '#445566', fontSize: '15px', textAlign: 'center' }}>
              No messages yet.<br />Send something to CEO!
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} onClick={() => { setSelected(msg); markRead(msg); }} style={{
              padding: '12px 14px', borderBottom: '1px solid #111133', cursor: 'pointer',
              background: selected?.id === msg.id ? '#112233' : msg.read ? 'transparent' : '#0d1122',
              borderLeft: `3px solid ${typeColor[msg.type] ?? '#334466'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', color: msg.read ? '#667788' : '#aaddff', fontWeight: msg.read ? 'normal' : 'bold' }}>
                  {msg.from === 'Owner (You)' ? '👤 You' : `🤖 ${msg.from}`}
                </span>
                <span style={{ fontSize: '13px', color: typeColor[msg.type], fontWeight: 'bold' }}>[{msg.type}]</span>
              </div>
              <div style={{ fontSize: '16px', color: msg.read ? '#556677' : '#ddeeff', fontWeight: 'bold', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {msg.subject}
              </div>
              <div style={{ fontSize: '13px', color: '#334455', marginTop: 3 }}>{msg.timestamp}</div>
              {msg.forwarded && <div style={{ fontSize: '13px', color: '#00ff88', marginTop: 3 }}>✅ Forwarded to {msg.forwardedTo}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Compose */}
        {showCompose && (
          <div style={{ padding: '16px', borderBottom: '2px solid #223355', background: '#0d0d1a', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '18px', color: '#66ddff', fontWeight: 'bold' }}>✉ New Message → CEO</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select style={{ ...inp, flex: 1 }} value={composeType} onChange={e => setComposeType(e.target.value as any)}>
                <option value="task">📋 Task</option>
                <option value="message">💬 Message</option>
                <option value="file">📄 File</option>
              </select>
              <input style={{ ...inp, flex: 2 }} placeholder="Subject..." value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
            </div>
            <textarea style={{ ...inp, height: 80, resize: 'none', lineHeight: 1.5 }} placeholder="Message body / instructions..." value={composeBody} onChange={e => setComposeBody(e.target.value)} />
            {composeType === 'file' && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={() => fileRef.current?.click()} style={{ ...inp, width: 'auto', cursor: 'pointer', background: '#112233', color: '#66aaff' }}>📎 Attach File</button>
                {fileName && <span style={{ color: '#00ff88', fontSize: '15px' }}>✅ {fileName}</span>}
                <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.doc,.docx,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={sendToCEO} style={{ flex: 1, padding: '10px', fontFamily: 'monospace', fontSize: '17px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>▶ Send to CEO</button>
              <button onClick={() => setShowCompose(false)} style={{ padding: '10px 20px', fontFamily: 'monospace', fontSize: '17px', background: '#1a0a0a', color: '#ff6666', border: '2px solid #aa3333', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Selected message view */}
        {selected ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '22px', color: '#aaddff', fontWeight: 'bold', marginBottom: 8 }}>{selected.subject}</div>
              <div style={{ display: 'flex', gap: 20, fontSize: '15px', color: '#667788' }}>
                <span>From: <span style={{ color: '#88ccff' }}>{selected.from}</span></span>
                <span>To: <span style={{ color: '#ffd700' }}>{selected.to}</span></span>
                <span>{selected.timestamp}</span>
                <span style={{ color: typeColor[selected.type], fontWeight: 'bold' }}>[{selected.type.toUpperCase()}]</span>
              </div>
            </div>

            <div style={{ background: '#0d0d1e', border: '2px solid #223355', padding: '16px', fontSize: '17px', color: '#ccddee', lineHeight: 1.7, marginBottom: 16 }}>
              {selected.body || <span style={{ color: '#445566' }}>(empty)</span>}
            </div>

            {selected.fileContent && (
              <div style={{ background: '#080f08', border: '2px solid #1a5a2a', padding: '14px', marginBottom: 16 }}>
                <div style={{ fontSize: '15px', color: '#557755', marginBottom: 8 }}>📄 {selected.fileName}</div>
                <pre style={{ margin: 0, fontSize: '14px', color: '#aaffaa', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{selected.fileContent.slice(0, 1000)}{selected.fileContent.length > 1000 ? '\n...(truncated)' : ''}</pre>
              </div>
            )}

            {/* CEO AI Response */}
            {ceo?.aiConfig && (
              <div style={{ marginBottom: 16 }}>
                {selected.aiResponse ? (
                  <div style={{ background: '#0a1a0a', border: '2px solid #1a7a3a', padding: '16px' }}>
                    <div style={{ fontSize: '16px', color: '#ffd700', fontWeight: 'bold', marginBottom: 10 }}>👑 {ceo.name} (CEO) responds:</div>
                    <div style={{ fontSize: '17px', color: '#aaffaa', lineHeight: 1.7 }}>{selected.aiResponse}</div>
                  </div>
                ) : (
                  <button onClick={() => askCEOAI(selected)} disabled={aiLoading === selected.id} style={{
                    padding: '10px 20px', fontFamily: 'monospace', fontSize: '17px', fontWeight: 'bold',
                    background: '#112211', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer',
                  }}>
                    {aiLoading === selected.id ? '⏳ CEO is thinking...' : '👑 Ask CEO to respond (AI)'}
                  </button>
                )}
              </div>
            )}

            {/* Forward to agent */}
            {agents.filter(a => a.role !== 'CEO').length > 0 && (
              <div style={{ borderTop: '2px solid #223355', paddingTop: 16 }}>
                <div style={{ fontSize: '17px', color: '#66ddff', fontWeight: 'bold', marginBottom: 10 }}>📤 CEO Forward to Agent:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {agents.filter(a => a.role !== 'CEO').map(a => (
                    <button key={a.id} onClick={() => forwardToAgent(selected, a.name)} style={{
                      padding: '8px 14px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold',
                      background: '#0d1a2a', color: '#88aaff', border: '2px solid #334466', cursor: 'pointer',
                    }}>→ {a.name} ({a.role})</button>
                  ))}
                </div>
                {selected.forwarded && <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 'bold', marginTop: 10 }}>✅ Forwarded to {selected.forwardedTo}</div>}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#334455', fontSize: '18px' }}>
            <div style={{ fontSize: '48px', marginBottom: 16 }}>👑</div>
            <div>Select a message to view</div>
            <div style={{ fontSize: '15px', color: '#223344', marginTop: 8 }}>or send something to CEO</div>
          </div>
        )}
      </div>
    </div>
  );
}
