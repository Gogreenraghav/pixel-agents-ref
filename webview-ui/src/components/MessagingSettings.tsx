import { useState } from 'react';

interface Props {
  onClose: () => void;
}

interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  connected: boolean;
  lastTest?: string;
}

interface WhatsAppConfig {
  enabled: boolean;
  apiUrl: string;
  apiToken: string;
  phoneNumber: string;
  connected: boolean;
  lastTest?: string;
}

const LS_TELEGRAM = 'pixeloffice_telegram';
const LS_WHATSAPP = 'pixeloffice_whatsapp';

function loadTelegram(): TelegramConfig {
  try { return JSON.parse(localStorage.getItem(LS_TELEGRAM) ?? '{"enabled":false,"botToken":"","chatId":"","connected":false}'); } catch { return { enabled: false, botToken: '', chatId: '', connected: false }; }
}
function saveTelegram(cfg: TelegramConfig) {
  try { localStorage.setItem(LS_TELEGRAM, JSON.stringify(cfg)); } catch {}
}
function loadWhatsApp(): WhatsAppConfig {
  try { return JSON.parse(localStorage.getItem(LS_WHATSAPP) ?? '{"enabled":false,"apiUrl":"","apiToken":"","phoneNumber":"","connected":false}'); } catch { return { enabled: false, apiUrl: '', apiToken: '', phoneNumber: '', connected: false }; }
}
function saveWhatsApp(cfg: WhatsAppConfig) {
  try { localStorage.setItem(LS_WHATSAPP, JSON.stringify(cfg)); } catch {}
}

