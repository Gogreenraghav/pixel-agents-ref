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
const LS_TAX_CONFIG = 'pixeloffice_tax_config';

interface TaxConfig {
  country: string;
  state: string;
  vat: number;
  tds: number;
  serviceTax: number;
  incomeTax: number;
}

const TAX_SYSTEMS: Record<string, { name: string; states: Record<string, { name: string; vat: number; tds: number; serviceTax: number; incomeTax: number }> }> = {
  india: {
    name: '🇮🇳 India',
    states: {
      delhi: { name: 'Delhi', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 },
      maharashtra: { name: 'Maharashtra', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 },
      karnataka: { name: 'Karnataka', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 },
      tamilnadu: { name: 'Tamil Nadu', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 },
      gujarat: { name: 'Gujarat', vat: 18, tds: 10, serviceTax: 15, incomeTax: 30 },
      up: { name: 'Uttar Pradesh', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 },
      westbengal: { name: 'West Bengal', vat: 18, tds: 10, serviceTax: 15, incomeTax: 30 },
      rajasthan: { name: 'Rajasthan', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 },
      telangana: { name: 'Telangana', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 },
      haryana: { name: 'Haryana', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 },
    }
  },
  usa: {
    name: '🇺🇸 USA',
    states: {
      california: { name: 'California', vat: 7.25, tds: 0, serviceTax: 0, incomeTax: 13.3 },
      texas: { name: 'Texas', vat: 6.25, tds: 0, serviceTax: 0, incomeTax: 0 },
      newyork: { name: 'New York', vat: 8, tds: 0, serviceTax: 4, incomeTax: 10.9 },
      florida: { name: 'Florida', vat: 6, tds: 0, serviceTax: 0, incomeTax: 0 },
      washington: { name: 'Washington', vat: 6.5, tds: 0, serviceTax: 0, incomeTax: 0 },
      nevada: { name: 'Nevada', vat: 6.85, tds: 0, serviceTax: 0, incomeTax: 0 },
      illinois: { name: 'Illinois', vat: 6.25, tds: 0, serviceTax: 0, incomeTax: 4.95 },
    }
  },
  uk: {
    name: '🇬🇧 UK',
    states: {
      england: { name: 'England', vat: 20, tds: 0, serviceTax: 0, incomeTax: 40 },
      scotland: { name: 'Scotland', vat: 20, tds: 0, serviceTax: 0, incomeTax: 46 },
      wales: { name: 'Wales', vat: 20, tds: 0, serviceTax: 0, incomeTax: 40 },
      northernireland: { name: 'Northern Ireland', vat: 20, tds: 0, serviceTax: 0, incomeTax: 40 },
    }
  },
  germany: {
    name: '🇩🇪 Germany',
    states: {
      berlin: { name: 'Berlin', vat: 19, tds: 0, serviceTax: 0, incomeTax: 45 },
      bayern: { name: 'Bayern', vat: 19, tds: 0, serviceTax: 0, incomeTax: 45 },
      hessen: { name: 'Hessen', vat: 19, tds: 0, serviceTax: 0, incomeTax: 45 },
      nordrhein: { name: 'Nordrhein-Westfalen', vat: 19, tds: 0, serviceTax: 0, incomeTax: 45 },
    }
  },
  canada: {
    name: '🇨🇦 Canada',
    states: {
      ontario: { name: 'Ontario', vat: 13, tds: 0, serviceTax: 0, incomeTax: 53.5 },
      quebec: { name: 'Quebec', vat: 14.975, tds: 0, serviceTax: 9.975, incomeTax: 53.31 },
      bc: { name: 'British Columbia', vat: 12, tds: 0, serviceTax: 0, incomeTax: 53.5 },
      alberta: { name: 'Alberta', vat: 5, tds: 0, serviceTax: 0, incomeTax: 48 },
    }
  },
  australia: {
    name: '🇦🇺 Australia',
    states: {
      nsw: { name: 'New South Wales', vat: 10, tds: 0, serviceTax: 0, incomeTax: 45 },
      victoria: { name: 'Victoria', vat: 10, tds: 0, serviceTax: 0, incomeTax: 45 },
      queensland: { name: 'Queensland', vat: 10, tds: 0, serviceTax: 0, incomeTax: 45 },
      wa: { name: 'Western Australia', vat: 10, tds: 0, serviceTax: 0, incomeTax: 45 },
    }
  },
  uae: {
    name: '🇦🇪 UAE',
    states: {
      dubai: { name: 'Dubai', vat: 5, tds: 0, serviceTax: 0, incomeTax: 0 },
      abudhabi: { name: 'Abu Dhabi', vat: 5, tds: 0, serviceTax: 0, incomeTax: 0 },
      sharjah: { name: 'Sharjah', vat: 0, tds: 0, serviceTax: 0, incomeTax: 0 },
    }
  },
  singapore: {
    name: '🇸🇬 Singapore',
    states: {
      singapore: { name: 'Singapore', vat: 8, tds: 0, serviceTax: 0, incomeTax: 22 },
    }
  },
};

