import { useState } from 'react';

interface Props {
  onClose: () => void;
}

interface Invoice {
  id: string; clientName: string; clientCompany: string;
  items: { desc: string; amount: number | string }[];
  total: number; status: 'draft' | 'sent' | 'paid';
  date: string; dueDate: string;
}

const LS_INVOICES = 'pixeloffice_invoices';
const LS_TRANSACTIONS = 'pixeloffice_transactions';
const LS_ALERTS = 'pixeloffice_finance_alerts';
const LS_BUDGET_CAPS = 'pixeloffice_budget_caps';

interface BudgetCap {
  category: string; limit: number; spent: number;
}
interface Alert {
  id: string; type: 'overbudget' | 'lowbalance' | 'due'; message: string; date: string; read: boolean;
}

function loadInvoices(): Invoice[] {
  try { return JSON.parse(localStorage.getItem(LS_INVOICES) ?? '[]'); } catch { return []; }
}
function saveInvoices(invs: Invoice[]) {
  try { localStorage.setItem(LS_INVOICES, JSON.stringify(invs)); } catch {}
}
function loadTransactions() {
  try { return JSON.parse(localStorage.getItem(LS_TRANSACTIONS) ?? '{"income":[],"expenses":[]}'); } catch { return { income: [], expenses: [] }; }
}
function loadAlerts(): Alert[] {
  try { return JSON.parse(localStorage.getItem(LS_ALERTS) ?? '[]'); } catch { return []; }
}
function saveAlerts(alerts: Alert[]) {
  try { localStorage.setItem(LS_ALERTS, JSON.stringify(alerts.slice(0, 50))); } catch {}
}
function loadBudgetCaps(): BudgetCap[] {
  try { return JSON.parse(localStorage.getItem(LS_BUDGET_CAPS) ?? '[]'); } catch { return []; }
}
function saveBudgetCaps(caps: BudgetCap[]) {
  try { localStorage.setItem(LS_BUDGET_CAPS, JSON.stringify(caps)); } catch {}
}

type Tab = 'overview' | 'invoices' | 'reports' | 'alerts';