export function MessagingSettings({ onClose }: Props) {
  const [telegram, setTelegram] = useState<TelegramConfig>(loadTelegram);
  const [whatsapp, setWhatsapp] = useState<WhatsAppConfig>(loadWhatsApp);
  const [testMsg, setTestMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveTelegram = () => {
    setSaving(true);
    saveTelegram(telegram);
    setTimeout(() => setSaving(false), 1000);
  };

  const handleSaveWhatsApp = () => {
    setSaving(true);
    saveWhatsApp(whatsapp);
    setTimeout(() => setSaving(false), 1000);
  };

  const testTelegram = async () => {
    if (!telegram.botToken || !telegram.chatId) {
      setTestMsg('❌ Please enter Bot Token and Chat ID');
      return;
    }
    setTestMsg('⏳ Testing Telegram connection...');
    try {
      const res = await fetch(`https://api.telegram.org/bot${telegram.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegram.chatId,
          text: '✅ Pixel Office: Telegram connected successfully! You will receive company updates here.',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestMsg('✅ Telegram connected! Test message sent.');
        setTelegram(t => ({ ...t, connected: true, lastTest: new Date().toLocaleString() }));
        saveTelegram({ ...telegram, connected: true, lastTest: new Date().toLocaleString() });
      } else {
        setTestMsg(`❌ Error: ${data.description}`);
        setTelegram(t => ({ ...t, connected: false }));
      }
    } catch (e: any) {
      setTestMsg(`❌ Connection failed: ${e.message}`);
    }
  };

  const getChatId = async () => {
    if (!telegram.botToken) {
      setTestMsg('❌ Please enter Bot Token first');
      return;
    }
    setTestMsg('📨 Opening Telegram bot... Send it a message first!');
    
    // Extract bot username and open Telegram
    const parts = telegram.botToken.split(':');
    if (parts.length >= 2) {
      window.open(`https://t.me/${parts[1]}`, '_blank');
    }
    
    // Try to get updates after 5 seconds
    setTimeout(async () => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${telegram.botToken}/getUpdates`);
        const data = await res.json();
        if (data.ok && data.result && data.result.length > 0) {
          const chat = data.result[data.result.length - 1]?.message?.chat;
          if (chat && chat.id) {
            setTelegram(t => ({ ...t, chatId: String(chat.id) }));
            setTestMsg(`✅ Chat ID found: ${chat.id}! Now click "Test Connection".`);
            return;
          }
        }
        setTestMsg('📨 No messages found. Send a message to your bot on Telegram, then click "Get Chat ID" again.');
      } catch (e: any) {
        setTestMsg(`❌ Error: ${e.message}`);
      }
    }, 5000);
  };

  const testWhatsApp = async () => {
    if (!whatsapp.apiUrl || !whatsapp.apiToken) {
      setTestMsg('❌ Please enter API URL and Token');
      return;
    }
    setTestMsg('⏳ Testing WhatsApp connection...');
    try {
      const res = await fetch(`${whatsapp.apiUrl}/health`, {
        headers: { 'Authorization': `Bearer ${whatsapp.apiToken}` },
      });
      if (res.ok) {
        setTestMsg('✅ WhatsApp connected!');
        setWhatsapp(w => ({ ...w, connected: true, lastTest: new Date().toLocaleString() }));
        saveWhatsApp({ ...whatsapp, connected: true, lastTest: new Date().toLocaleString() });
      } else {
        setTestMsg('❌ WhatsApp API not responding');
        setWhatsapp(w => ({ ...w, connected: false }));
      }
    } catch (e: any) {
      setTestMsg(`❌ Connection failed: ${e.message}`);
    }
  };

  const inp: React.CSSProperties = {
    background: '#0a0a14', color: '#aaddff', border: '2px solid #334466',
    fontFamily: 'monospace', fontSize: '16px', padding: '10px 12px', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 720, maxHeight: '90vh', background: '#0d0d1e', border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>📱</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Messaging Integration</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Connect Telegram & WhatsApp for CEO notifications</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Telegram Section */}
          <div style={{ background: '#0a0a18', border: `2px solid ${telegram.connected ? '#00ff88' : '#334466'}`, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '32px' }}>📨</span>
                <div>
                  <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold' }}>Telegram</div>
                  <div style={{ fontSize: '14px', color: telegram.connected ? '#00ff88' : '#667788' }}>
                    {telegram.connected ? '✅ Connected' : '❌ Not Connected'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTelegram(t => ({ ...t, enabled: !t.enabled }))}
                style={{
                  padding: '8px 20px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                  background: telegram.enabled ? '#0a1a0a' : '#1a0606',
                  color: telegram.enabled ? '#00ff88' : '#ff4444',
                  border: `2px solid ${telegram.enabled ? '#00ff88' : '#ff4444'}`,
                  cursor: 'pointer',
                }}
              >
                {telegram.enabled ? '🔔 Enabled' : '🔕 Disabled'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '15px', color: '#8899aa', marginBottom: 6 }}>🤖 Bot Token *</div>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={telegram.botToken}
                  onChange={e => setTelegram(t => ({ ...t, botToken: e.target.value }))}
                  style={inp}
                />
              </div>
              <div>
                <div style={{ fontSize: '15px', color: '#8899aa', marginBottom: 6 }}>💬 Chat ID</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="Chat ID will appear here..."
                    value={telegram.chatId}
                    readOnly
                    style={{ ...inp, flex: 1, opacity: telegram.chatId ? 1 : 0.6 }}
                  />
                  <button
                    onClick={getChatId}
                    style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', background: '#1a1a00', color: '#ffdd44', border: '2px solid #ffdd44', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    🔍 Get Chat ID
                  </button>
                </div>
              </div>
              <div style={{ background: '#0d0d1a', border: '1px solid #223355', padding: '12px', fontSize: '14px', color: '#667788' }}>
                💡 <span style={{ color: '#aaddff' }}>Setup Steps:</span><br/>
                1. Get Bot Token from <span style={{ color: '#00ff88' }}>@BotFather</span> on Telegram<br/>
                2. Click "Get Chat ID" → Bot page opens in Telegram<br/>
                3. Send any message to the bot<br/>
                4. Chat ID will be auto-detected!
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={testTelegram}
                  style={{ flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}
                >
                  🧪 Test Connection
                </button>
                <button
                  onClick={handleSaveTelegram}
                  style={{ flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: saving ? '#1a1a00' : '#0a1a0a', color: saving ? '#ffdd44' : '#00ff88', border: '2px solid #334466', cursor: 'pointer' }}
                >
                  💾 {saving ? 'Saved!' : 'Save'}
                </button>
              </div>
              {telegram.lastTest && (
                <div style={{ fontSize: '13px', color: '#445566' }}>Last tested: {telegram.lastTest}</div>
              )}
            </div>
          </div>

          {/* WhatsApp Section */}
          <div style={{ background: '#0a0a18', border: `2px solid ${whatsapp.connected ? '#00ff88' : '#334466'}`, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '32px' }}>💬</span>
                <div>
                  <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold' }}>WhatsApp</div>
                  <div style={{ fontSize: '14px', color: whatsapp.connected ? '#00ff88' : '#667788' }}>
                    {whatsapp.connected ? '✅ Connected' : '❌ Not Connected'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setWhatsapp(w => ({ ...w, enabled: !w.enabled }))}
                style={{
                  padding: '8px 20px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                  background: whatsapp.enabled ? '#0a1a0a' : '#1a0606',
                  color: whatsapp.enabled ? '#00ff88' : '#ff4444',
                  border: `2px solid ${whatsapp.enabled ? '#00ff88' : '#ff4444'}`,
                  cursor: 'pointer',
                }}
              >
                {whatsapp.enabled ? '🔔 Enabled' : '🔕 Disabled'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '15px', color: '#8899aa', marginBottom: 6 }}>🌐 WhatsApp API URL *</div>
                <input
                  placeholder="https://api.whatsapp.com/v1 (or your provider URL)"
                  value={whatsapp.apiUrl}
                  onChange={e => setWhatsapp(w => ({ ...w, apiUrl: e.target.value }))}
                  style={inp}
                />
              </div>
              <div>
                <div style={{ fontSize: '15px', color: '#8899aa', marginBottom: 6 }}>🔑 API Token *</div>
                <input
                  type="password"
                  placeholder="Your WhatsApp API Token"
                  value={whatsapp.apiToken}
                  onChange={e => setWhatsapp(w => ({ ...w, apiToken: e.target.value }))}
                  style={inp}
                />
              </div>
              <div>
                <div style={{ fontSize: '15px', color: '#8899aa', marginBottom: 6 }}>📱 Phone Number</div>
                <input
                  placeholder="+91 9876543210"
                  value={whatsapp.phoneNumber}
                  onChange={e => setWhatsapp(w => ({ ...w, phoneNumber: e.target.value }))}
                  style={inp}
                />
              </div>
              <div style={{ background: '#0d0d1a', border: '1px solid #223355', padding: '12px', fontSize: '14px', color: '#667788' }}>
                💡 <span style={{ color: '#aaddff' }}>Supported Providers:</span> Twilio, MessageBird, Vonage, or any WhatsApp Business API provider. Check their docs for API URL and token format.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={testWhatsApp}
                  style={{ flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}
                >
                  🧪 Test Connection
                </button>
                <button
                  onClick={handleSaveWhatsApp}
                  style={{ flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: saving ? '#1a1a00' : '#0a1a0a', color: saving ? '#ffdd44' : '#00ff88', border: '2px solid #334466', cursor: 'pointer' }}
                >
                  💾 {saving ? 'Saved!' : 'Save'}
                </button>
              </div>
              {whatsapp.lastTest && (
                <div style={{ fontSize: '13px', color: '#445566' }}>Last tested: {whatsapp.lastTest}</div>
              )}
            </div>
          </div>

          {/* Test Message Result */}
          {testMsg && (
            <div style={{ background: '#0d0d1a', border: `2px solid ${testMsg.includes('✅') ? '#00ff88' : testMsg.includes('⏳') || testMsg.includes('📨') ? '#ffdd44' : '#ff4444'}`, padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '16px', color: testMsg.includes('✅') ? '#00ff88' : testMsg.includes('⏳') || testMsg.includes('📨') ? '#ffdd44' : '#ff4444' }}>{testMsg}</span>
            </div>
          )}

          {/* Info Box */}
          <div style={{ background: '#0d0d1a', border: '1px solid #223355', padding: '16px' }}>
            <div style={{ fontSize: '18px', color: '#66ddff', fontWeight: 'bold', marginBottom: 10 }}>📋 How It Works</div>
            <div style={{ fontSize: '15px', color: '#8899aa', lineHeight: 1.8 }}>
              <div>1. Connect Telegram/WhatsApp using your API credentials</div>
              <div>2. When any event happens (task completed, client added, etc.), the CEO receives a notification</div>
              <div>3. The CEO (main agent) will respond to incoming messages</div>
              <div>4. Configure webhook events in the Webhooks tab to control what notifications you receive</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
