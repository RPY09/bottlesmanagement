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

// ─── GET / (optimized with pure MongoDB aggregations — zero in-memory reduction) ───
router.get('/', async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Parallel database-level aggregations
  const [
    todayAgg,
    monthPaymentsAgg,
    pendingSummaryAgg,
    monthExpensesAgg,
    monthOrdersAgg,
    dailySales,
    productSales,
    recentOrders,
    recentPayments,
    recentExpenses,
    topCustomers,
    expenseByCategory,
    topPendingCustomers,
    recentPendingOrders,
  ] = await Promise.all([
    // 1. Today's orders aggregated in DB
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: startOfDay, $lte: endOfDay }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          todaysSales: { $sum: '$totalAmount' },
          todaysCases: { $sum: { $sum: '$lines.cases' } },
          todaysBottles: {
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
          todayOrdersCount: { $sum: 1 },
        }
      }
    ]),

    // 2. Month's payments aggregated in DB
    Payment.aggregate([
      { $match: { user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, totalReceived: { $sum: '$amount' }, paymentsCountMonth: { $sum: 1 } } }
    ]),

    // 3. Overall pending balance & distinct customers aggregated in DB
    Order.aggregate([
      {
        $match: {
          user: userId,
          paymentStatus: { $in: ['unpaid', 'partial'] },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          pendingBalance: {
            $sum: { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] }
          },
          customers: { $addToSet: '$customer' },
        }
      }
    ]),

    // 4. Month's expenses aggregated in DB
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
    ]),

    // 5. Month's orders aggregated in DB
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalOrdersValue: { $sum: '$totalAmount' },
          totalCasesMonth: { $sum: { $sum: '$lines.cases' } },
          totalBottlesMonth: {
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
          paidThisMonth: { $sum: { $ifNull: ['$paidAmount', 0] } },
          pendingThisMonth: {
            $sum: { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] }
          },
          totalOrdersCountMonth: { $sum: 1 },
        }
      }
    ]),

    // 6. Daily sales (last 30 days)
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, cases: { $sum: { $sum: '$lines.cases' } } } },
      { $sort: { _id: 1 } },
    ]),

    // 7. Product sales breakdown
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: { $ne: 'cancelled' } } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.size', totalCases: { $sum: '$lines.cases' }, totalValue: { $sum: '$lines.subtotal' } } },
    ]),

    // 8. Recent 6 orders
    Order.find({ user: userId })
      .select('orderNumber customer totalAmount paidAmount paymentStatus status createdAt')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),

    // 9. Recent 5 payments
    Payment.find({ user: userId })
      .select('customer order amount mode date')
      .populate('customer', 'name')
      .populate('order', 'orderNumber')
      .sort({ date: -1 })
      .limit(5)
      .lean(),

    // 10. Recent 5 expenses
    Expense.find({ user: userId })
      .select('description category amount date')
      .sort({ date: -1 })
      .limit(5)
      .lean(),

    // 11. Top 5 customers this month
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$customer', totalValue: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customerInfo' } },
      { $unwind: '$customerInfo' },
      { $project: { name: '$customerInfo.name', totalValue: 1, orderCount: 1 } },
    ]),

    // 12. Expenses by category
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),

    // 13. Top 5 customers with pending dues (aggregated in DB with $limit)
    Order.aggregate([
      {
        $match: {
          user: userId,
          paymentStatus: { $in: ['unpaid', 'partial'] },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalDue: { $sum: { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] } },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { totalDue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 0,
          customer: { _id: '$customer._id', name: '$customer.name', phone: '$customer.phone', address: '$customer.address' },
          totalDue: 1,
          ordersCount: 1,
          orders: []
        }
      }
    ]),

    // 14. Top 5 recent pending orders (lean and limited directly in DB)
    Order.find({ user: userId, paymentStatus: { $in: ['unpaid', 'partial'] }, status: { $ne: 'cancelled' } })
      .select('orderNumber customer totalAmount paidAmount createdAt')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const { todaysSales = 0, todaysCases = 0, todaysBottles = 0, todayOrdersCount = 0 } = todayAgg[0] || {};
  const { totalReceived = 0, paymentsCountMonth = 0 } = monthPaymentsAgg[0] || {};
  const { pendingBalance = 0, customers = [] } = pendingSummaryAgg[0] || {};
  const { totalExpenses = 0 } = monthExpensesAgg[0] || {};
  const {
    totalOrdersValue = 0,
    totalCasesMonth = 0,
    totalBottlesMonth = 0,
    paidThisMonth = 0,
    pendingThisMonth = 0,
    totalOrdersCountMonth = 0,
  } = monthOrdersAgg[0] || {};

  const estimatedProfit = totalReceived - totalExpenses;

  res.json({
    kpis: {
      todaysSales,
      todaysCases,
      todaysBottles,
      todayOrdersCount,
      totalReceived,
      paymentsCountMonth,
      pendingBalance,
      pendingCustomers: customers.length,
      totalExpenses,
      estimatedProfit,
      totalOrdersValue,
      totalOrdersCountMonth,
      totalCasesMonth,
      totalBottlesMonth,
    },
    charts: {
      dailySales,
      productSales,
      paymentStatus: { paid: paidThisMonth, pending: pendingThisMonth },
      expenseByCategory,
    },
    lists: {
      recentOrders,
      recentPayments,
      recentExpenses,
      topCustomers,
      pendingCustomersList: topPendingCustomers,
      pendingOrders: recentPendingOrders,
    },
  });
});

// ─── Monthly report (optimized with pure DB aggregation) ─────────────────────
router.get('/monthly-report', async (req, res) => {
  const { month, year } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);
  const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

  const [ordersAgg, paymentsAgg, expensesAgg] = await Promise.all([
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalBottles: {
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
          ordersCount: { $sum: 1 },
        }
      }
    ]),
    Payment.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
    ]),
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
    ]),
  ]);

  const totalRevenue = ordersAgg[0]?.totalRevenue || 0;
  const totalBottles = ordersAgg[0]?.totalBottles || 0;
  const ordersCount = ordersAgg[0]?.ordersCount || 0;
  const totalCollected = paymentsAgg[0]?.totalCollected || 0;
  const totalExpenses = expensesAgg[0]?.totalExpenses || 0;
  const netProfit = totalCollected - totalExpenses;

  res.json({ month: m, year: y, totalRevenue, totalCollected, totalExpenses, netProfit, totalBottles, ordersCount });
});

module.exports = router;
