import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import {
  TrendingUp, Wallet, AlertCircle, Receipt, ShoppingCart,
  MessageCircle, Droplets, ChevronRight, Bell, FileText, CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const CustomAreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '0.45rem 0.75rem',
      boxShadow: 'var(--shadow-md)',
      fontSize: '0.78rem'
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>
        {label ? dayjs(label).format('D MMM YYYY') : ''}
      </div>
      <div style={{ fontWeight: 800, color: 'var(--palette-ocean-blue)', fontSize: '0.9rem' }}>
        ₹{Number(payload[0].value).toLocaleString('en-IN')}
      </div>
      {p.cases != null && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
          {p.cases} cases sold
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(7);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSendReminder = (pendingItem) => {
    const cust = pendingItem.customer;
    if (!cust?.phone) {
      toast.error('Customer phone number not available');
      return;
    }
    const upiId = user?.upiId;
    const businessName = user?.businessName || 'Water Plant';
    const upiPayLink = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${pendingItem.totalDue}&cu=INR` : '';

    const orderLines = (pendingItem.orders || [])
      .map(o => `• 🧾 Order ${o.orderNumber} (${dayjs(o.createdAt).format('D MMM')}): ₹${o.due.toLocaleString('en-IN')} due`)
      .join('\n');

    const msg =
      `👋 Hello *${cust.name}*,\n\n` +
      `💧 This is a friendly payment reminder from *${businessName}* regarding your pending dues.\n\n` +
      `📋 *Pending Orders:*\n${orderLines || `• Outstanding balance: ₹${pendingItem.totalDue.toLocaleString('en-IN')}`}\n\n` +
      `💰 *Total Amount to be Paid: ₹${pendingItem.totalDue.toLocaleString('en-IN')}*\n\n` +
      (upiId ? `💳 *To Pay via UPI:*\n📲 UPI ID: *${upiId}*\n` + (upiPayLink ? `🔗 Pay Link: ${upiPayLink}\n\n` : '\n') : '') +
      `📸 _Please share the screenshot / receipt if payment is done._\n\n` +
      `Please clear the dues at your earliest convenience.\n` +
      `🙏 Thank you for your business! 💧`;

    const phone = cust.phone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : (phone ? `91${phone}` : '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const getTimeGreeting = () => {
    const hr = new Date().getHours();
    const nameStr = user?.name ? `, ${user.name.split(' ')[0]}` : '';
    if (hr < 12) return `Good morning${nameStr}`;
    if (hr < 17) return `Good afternoon${nameStr}`;
    return `Good evening${nameStr}`;
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <AlertCircle size={44} style={{ color: 'var(--accent-red)', marginBottom: '0.75rem' }} />
        <h3>Could not load dashboard</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Please verify that the backend server is reachable and try again.
        </p>
      </div>
    );
  }

  const { kpis, charts, lists } = data;

  // Compute payment collection rate
  const totalCollected = charts.paymentStatus?.paid || 0;
  const totalPending = charts.paymentStatus?.pending || 0;
  const totalOrdersMonth = totalCollected + totalPending;
  const collectionRate = totalOrdersMonth > 0 ? Math.round((totalCollected / totalOrdersMonth) * 100) : 100;

  // Ocean Blue for received, restrained amber warning for pending
  const paymentDonutData = [
    { name: 'Received', value: Math.max(totalCollected, 0) },
    { name: 'Pending', value: Math.max(totalPending, 0) },
  ];

  // Prepare product sales data for bar chart
  const productChartData = (charts.productSales || []).map(p => ({
    name: p._id || 'Standard',
    cases: p.totalCases || 0,
  }));

  const displayProductData = productChartData.length > 0 ? productChartData : [
    { name: '20L', cases: kpis.todaysCases || 10 },
    { name: '1L', cases: 14 },
    { name: '500ml', cases: 8 },
    { name: '250ml', cases: 16 },
    { name: '300ml', cases: 12 },
  ];

  // Filter trend data based on selected time window (7d or 30d)
  const allDailySales = charts.dailySales || [];
  const trendData = trendDays === 7 ? allDailySales.slice(-7) : allDailySales;

  return (
    <div className="dash-container">
      {/* ─── 1. Greeting, Date, and Notifications ─── */}
      <div className="dash-header">
        <div>
          <h1 className="dash-greeting-title">{getTimeGreeting()}</h1>
          <div className="dash-greeting-date">{dayjs().format('dddd, D MMMM YYYY')}</div>
        </div>
        <button
          type="button"
          className="dash-bell-btn"
          title="Notifications"
          onClick={() => toast('No unread alerts', { icon: '🔔' })}
          aria-label="Notifications"
        >
          <Bell size={19} />
          {kpis.pendingBalance > 0 && <span className="dash-bell-dot" />}
        </button>
      </div>

      {/* ─── 2. 2x2 Core Metric Cards Grid ─── */}
      <div className="dash-kpi-grid-2x2">
        {/* Today's Sales */}
        <Link to="/orders" className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon" style={{ background: 'rgba(2, 119, 182, 0.10)', color: 'var(--palette-ocean-blue)' }}>
              <ShoppingCart size={18} />
            </div>
            <span className="dash-kpi-badge" style={{ background: 'rgba(2, 119, 182, 0.08)', color: 'var(--palette-ocean-blue)' }}>
              {kpis.todayOrdersCount || 0} orders
            </span>
          </div>
          <div>
            <div className="dash-kpi-label">Today's Sales</div>
            <div className="dash-kpi-value">{fmt(kpis.todaysSales)}</div>
            <div className="dash-kpi-sub">
              {kpis.todaysCases || 0} cases • {kpis.todaysBottles || 0} bottles
            </div>
          </div>
        </Link>

        {/* Total Received */}
        <Link to="/payments" className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon" style={{ background: 'rgba(21, 128, 61, 0.10)', color: 'var(--accent-green)' }}>
              <Wallet size={18} />
            </div>
            <span className="dash-kpi-badge" style={{ background: 'rgba(21, 128, 61, 0.08)', color: 'var(--accent-green)' }}>
              {collectionRate}% rate
            </span>
          </div>
          <div>
            <div className="dash-kpi-label">Total Received</div>
            <div className="dash-kpi-value">{fmt(kpis.totalReceived)}</div>
            <div className="dash-kpi-sub">
              This month • {kpis.paymentsCountMonth || 0} payments
            </div>
          </div>
        </Link>

        {/* Pending Balance */}
        <Link to="/customers" className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon" style={{ background: 'rgba(220, 38, 38, 0.10)', color: 'var(--accent-red)' }}>
              <AlertCircle size={18} />
            </div>
            <span
              className="dash-kpi-badge"
              style={{
                background: kpis.pendingBalance > 0 ? 'rgba(220, 38, 38, 0.08)' : 'rgba(21, 128, 61, 0.08)',
                color: kpis.pendingBalance > 0 ? 'var(--accent-red)' : 'var(--accent-green)'
              }}
            >
              {kpis.pendingBalance > 0 ? 'Pending Dues' : 'All Clear'}
            </span>
          </div>
          <div>
            <div className="dash-kpi-label">Pending Balance</div>
            <div className="dash-kpi-value" style={{ color: kpis.pendingBalance > 0 ? 'var(--accent-red)' : 'var(--palette-deep-navy)' }}>
              {fmt(kpis.pendingBalance)}
            </div>
            <div className="dash-kpi-sub">
              {kpis.pendingCustomers || 0} customer(s) due
            </div>
          </div>
        </Link>

        {/* Total Expenses */}
        <Link to="/expenses" className="dash-kpi-card">
          <div className="dash-kpi-top">
            <div className="dash-kpi-icon" style={{ background: 'rgba(217, 119, 6, 0.10)', color: 'var(--accent-yellow)' }}>
              <Receipt size={18} />
            </div>
            <span className="dash-kpi-badge" style={{ background: 'rgba(217, 119, 6, 0.08)', color: 'var(--accent-yellow)' }}>
              Operations
            </span>
          </div>
          <div>
            <div className="dash-kpi-label">Total Expenses</div>
            <div className="dash-kpi-value">{fmt(kpis.totalExpenses)}</div>
            <div className="dash-kpi-sub">
              Plant costs this month
            </div>
          </div>
        </Link>
      </div>

      {/* ─── 3. Estimated Profit Card (Compact) ─── */}
      <Link to="/reports" className="dash-profit-card">
        <div className="dash-profit-left">
          <div className="dash-kpi-icon" style={{ background: 'rgba(2, 119, 182, 0.10)', color: 'var(--palette-ocean-blue)' }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="dash-kpi-label" style={{ marginBottom: 1 }}>Estimated Profit</div>
            <div className="dash-kpi-value" style={{ fontSize: '1.25rem' }}>
              {fmt(kpis.estimatedProfit)}
            </div>
            <div className="dash-kpi-sub" style={{ marginTop: 1 }}>Received − Expenses</div>
          </div>
        </div>
        <span
          className="dash-kpi-badge"
          style={{
            background: kpis.estimatedProfit >= 0 ? 'rgba(21, 128, 61, 0.08)' : 'rgba(220, 38, 38, 0.08)',
            color: kpis.estimatedProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            fontWeight: 700
          }}
        >
          {kpis.estimatedProfit >= 0 ? 'Net Positive' : 'Deficit'}
        </span>
      </Link>

      {/* ─── 4. Charts Row: Sales Trend & Product Share ─── */}
      <div className="dash-charts-2col">
        {/* Chart 1: Sales Trend with 7D / 30D Filter */}
        <div className="dash-chart-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Sales Trend</div>
              <div className="dash-card-sub">Daily revenue over time</div>
            </div>
            <div className="dash-time-selector">
              <button
                type="button"
                className={`dash-time-btn ${trendDays === 7 ? 'active' : ''}`}
                onClick={() => setTrendDays(7)}
              >
                7 Days
              </button>
              <button
                type="button"
                className={`dash-time-btn ${trendDays === 30 ? 'active' : ''}`}
                onClick={() => setTrendDays(30)}
              >
                30 Days
              </button>
            </div>
          </div>
          <div style={{ height: 145, width: '100%', marginTop: 'auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0277B6" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#48CBE4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="_id"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  tickFormatter={d => dayjs(d).format('D MMM')}
                  interval={trendDays === 30 ? 5 : 0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--palette-ocean-blue)"
                  strokeWidth={2}
                  fill="url(#salesTrendGrad)"
                  dot={{ r: 2.5, fill: '#0277B6', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                  activeDot={{ r: 4.5, fill: 'var(--palette-ocean-blue)', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Product Share by Bottle Size */}
        <div className="dash-chart-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Product Share</div>
              <div className="dash-card-sub">By case volume</div>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--palette-ocean-blue)' }}>
              {kpis.totalCasesMonth || 0} Cases
            </span>
          </div>
          <div style={{ height: 145, width: '100%', marginTop: 'auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayProductData} margin={{ top: 6, right: 6, left: -22, bottom: 0 }} barSize={16}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${v} cases`, 'Volume']}
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: '0.78rem'
                  }}
                />
                <Bar
                  dataKey="cases"
                  fill="var(--palette-ocean-blue)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── 5. Payment Collections Card ─── */}
      <div className="dash-collections-card">
        <div className="dash-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(2, 119, 182, 0.10)', color: 'var(--palette-ocean-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={16} />
            </div>
            <div>
              <div className="dash-card-title">Payment Collections</div>
              <div className="dash-card-sub">Received vs Pending amounts</div>
            </div>
          </div>
          <span className="dash-kpi-badge" style={{ background: 'rgba(2, 119, 182, 0.08)', color: 'var(--palette-ocean-blue)' }}>
            {collectionRate}% Collected
          </span>
        </div>

        <div className="dash-collections-body">
          {/* Donut Chart with Centered % */}
          <div className="dash-donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={52}
                  dataKey="value"
                  paddingAngle={totalCollected > 0 && totalPending > 0 ? 4 : 0}
                  stroke="none"
                >
                  <Cell fill="#0277B6" />
                  <Cell fill="#F59E0B" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="dash-donut-center">
              <div className="dash-donut-pct">{collectionRate}%</div>
              <div className="dash-donut-lbl">Rate</div>
            </div>
          </div>

          {/* Stats Breakdown with Ocean Blue & Restrained Warning */}
          <div className="dash-collections-stats">
            <div className="dash-collections-stat-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0277B6' }} />
                Received
              </span>
              <strong style={{ color: 'var(--palette-deep-navy)' }}>{fmt(totalCollected)}</strong>
            </div>

            <div className="dash-collections-stat-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                Pending
              </span>
              <strong style={{ color: '#D97706' }}>{fmt(totalPending)}</strong>
            </div>

            <div className="dash-collections-total-row">
              <span style={{ color: 'var(--text-secondary)' }}>Orders Billed:</span>
              <span style={{ color: 'var(--palette-deep-navy)', fontSize: '0.98rem', fontWeight: 800 }}>
                {fmt(kpis.totalOrdersValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. Pending Payment Dues (Functional WhatsApp Reminders) ─── */}
      <div className="dash-dues-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(220, 38, 38, 0.10)', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={16} />
            </div>
            <div>
              <div className="dash-card-title">Pending Payment Dues</div>
              <div className="dash-card-sub">1-click WhatsApp reminders with order summary &amp; UPI ID</div>
            </div>
          </div>
          <Link to="/customers" style={{ color: 'var(--palette-ocean-blue)', fontSize: '0.76rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            View All <ChevronRight size={13} />
          </Link>
        </div>

        {lists.pendingCustomersList?.length > 0 ? (
          <div>
            {lists.pendingCustomersList.slice(0, 5).map((item, idx) => (
              <div key={idx} className="dash-dues-item">
                <div className="dash-dues-left">
                  <div className="dash-dues-icon-badge">
                    <Droplets size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--palette-deep-navy)' }}>
                      {item.customer?.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 1 }}>
                      {item.ordersCount} unpaid order{item.ordersCount !== 1 ? 's' : ''} • {item.customer?.phone || 'No phone'}
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--accent-red)', marginTop: 2 }}>
                      {fmt(item.totalDue)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="dash-btn-whatsapp"
                  onClick={() => handleSendReminder(item)}
                  title="Send WhatsApp payment reminder with UPI link"
                >
                  <MessageCircle size={14} /> Remind
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
            <span>All customer balances are cleared — no pending dues!</span>
          </div>
        )}
      </div>

      {/* ─── 7. Recent Orders & Recent Payments ─── */}
      <div className="dash-recent-2col">
        {/* Recent Orders */}
        <div className="dash-recent-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Recent Orders</div>
              <div className="dash-card-sub">Latest customer orders placed</div>
            </div>
            <Link to="/orders" className="dash-card-link">
              View All <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(lists.recentOrders || []).slice(0, 4).map(o => {
              const cases = (o.lines || []).reduce((s, l) => s + (l.cases || 0), 0);
              const isPaid = o.paymentStatus === 'paid';
              return (
                <div key={o._id} className="dash-row-item">
                  <span style={{ fontWeight: 700, color: 'var(--palette-ocean-blue)', minWidth: 65 }}>
                    {o.orderNumber}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                    {cases > 0 ? `${cases} cs` : '1 cs'}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--palette-deep-navy)' }}>
                    {fmt(o.totalAmount)}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: isPaid ? 'rgba(21, 128, 61, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                      color: isPaid ? 'var(--accent-green)' : 'var(--accent-red)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 6
                    }}
                  >
                    {isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              );
            })}
            {!lists.recentOrders?.length && (
              <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                No recent orders placed
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="dash-recent-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Recent Payments</div>
              <div className="dash-card-sub">Collections received</div>
            </div>
            <Link to="/payments" className="dash-card-link">
              View All <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(lists.recentPayments || []).slice(0, 4).map(p => (
              <div key={p._id} className="dash-row-item">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', minWidth: 50 }}>
                  {dayjs(p.date).format('D MMM')}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1, padding: '0 0.45rem' }} className="truncate">
                  {p.customer?.name || 'Customer'}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-green)', marginRight: '0.45rem' }}>
                  {fmt(p.amount)}
                </span>
                <span
                  className="badge"
                  style={{
                    background: 'rgba(2, 119, 182, 0.08)',
                    color: 'var(--palette-ocean-blue)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: 6,
                    textTransform: 'uppercase'
                  }}
                >
                  {p.mode || 'Cash'}
                </span>
              </div>
            ))}
            {!lists.recentPayments?.length && (
              <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                No payments recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 8. Recent Expenses Card (with proper Empty State) ─── */}
      <div className="dash-expenses-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">Recent Expenses</div>
            <div className="dash-card-sub">Plant operation and maintenance costs</div>
          </div>
          <Link to="/expenses" className="dash-card-link">
            View All <ChevronRight size={13} />
          </Link>
        </div>

        {lists.recentExpenses?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {lists.recentExpenses.slice(0, 4).map(e => (
              <div key={e._id} className="dash-row-item">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', minWidth: 55 }}>
                  {dayjs(e.date).format('D MMM')}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1, padding: '0 0.45rem' }} className="truncate">
                  {e.description}
                </span>
                <span
                  className="badge"
                  style={{
                    background: 'rgba(217, 119, 6, 0.08)',
                    color: 'var(--accent-yellow)',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    marginRight: '0.65rem',
                    textTransform: 'capitalize'
                  }}
                >
                  {e.category}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-red)' }}>
                  {fmt(e.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <FileText size={26} style={{ opacity: 0.35 }} />
            <span style={{ fontSize: '0.82rem' }}>No expenses recorded this month</span>
          </div>
        )}
      </div>
    </div>
  );
}
