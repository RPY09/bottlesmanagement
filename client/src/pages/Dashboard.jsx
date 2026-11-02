import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Receipt,
  ShoppingCart,
  Droplets,
  ChevronRight,
  Bell,
  FileText,
  CheckCircle2,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Activity,
  Users,
  CreditCard,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function pctChange(curr, prev) {
  if (!prev) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return pct;
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────
function SalesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="dash-tooltip">
      <div className="dash-tooltip-date">
        {label ? dayjs(label).format("D MMM YYYY") : ""}
      </div>
      <div className="dash-tooltip-value">{fmt(payload[0].value)}</div>
      {p.cases != null && (
        <div className="dash-tooltip-sub">{p.cases} cases sold</div>
      )}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard({ h = 110 }) {
  return (
    <div className="dash-skeleton" style={{ height: h, borderRadius: 14 }} />
  );
}

// ─── Delta badge ──────────────────────────────────────────────────────────────
function DeltaBadge({ curr, prev }) {
  const pct = pctChange(curr, prev);
  if (pct === null) return null;
  const pos = pct >= 0;
  return (
    <span className={`dash-delta-badge ${pos ? "pos" : "neg"}`}>
      {pos ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(pct)}%
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityTab, setActivityTab] = useState("orders");
  const [trendDays, setTrendDays] = useState(7);

  // Greeting (lazy init — avoids purity lint warning)
  const [greeting] = useState(() => {
    const hr = new Date().getHours();
    const first = user?.name ? `, ${user.name.split(" ")[0]}` : "";
    if (hr < 12) return `Good morning${first}`;
    if (hr < 17) return `Good afternoon${first}`;
    return `Good evening${first}`;
  });

  // Fetch dashboard data
  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get("/dashboard/summary")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WhatsApp reminder
  const handleWhatsApp = (item) => {
    if (!item.phone) {
      toast.error("No phone number");
      return;
    }
    const businessName = user?.businessName || "Water Plant";
    const upiId = user?.upiId;
    const upiLink = upiId
      ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${item.outstanding}&cu=INR`
      : "";
    const orderLines = (item.orders || [])
      .map(
        (o) =>
          `- Order ${o.orderNumber} (${dayjs(o.createdAt).format("D MMM")}): ₹${o.due.toLocaleString("en-IN")} due`,
      )
      .join("\n");
    const msg =
      `Hello *${item.name}*,\n\n` +
      `Friendly payment reminder from *${businessName}*.\n\n` +
      `*Pending Orders:*\n${orderLines || `- Outstanding: ₹${item.outstanding.toLocaleString("en-IN")}`}\n\n` +
      `*Total Due: ₹${item.outstanding.toLocaleString("en-IN")}*\n\n` +
      (upiId
        ? `UPI ID: *${upiId}*\n${upiLink ? `${upiLink}\n\n` : "\n"}`
        : "") +
      `Please share the receipt if paid.\nThank you!`;
    const phone = item.phone.replace(/\D/g, "");
    const clean = phone.startsWith("91") ? phone : `91${phone}`;
    window.open(
      `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  // Loading state
  if (loading) {
    return (
      <div className="dash-container">
        <div className="dash-header">
          <div>
            <div
              className="dash-skeleton"
              style={{
                width: 200,
                height: 28,
                borderRadius: 8,
                marginBottom: 6,
              }}
            />
            <div
              className="dash-skeleton"
              style={{ width: 140, height: 16, borderRadius: 6 }}
            />
          </div>
          <div
            className="dash-skeleton"
            style={{ width: 40, height: 40, borderRadius: 12 }}
          />
        </div>
        <div className="dash-kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} h={118} />
          ))}
        </div>
        <SkeletonCard h={80} />
        <div className="dash-charts-row">
          <SkeletonCard h={220} />
          <SkeletonCard h={220} />
        </div>
        <SkeletonCard h={200} />
        <SkeletonCard h={240} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dash-container">
        <div className="dash-error-card">
          <AlertCircle size={32} />
          <div>
            <div className="dash-error-title">Dashboard failed to load</div>
            <div className="dash-error-sub">{error}</div>
          </div>
          <button type="button" className="dash-retry-btn" onClick={fetchData}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    overview,
    prevOverview,
    salesTrend,
    productShare,
    topCustomers,
    pendingDues,
    recentActivity,
  } = data;

  // Fill days without orders so the trend always has a continuous baseline.
  // Without these zero-value points, a single sale is rendered as an isolated dot.
  const trendByDate = new Map(
    (salesTrend || []).map((entry) => [entry.date, entry]),
  );
  const completeTrendData = Array.from({ length: 30 }, (_, index) => {
    const date = dayjs().subtract(29 - index, "day").format("YYYY-MM-DD");
    return (
      trendByDate.get(date) || {
        date,
        revenue: 0,
        orders: 0,
        cases: 0,
      }
    );
  });
  const trendData =
    trendDays === 7 ? completeTrendData.slice(-7) : completeTrendData;

  // Prepare product share bar data
  const productBarData =
    productShare.length > 0
      ? productShare.map((p) => ({
          name: p.productName || "Unknown",
          cases: p.cases,
          share: p.share,
        }))
      : [];

  // Collection donut
  const collected = overview.paymentsReceived || 0;
  const totalBilled = overview.totalSales || 0;
  const collectionRate =
    totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0;
  const donutData = [
    { name: "Collected", value: Math.max(collected, 0) },
    { name: "Pending", value: Math.max(overview.pendingBalance || 0, 0) },
  ];

  return (
    <div className="dash-container">
      {/* ── 1. Header ─────────────────────────────────────────────────────── */}
      <div className="dash-header">
        <div>
          <h1 className="dash-greeting-title">{greeting}</h1>
          <div className="dash-greeting-date">
            <Calendar
              size={12}
              style={{
                display: "inline",
                marginRight: 4,
                verticalAlign: "middle",
              }}
            />
            {dayjs().format("dddd, D MMMM YYYY")}
          </div>
        </div>
        <div className="dash-notifications-wrap">
          <button
            type="button"
            className="dash-bell-btn"
            title="Payment alerts"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-label="Payment alerts"
            aria-expanded={notificationsOpen}
          >
            <Bell size={18} />
            {(pendingDues?.totalOutstanding || 0) > 0 && (
              <span className="dash-bell-dot" />
            )}
          </button>
          {notificationsOpen && (
            <div className="dash-notifications-popover" role="status">
              <div className="dash-notifications-header">
                <div>
                  <strong>Payment alerts</strong>
                  <span>
                    {pendingDues?.customerCount || 0} customer
                    {pendingDues?.customerCount === 1 ? "" : "s"} with pending
                    dues
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  aria-label="Close payment alerts"
                >
                  ×
                </button>
              </div>
              {pendingDues?.topDues?.length ? (
                <div className="dash-notifications-list">
                  {pendingDues.topDues.slice(0, 3).map((due) => (
                    <button
                      type="button"
                      className="dash-notification-row"
                      key={due.customerId}
                      onClick={() => navigate("/customers")}
                    >
                      <span>
                        <strong>{due.name}</strong>
                        <small>
                          {due.ordersCount} unpaid order
                          {due.ordersCount === 1 ? "" : "s"}
                        </small>
                      </span>
                      <b>{fmt(due.outstanding)}</b>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="dash-notifications-empty">
                  No pending payment alerts.
                </div>
              )}
              <Link
                to="/orders"
                className="dash-notifications-link"
                onClick={() => setNotificationsOpen(false)}
              >
                View unpaid orders <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. KPI Cards ──────────────────────────────────────────────────── */}
      <div className="dash-kpi-grid">
        {/* All-time sales */}
        <Link to="/orders" className="dash-kpi-card blue">
          <div className="dash-kpi-top">
            <div className="dash-kpi-heading">
              <div className="dash-kpi-icon">
                <ShoppingCart size={17} />
              </div>
              <span className="dash-kpi-label">Sales</span>
            </div>
            <DeltaBadge
              curr={overview.totalSales}
              prev={prevOverview.totalSales}
            />
          </div>
          <div className="dash-kpi-value">{fmt(overview.totalSales)}</div>
          <div className="dash-kpi-sub">
            {overview.orderCount || 0} orders · {overview.casesSold || 0} cases
          </div>
        </Link>

        {/* Payments Received */}
        <Link to="/payments" className="dash-kpi-card green">
          <div className="dash-kpi-top">
            <div className="dash-kpi-heading">
              <div className="dash-kpi-icon">
                <Wallet size={17} />
              </div>
              <span className="dash-kpi-label">Collected</span>
            </div>
            <DeltaBadge
              curr={overview.paymentsReceived}
              prev={prevOverview.paymentsReceived}
            />
          </div>
          <div className="dash-kpi-value">{fmt(overview.paymentsReceived)}</div>
          <div className="dash-kpi-sub">
            {overview.paymentCount || 0} payments · {collectionRate}% rate
          </div>
        </Link>

        {/* Pending Balance */}
        <Link to="/orders" className="dash-kpi-card red">
          <div className="dash-kpi-top">
            <div className="dash-kpi-heading">
              <div className="dash-kpi-icon">
                <AlertCircle size={17} />
              </div>
              <span className="dash-kpi-label">Pending</span>
            </div>
            <span
              className={`dash-kpi-status ${overview.pendingBalance > 0 ? "danger" : "ok"}`}
            >
              {overview.pendingBalance > 0 ? "Due" : "Clear"}
            </span>
          </div>
          <div className="dash-kpi-value">{fmt(overview.pendingBalance)}</div>
          <div className="dash-kpi-sub">
            {overview.pendingOrderCount || 0} unpaid orders
          </div>
        </Link>

        {/* Expenses */}
        <Link to="/expenses" className="dash-kpi-card orange">
          <div className="dash-kpi-top">
            <div className="dash-kpi-heading">
              <div className="dash-kpi-icon">
                <Receipt size={17} />
              </div>
              <span className="dash-kpi-label">Expenses</span>
            </div>
            <DeltaBadge curr={overview.expenses} prev={prevOverview.expenses} />
          </div>
          <div className="dash-kpi-value">{fmt(overview.expenses)}</div>
          <div className="dash-kpi-sub">Operating costs</div>
        </Link>
      </div>

      {/* ── 3. Net Cashflow Card ──────────────────────────────────────────── */}
      <Link
        to="/reports"
        className={`dash-cashflow-card ${overview.netCashflow >= 0 ? "positive" : "negative"}`}
      >
        <div className="dash-cashflow-left">
          <div className="dash-cashflow-icon">
            {overview.netCashflow >= 0 ? (
              <TrendingUp size={20} />
            ) : (
              <TrendingDown size={20} />
            )}
          </div>
          <div>
            <div className="dash-cashflow-label">Net Cashflow</div>
            <div className="dash-cashflow-sub">
              Payments Received − Expenses
            </div>
          </div>
        </div>
        <div className="dash-cashflow-right">
          <div className="dash-cashflow-value">{fmt(overview.netCashflow)}</div>
          <span
            className={`dash-cashflow-badge ${overview.netCashflow >= 0 ? "pos" : "neg"}`}
          >
            {overview.netCashflow >= 0 ? "Net Positive" : "Deficit"}
          </span>
        </div>
      </Link>

      {/* ── 4. Charts ─────────────────────────────────────────────────────── */}
      <div className="dash-charts-row">
        {/* Sales Trend */}
        <div className="dash-chart-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Sales Trend</div>
              <div className="dash-card-sub">Daily revenue (last 30 days)</div>
            </div>
            <div className="dash-time-selector">
              <button
                type="button"
                className={`dash-time-btn${trendDays === 7 ? " active" : ""}`}
                onClick={() => setTrendDays(7)}
              >
                7d
              </button>
              <button
                type="button"
                className={`dash-time-btn${trendDays === 30 ? " active" : ""}`}
                onClick={() => setTrendDays(30)}
              >
                30d
              </button>
            </div>
          </div>
          {trendData.length === 0 ? (
            <div className="dash-empty">
              <Activity size={28} />
              <span>No sales data</span>
            </div>
          ) : (
            <div style={{ height: 160, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="dashTrendGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--palette-ocean-blue)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--palette-sky-blue)"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#F1F5F9"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                    tickFormatter={(d) => dayjs(d).format("D MMM")}
                    interval={trendDays === 30 ? 5 : 0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : v
                    }
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<SalesTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--palette-ocean-blue)"
                    strokeWidth={2}
                    fill="url(#dashTrendGrad)"
                    dot={{
                      r: 2.5,
                      fill: "var(--palette-ocean-blue)",
                      stroke: "#FFFFFF",
                      strokeWidth: 1.5,
                    }}
                    activeDot={{
                      r: 4.5,
                      fill: "var(--palette-ocean-blue)",
                      stroke: "#FFFFFF",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Product Share */}
        <div className="dash-chart-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Product Share</div>
              <div className="dash-card-sub">By case volume</div>
            </div>
            <span className="dash-chart-badge">
              <Package size={12} style={{ marginRight: 3 }} />
              {overview.casesSold || 0} cs
            </span>
          </div>
          {productBarData.length === 0 ? (
            <div className="dash-empty">
              <Package size={28} />
              <span>No product data</span>
            </div>
          ) : (
            <div style={{ height: 160, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productBarData}
                  margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                  barSize={18}
                >
                  <CartesianGrid
                    stroke="#F1F5F9"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v, name) =>
                      name === "cases" ? [`${v} cases`, "Volume"] : [v, name]
                    }
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: "0.78rem",
                    }}
                  />
                  <Bar
                    dataKey="cases"
                    fill="var(--palette-ocean-blue)"
                    radius={[4, 4, 0, 0]}
                  >
                    {productBarData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === 0
                            ? "var(--palette-deep-navy)"
                            : i === 1
                              ? "var(--palette-ocean-blue)"
                              : i === 2
                                ? "var(--palette-sky-blue)"
                                : "var(--palette-ice-blue)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Payment Collections ─────────────────────────────────────────── */}
      <div className="dash-collections-card">
        <div className="dash-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div className="dash-coll-icon">
              <Wallet size={16} />
            </div>
            <div>
              <div className="dash-card-title">Payment Collections</div>
              <div className="dash-card-sub">Collected vs Outstanding</div>
            </div>
          </div>
          <span className="dash-chart-badge green">
            {collectionRate}% Collected
          </span>
        </div>
        <div className="dash-collections-body">
          <div className="dash-donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={52}
                  dataKey="value"
                  paddingAngle={
                    collected > 0 && overview.pendingBalance > 0 ? 4 : 0
                  }
                  stroke="none"
                >
                  <Cell fill="var(--palette-ocean-blue)" />
                  <Cell fill="var(--status-danger-bg)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="dash-donut-center">
              <div className="dash-donut-pct">{collectionRate}%</div>
              <div className="dash-donut-lbl">Rate</div>
            </div>
          </div>
          <div className="dash-collections-stats">
            <div className="dash-stat-row">
              <span>
                <span className="dash-dot blue" />
                Collected
              </span>
              <strong style={{ color: "var(--text-primary)" }}>
                {fmt(collected)}
              </strong>
            </div>
            <div className="dash-stat-row">
              <span>
                <span className="dash-dot amber" />
                Outstanding
              </span>
              <strong style={{ color: "var(--status-warning-text)" }}>
                {fmt(overview.pendingBalance)}
              </strong>
            </div>
            <div className="dash-stat-divider" />
            <div className="dash-stat-row total">
              <span>Orders Billed</span>
              <span
                style={{
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  fontSize: "0.98rem",
                }}
              >
                {fmt(overview.totalSales)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. Top Customers ──────────────────────────────────────────────── */}
      {topCustomers.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <div className="dash-icon-badge blue">
                <Users size={15} />
              </div>
              <div>
                <div className="dash-card-title">Top Customers</div>
                <div className="dash-card-sub">
                  By collections · {data.period?.label}
                </div>
              </div>
            </div>
            <Link to="/customers" className="dash-card-link">
              View All <ChevronRight size={13} />
            </Link>
          </div>
          <div className="dash-top-customers">
            {topCustomers.map((c, i) => (
              <div key={c._id || i} className="dash-top-cust-row">
                <span className="dash-rank">
                  #{String(i + 1).padStart(2, "0")}
                </span>
                <div className="dash-top-cust-info">
                  <div className="dash-top-cust-name">
                    {c.name || "Unknown"}
                  </div>
                  {c.address && (
                    <div className="dash-top-cust-loc">{c.address}</div>
                  )}
                </div>
                <div className="dash-top-cust-amount">{fmt(c.collected)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 8. Pending Dues ───────────────────────────────────────────────── */}
      <div className="dash-dues-card">
        <div className="dash-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div className="dash-icon-badge red">
              <AlertCircle size={15} strokeWidth={2.4} />
            </div>
            <div>
              <div className="dash-card-title">Pending Payment Dues</div>
              <div className="dash-card-sub">
                Follow up before balances become overdue
              </div>
            </div>
          </div>
          <Link to="/orders" className="dash-card-link">
            View all <ChevronRight size={13} />
          </Link>
        </div>

        {/* Summary stats row */}
        <div className="dash-dues-stats">
          <div className="dash-dues-stat">
            <div className="dash-dues-stat-val">
              {fmt(pendingDues?.totalOutstanding)}
            </div>
            <div className="dash-dues-stat-lbl">Total outstanding</div>
          </div>
          <div className="dash-dues-stat-sep" />
          <div className="dash-dues-stat">
            <div className="dash-dues-stat-val">
              {pendingDues?.customerCount || 0}
            </div>
            <div className="dash-dues-stat-lbl">Customers</div>
          </div>
          <div className="dash-dues-stat-sep" />
          <div className="dash-dues-stat">
            <div className="dash-dues-stat-val">
              {pendingDues?.unpaidOrderCount || 0}
            </div>
            <div className="dash-dues-stat-lbl">Orders</div>
          </div>
        </div>

        {pendingDues?.topDues?.length > 0 ? (
          <div>
            {pendingDues.topDues.map((item, idx) => (
              <div key={idx} className="dash-dues-item">
                <div className="dash-dues-left">
                  <div className="dash-dues-avatar">
                    <Droplets size={17} />
                  </div>
                  <div>
                    <div className="dash-dues-name">{item.name}</div>
                    <div className="dash-dues-meta">
                      {item.ordersCount} order
                      {item.ordersCount !== 1 ? "s" : ""} ·{" "}
                      {item.phone || "No phone"}
                    </div>
                    <div className="dash-dues-amount">
                      {fmt(item.outstanding)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="dash-btn-whatsapp"
                  onClick={() => handleWhatsApp(item)}
                  title="Send WhatsApp payment reminder"
                >
                  <i className="bi bi-whatsapp" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="dash-empty-inline">
            <CheckCircle2
              size={16}
              style={{ color: "var(--status-success-text)" }}
            />
            <span>All customer balances cleared — no pending dues!</span>
          </div>
        )}
      </div>

      {/* ── 9. Recent Activity ────────────────────────────────────────────── */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div className="dash-icon-badge navy">
              <Activity size={15} />
            </div>
            <div>
              <div className="dash-card-title">Recent Activity</div>
              <div className="dash-card-sub">
                Latest orders, payments &amp; expenses
              </div>
            </div>
          </div>
        </div>

        <div className="dash-activity-tabs">
          {["orders", "payments", "expenses"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`dash-activity-tab${activityTab === tab ? " active" : ""}`}
              onClick={() => setActivityTab(tab)}
            >
              {tab === "orders" && <ShoppingCart size={13} />}
              {tab === "payments" && <CreditCard size={13} />}
              {tab === "expenses" && <Receipt size={13} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {activityTab === "orders" && (
          <div className="dash-activity-list">
            {recentActivity.orders?.length > 0 ? (
              recentActivity.orders.slice(0, 5).map((o) => {
                const cases = (o.lines || []).reduce(
                  (s, l) => s + (l.cases || 0),
                  0,
                );
                const isPaid = o.paymentStatus === "paid";
                return (
                  <div key={o._id} className="dash-activity-row">
                    <div className="dash-activity-icon blue">
                      <ShoppingCart size={13} />
                    </div>
                    <div className="dash-activity-main">
                      <div className="dash-activity-title">
                        <span className="dash-order-num">{o.orderNumber}</span>
                        <span className="dash-activity-cust">
                          {o.customer?.name}
                        </span>
                      </div>
                      <div className="dash-activity-sub">
                        {dayjs(o.createdAt).format("D MMM")} · {cases} cases
                      </div>
                    </div>
                    <div className="dash-activity-right">
                      <div className="dash-activity-amount">
                        {fmt(o.totalAmount)}
                      </div>
                      <span
                        className={`dash-status-pill ${isPaid ? "paid" : o.paymentStatus === "partial" ? "partial" : "unpaid"}`}
                      >
                        {isPaid
                          ? "Paid"
                          : o.paymentStatus === "partial"
                            ? "Partial"
                            : "Unpaid"}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="dash-empty">
                <FileText size={26} />
                <span>No recent orders</span>
              </div>
            )}
            <Link to="/orders" className="dash-view-all-link">
              View all orders <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* Payments tab */}
        {activityTab === "payments" && (
          <div className="dash-activity-list">
            {recentActivity.payments?.length > 0 ? (
              recentActivity.payments.slice(0, 5).map((p) => (
                <div key={p._id} className="dash-activity-row">
                  <div className="dash-activity-icon green">
                    <CreditCard size={13} />
                  </div>
                  <div className="dash-activity-main">
                    <div className="dash-activity-title">
                      <span className="dash-activity-cust">
                        {p.customer?.name || "Customer"}
                      </span>
                    </div>
                    <div className="dash-activity-sub">
                      {dayjs(p.date).format("D MMM")} ·{" "}
                      {p.order?.orderNumber || ""} · {p.mode || "cash"}
                    </div>
                  </div>
                  <div className="dash-activity-right">
                    <div className="dash-activity-amount green">
                      {fmt(p.amount)}
                    </div>
                    <span className="dash-mode-pill">
                      {(p.mode || "cash").toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dash-empty">
                <Wallet size={26} />
                <span>No recent payments</span>
              </div>
            )}
            <Link to="/payments" className="dash-view-all-link">
              View all payments <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* Expenses tab */}
        {activityTab === "expenses" && (
          <div className="dash-activity-list">
            {recentActivity.expenses?.length > 0 ? (
              recentActivity.expenses.slice(0, 5).map((e) => (
                <div key={e._id} className="dash-activity-row">
                  <div className="dash-activity-icon orange">
                    <Receipt size={13} />
                  </div>
                  <div className="dash-activity-main">
                    <div className="dash-activity-title">
                      <span className="dash-activity-cust">
                        {e.description}
                      </span>
                    </div>
                    <div className="dash-activity-sub">
                      {dayjs(e.date).format("D MMM")} · {e.category}
                    </div>
                  </div>
                  <div className="dash-activity-right">
                    <div className="dash-activity-amount red">
                      {fmt(e.amount)}
                    </div>
                    <span className="dash-cat-pill">{e.category}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dash-empty">
                <FileText size={26} />
                <span>No recent expenses</span>
              </div>
            )}
            <Link to="/expenses" className="dash-view-all-link">
              View all expenses <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
