import { useState, useEffect } from 'react';

interface EmailConfig {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  enabled: boolean;
}

const LS_EMAIL_CONFIG = 'pixeloffice_email_config';
const LS_EMAIL_TEMPLATES = 'pixeloffice_email_templates';

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  { id: 'daily_report', name: '📊 Daily Report', subject: 'Your Daily Company Report', enabled: true },
  { id: 'weekly_report', name: '📈 Weekly Report', subject: 'Weekly Summary Report', enabled: true },
  { id: 'client_added', name: '🤝 New Client Alert', subject: 'New Client Added to Company', enabled: true },
  { id: 'task_completed', name: '✅ Task Completed', subject: 'Task Completed Successfully', enabled: false },
  { id: 'payment_received', name: '💰 Payment Received', subject: 'Payment Confirmation', enabled: true },
  { id: 'agent_hired', name: '👤 New Agent Hired', subject: 'New Team Member Joined', enabled: false },
];

export function EmailSettings({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<EmailConfig>({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    fromName: 'Pixel Office',
    enabled: false,
  });

  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'send'>('settings');

  useEffect(() => {
    const stored = localStorage.getItem(LS_EMAIL_CONFIG);
    if (stored) setConfig(JSON.parse(stored));
    const storedTemplates = localStorage.getItem(LS_EMAIL_TEMPLATES);
    if (storedTemplates) setTemplates(JSON.parse(storedTemplates));
  }, []);

  const saveConfig = (updated: EmailConfig) => {
    setConfig(updated);
    localStorage.setItem(LS_EMAIL_CONFIG, JSON.stringify(updated));
  };

  const toggleTemplate = (id: string) => {
    const updated = templates.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t);
    setTemplates(updated);
    localStorage.setItem(LS_EMAIL_TEMPLATES, JSON.stringify(updated));
  };

  const sendTestEmail = async () => {
    if (!testEmail || !config.smtpHost) return;
    setTestStatus('sending');
    
    // Simulated email send (in real app, this would call backend API)
    setTimeout(() => {
      if (config.smtpHost && testEmail.includes('@')) {
        setTestStatus('success');
        // Trigger webhook for email sent event
        try {
          const webhooks = JSON.parse(localStorage.getItem('pixeloffice_webhooks') ?? '[]');
          const enabled = webhooks.filter((w: any) => w.enabled);
          enabled.forEach((webhook: any) => {
            if (webhook.events.includes('email_sent')) {
              console.log(`Email webhook triggered: ${webhook.url}`);
            }
          });
        } catch {}
      } else {
        setTestStatus('error');
      }
      setTimeout(() => setTestStatus('idle'), 3000);
    }, 1500);
  };

  const sendReport = async (type: 'daily' | 'weekly') => {
    setTestStatus('sending');
    
    // Gather data for report
    const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
    const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
    const clients = JSON.parse(localStorage.getItem('pixeloffice_clients') ?? '[]');
    const invoices = JSON.parse(localStorage.getItem('pixeloffice_invoices') ?? '[]');
    
    const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
    const pendingTasks = tasks.filter((t: any) => t.status !== 'done').length;
    const paidRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.total, 0);
    
    const reportData = {
      type,
      date: new Date().toLocaleDateString(),
      stats: {
        totalTasks: tasks.length,
        completedTasks,
        pendingTasks,
        totalAgents: agents.length,
        totalClients: clients.length,
        revenue: paidRevenue,
      }
    };
    
    console.log('Report generated:', reportData);
    
    setTimeout(() => {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 700, maxHeight: '90vh', background: '#0d0d1e',
        border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>📧</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Email Integration</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>Configure SMTP & Email Templates</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 50, height: 26, background: config.enabled ? '#00ff88' : '#333',
              borderRadius: 13, position: 'relative', cursor: 'pointer',
            }} onClick={() => saveConfig({ ...config, enabled: !config.enabled })}>
              <div style={{
                width: 22, height: 22, background: '#fff', borderRadius: '50%',
                position: 'absolute', top: 2, left: config.enabled ? 26 : 2,
                transition: 'left 0.2s',
              }} />
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #223355' }}>
          {([
            { id: 'settings', label: '⚙️ SMTP Settings' },
            { id: 'templates', label: '📝 Templates' },
            { id: 'send', label: '🚀 Send Report' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
              background: activeTab === tab.id ? '#112233' : 'transparent',
              color: activeTab === tab.id ? '#66ddff' : '#445566',
              border: 'none', borderBottom: activeTab === tab.id ? '3px solid #66ddff' : '3px solid transparent',
              cursor: 'pointer',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px' }}>
                <div style={{ fontSize: '18px', color: '#ffdd44', marginBottom: 12 }}>⚙️ SMTP Configuration</div>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 4 }}>SMTP Host</label>
                  <input
                    type="text"
                    value={config.smtpHost}
                    onChange={e => saveConfig({ ...config, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    style={{
                      width: '100%', padding: '10px', background: '#0d0d1e', color: '#fff',
                      border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 4 }}>Port</label>
                    <input
                      type="text"
                      value={config.smtpPort}
                      onChange={e => saveConfig({ ...config, smtpPort: e.target.value })}
                      placeholder="587"
                      style={{
                        width: '100%', padding: '10px', background: '#0d0d1e', color: '#fff',
                        border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 4 }}>From Email</label>
                    <input
                      type="email"
                      value={config.fromEmail}
                      onChange={e => saveConfig({ ...config, fromEmail: e.target.value })}
                      placeholder="noreply@company.com"
                      style={{
                        width: '100%', padding: '10px', background: '#0d0d1e', color: '#fff',
                        border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 4 }}>Username / Email</label>
                  <input
                    type="text"
                    value={config.smtpUser}
                    onChange={e => saveConfig({ ...config, smtpUser: e.target.value })}
                    placeholder="your@email.com"
                    style={{
                      width: '100%', padding: '10px', background: '#0d0d1e', color: '#fff',
                      border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 4 }}>Password / App Password</label>
                  <input
                    type="password"
                    value={config.smtpPass}
                    onChange={e => saveConfig({ ...config, smtpPass: e.target.value })}
                    placeholder="••••••••"
                    style={{
                      width: '100%', padding: '10px', background: '#0d0d1e', color: '#fff',
                      border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#8899aa', fontSize: '14px', marginBottom: 4 }}>From Name</label>
                  <input
                    type="text"
                    value={config.fromName}
                    onChange={e => saveConfig({ ...config, fromName: e.target.value })}
                    placeholder="Pixel Office"
                    style={{
                      width: '100%', padding: '10px', background: '#0d0d1e', color: '#fff',
                      border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px',
                    }}
                  />
                </div>
              </div>

              {/* Test Connection */}
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px' }}>
                <div style={{ fontSize: '18px', color: '#ffdd44', marginBottom: 12 }}>🔗 Test Connection</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    style={{
                      flex: 1, padding: '10px', background: '#0d0d1e', color: '#fff',
                      border: '1px solid #334466', fontFamily: 'monospace', fontSize: '15px',
                    }}
                  />
                  <button
                    onClick={sendTestEmail}
                    disabled={testStatus === 'sending'}
                    style={{
                      padding: '10px 20px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold',
                      background: testStatus === 'success' ? '#00ff88' : testStatus === 'error' ? '#ff4444' : '#2255aa',
                      color: '#fff', border: 'none', cursor: testStatus === 'sending' ? 'wait' : 'pointer',
                    }}
                  >
                    {testStatus === 'sending' ? '⏳ Sending...' : testStatus === 'success' ? '✅ Sent!' : testStatus === 'error' ? '❌ Failed' : '📤 Send Test'}
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#445566', marginTop: 8 }}>
                  💡 Gmail users: Use <a href="https://myaccount.google.com/apppasswords" target="_blank" style={{ color: '#66ddff' }}>App Password</a> instead of regular password
                </div>
              </div>

            </div>
          )}

          {activeTab === 'templates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '16px', color: '#667788', marginBottom: 8 }}>
                Toggle which events trigger automatic emails
              </div>
              
              {templates.map(template => (
                <div key={template.id} style={{
                  background: template.enabled ? '#0a1a1a' : '#0a0a14',
                  border: `2px solid ${template.enabled ? '#00ff88' : '#334466'}`,
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 44, height: 24, background: template.enabled ? '#00ff88' : '#333',
                    borderRadius: 12, position: 'relative', cursor: 'pointer',
                  }} onClick={() => toggleTemplate(template.id)}>
                    <div style={{
                      width: 20, height: 20, background: '#fff', borderRadius: '50%',
                      position: 'absolute', top: 2, left: template.enabled ? 22 : 2,
                      transition: 'left 0.2s',
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '17px', color: template.enabled ? '#00ff88' : '#667788', fontWeight: 'bold' }}>
                      {template.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#445566' }}>{template.subject}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'send' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: 10 }}>📊</div>
                <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 8 }}>Send Company Report</div>
                <div style={{ fontSize: '15px', color: '#667788', marginBottom: 16 }}>
                  Generate and email current company statistics
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={() => sendReport('daily')}
                    disabled={testStatus === 'sending'}
                    style={{
                      padding: '16px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                      background: '#0a2a0a', color: '#00ff88', border: '2px solid #00ff88',
                      cursor: testStatus === 'sending' ? 'wait' : 'pointer',
                    }}
                  >
                    📊 Daily Report
                  </button>
                  <button
                    onClick={() => sendReport('weekly')}
                    disabled={testStatus === 'sending'}
                    style={{
                      padding: '16px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                      background: '#1a1a0a', color: '#ffdd44', border: '2px solid #ffdd44',
                      cursor: testStatus === 'sending' ? 'wait' : 'pointer',
                    }}
                  >
                    📈 Weekly Report
                  </button>
                </div>

                {testStatus === 'sending' && (
                  <div style={{ marginTop: 16, color: '#66ddff', fontSize: '16px' }}>
                    ⏳ Generating and sending report...
                  </div>
                )}
                {testStatus === 'success' && (
                  <div style={{ marginTop: 16, color: '#00ff88', fontSize: '16px' }}>
                    ✅ Report sent successfully!
                  </div>
                )}
              </div>

              {/* Quick Stats Preview */}
              <div style={{ background: '#0a0a18', border: '2px solid #334466', padding: '16px' }}>
                <div style={{ fontSize: '18px', color: '#ffdd44', marginBottom: 12 }}>📋 Report Preview</div>
                {(() => {
                  const tasks = JSON.parse(localStorage.getItem('pixeloffice_tasks') ?? '[]');
                  const agents = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]');
                  const invoices = JSON.parse(localStorage.getItem('pixeloffice_invoices') ?? '[]');
                  
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      <div style={{ background: '#0d0d1e', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>📋</div>
                        <div style={{ color: '#ffdd44', fontSize: '20px', fontWeight: 'bold' }}>{tasks.length}</div>
                        <div style={{ color: '#667788', fontSize: '13px' }}>Total Tasks</div>
                      </div>
                      <div style={{ background: '#0d0d1e', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>✅</div>
                        <div style={{ color: '#00ff88', fontSize: '20px', fontWeight: 'bold' }}>{tasks.filter((t: any) => t.status === 'done').length}</div>
                        <div style={{ color: '#667788', fontSize: '13px' }}>Completed</div>
                      </div>
                      <div style={{ background: '#0d0d1e', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>👥</div>
                        <div style={{ color: '#66ddff', fontSize: '20px', fontWeight: 'bold' }}>{agents.length}</div>
                        <div style={{ color: '#667788', fontSize: '13px' }}>Agents</div>
                      </div>
                      <div style={{ background: '#0d0d1e', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>💰</div>
                        <div style={{ color: '#00ff88', fontSize: '20px', fontWeight: 'bold' }}>${invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.total, 0).toLocaleString()}</div>
                        <div style={{ color: '#667788', fontSize: '13px' }}>Revenue</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#0a0a18', borderTop: '2px solid #334466', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: config.enabled ? '#00ff88' : '#ff6666' }}>
            {config.enabled ? '✅ Email Enabled' : '❌ Email Disabled'}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold',
              background: '#2255aa', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