export function FinancePanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invForm, setInvForm] = useState({ clientName: '', clientCompany: '', items: [{ desc: '', amount: '' }], dueDate: '' });
  const [budgetCaps, setBudgetCaps] = useState<BudgetCap[]>(loadBudgetCaps);
  const [showBudget, setShowBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: 'Payroll', limit: '' });
  const [alerts, setAlerts] = useState<Alert[]>(loadAlerts);

  const balance = parseInt(localStorage.getItem('pixeloffice_balance') ?? '50000');
  const transactions = loadTransactions();
  const unreadAlerts = alerts.filter(a => !a.read).length;
  
  // Calculate stats
  const totalIncome = transactions.income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const totalExpenses = transactions.expenses.reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const payrollCost = JSON.parse(localStorage.getItem('pixeloffice_agents') ?? '[]').reduce((s: number, a: any) => s + Math.floor((a.salary || 4000) / 30), 0);
  const netFlow = totalIncome - totalExpenses;
  const invoiceTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const invoicePending = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);

  // Check budget alerts
  const checkBudgetAlerts = () => {
    const newAlerts: Alert[] = [];
    budgetCaps.forEach(cap => {
      if (cap.spent > cap.limit) {
        newAlerts.push({ id: `al_${Date.now()}_${Math.random()}`, type: 'overbudget', message: `⚠️ Over Budget: ${cap.category} spent $${cap.spent.toLocaleString()} of $${cap.limit.toLocaleString()} budget`, date: new Date().toLocaleString(), read: false });
      }
    });
    if (balance < 5000) {
      newAlerts.push({ id: `al_${Date.now()}_${Math.random()}`, type: 'lowbalance', message: `⚠️ Low Balance Alert: Company balance is $${balance.toLocaleString()}. Consider cutting costs!`, date: new Date().toLocaleString(), read: false });
    }
    if (newAlerts.length > 0) {
      const updated = [...newAlerts, ...loadAlerts()].slice(0, 50);
      saveAlerts(updated);
      setAlerts(updated);
    }
  };

  const addBudgetCap = () => {
    if (!budgetForm.limit) return;
    const caps = [...budgetCaps, { category: budgetForm.category, limit: parseInt(budgetForm.limit), spent: 0 }];
    setBudgetCaps(caps);
    saveBudgetCaps(caps);
    setBudgetForm({ category: 'Payroll', limit: '' });
    setShowBudget(false);
    checkBudgetAlerts();
  };

  const removeBudgetCap = (category: string) => {
    const caps = budgetCaps.filter(c => c.category !== category);
    setBudgetCaps(caps);
    saveBudgetCaps(caps);
  };

  const markAlertRead = (id: string) => {
    const updated = alerts.map(a => a.id === id ? { ...a, read: true } : a);
    setAlerts(updated);
    saveAlerts(updated);
  };

  const clearAllAlerts = () => {
    setAlerts([]);
    saveAlerts([]);
  };

  const createInvoice = () => {
    const items = invForm.items.filter(i => i.desc && i.amount);
    if (!invForm.clientName || items.length === 0) return;
    const inv: Invoice = {
      id: `inv_${Date.now()}`,
      clientName: invForm.clientName,
      clientCompany: invForm.clientCompany,
      items,
      total: items.reduce((s, i) => s + parseInt(i.amount || '0'), 0),
      status: 'draft',
      date: new Date().toLocaleString(),
      dueDate: invForm.dueDate,
    };
    const updated = [inv, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    setShowInvoice(false);
    setInvForm({ clientName: '', clientCompany: '', items: [{ desc: '', amount: '' }], dueDate: '' });
  };

  const markPaid = (id: string) => {
    const updated = invoices.map(i => i.id === id ? { ...i, status: 'paid' as const } : i);
    setInvoices(updated);
    saveInvoices(updated);
  };

  const addItem = () => setInvForm(f => ({ ...f, items: [...f.items, { desc: '', amount: '' }] }));
  const updateItem = (idx: number, field: 'desc' | 'amount', val: string) => {
    const items = [...invForm.items];
    items[idx] = { ...items[idx], [field]: val };
    setInvForm(f => ({ ...f, items }));
  };

  const inp: React.CSSProperties = {
    background: '#0a0a14', color: '#aaddff', border: '2px solid #334466',
    fontFamily: 'monospace', fontSize: '16px', padding: '8px 10px', width: '100%', boxSizing: 'border-box',
  };

  const card: React.CSSProperties = {
    background: '#0d0d1a', border: '2px solid #334466', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 6,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 900, maxHeight: '90vh', background: '#0d0d1e', border: '2px solid #334466', display: 'flex', flexDirection: 'column', fontFamily: 'monospace' }}>
        {/* Header */}
        <div style={{ background: '#0a0a18', borderBottom: '2px solid #334466', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '28px' }}>📊</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#66ddff' }}>Finance Dashboard</div>
            <div style={{ fontSize: '16px', color: '#667788' }}>P&L, Invoices & Reports</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff6666', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #223355' }}>
          {(['overview', 'invoices', 'reports', 'alerts'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold',
              background: tab === t ? '#112233' : 'transparent',
              color: tab === t ? '#66ddff' : '#445566',
              border: 'none', borderBottom: tab === t ? '3px solid #66ddff' : '3px solid transparent',
              cursor: 'pointer',
            }}>
              {t === 'overview' ? '📈 P&L' : t === 'invoices' ? '🧾 Invoices' : t === 'reports' ? '📋 Reports' : `🚨 Alerts${unreadAlerts > 0 ? ` (${unreadAlerts})` : ''}`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ ...card, borderColor: '#00ff88' }}>
                  <div style={{ fontSize: '16px', color: '#667788' }}>💰 Current Balance</div>
                  <div style={{ fontSize: '32px', color: balance < 5000 ? '#ff4444' : '#00ff88', fontWeight: 'bold' }}>${balance.toLocaleString()}</div>
                  {balance < 5000 && <div style={{ fontSize: '13px', color: '#ff4444' }}>⚠️ LOW BALANCE</div>}
                </div>
                <div style={{ ...card }}>
                  <div style={{ fontSize: '16px', color: '#667788' }}>📈 Total Income</div>
                  <div style={{ fontSize: '32px', color: '#00ff88', fontWeight: 'bold' }}>${totalIncome.toLocaleString()}</div>
                </div>
                <div style={{ ...card, borderColor: '#ff4444' }}>
                  <div style={{ fontSize: '16px', color: '#667788' }}>📉 Total Expenses</div>
                  <div style={{ fontSize: '32px', color: '#ff4444', fontWeight: 'bold' }}>${totalExpenses.toLocaleString()}</div>
                </div>
                <div style={{ ...card, borderColor: netFlow >= 0 ? '#00ff88' : '#ff4444' }}>
                  <div style={{ fontSize: '16px', color: '#667788' }}>📊 Net Flow</div>
                  <div style={{ fontSize: '32px', color: netFlow >= 0 ? '#00ff88' : '#ff4444', fontWeight: 'bold' }}>{netFlow >= 0 ? '+' : ''}${netFlow.toLocaleString()}</div>
                </div>
              </div>

              {/* Monthly breakdown */}
              <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold' }}>💸 Budget Categories</div>
                  <button onClick={() => setShowBudget(v => !v)} style={{ padding: '6px 14px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>+ Set Budget</button>
                </div>
                {showBudget && (
                  <div style={{ background: '#0d0d1e', border: '1px solid #00ff88', padding: '12px', marginBottom: 12, display: 'flex', gap: 8 }}>
                    <select value={budgetForm.category} onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, flex: 1 }}>
                      {['Payroll', 'Marketing', 'Infrastructure', 'Operations', 'Miscellaneous'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input placeholder="Limit ($)" type="number" value={budgetForm.limit} onChange={e => setBudgetForm(f => ({ ...f, limit: e.target.value }))} style={{ ...inp, flex: 1 }} />
                    <button onClick={addBudgetCap} style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>Add</button>
                  </div>
                )}
                {budgetCaps.map(cap => (
                  <div key={cap.category} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '16px', color: '#8899aa' }}>{cap.category}</span>
                      <span style={{ fontSize: '16px', color: cap.spent > cap.limit ? '#ff4444' : '#aaddff', fontWeight: 'bold' }}>${cap.spent.toLocaleString()} / ${cap.limit.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 10, background: '#111133', border: '1px solid #223355' }}>
                      <div style={{ height: '100%', width: `${Math.min((cap.spent / cap.limit) * 100, 100)}%`, background: cap.spent > cap.limit ? '#ff4444' : '#00ff88', transition: 'width 0.3s' }} />
                    </div>
                    {cap.spent > cap.limit && <div style={{ fontSize: '13px', color: '#ff4444', marginTop: 2 }}>⚠️ OVER BUDGET by ${(cap.spent - cap.limit).toLocaleString()}!</div>}
                    <button onClick={() => removeBudgetCap(cap.category)} style={{ fontSize: '12px', background: 'transparent', color: '#445566', border: 'none', cursor: 'pointer', marginTop: 2 }}>Remove</button>
                  </div>
                ))}
                {budgetCaps.length === 0 && <div style={{ fontSize: '15px', color: '#445566' }}>No budgets set. Click "+ Set Budget" to create one.</div>}
              </div>

              {/* Recent Transactions */}
              <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '16px 20px' }}>
                <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold', marginBottom: 14 }}>📜 Recent Transactions</div>
                {[...transactions.income.slice(-5).reverse(), ...transactions.expenses.slice(-5).reverse()].slice(0, 8).map((t: any, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #223355' }}>
                    <span style={{ fontSize: '16px', color: '#aaddff' }}>{t.desc || 'Transaction'}</span>
                    <span style={{ fontSize: '17px', color: t.amount > 0 ? '#00ff88' : '#ff4444', fontWeight: 'bold' }}>
                      {t.amount > 0 ? '+' : ''}${t.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                {transactions.income.length === 0 && transactions.expenses.length === 0 && (
                  <div style={{ fontSize: '16px', color: '#445566' }}>No transactions yet.</div>
                )}
              </div>
            </div>
          )}

          {tab === 'invoices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold' }}>🧾 Invoices ({invoices.length})</div>
                <button onClick={() => setShowInvoice(v => !v)} style={{ padding: '10px 18px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>
                  + Create Invoice
                </button>
              </div>

              {/* Invoice Form */}
              {showInvoice && (
                <div style={{ background: '#0d0d1a', border: '2px solid #00ff88', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: '20px', color: '#00ff88', fontWeight: 'bold' }}>🧾 New Invoice</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input placeholder="Client Name *" value={invForm.clientName} onChange={e => setInvForm({ ...invForm, clientName: e.target.value })} style={inp} />
                    <input placeholder="Company" value={invForm.clientCompany} onChange={e => setInvForm({ ...invForm, clientCompany: e.target.value })} style={inp} />
                  </div>
                  <div style={{ fontSize: '16px', color: '#8899aa' }}>Line Items:</div>
                  {invForm.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                      <input placeholder="Description" value={item.desc} onChange={e => updateItem(idx, 'desc', e.target.value)} style={inp} />
                      <input placeholder="Amount ($)" type="number" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} style={inp} />
                    </div>
                  ))}
                  <button onClick={addItem} style={{ padding: '8px', fontFamily: 'monospace', fontSize: '15px', background: '#0a0a14', color: '#8899aa', border: '1px solid #334466', cursor: 'pointer' }}>+ Add Line Item</button>
                  <input placeholder="Due Date (optional)" type="date" value={invForm.dueDate} onChange={e => setInvForm({ ...invForm, dueDate: e.target.value })} style={inp} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={createInvoice} style={{ flex: 1, padding: 12, fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>✅ Create Invoice</button>
                    <button onClick={() => setShowInvoice(false)} style={{ flex: 1, padding: 12, fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#1a0606', color: '#ff6666', border: '2px solid #331111', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Invoice List */}
              {invoices.map(inv => (
                <div key={inv.id} style={{ background: '#0d0d1a', border: `2px solid ${inv.status === 'paid' ? '#00ff88' : inv.status === 'sent' ? '#ffdd44' : '#334466'}`, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: '18px', color: '#66ddff', fontWeight: 'bold' }}>{inv.clientName}</div>
                      <div style={{ fontSize: '15px', color: '#667788' }}>{inv.clientCompany}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', color: '#ffdd44', fontWeight: 'bold' }}>${inv.total.toLocaleString()}</div>
                      <div style={{ fontSize: '14px', color: inv.status === 'paid' ? '#00ff88' : inv.status === 'sent' ? '#ffdd44' : '#667788', fontWeight: 'bold' }}>
                        {inv.status === 'paid' ? '✅ PAID' : inv.status === 'sent' ? '📤 SENT' : '📝 DRAFT'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#445566' }}>Created: {inv.date}</div>
                    {inv.status !== 'paid' && (
                      <button onClick={() => markPaid(inv.id)} style={{ padding: '6px 14px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <div style={{ textAlign: 'center', color: '#445566', fontSize: '17px', padding: 40 }}>No invoices yet. Create your first invoice!</div>}
            </div>
          )}

          {tab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '20px' }}>
                <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 16 }}>📋 Monthly Report</div>
                <div style={{ fontSize: '17px', color: '#aaddff', lineHeight: 2 }}>
                  <div>📅 Report Generated: {new Date().toLocaleString()}</div>
                  <div>💰 Starting Balance: $50,000</div>
                  <div>💵 Current Balance: ${balance.toLocaleString()}</div>
                  <div>📈 Total Income: ${totalIncome.toLocaleString()}</div>
                  <div>📉 Total Expenses: ${totalExpenses.toLocaleString()}</div>
                  <div style={{ color: netFlow >= 0 ? '#00ff88' : '#ff4444', fontWeight: 'bold', fontSize: '20px', marginTop: 10 }}>
                    {(netFlow >= 0 ? '✅ Net Profit: ' : '❌ Net Loss: ') + '$' + Math.abs(netFlow).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '20px' }}>
                <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 16 }}>📊 Quick Stats</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#0a0a18', padding: '14px', border: '1px solid #223355' }}>
                    <div style={{ fontSize: '16px', color: '#667788' }}>Invoices Created</div>
                    <div style={{ fontSize: '28px', color: '#ffdd44', fontWeight: 'bold' }}>{invoices.length}</div>
                  </div>
                  <div style={{ background: '#0a0a18', padding: '14px', border: '1px solid #223355' }}>
                    <div style={{ fontSize: '16px', color: '#667788' }}>Revenue from Invoices</div>
                    <div style={{ fontSize: '28px', color: '#00ff88', fontWeight: 'bold' }}>${invoiceTotal.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#0a0a18', padding: '14px', border: '1px solid #223355' }}>
                    <div style={{ fontSize: '16px', color: '#667788' }}>Pending Amount</div>
                    <div style={{ fontSize: '28px', color: '#ffaa44', fontWeight: 'bold' }}>${invoicePending.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#0a0a18', padding: '14px', border: '1px solid #223355' }}>
                    <div style={{ fontSize: '16px', color: '#667788' }}>Daily Payroll Cost</div>
                    <div style={{ fontSize: '28px', color: '#ff4444', fontWeight: 'bold' }}>${payrollCost.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '20px', color: '#66ddff', fontWeight: 'bold' }}>🚨 Finance Alerts ({alerts.length})</div>
                {alerts.length > 0 && (
                  <button onClick={clearAllAlerts} style={{ padding: '8px 16px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', background: '#1a0606', color: '#ff4444', border: '2px solid #441111', cursor: 'pointer' }}>
                    Clear All
                  </button>
                )}
              </div>
              <button onClick={checkBudgetAlerts} style={{ padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>
                🔍 Check All Budgets & Generate Alerts
              </button>
              {alerts.map(alert => (
                <div key={alert.id} onClick={() => markAlertRead(alert.id)} style={{ background: alert.read ? '#0d0d1a' : '#1a1a00', border: `2px solid ${alert.type === 'lowbalance' ? '#ff4444' : alert.type === 'overbudget' ? '#ffaa44' : '#ffdd44'}`, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', color: alert.read ? '#667788' : '#ffdd44', fontWeight: 'bold' }}>{alert.message}</span>
                    {!alert.read && <span style={{ fontSize: '14px', background: '#ff4444', color: '#fff', padding: '2px 8px' }}>NEW</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: '#445566', marginTop: 4 }}>{alert.date}</div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div style={{ textAlign: 'center', color: '#445566', fontSize: '17px', padding: 40 }}>
                  ✅ No alerts! Click "Check All Budgets" to scan for issues.<br/>
                  <span style={{ fontSize: '15px', color: '#556677' }}>Tip: Set budget limits in the Overview tab to get alerts when you overspend.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
