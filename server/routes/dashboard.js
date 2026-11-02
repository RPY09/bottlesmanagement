const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const router = express.Router();

// ─── Timezone helper (Asia/Kolkata = UTC+5:30) ───────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 330 minutes

function nowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function startOfDayIST(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST_OFFSET_MS);
}

function endOfDayIST(d) {
  const s = startOfDayIST(d);
  return new Date(s.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function addDays(d, n) {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function startOfMonthIST(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - IST_OFFSET_MS);
}

function endOfMonthIST(d) {
  const nextMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - IST_OFFSET_MS);
  return new Date(nextMonth.getTime() - 1);
}

function getPeriodBoundaries(period, startDate, endDate) {
  const now = nowIST();
  let start, end, prevStart, prevEnd, label;

  if (period === 'allTime') {
    start = new Date(0);
    end = now;
    prevStart = new Date(0);
    prevEnd = new Date(0);
    label = 'All Time';
  } else if (period === 'yesterday') {
    const yest = addDays(now, -1);
    start = startOfDayIST(yest);
    end = endOfDayIST(yest);
    prevStart = startOfDayIST(addDays(now, -2));
    prevEnd = endOfDayIST(addDays(now, -2));
    label = 'Yesterday';
  } else if (period === 'last7days') {
    start = startOfDayIST(addDays(now, -6));
    end = endOfDayIST(now);
    prevStart = startOfDayIST(addDays(now, -13));
    prevEnd = endOfDayIST(addDays(now, -7));
    label = 'Last 7 Days';
  } else if (period === 'last30days') {
    start = startOfDayIST(addDays(now, -29));
    end = endOfDayIST(now);
    prevStart = startOfDayIST(addDays(now, -59));
    prevEnd = endOfDayIST(addDays(now, -30));
    label = 'Last 30 Days';
  } else if (period === 'thisMonth') {
    start = startOfMonthIST(now);
    end = endOfMonthIST(now);
    const lastMonthDate = addDays(start, -1);
    prevStart = startOfMonthIST(lastMonthDate);
    prevEnd = endOfMonthIST(lastMonthDate);
    label = 'This Month';
  } else if (period === 'lastMonth') {
    const firstOfThisMonth = startOfMonthIST(now);
    const lastMonthDate = addDays(firstOfThisMonth, -1);
    start = startOfMonthIST(lastMonthDate);
    end = endOfMonthIST(lastMonthDate);
    const prevMonthDate = addDays(start, -1);
    prevStart = startOfMonthIST(prevMonthDate);
    prevEnd = endOfMonthIST(prevMonthDate);
    label = 'Last Month';
  } else if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate + 'T00:00:00+05:30');
    end = new Date(endDate + 'T23:59:59+05:30');
    const rangeMs = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - rangeMs);
    label = startDate + ' \u2013 ' + endDate;
  } else {
    // Keep the endpoint backward compatible for callers that send an
    // unsupported period while making the dashboard's explicit default all-time.
    start = startOfDayIST(now);
    end = endOfDayIST(now);
    prevStart = startOfDayIST(addDays(now, -1));
    prevEnd = endOfDayIST(addDays(now, -1));
    label = 'Today';
  }

  return { start, end, prevStart, prevEnd, label };
}

async function getOverviewAgg(userId, start, end) {
  const [ordersAgg, paymentsAgg, expensesAgg, pendingAgg] = await Promise.all([
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          casesSold: { $sum: { $sum: '$lines.cases' } },
          bottlesSold: {
            $sum: {
              $sum: {
                $map: {
                  input: '$lines',
                  as: 'l',
                  in: { $multiply: ['$$l.cases', { $ifNull: ['$$l.bottlesPerCase', 12] }] }
                }
              }
            }
          },
        }
      }
    ]),
    Payment.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          paidTotal: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 0, '$amount']
            }
          }
        }
      }
    ]),
    Order.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lte: end },
          paymentStatus: { $in: ['unpaid', 'partial'] },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          pendingBalance: { $sum: { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] } },
          pendingOrderCount: { $sum: 1 },
        }
      }
    ]),
  ]);

  const totalSales = ordersAgg[0]?.totalSales || 0;
  const orderCount = ordersAgg[0]?.orderCount || 0;
  const casesSold = ordersAgg[0]?.casesSold || 0;
  const bottlesSold = ordersAgg[0]?.bottlesSold || 0;
  const paymentsReceived = paymentsAgg[0]?.total || 0;
  const paymentCount = paymentsAgg[0]?.count || 0;
  const expenses = expensesAgg[0]?.total || 0;
  const paidExpenses = expensesAgg[0]?.paidTotal !== undefined ? expensesAgg[0].paidTotal : expenses;
  const pendingBalance = pendingAgg[0]?.pendingBalance || 0;
  const pendingOrderCount = pendingAgg[0]?.pendingOrderCount || 0;
  const netCashflow = paymentsReceived - paidExpenses;

  return { totalSales, paymentsReceived, pendingBalance, expenses, netCashflow, orderCount, casesSold, bottlesSold, paymentCount, pendingOrderCount };
}

