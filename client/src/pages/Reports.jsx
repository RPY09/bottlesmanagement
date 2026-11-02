import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Printer,
  Calendar, Users, Package, AlertCircle, ArrowUpRight,
  ArrowDownRight, CheckCircle2, ChevronRight, BarChart3,
  Layers, CreditCard, PieChart as PieIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/reports.css';
import logo from '../assets/logo.png';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const QUARTERS = [
  { value: 1, label: 'Q1 (Jan – Mar)' },
  { value: 2, label: 'Q2 (Apr – Jun)' },
  { value: 3, label: 'Q3 (Jul – Sep)' },
  { value: 4, label: 'Q4 (Oct – Dec)' },
];

const DONUT_COLORS = {
  collected: '#15803D', // Green
  pending: '#DC2626',   // Red
};

const EXP_COLORS = [
  '#0277B6', '#7C3AED', '#EA580C', '#D97706',
  '#15803D', '#0891B2', '#475569', '#64748B'
];

function calcDelta(curr, prev) {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

// ─── Custom Tooltip for Monthly Trends ───────────────────────────────────────
function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 10,
      padding: '0.6rem 0.85rem',
      boxShadow: '0 4px 12px rgba(3, 4, 94, 0.1)',
      fontSize: '0.8rem',
    }}>
      <div style={{ fontWeight: 700, color: '#03045E', marginBottom: 4 }}>
        {label}
      </div>
      {payload.map((entry, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: '#64748B', flex: 1 }}>{entry.name}:</span>
          <strong style={{ color: entry.color }}>{fmt(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Main Reports Component ──────────────────────────────────────────────────
export default function Reports() {
  const { user } = useAuth();

  // Period State (using lazy initializers to avoid impure new Date() linter warning)
  const [reportType, setReportType] = useState('monthly'); // 'monthly' | 'quarterly' | 'yearly' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(() => dayjs().year());
  const [selectedQuarter, setSelectedQuarter] = useState(() => Math.floor(dayjs().month() / 3) + 1);
  const [customRange, setCustomRange] = useState({
    start: dayjs().startOf('month').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  });

  // Customer Sort State
  const [customerSort, setCustomerSort] = useState('billed'); // 'billed' | 'collected' | 'outstanding' | 'orders'

  // Data & Loading State
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Available Years
  const availableYears = useMemo(() => {
    const currentY = dayjs().year();
    return Array.from({ length: 5 }, (_, i) => currentY - i);
  }, []);

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        type: reportType,
        year: selectedYear,
        month: selectedMonth,
        quarter: selectedQuarter,
        startDate: customRange.start,
        endDate: customRange.end,
      };

      const { data } = await api.get('/reports/summary', { params });
      setReport(data);
    } catch {
      toast.error('Failed to load financial report');
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedYear, selectedMonth, selectedQuarter, customRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Sorted Top Customers
  const sortedCustomers = useMemo(() => {
    if (!report?.topCustomers) return [];
    const list = [...report.topCustomers];
    if (customerSort === 'collected') {
      return list.sort((a, b) => b.totalCollected - a.totalCollected);
    }
    if (customerSort === 'outstanding') {
      return list.sort((a, b) => b.outstanding - a.outstanding);
    }
    if (customerSort === 'orders') {
      return list.sort((a, b) => b.ordersCount - a.ordersCount);
    }
    return list.sort((a, b) => b.totalBilled - a.totalBilled);
  }, [report, customerSort]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const overview = report?.overview || {};
  const prevOverview = report?.previousOverview || {};

  const colAmount = overview.totalCollected || 0;
  const outAmount = overview.periodOutstanding || 0;

  // Donut data for Collection Analysis
  const donutData = useMemo(() => {
    return [
      { name: 'Collected', value: colAmount, color: DONUT_COLORS.collected },
      { name: 'Pending', value: outAmount, color: DONUT_COLORS.pending },
    ];
  }, [colAmount, outAmount]);

  return (
    <div className="rpt-page">

      {/* ─── Printable Header (Visible only on print/export) ─── */}
      <div className="rpt-print-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="rpt-print-brand">
            <img src={logo} alt="" className="rpt-print-logo" />
            <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#03045E' }}>
              {user?.businessName || 'Hydro Business Manager'}
            </h1>
            <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#64748B' }}>
              Official Financial Statement &amp; Business Intelligence Report
            </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#64748B' }}>
            <div><strong>Period:</strong> {report?.period?.label}</div>
            <div><strong>Generated:</strong> {dayjs().format('D MMMM YYYY, h:mm A')}</div>
          </div>
        </div>
      </div>

      {/* ─── 1. Reports Header ─── */}
      <div className="rpt-header">
        <div className="rpt-title-wrap">
          <h1 className="rpt-title">Business Reports</h1>
          <p className="rpt-subtitle">Financial performance, collections and product insights.</p>
        </div>
        <div className="rpt-header-actions">
          <button
            type="button"
            className="rpt-btn-export"
            onClick={handlePrint}
            title="Download or Print PDF Statement"
          >
            <Printer size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* ─── 2. Period Selector & Controls ─── */}
      <div className="rpt-period-container">
        {/* Period type tabs */}
        <div className="rpt-period-tabs" role="tablist" aria-label="Select report frequency">
          {[
            { id: 'monthly', label: 'Monthly' },
            { id: 'quarterly', label: 'Quarterly' },
            { id: 'yearly', label: 'Yearly' },
            { id: 'custom', label: 'Custom Range' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`rpt-period-tab${reportType === tab.id ? ' active' : ''}`}
              onClick={() => setReportType(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Selectors according to active period type */}
        <div className="rpt-period-selectors">
          {reportType === 'monthly' && (
            <>
              <select
                className="rpt-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                aria-label="Select Month"
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                className="rpt-select"
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                aria-label="Select Year"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}

          {reportType === 'quarterly' && (
            <>
              <select
                className="rpt-select"
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(parseInt(e.target.value, 10))}
                aria-label="Select Quarter"
              >
                {QUARTERS.map(q => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
              <select
                className="rpt-select"
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                aria-label="Select Year"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}

          {reportType === 'yearly' && (
            <select
              className="rpt-select"
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              aria-label="Select Year"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {reportType === 'custom' && (
            <div className="rpt-custom-range">
              <input
                type="date"
                className="rpt-date-input"
                value={customRange.start}
                max={customRange.end}
                onChange={e => setCustomRange(r => ({ ...r, start: e.target.value }))}
                aria-label="Start Date"
              />
              <span style={{ color: '#64748B', fontSize: '0.82rem' }}>→</span>
              <input
                type="date"
                className="rpt-date-input"
                value={customRange.end}
                min={customRange.start}
                onChange={e => setCustomRange(r => ({ ...r, end: e.target.value }))}
                aria-label="End Date"
              />
            </div>
          )}

          {report?.period?.label && (
            <span className="rpt-badge-period">
              <Calendar size={13} /> {report.period.label}
            </span>
          )}
        </div>
      </div>

      {/* ─── Loading Skeletons ─── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="rpt-kpi-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rpt-skeleton" style={{ height: 122, borderRadius: 16 }} />
            ))}
          </div>
          <div className="rpt-skeleton" style={{ height: 200, borderRadius: 18 }} />
          <div className="rpt-skeleton" style={{ height: 260, borderRadius: 18 }} />
        </div>
      ) : !report ? (
        <div className="rpt-empty-state">
          <AlertCircle size={36} style={{ color: '#DC2626' }} />
          <h3>Could not load financial report</h3>
          <p>Please check your connection and try refreshing.</p>
        </div>
      ) : (
        <>
          {/* ─── 3. Financial Overview (4 KPI Cards) ─── */}
          <div className="rpt-kpi-grid">
            {/* 1. Total Revenue */}
            <div className="rpt-kpi-card blue">
              <div className="rpt-kpi-top">
                <div className="rpt-kpi-icon"><DollarSign size={20} /></div>
                {calcDelta(overview.totalRevenue, prevOverview.totalRevenue) !== null && (
                  <span className={`rpt-delta-badge ${calcDelta(overview.totalRevenue, prevOverview.totalRevenue) >= 0 ? 'pos' : 'neg'}`}>
                    {calcDelta(overview.totalRevenue, prevOverview.totalRevenue) >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {Math.abs(calcDelta(overview.totalRevenue, prevOverview.totalRevenue))}%
                  </span>
                )}
              </div>
              <div className="rpt-kpi-label">Total Revenue</div>
              <div className="rpt-kpi-value">{fmt(overview.totalRevenue)}</div>
              <div className="rpt-kpi-sub">
                {overview.ordersCount || 0} orders · {overview.totalCases || 0} cases
              </div>
            </div>

            {/* 2. Total Collected */}
            <div className="rpt-kpi-card green">
              <div className="rpt-kpi-top">
                <div className="rpt-kpi-icon"><Wallet size={20} /></div>
                {calcDelta(overview.totalCollected, prevOverview.totalCollected) !== null && (
                  <span className={`rpt-delta-badge ${calcDelta(overview.totalCollected, prevOverview.totalCollected) >= 0 ? 'pos' : 'neg'}`}>
                    {calcDelta(overview.totalCollected, prevOverview.totalCollected) >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {Math.abs(calcDelta(overview.totalCollected, prevOverview.totalCollected))}%
                  </span>
                )}
              </div>
              <div className="rpt-kpi-label">Total Collected</div>
              <div className="rpt-kpi-value green">{fmt(overview.totalCollected)}</div>
              <div className="rpt-kpi-sub">
                {overview.collectionRate || 0}% collection rate
              </div>
            </div>

            {/* 3. Total Expenses */}
            <div className="rpt-kpi-card red">
              <div className="rpt-kpi-top">
                <div className="rpt-kpi-icon"><TrendingDown size={20} /></div>
                {calcDelta(overview.totalExpenses, prevOverview.totalExpenses) !== null && (
                  <span className={`rpt-delta-badge ${calcDelta(overview.totalExpenses, prevOverview.totalExpenses) <= 0 ? 'pos' : 'neg'}`}>
                    {calcDelta(overview.totalExpenses, prevOverview.totalExpenses) <= 0 ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
                    {Math.abs(calcDelta(overview.totalExpenses, prevOverview.totalExpenses))}%
                  </span>
                )}
              </div>
              <div className="rpt-kpi-label">Total Expenses</div>
              <div className="rpt-kpi-value red">{fmt(overview.totalExpenses)}</div>
              <div className="rpt-kpi-sub">
                {overview.expensesCount || 0} recorded entries
              </div>
            </div>

            {/* 4. Net Cashflow */}
            <div className="rpt-kpi-card purple">
              <div className="rpt-kpi-top">
                <div className="rpt-kpi-icon"><TrendingUp size={20} /></div>
                <span className={`rpt-delta-badge ${overview.netCashflow >= 0 ? 'pos' : 'neg'}`}>
                  {overview.netCashflow >= 0 ? 'Surplus' : 'Deficit'}
                </span>
              </div>
              <div className="rpt-kpi-label">Net Cashflow</div>
              <div className={`rpt-kpi-value ${overview.netCashflow >= 0 ? 'green' : 'red'}`}>
                {fmt(overview.netCashflow)}
              </div>
              <div className="rpt-kpi-sub">
                Collections − Expenses Paid
              </div>
            </div>
          </div>

          {/* ─── 4. Financial Summary (P&L Card) ─── */}
          <div className="rpt-card">
            <div className="rpt-card-header">
              <div className="rpt-card-title-group">
                <div className="rpt-card-icon"><BarChart3 size={17} /></div>
                <div>
                  <div className="rpt-card-title">Profit &amp; Loss Statement</div>
                  <div className="rpt-card-sub">Accrual billing vs cashflow performance</div>
                </div>
              </div>
              <span className="rpt-summary-period">{report?.period?.label}</span>
            </div>

            <div className="rpt-summary-table">
              {[
                {
                  number: '01',
                  label: 'Billed revenue',
                  basis: 'Eligible orders in this period',
                  value: overview.totalRevenue,
                  tag: '100% baseline',
                  tone: 'blue',
                },
                {
                  number: '02',
                  label: 'Operating expenses',
                  basis: 'Recorded plant costs',
                  value: overview.totalExpenses,
                  tag: overview.totalRevenue > 0 ? `${Math.round((overview.totalExpenses / overview.totalRevenue) * 100)}% of revenue` : 'No revenue',
                  tone: 'red',
                },
                {
                  number: '03',
                  label: 'Operating profit',
                  basis: 'Revenue minus expenses',
                  value: overview.operatingProfit,
                  tag: overview.totalRevenue > 0 ? `${Math.round((overview.operatingProfit / overview.totalRevenue) * 100)}% margin` : 'No revenue',
                  tone: overview.operatingProfit >= 0 ? 'green' : 'red',
                },
                {
                  number: '04',
                  label: 'Cash collected',
                  basis: 'Confirmed customer payments',
                  value: overview.totalCollected,
                  tag: `${overview.collectionRate || 0}% collected`,
                  tone: 'green',
                },
                {
                  number: '05',
                  label: 'Outstanding balance',
                  basis: 'Uncollected order value',
                  value: overview.periodOutstanding,
                  tag: overview.totalRevenue > 0 ? `${Math.max(0, 100 - overview.collectionRate)}% remaining` : 'No balance',
                  tone: 'amber',
                },
              ].map(item => (
                <div className="rpt-summary-row" key={item.number}>
                  <span className={`rpt-summary-index ${item.tone}`}>{item.number}</span>
                  <div className="rpt-summary-label">
                    <strong>{item.label}</strong>
                    <span>{item.basis}</span>
                  </div>
                  <div className="rpt-summary-right">
                    <span className={`rpt-summary-tag ${item.tone}`}>{item.tag}</span>
                    <span className={`rpt-summary-amount ${item.tone}`}>{fmt(item.value)}</span>
                  </div>
                </div>
              ))}

              <div className={`rpt-summary-row total ${overview.netCashflow >= 0 ? 'positive' : 'negative'}`}>
                <span className="rpt-summary-index total">06</span>
                <div className="rpt-summary-label">
                  <strong>Net cashflow</strong>
                  <span>Cash collected minus paid expenses</span>
                </div>
                <div className="rpt-summary-right">
                  <span className="rpt-summary-tag actual">Actual cash</span>
                  <span className={`rpt-summary-amount ${overview.netCashflow >= 0 ? 'green' : 'red'}`}>
                    {fmt(overview.netCashflow)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 5. Two-Column Analytics: Collection Analysis & Expense Breakdown ─── */}
          <div className="rpt-analytics-2col">

            {/* Collection Analysis Donut */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <div className="rpt-card-title-group">
                  <div className="rpt-card-icon"><PieIcon size={17} /></div>
                  <div>
                    <div className="rpt-card-title">Collection Analysis</div>
                    <div className="rpt-card-sub">Collected vs period outstanding</div>
                  </div>
                </div>
              </div>

              <div className="rpt-donut-container">
                <div className="rpt-donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={65}
                        dataKey="value"
                        paddingAngle={overview.totalCollected > 0 && overview.periodOutstanding > 0 ? 4 : 0}
                        stroke="none"
                      >
                        <Cell fill={DONUT_COLORS.collected} />
                        <Cell fill={DONUT_COLORS.pending} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="rpt-donut-center">
                    <div className="rpt-donut-pct">{overview.collectionRate}%</div>
                    <div className="rpt-donut-lbl">Collected</div>
                  </div>
                </div>

                <div className="rpt-collection-stats">
                  <div className="rpt-stat-row">
                    <span><span className="rpt-stat-dot green" />Total Collected</span>
                    <strong style={{ color: '#15803D' }}>{fmt(overview.totalCollected)}</strong>
                  </div>
                  <div className="rpt-stat-row">
                    <span><span className="rpt-stat-dot red" />Outstanding Dues</span>
                    <strong style={{ color: '#DC2626' }}>{fmt(overview.periodOutstanding)}</strong>
                  </div>
                  <div className="rpt-stat-row" style={{ paddingTop: '0.4rem', borderTop: '1px dashed #E2E8F0', fontWeight: 700 }}>
                    <span><span className="rpt-stat-dot blue" />Total Billed</span>
                    <span style={{ color: '#03045E' }}>{fmt(overview.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="rpt-card">
              <div className="rpt-card-header">
                <div className="rpt-card-title-group">
                  <div className="rpt-card-icon"><CreditCard size={17} /></div>
                  <div>
                    <div className="rpt-card-title">Expense Breakdown</div>
                    <div className="rpt-card-sub">Category distribution for period</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626' }}>
                  {fmt(overview.totalExpenses)}
                </span>
              </div>

              {report.expenseCategories?.length > 0 ? (
                <div className="rpt-expense-list">
                  {report.expenseCategories.map((item, idx) => (
                    <div key={idx} className="rpt-expense-item">
                      <div className="rpt-expense-item-header">
                        <span className="rpt-expense-name">{item.category}</span>
                        <div>
                          <span style={{ color: '#64748B', fontSize: '0.74rem', marginRight: 8 }}>
                            {item.share}% ({item.count} items)
                          </span>
                          <span className="rpt-expense-amount">{fmt(item.total)}</span>
                        </div>
                      </div>
                      <div className="rpt-progress-track">
                        <div
                          className="rpt-progress-fill"
                          style={{
                            width: `${item.share}%`,
                            background: EXP_COLORS[idx % EXP_COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rpt-empty-state" style={{ padding: '1.5rem 1rem' }}>
                  <CheckCircle2 size={24} style={{ color: '#15803D' }} />
                  <span style={{ fontSize: '0.84rem' }}>No expenses recorded for this period</span>
                </div>
              )}
            </div>

          </div>

          {/* ─── 6. Product Performance ─── */}
          <div className="rpt-card">
            <div className="rpt-card-header">
              <div className="rpt-card-title-group">
                <div className="rpt-card-icon"><Package size={17} /></div>
                <div>
                  <div className="rpt-card-title">Product Performance</div>
                  <div className="rpt-card-sub">Volume and revenue by product snapshot</div>
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0277B6' }}>
                {overview.totalCases || 0} Total Cases
              </span>
            </div>

            {report.productPerformance?.length > 0 ? (
              <div className="rpt-prod-grid">
                {report.productPerformance.map((prod, idx) => (
                  <div key={idx} className="rpt-prod-card">
                    <span className="rpt-prod-title">{prod.productName}</span>
                    <span className="rpt-prod-rev">{fmt(prod.revenue)}</span>
                    <div className="rpt-prod-stats">
                      <span>{prod.cases} cases ({prod.volumeShare}%)</span>
                      <span>{prod.bottles} bottles</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rpt-empty-state" style={{ padding: '1.5rem 1rem' }}>
                <Package size={24} style={{ color: '#94A3B8' }} />
                <span style={{ fontSize: '0.84rem' }}>No product sales recorded in this period</span>
              </div>
            )}
          </div>

          {/* ─── 7. Top Customers Ranking ─── */}
          <div className="rpt-card">
            <div className="rpt-card-header" style={{ flexWrap: 'wrap', gap: '0.65rem' }}>
              <div className="rpt-card-title-group">
                <div className="rpt-card-icon"><Users size={17} /></div>
                <div>
                  <div className="rpt-card-title">Top Customers</div>
                  <div className="rpt-card-sub">Ranked business partners</div>
                </div>
              </div>

              {/* Sort Tabs */}
              <div className="rpt-sort-tabs" role="tablist">
                {[
                  { id: 'billed', label: 'By Billed' },
                  { id: 'collected', label: 'By Collected' },
                  { id: 'outstanding', label: 'By Dues' },
                  { id: 'orders', label: 'By Orders' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`rpt-sort-tab${customerSort === tab.id ? ' active' : ''}`}
                    onClick={() => setCustomerSort(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {sortedCustomers.length > 0 ? (
              <div className="rpt-cust-list">
                {sortedCustomers.slice(0, 5).map((cust, idx) => (
                  <div key={cust.customerId || idx} className="rpt-cust-row">
                    <div className="rpt-cust-left">
                      <span className="rpt-cust-rank">#{String(idx + 1).padStart(2, '0')}</span>
                      <div className="rpt-cust-info">
                        <div className="rpt-cust-name">{cust.name}</div>
                        <div className="rpt-cust-sub">
                          {cust.ordersCount} orders · {cust.casesSold} cases · {cust.phone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <div className="rpt-cust-right">
                      <div className="rpt-cust-val">
                        {customerSort === 'collected' ? fmt(cust.totalCollected) : fmt(cust.totalBilled)}
                      </div>
                      {cust.outstanding > 0 && (
                        <div className="rpt-cust-due">Due: {fmt(cust.outstanding)}</div>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'right', marginTop: '0.35rem' }}>
                  <Link
                    to="/customers"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#0277B6',
                      textDecoration: 'none'
                    }}
                  >
                    View All Customers <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rpt-empty-state" style={{ padding: '1.5rem 1rem' }}>
                <Users size={24} style={{ color: '#94A3B8' }} />
                <span style={{ fontSize: '0.84rem' }}>No customer activity in this period</span>
              </div>
            )}
          </div>

          {/* ─── 8. Monthly Trends (6 Months Comparison) ─── */}
          {report.monthlyTrends?.length > 0 && (
            <div className="rpt-card">
              <div className="rpt-card-header">
                <div className="rpt-card-title-group">
                  <div className="rpt-card-icon"><Layers size={17} /></div>
                  <div>
                    <div className="rpt-card-title">Monthly Financial Trends</div>
                    <div className="rpt-card-sub">Comparative overview across recent months</div>
                  </div>
                </div>
              </div>

              <div className="rpt-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.monthlyTrends}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barGap={4}
                  >
                    <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickFormatter={m => {
                        const [y, mm] = m.split('-');
                        return `${MONTHS[parseInt(mm, 10) - 1].slice(0, 3)} '${y.slice(2)}`;
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      tickFormatter={v => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '0.75rem', paddingTop: 10 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="revenue" name="Billed Revenue" fill="#0277B6" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="collected" name="Collections" fill="#15803D" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="expenses" name="Expenses" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </>
      )}

    </div>
  );
}