interface BudgetCap {
  category: string; limit: number; spent: number;
}
interface Alert {
  id: string; type: 'overbudget' | 'lowbalance' | 'due' | 'tax'; message: string; date: string; read: boolean;
}

function loadTaxConfig(): TaxConfig {
  const stored = localStorage.getItem(LS_TAX_CONFIG);
  if (stored) {
    try {
      const cfg = JSON.parse(stored);
      if (cfg.country && cfg.state) return cfg;
    } catch {}
  }
  return { country: 'india', state: 'delhi', vat: 18, tds: 10, serviceTax: 18, incomeTax: 30 };
}
function saveTaxConfig(cfg: TaxConfig) {
  try { localStorage.setItem(LS_TAX_CONFIG, JSON.stringify(cfg)); } catch {}
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

type Tab = 'overview' | 'invoices' | 'reports' | 'alerts' | 'tax';

export function FinancePanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invForm, setInvForm] = useState({ clientName: '', clientCompany: '', items: [{ desc: '', amount: '' }], dueDate: '' });
  const [budgetCaps, setBudgetCaps] = useState<BudgetCap[]>(loadBudgetCaps);
  const [showBudget, setShowBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: 'Payroll', limit: '' });
  const [alerts, setAlerts] = useState<Alert[]>(loadAlerts);
  const [taxConfig, setTaxConfig] = useState<TaxConfig>(loadTaxConfig);

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
          {(['overview', 'invoices', 'reports', 'alerts', 'tax'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold',
              background: tab === t ? '#112233' : 'transparent',
              color: tab === t ? '#66ddff' : '#445566',
              border: 'none', borderBottom: tab === t ? '3px solid #66ddff' : '3px solid transparent',
              cursor: 'pointer',
            }}>
              {t === 'overview' ? '📈 P&L' : t === 'invoices' ? '🧾 Invoices' : t === 'reports' ? '📋 Reports' : t === 'alerts' ? `🚨 Alerts${unreadAlerts > 0 ? ` (${unreadAlerts})` : ''}` : '🧾 Tax'}
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

          {tab === 'tax' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tax Mode Selection */}
              <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '20px' }}>
                <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 16 }}>⚙️ Tax Configuration</div>
                
                {/* Mode Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button 
                    onClick={() => {
                      const country = 'india';
                      const states = Object.keys(TAX_SYSTEMS[country]?.states || {});
                      const firstState = states[0] || '';
                      const stateData = TAX_SYSTEMS[country]?.states[firstState];
                      setTaxConfig(c => ({
                        ...c,
                        country: 'custom',
                        state: 'custom',
                        vat: stateData?.vat || 0,
                        tds: stateData?.tds || 0,
                        serviceTax: stateData?.serviceTax || 0,
                        incomeTax: stateData?.incomeTax || 0,
                      }));
                    }}
                    style={{
                      flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                      background: taxConfig.country === 'custom' ? '#1a1a00' : '#0a0a14',
                      color: taxConfig.country === 'custom' ? '#ffdd44' : '#667788',
                      border: `2px solid ${taxConfig.country === 'custom' ? '#ffdd44' : '#334466'}`,
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Custom
                  </button>
                  <button 
                    onClick={() => {
                      const country = 'india';
                      const states = Object.keys(TAX_SYSTEMS[country]?.states || {});
                      const firstState = states[0] || '';
                      const stateData = TAX_SYSTEMS[country]?.states[firstState];
                      setTaxConfig(c => ({
                        ...c,
                        country,
                        state: firstState,
                        vat: stateData?.vat || 0,
                        tds: stateData?.tds || 0,
                        serviceTax: stateData?.serviceTax || 0,
                        incomeTax: stateData?.incomeTax || 0,
                      }));
                    }}
                    style={{
                      flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold',
                      background: taxConfig.country !== 'custom' ? '#001a1a' : '#0a0a14',
                      color: taxConfig.country !== 'custom' ? '#00ff88' : '#667788',
                      border: `2px solid ${taxConfig.country !== 'custom' ? '#00ff88' : '#334466'}`,
                      cursor: 'pointer',
                    }}
                  >
                    🌍 Predefined
                  </button>
                </div>

                {taxConfig.country === 'custom' ? (
                  /* Custom Tax Input */
                  <div style={{ background: '#0d0d1e', border: '1px solid #ffdd44', padding: '16px' }}>
                    <div style={{ fontSize: '16px', color: '#ffdd44', fontWeight: 'bold', marginBottom: 12 }}>✏️ Set Your Custom Tax Rates</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: '14px', color: '#8899aa', marginBottom: 6 }}>VAT/GST (%)</div>
                        <input 
                          type="number" 
                          value={taxConfig.vat} 
                          onChange={e => setTaxConfig(c => ({ ...c, vat: parseFloat(e.target.value) || 0 }))} 
                          style={inp} 
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: '#8899aa', marginBottom: 6 }}>TDS (%)</div>
                        <input 
                          type="number" 
                          value={taxConfig.tds} 
                          onChange={e => setTaxConfig(c => ({ ...c, tds: parseFloat(e.target.value) || 0 }))} 
                          style={inp} 
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: '#8899aa', marginBottom: 6 }}>Service Tax (%)</div>
                        <input 
                          type="number" 
                          value={taxConfig.serviceTax} 
                          onChange={e => setTaxConfig(c => ({ ...c, serviceTax: parseFloat(e.target.value) || 0 }))} 
                          style={inp} 
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: '#8899aa', marginBottom: 6 }}>Income Tax (%)</div>
                        <input 
                          type="number" 
                          value={taxConfig.incomeTax} 
                          onChange={e => setTaxConfig(c => ({ ...c, incomeTax: parseFloat(e.target.value) || 0 }))} 
                          style={inp} 
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => saveTaxConfig(taxConfig)} 
                        style={{ flex: 1, padding: '10px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', background: '#1a1a00', color: '#ffdd44', border: '2px solid #ffdd44', cursor: 'pointer' }}
                      >
                        💾 Save Custom Rates
                      </button>
                      <button 
                        onClick={() => {
                          setTaxConfig(c => ({ ...c, vat: 0, tds: 0, serviceTax: 0, incomeTax: 0 }));
                        }} 
                        style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold', background: '#1a0606', color: '#ff6666', border: '2px solid #441111', cursor: 'pointer' }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Predefined Country Selection */
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: '15px', color: '#8899aa', marginBottom: 6 }}>Country</div>
                        <select 
                          value={taxConfig.country} 
                          onChange={e => {
                            const country = e.target.value;
                            const states = Object.keys(TAX_SYSTEMS[country]?.states || {});
                            const firstState = states[0] || '';
                            const stateData = TAX_SYSTEMS[country]?.states[firstState];
                            setTaxConfig(c => ({
                              ...c,
                              country,
                              state: firstState,
                              vat: stateData?.vat || 0,
                              tds: stateData?.tds || 0,
                              serviceTax: stateData?.serviceTax || 0,
                              incomeTax: stateData?.incomeTax || 0,
                            }));
                          }} 
                          style={{ ...inp, cursor: 'pointer' }}
                        >
                          {Object.entries(TAX_SYSTEMS).map(([key, val]) => (
                            <option key={key} value={key}>{val.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', color: '#8899aa', marginBottom: 6 }}>
                          {taxConfig.country === 'usa' ? 'State' : taxConfig.country === 'uk' ? 'Region' : taxConfig.country === 'canada' ? 'Province' : taxConfig.country === 'australia' ? 'State' : 'State'}
                        </div>
                        <select 
                          value={taxConfig.state} 
                          onChange={e => {
                            const state = e.target.value;
                            const stateData = TAX_SYSTEMS[taxConfig.country]?.states[state];
                            if (stateData) {
                              setTaxConfig(c => ({
                                ...c,
                                state,
                                vat: stateData.vat,
                                tds: stateData.tds,
                                serviceTax: stateData.serviceTax,
                                incomeTax: stateData.incomeTax,
                              }));
                            }
                          }} 
                          style={{ ...inp, cursor: 'pointer' }}
                        >
                          {Object.entries(TAX_SYSTEMS[taxConfig.country]?.states || {}).map(([key, val]) => (
                            <option key={key} value={key}>{val.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Current Tax Rates */}
                    <div style={{ background: '#0d0d1e', border: '1px solid #223355', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ffdd44', fontWeight: 'bold', marginBottom: 10 }}>📊 Current Tax Rates for {TAX_SYSTEMS[taxConfig.country]?.states[taxConfig.state]?.name || taxConfig.state}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        <div style={{ background: '#0a0a18', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', color: '#00ff88', fontWeight: 'bold' }}>{taxConfig.vat}%</div>
                          <div style={{ fontSize: '13px', color: '#667788' }}>VAT/GST</div>
                        </div>
                        <div style={{ background: '#0a0a18', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', color: '#ff8844', fontWeight: 'bold' }}>{taxConfig.tds}%</div>
                          <div style={{ fontSize: '13px', color: '#667788' }}>TDS</div>
                        </div>
                        <div style={{ background: '#0a0a18', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', color: '#66ddff', fontWeight: 'bold' }}>{taxConfig.serviceTax}%</div>
                          <div style={{ fontSize: '13px', color: '#667788' }}>Service Tax</div>
                        </div>
                        <div style={{ background: '#0a0a18', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', color: '#ff4444', fontWeight: 'bold' }}>{taxConfig.incomeTax}%</div>
                          <div style={{ fontSize: '13px', color: '#667788' }}>Income Tax</div>
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={() => saveTaxConfig(taxConfig)} style={{ marginTop: 12, width: '100%', padding: '10px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', background: '#0a1a0a', color: '#00ff88', border: '2px solid #00ff88', cursor: 'pointer' }}>
                      💾 Save Tax Settings
                    </button>
                  </>
                )}
              </div>

              {/* Tax Calculations */}
              <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '20px' }}>
                <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 16 }}>📊 Tax Breakdown</div>
                
                {/* Invoice-based tax */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '18px', color: '#ffdd44', fontWeight: 'bold', marginBottom: 12 }}>🧾 Invoice Taxes ({TAX_SYSTEMS[taxConfig.country]?.name})</div>
                  <div style={{ background: '#0a0a18', border: '1px solid #223355', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '16px', color: '#aaddff' }}>Total Invoice Amount</span>
                      <span style={{ fontSize: '17px', color: '#00ff88', fontWeight: 'bold' }}>${invoiceTotal.toLocaleString()}</span>
                    </div>
                    {taxConfig.vat > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '16px', color: '#aaddff' }}>VAT/GST ({taxConfig.vat}%)</span>
                        <span style={{ fontSize: '17px', color: '#ff4444', fontWeight: 'bold' }}>-${(invoiceTotal * taxConfig.vat / 100).toLocaleString()}</span>
                      </div>
                    )}
                    {taxConfig.tds > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '16px', color: '#aaddff' }}>TDS ({taxConfig.tds}%)</span>
                        <span style={{ fontSize: '17px', color: '#ff8844', fontWeight: 'bold' }}>-${(invoiceTotal * taxConfig.tds / 100).toLocaleString()}</span>
                      </div>
                    )}
                    {taxConfig.serviceTax > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '16px', color: '#aaddff' }}>Service Tax ({taxConfig.serviceTax}%)</span>
                        <span style={{ fontSize: '17px', color: '#66ddff', fontWeight: 'bold' }}>-${(invoiceTotal * taxConfig.serviceTax / 100).toLocaleString()}</span>
                      </div>
                    )}
                    {taxConfig.incomeTax > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '16px', color: '#aaddff' }}>Income Tax ({taxConfig.incomeTax}%)</span>
                        <span style={{ fontSize: '17px', color: '#ff4444', fontWeight: 'bold' }}>-${(invoiceTotal * taxConfig.incomeTax / 100).toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ borderTop: '2px solid #334466', marginTop: 8, paddingTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '18px', color: '#66ddff', fontWeight: 'bold' }}>Net After Tax</span>
                        <span style={{ fontSize: '20px', color: '#00ff88', fontWeight: 'bold' }}>
                          ${(invoiceTotal - (invoiceTotal * (taxConfig.vat + taxConfig.tds + taxConfig.serviceTax + taxConfig.incomeTax) / 100)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pending invoice tax */}
                {invoicePending > 0 && (
                  <div style={{ background: '#0a0a18', border: '1px solid #ffaa44', padding: '14px', marginBottom: 16 }}>
                    <div style={{ fontSize: '18px', color: '#ffaa44', fontWeight: 'bold', marginBottom: 10 }}>⏳ Pending Invoice Tax Liability</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '16px', color: '#aaddff' }}>Pending Amount</span>
                      <span style={{ fontSize: '17px', color: '#ffdd44', fontWeight: 'bold' }}>${invoicePending.toLocaleString()}</span>
                    </div>
                    {taxConfig.tds > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '16px', color: '#aaddff' }}>Estimated TDS Holdback ({taxConfig.tds}%)</span>
                        <span style={{ fontSize: '17px', color: '#ff4444', fontWeight: 'bold' }}>${(invoicePending * taxConfig.tds / 100).toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '14px', color: '#667788', marginTop: 8 }}>💡 TDS/GST amounts are usually adjusted by clients before payment</div>
                  </div>
                )}

                {/* Summary */}
                <div style={{ background: '#0d0d1e', border: '2px solid #223355', padding: '16px' }}>
                  <div style={{ fontSize: '18px', color: '#66ddff', fontWeight: 'bold', marginBottom: 12 }}>📋 Per Invoice Tax Summary</div>
                  {invoices.filter(i => i.status === 'paid').map(inv => {
                    const invVat = inv.total * taxConfig.vat / 100;
                    const invTds = inv.total * taxConfig.tds / 100;
                    const invService = inv.total * taxConfig.serviceTax / 100;
                    const invIncome = inv.total * taxConfig.incomeTax / 100;
                    const invTax = invVat + invTds + invService + invIncome;
                    const netAmount = inv.total - invTax;
                    return (
                      <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '10px', background: '#0a0a18' }}>
                        <div>
                          <div style={{ fontSize: '15px', color: '#aaddff', fontWeight: 'bold' }}>{inv.clientName}</div>
                          <div style={{ fontSize: '13px', color: '#667788' }}>{inv.date}</div>
                          <div style={{ fontSize: '13px', color: '#8899aa' }}>Gross: ${inv.total.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', color: '#ff4444' }}>Tax: -${invTax.toLocaleString()}</div>
                          <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 'bold' }}>Net: ${netAmount.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                  {invoices.filter(i => i.status === 'paid').length === 0 && (
                    <div style={{ color: '#445566', fontSize: '15px' }}>No paid invoices to calculate tax.</div>
                  )}
                </div>
              </div>

              {/* Tax Calendar - Country Specific */}
              <div style={{ background: '#0d0d1a', border: '2px solid #334466', padding: '20px' }}>
                <div style={{ fontSize: '22px', color: '#66ddff', fontWeight: 'bold', marginBottom: 16 }}>
                  📅 Tax Calendar {taxConfig.country !== 'custom' ? `(${TAX_SYSTEMS[taxConfig.country]?.name})` : '(Custom)'}
                </div>
                
                {taxConfig.country === 'custom' && (
                  <div style={{ background: '#0d0d1e', border: '1px solid #ffdd44', padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', color: '#ffdd44', fontWeight: 'bold', marginBottom: 10 }}>✏️ Custom Tax Mode</div>
                    <div style={{ fontSize: '15px', color: '#667788', marginBottom: 16 }}>
                      You're using custom tax rates. Tax calendar reminders are based on general business tax cycles.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <div style={{ background: '#0a0a18', border: '1px solid #ff8844', padding: '14px' }}>
                        <div style={{ fontSize: '16px', color: '#ff8844', fontWeight: 'bold' }}>📤 Quarterly Taxes</div>
                        <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Set reminders for your tax dates</div>
                      </div>
                      <div style={{ background: '#0a0a18', border: '1px solid #66ddff', padding: '14px' }}>
                        <div style={{ fontSize: '16px', color: '#66ddff', fontWeight: 'bold' }}>📊 Annual Return</div>
                        <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Set annual filing reminder</div>
                      </div>
                    </div>
                  </div>
                )}

                {taxConfig.country === 'india' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff8844', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff8844', fontWeight: 'bold' }}>🗓️ GST Quarterly</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Due: 20th of next quarter month</div>
                      <div style={{ fontSize: '12px', color: '#445566', marginTop: 4 }}>GSTR-1: 11th, GSTR-3B: 20th</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff4444', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff4444', fontWeight: 'bold' }}>📤 TDS Quarterly</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Due: 30th of next quarter month</div>
                      <div style={{ fontSize: '12px', color: '#445566', marginTop: 4 }}>Form 24Q, 27Q</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #66ddff', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#66ddff', fontWeight: 'bold' }}>📊 Annual Return</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Due: 31st July (FY end: March)</div>
                      <div style={{ fontSize: '12px', color: '#445566', marginTop: 4 }}>GSTR-9, GSTR-9C</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #00ff88', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 'bold' }}>✍️ Income Tax Return</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Due: 31st July / 31st Oct</div>
                      <div style={{ fontSize: '12px', color: '#445566', marginTop: 4 }}>ITR-4, ITR-6</div>
                    </div>
                  </div>
                )}

                {taxConfig.country === 'usa' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff8844', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff8844', fontWeight: 'bold' }}>📤 Estimated Taxes</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Due: 15th Apr, Jun, Sep, Jan</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #66ddff', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#66ddff', fontWeight: 'bold' }}>📊 Annual Return</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Due: April 15th</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff4444', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff4444', fontWeight: 'bold' }}>🗓️ Sales Tax</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Varies by state - monthly/quarterly</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #00ff88', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 'bold' }}>✍️ Payroll Taxes</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Federal: monthly / State: varies</div>
                    </div>
                  </div>
                )}

                {(taxConfig.country === 'uk' || taxConfig.country === 'germany' || taxConfig.country === 'singapore') && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff8844', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff8844', fontWeight: 'bold' }}>📤 VAT Return</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Quarterly (UK) / Monthly (DE)</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #66ddff', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#66ddff', fontWeight: 'bold' }}>📊 Corporation Tax</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>9 months + 1 day after FY end</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff4444', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff4444', fontWeight: 'bold' }}>✍️ Income Tax</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Self-assessment deadline</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #00ff88', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 'bold' }}>🏢 Payroll Taxes</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Monthly payments</div>
                    </div>
                  </div>
                )}

                {taxConfig.country === 'uae' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                    <div style={{ background: '#0a0a18', border: '1px solid #00ff88', padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', color: '#00ff88', fontWeight: 'bold' }}>✅ No Corporate Income Tax</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>UAE has no personal or corporate income tax (except specific industries)</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff8844', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff8844', fontWeight: 'bold' }}>🗓️ VAT (5%)</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Quarterly returns - due within 28 days of quarter end</div>
                    </div>
                  </div>
                )}

                {(taxConfig.country === 'canada' || taxConfig.country === 'australia') && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff8844', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff8844', fontWeight: 'bold' }}>📤 GST/HST Return</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>{taxConfig.country === 'canada' ? 'Monthly/Quarterly' : 'Monthly/BAS'}</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #ff4444', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#ff4444', fontWeight: 'bold' }}>✍️ Income Tax</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Annual return due</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #66ddff', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#66ddff', fontWeight: 'bold' }}>📊 Payroll Taxes</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Regular remittances</div>
                    </div>
                    <div style={{ background: '#0a0a18', border: '1px solid #00ff88', padding: '14px' }}>
                      <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 'bold' }}>🏢 State Tax</div>
                      <div style={{ fontSize: '14px', color: '#667788', marginTop: 4 }}>Varies by state/province</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