// ─── GET /api/dashboard/summary ──────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
  // JWTs issued by auth routes store the user identifier as `id`.
  const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);
  const { period = 'allTime', startDate, endDate } = req.query;

  const { start, end, prevStart, prevEnd, label } = getPeriodBoundaries(period, startDate, endDate);

  const [overview, prevOverview] = await Promise.all([
    getOverviewAgg(userId, start, end),
    getOverviewAgg(userId, prevStart, prevEnd),
  ]);

  // Sales trend: last 30 days always (client slices as needed)
  const trendStart = startOfDayIST(addDays(nowIST(), -29));

  const [salesTrendRaw, productShareRaw, topCustomersRaw, pendingDuesRaw] = await Promise.all([
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: trendStart }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          cases: { $sum: { $sum: '$lines.cases' } },
        }
      },
      { $sort: { _id: 1 } },
    ]),

    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.productName',
          cases: { $sum: '$lines.cases' },
          bottles: { $sum: { $multiply: ['$lines.cases', { $ifNull: ['$lines.bottlesPerCase', 12] }] } },
          revenue: { $sum: '$lines.subtotal' },
        }
      },
      { $sort: { cases: -1 } },
    ]),

    Payment.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$customer', collected: { $sum: '$amount' } } },
      { $sort: { collected: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'cust' } },
      { $unwind: { path: '$cust', preserveNullAndEmptyArrays: false } },
      { $project: { name: '$cust.name', phone: '$cust.phone', address: '$cust.address', collected: 1 } },
    ]),

    Order.aggregate([
      { $match: { user: userId, paymentStatus: { $in: ['unpaid', 'partial'] }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$customer',
          outstanding: { $sum: { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] } },
          ordersCount: { $sum: 1 },
          orders: {
            $push: {
              orderNumber: '$orderNumber',
              due: { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] },
              createdAt: '$createdAt'
            }
          },
        }
      },
      { $sort: { outstanding: -1 } },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'cust' } },
      { $unwind: { path: '$cust', preserveNullAndEmptyArrays: false } },
      { $project: { name: '$cust.name', phone: '$cust.phone', outstanding: 1, ordersCount: 1, orders: 1 } },
    ]),
  ]);

  const totalCases = productShareRaw.reduce((s, p) => s + p.cases, 0);
  const productShare = productShareRaw.map(p => ({
    productName: p._id || 'Unknown',
    cases: p.cases,
    bottles: p.bottles,
    revenue: p.revenue,
    share: totalCases > 0 ? Math.round((p.cases / totalCases) * 100) : 0,
  }));

  const totalOutstanding = pendingDuesRaw.reduce((s, d) => s + d.outstanding, 0);
  const pendingDues = {
    totalOutstanding,
    customerCount: pendingDuesRaw.length,
    unpaidOrderCount: pendingDuesRaw.reduce((s, d) => s + d.ordersCount, 0),
    topDues: pendingDuesRaw.slice(0, 5).map(d => ({
      customerId: d._id,
      name: d.name,
      phone: d.phone,
      outstanding: d.outstanding,
      ordersCount: d.ordersCount,
      orders: d.orders,
    })),
  };

  const [recentOrders, recentPayments, recentExpenses] = await Promise.all([
    Order.find({ user: userId })
      .select('_id orderNumber customer lines.cases totalAmount paymentStatus createdAt')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Payment.find({ user: userId })
      .select('_id customer order amount mode date')
      .populate('customer', 'name')
      .populate('order', 'orderNumber')
      .sort({ date: -1 })
      .limit(5)
      .lean(),
    Expense.find({ user: userId })
      .select('_id description category amount date')
      .sort({ date: -1 })
      .limit(5)
      .lean(),
  ]);

  res.json({
    period: { start, end, label },
    overview,
    prevOverview,
    salesTrend: salesTrendRaw.map(d => ({ date: d._id, revenue: d.revenue, orders: d.orders, cases: d.cases })),
    productShare,
    topCustomers: topCustomersRaw,
    pendingDues,
    recentActivity: { orders: recentOrders, payments: recentPayments, expenses: recentExpenses },
  });
});

