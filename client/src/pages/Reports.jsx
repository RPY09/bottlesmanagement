import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import '../styles/reports.css';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const PIE_COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#ef4444', '#a855f7', '#22c55e', '#f97316'];

export default function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expenseCategories, setExpenseCategories] = useState([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const [r, ec] = await Promise.all([
        api.get('/dashboard/monthly-report', { params: { month, year } }),
        api.get('/expenses/summary/by-category', { params: { month, year } }),
      ]);
      setReport(r.data);
      setExpenseCategories(ec.data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [month, year]);

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Reports</h1>
          <p className="page-subtitle">Financial summary & analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select className="form-select" style={{ width: 130 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="form-select" style={{ width: 90 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="loading-page"><div className="loading-spinner" /></div> : !report ? null : (
        <>
          {/* Summary Cards */}
          <div className="dashboard-kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-blue)', '--kpi-bg': 'rgba(59,130,246,0.1)' }}>
              <div className="kpi-icon"><DollarSign size={22} /></div>
              <div>
                <div className="kpi-label">Total Revenue</div>
                <div className="kpi-value">{fmt(report.totalRevenue)}</div>
                <div className="kpi-sub">{report.ordersCount} orders · {report.totalBottles} bottles</div>
              </div>
            </div>
            <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-green)', '--kpi-bg': 'rgba(34,197,94,0.1)' }}>
              <div className="kpi-icon"><TrendingUp size={22} /></div>
              <div>
                <div className="kpi-label">Collected</div>
                <div className="kpi-value">{fmt(report.totalCollected)}</div>
                <div className="kpi-sub">{Math.round((report.totalCollected / (report.totalRevenue || 1)) * 100)}% collection rate</div>
              </div>
            </div>
            <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-red)', '--kpi-bg': 'rgba(239,68,68,0.1)' }}>
              <div className="kpi-icon"><TrendingDown size={22} /></div>
              <div>
                <div className="kpi-label">Total Expenses</div>
                <div className="kpi-value">{fmt(report.totalExpenses)}</div>
              </div>
            </div>
            <div className="kpi-card" style={{ '--kpi-color': report.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', '--kpi-bg': report.netProfit >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
              <div className="kpi-icon"><BarChart3 size={22} /></div>
              <div>
                <div className="kpi-label">Net Profit</div>
                <div className="kpi-value" style={{ color: report.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {report.netProfit >= 0 ? '' : '-'}{fmt(Math.abs(report.netProfit))}
                </div>
                <div className="kpi-sub">Collected − Expenses</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="reports-charts-grid">
            {/* P&L Bar */}
            <div className="chart-card">
              <div className="chart-header">
                <span className="chart-title">P&L Summary — {months[month - 1]} {year}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: 'Revenue', value: report.totalRevenue },
                  { name: 'Collected', value: report.totalCollected },
                  { name: 'Expenses', value: report.totalExpenses },
                  { name: 'Net Profit', value: Math.max(0, report.netProfit) },
                ]} barSize={36}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [fmt(v)]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {['#3b82f6','#22c55e','#ef4444','#a855f7'].map((c, i) => <Cell key={i} fill={c} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Expense by Category */}
            <div className="chart-card">
              <div className="chart-header">
                <span className="chart-title">Expenses by Category</span>
              </div>
              {expenseCategories.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expenseCategories.map(e => ({ name: e._id, value: e.total }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}>
                      {expenseCategories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem', textTransform: 'capitalize' }} />
                    <Tooltip formatter={v => [fmt(v)]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '2rem' }}><p>No expense data for this period</p></div>
              )}
            </div>
          </div>

          {/* Expense breakdown table */}
          {expenseCategories.length > 0 && (
            <div className="card" style={{ marginTop: '1rem', padding: 0 }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <h3>Expense Breakdown</h3>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>Category</th><th>Count</th><th>Amount</th><th>% of Total</th></tr></thead>
                  <tbody>
                    {expenseCategories.map((e, i) => (
                      <tr key={i}>
                        <td style={{ textTransform: 'capitalize', fontWeight: 500 }}>{e._id}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{e.count}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{fmt(e.total)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: 80 }}>
                              <div className="progress-fill" style={{ width: `${(e.total / report.totalExpenses) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            </div>
                            <span style={{ fontSize: '0.8rem' }}>{Math.round((e.total / report.totalExpenses) * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
