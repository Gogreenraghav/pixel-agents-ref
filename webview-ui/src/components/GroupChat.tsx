import { useState, useRef, useEffect } from 'react';

interface ChatMsg {
  id: string; sender: string; senderRole: string; senderType: 'ceo' | 'agent' | 'system';
  content: string; ts: number; mentions: string[];
}

interface Props {
  agents: Array<{ id: string; name: string; role: string; aiConfig?: { connected: boolean } }>;
  ceoName: string;
  onClose: () => void;
}

const LS_KEY = 'pixeloffice_groupchat';

function loadMsgs(): ChatMsg[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function saveMsgs(msgs: ChatMsg[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(msgs.slice(-100))); } catch {}
}

export function GroupChat({ agents, ceoName, onClose }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(loadMsgs);
  const [input, setInput] = useState('');
  const [asCeo, setAsCeo] = useState(true);
  const [unread, setUnread] = useState(0);
  const [aiTyping, setAiTyping] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, aiTyping]);

  // Agent AI response when mentioned
  const agentRespond = async (mentionedNames: string[]) => {
    for (const name of mentionedNames) {
      const agent = agents.find(a => a.name === name);
      if (!agent?.aiConfig?.connected) continue;
      setAiTyping(name);
      await new Promise(r => setTimeout(r, 800)); // typing delay

      const prompt = `You are ${agent.name}, a ${agent.role}. You were just mentioned in the company group chat. Give a brief, professional acknowledgment (1-2 sentences). Be friendly but work-focused.`;
      try {
        const cfg = agent.aiConfig as any;
        const res = await fetch((cfg.baseUrl ?? '').replace(/\/$/, '') + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey ?? ''}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 80 }),
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content ?? `Hi! ${agent.name} here. I'll check this out.`;
        const aiMsg: ChatMsg = {
          id: `msg_${Date.now()}_${Math.random()}`,
          sender: agent.name,
          senderRole: agent.role,
          senderType: 'agent',
          content: reply,
          ts: Date.now(),
          mentions: [],
        };
        const updated = [...loadMsgs(), aiMsg];
        setMsgs(updated);
        saveMsgs(updated);
      } catch {
        const aiMsg: ChatMsg = {
          id: `msg_${Date.now()}_${Math.random()}`,
          sender: agent.name,
          senderRole: agent.role,
          senderType: 'agent',
          content: `Got it! I'll take a look. — ${agent.name}`,
          ts: Date.now(),
          mentions: [],
        };
        const updated = [...loadMsgs(), aiMsg];
        setMsgs(updated);
        saveMsgs(updated);
      }
      setAiTyping(null);
    }
  };

  const sendMsg = () => {
    const text = input.trim();
    if (!text) return;
    const mentions = agents.filter(a => text.includes(`@${a.name}`)).map(a => a.name);
    const newMsg: ChatMsg = {
      id: `msg_${Date.now()}`,
      sender: asCeo ? ceoName : 'Company',
      senderRole: asCeo ? 'CEO' : 'Announcement',
      senderType: asCeo ? 'ceo' : 'system',
      content: text,
      ts: Date.now(),
      mentions,
    };
    const updated = [...msgs, newMsg];
    setMsgs(updated);
    saveMsgs(updated);
    setInput('');
    setUnread(0);
    // Trigger AI response if agents mentioned
    if (mentions.length > 0) agentRespond(mentions);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  const renderContent = (content: string) => {
    const regex = /@(\w+)/g;
    const spans: React.ReactNode[] = [];
    let last = 0;
    let match;
    const text = content;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) spans.push(text.slice(last, match.index));
      spans.push(
        <span key={match.index} style={{ background: '#2a2a00', color: '#ffee55', padding: '0 4px', border: '1px solid #554400', fontWeight: 'bold' }}>
          {match[0]}
        </span>
      );
      last = regex.lastIndex;
    }
    if (last < text.length) spans.push(text.slice(last));
    return spans.length > 0 ? spans : content;
  };

  // @mention autocomplete
  const agentSuggestions = input.match(/@(\w*)$/);
  const showSuggestions = !!agentSuggestions;
  const searchTerm = agentSuggestions ? agentSuggestions[1].toLowerCase() : '';
  const filtered = agents.filter(a => a.name.toLowerCase().includes(searchTerm)).slice(0, 4);

  const insertMention = (name: string) => {
    const before = input.replace(/@\w*$/, '');
    setInput(before + '@' + name + ' ');
    inputRef.current?.focus();
  };

  const msgColor = (t: ChatMsg['senderType']) =>
    t === 'ceo' ? '#ffd700' : t === 'agent' ? '#66ddff' : '#88ffbb';

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 380, zIndex: 350,
      background: '#0d0d1e', borderLeft: '2px solid #334466',
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
    }}>
      {/* Header */}
      <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '22px' }}>💬</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#66ddff' }}>Team Chat</div>
          <div style={{ fontSize: '14px', color: '#667788' }}>{agents.length} agents online</div>
        </div>
        {unread > 0 && (
          <div style={{ background: '#ff4444', color: '#fff', fontSize: '14px', fontWeight: 'bold', padding: '2px 8px', borderRadius: 0 }}>
            {unread} new
          </div>
        )}
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.length === 0 && (
          <div style={{ color: '#445566', fontSize: '15px', textAlign: 'center', marginTop: 40 }}>
            No messages yet.<br/>Start the conversation!
          </div>
        )}
        {msgs.map(m => (
          <div key={m.id} style={{ padding: '8px 10px', background: m.senderType === 'ceo' ? '#1a1a00' : '#0d0d1a', border: `1px solid ${msgColor(m.senderType)}44` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '16px' }}>{m.senderType === 'ceo' ? '👑' : m.senderType === 'agent' ? '🤖' : '📢'}</span>
                <span style={{ fontSize: '16px', color: msgColor(m.senderType), fontWeight: 'bold' }}>{m.sender}</span>
                {m.senderType !== 'system' && <span style={{ fontSize: '13px', color: '#556677' }}>({m.senderRole})</span>}
              </div>
              <span style={{ fontSize: '12px', color: '#445566' }}>{formatTime(m.ts)}</span>
            </div>
            <div style={{ fontSize: '15px', color: '#ccddee', lineHeight: 1.5 }}>
              {renderContent(m.content)}
            </div>
            {m.mentions.length > 0 && (
              <div style={{ fontSize: '12px', color: '#ffee55', marginTop: 4 }}>
                👀 Mentioned: {m.mentions.map(n => `@${n}`).join(', ')}
              </div>
            )}
          </div>
        ))}
            {aiTyping && (
              <div style={{ padding: '8px 10px', background: '#0d0d1a', border: '1px solid #334466', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '16px' }}>🤖</span>
                <span style={{ fontSize: '15px', color: '#66ddff' }}>{aiTyping} is typing</span>
                <span style={{ color: '#44aaff' }}>...</span>
              </div>
            )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: '#0a0a14', borderTop: '2px solid #223355', padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => setAsCeo(true)} style={{ flex: 1, padding: '6px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', background: asCeo ? '#2a2a00' : '#0a0a14', color: asCeo ? '#ffd700' : '#556677', border: `2px solid ${asCeo ? '#554400' : '#223355'}`, cursor: 'pointer' }}>
            👑 As CEO
          </button>
          <button onClick={() => setAsCeo(false)} style={{ flex: 1, padding: '6px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', background: !asCeo ? '#0a1a0a' : '#0a0a14', color: !asCeo ? '#00ff88' : '#556677', border: `2px solid ${!asCeo ? '#004400' : '#223355'}`, cursor: 'pointer' }}>
            📢 Announcement
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMsg(); } }}
              placeholder="@Mention agents, type message..."
              style={{ width: '100%', background: '#0a0a14', color: '#aaddff', border: '2px solid #334466', fontFamily: 'monospace', fontSize: '15px', padding: '8px 10px', boxSizing: 'border-box' }}
            />
            {/* @mention suggestions dropdown */}
            {showSuggestions && filtered.length > 0 && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#0d0d1e', border: '2px solid #334466', zIndex: 10, marginBottom: 4 }}>
                {filtered.map(a => (
                  <div key={a.id} onClick={() => insertMention(a.name)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '15px', color: '#66ddff', borderBottom: '1px solid #223355' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#112233')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    🤖 {a.name} <span style={{ color: '#667788' }}>({a.role})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={sendMsg} style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>➤</button>
        </div>
        <div style={{ fontSize: '12px', color: '#445566', marginTop: 4 }}>Type @ and select agent to mention</div>
      </div>
    </div>
  );
}