// ─── GET / (legacy — preserved for existing Dashboard.jsx and Reports.jsx) ───
router.get('/', async (req, res) => {
  const userId = req.user.id || req.user._id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const todayOrders = await Order.find({ user: userId, createdAt: { $gte: startOfDay, $lte: endOfDay } });
  const todaysSales = todayOrders.reduce((s, o) => s + o.totalAmount, 0);
  const todaysCases = todayOrders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + (l.cases || 0), 0), 0);
  const todaysBottles = todayOrders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0), 0);

  const monthPayments = await Payment.find({ user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } });
  const totalReceived = monthPayments.reduce((s, p) => s + p.amount, 0);

  const pendingOrders = await Order.find({ user: userId, paymentStatus: { $in: ['unpaid', 'partial'] } }).populate('customer', 'name phone address');
  const pendingBalance = pendingOrders.reduce((s, o) => s + Math.max(0, o.totalAmount - (o.paidAmount || 0)), 0);
  const pendingCustomerIds = new Set(pendingOrders.map(o => (o.customer?._id || o.customer)?.toString()));

  const customerDuesMap = {};
  for (const o of pendingOrders) {
    const custId = o.customer?._id?.toString() || o.customer?.toString();
    if (!custId || !o.customer?.name) continue;
    if (!customerDuesMap[custId]) {
      customerDuesMap[custId] = { customer: o.customer, totalDue: 0, ordersCount: 0, orders: [] };
    }
    const due = Math.max(0, o.totalAmount - (o.paidAmount || 0));
    customerDuesMap[custId].totalDue += due;
    customerDuesMap[custId].ordersCount += 1;
    customerDuesMap[custId].orders.push({ orderNumber: o.orderNumber, due, createdAt: o.createdAt });
  }
  const pendingCustomersList = Object.values(customerDuesMap).sort((a, b) => b.totalDue - a.totalDue).slice(0, 5);

  const monthExpenses = await Expense.find({ user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } });
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const estimatedProfit = totalReceived - totalExpenses;

  const monthOrders = await Order.find({ user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } });
  const totalOrdersValue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalCasesMonth = monthOrders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + (l.cases || 0), 0), 0);
  const totalBottlesMonth = monthOrders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0), 0);

  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailySales = await Order.aggregate([
    { $match: { user: userId, createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, cases: { $sum: { $sum: '$lines.cases' } } } },
    { $sort: { _id: 1 } },
  ]);

  const productSales = await Order.aggregate([
    { $match: { user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $unwind: '$lines' },
    { $group: { _id: '$lines.size', totalCases: { $sum: '$lines.cases' }, totalValue: { $sum: '$lines.subtotal' } } },
  ]);

  const paidThisMonth = monthOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
  const pendingThisMonth = monthOrders.reduce((s, o) => s + Math.max(0, o.totalAmount - (o.paidAmount || 0)), 0);

  const recentOrders = await Order.find({ user: userId }).populate('customer', 'name phone').sort({ createdAt: -1 }).limit(6);
  const recentPayments = await Payment.find({ user: userId }).populate('customer', 'name').populate('order', 'orderNumber').sort({ date: -1 }).limit(5);
  const recentExpenses = await Expense.find({ user: userId }).sort({ date: -1 }).limit(5);

  const topCustomers = await Order.aggregate([
    { $match: { user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: '$customer', totalValue: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
    { $sort: { totalValue: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customerInfo' } },
    { $unwind: '$customerInfo' },
    { $project: { name: '$customerInfo.name', totalValue: 1, orderCount: 1 } },
  ]);

  const expenseByCategory = await Expense.aggregate([
    { $match: { user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);

  res.json({
    kpis: {
      todaysSales, todaysCases, todaysBottles, todayOrdersCount: todayOrders.length,
      totalReceived, paymentsCountMonth: monthPayments.length,
      pendingBalance, pendingCustomers: pendingCustomerIds.size,
      totalExpenses, estimatedProfit,
      totalOrdersValue, totalOrdersCountMonth: monthOrders.length,
      totalCasesMonth, totalBottlesMonth,
    },
    charts: { dailySales, productSales, paymentStatus: { paid: paidThisMonth, pending: pendingThisMonth }, expenseByCategory },
    lists: { recentOrders, recentPayments, recentExpenses, topCustomers, pendingCustomersList, pendingOrders: pendingOrders.slice(0, 5) },
  });
});

// ─── Monthly report (preserved for Reports.jsx) ───────────────────────────────
router.get('/monthly-report', async (req, res) => {
  const { month, year } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);
  const userId = req.user.id || req.user._id;

  const orders = await Order.find({ user: userId, createdAt: { $gte: start, $lte: end } });
  const payments = await Payment.find({ user: userId, date: { $gte: start, $lte: end } });
  const expenses = await Expense.find({ user: userId, date: { $gte: start, $lte: end } });

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalCollected - totalExpenses;
  const totalBottles = orders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + l.cases * 12, 0), 0);

  res.json({ month: m, year: y, totalRevenue, totalCollected, totalExpenses, netProfit, totalBottles, ordersCount: orders.length });
});

module.exports = router;
