const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const router = express.Router();

// ─── Timezone Helper (Asia/Kolkata = UTC+5:30) ──────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function nowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function parsePeriodBoundaries(type, query) {
  const now = nowIST();
  let start, end, label;

  if (type === 'quarterly') {
    const y = parseInt(query.year, 10) || now.getUTCFullYear();
    const q = parseInt(query.quarter, 10) || Math.floor(now.getUTCMonth() / 3) + 1;
    const startMonth = (q - 1) * 3;
    start = new Date(Date.UTC(y, startMonth, 1) - IST_OFFSET_MS);
    end = new Date(Date.UTC(y, startMonth + 3, 1) - IST_OFFSET_MS - 1);
    label = `Q${q} ${y} (${MONTH_NAMES[startMonth].slice(0, 3)} - ${MONTH_NAMES[startMonth + 2].slice(0, 3)})`;
  } else if (type === 'yearly') {
    const y = parseInt(query.year, 10) || now.getUTCFullYear();
    start = new Date(Date.UTC(y, 0, 1) - IST_OFFSET_MS);
    end = new Date(Date.UTC(y + 1, 0, 1) - IST_OFFSET_MS - 1);
    label = `Year ${y}`;
  } else if (type === 'custom' && query.startDate && query.endDate) {
    start = new Date(query.startDate + 'T00:00:00+05:30');
    end = new Date(query.endDate + 'T23:59:59.999+05:30');
    label = `${query.startDate} – ${query.endDate}`;
  } else {
    // Default: monthly
    const y = parseInt(query.year, 10) || now.getUTCFullYear();
    const m = parseInt(query.month, 10) || now.getUTCMonth() + 1;
    start = new Date(Date.UTC(y, m - 1, 1) - IST_OFFSET_MS);
    end = new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS - 1);
    label = `${MONTH_NAMES[m - 1]} ${y}`;
  }

  // Previous period of equal duration for comparison
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return { start, end, prevStart, prevEnd, label };
}

// ─── GET /api/reports/summary ───────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);
  const { type = 'monthly' } = req.query;

  const { start, end, prevStart, prevEnd, label } = parsePeriodBoundaries(type, req.query);

  // Parallel Aggregations
  const [
    overviewAgg,
    prevOverviewAgg,
    paymentAgg,
    prevPaymentAgg,
    expenseAgg,
    prevExpenseAgg,
    expenseCategories,
    productPerformance,
    topCustomersRaw,
    monthlyTrendsRaw,
  ] = await Promise.all([
    // 1. Current Period Orders (Revenue, Billed, Bottles, Pending)
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 },
          totalCases: { $sum: { $sum: '$lines.cases' } },
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
          periodOutstanding: {
            $sum: {
              $cond: [
                { $in: ['$paymentStatus', ['unpaid', 'partial']] },
                { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] },
                0
              ]
            }
          }
        }
      }
    ]),

    // 2. Previous Period Orders (for comparison)
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: prevStart, $lte: prevEnd }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]),

    // 3. Current Period Collections
    Payment.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' }, paymentsCount: { $sum: 1 } } }
    ]),

    // 4. Previous Period Collections
    Payment.aggregate([
      { $match: { user: userId, date: { $gte: prevStart, $lte: prevEnd } } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
    ]),

    // 5. Current Period Expenses
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          paidExpenses: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 0, '$amount'] }
          },
          expensesCount: { $sum: 1 }
        }
      }
    ]),

    // 6. Previous Period Expenses
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: prevStart, $lte: prevEnd } } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          paidExpenses: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 0, '$amount'] }
          }
        }
      }
    ]),

    // 7. Expense by Category Breakdown
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]),

    // 8. Product Performance Breakdown (using historical snapshot)
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.productName',
          size: { $first: '$lines.size' },
          cases: { $sum: '$lines.cases' },
          bottles: {
            $sum: {
              $multiply: ['$lines.cases', { $ifNull: ['$lines.bottlesPerCase', 12] }]
            }
          },
          revenue: { $sum: '$lines.subtotal' }
        }
      },
      { $sort: { cases: -1 } }
    ]),

    // 9. Top Customers in this period
    Order.aggregate([
      { $match: { user: userId, createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$customer',
          ordersCount: { $sum: 1 },
          totalBilled: { $sum: '$totalAmount' },
          casesSold: { $sum: { $sum: '$lines.cases' } },
          outstanding: {
            $sum: {
              $cond: [
                { $in: ['$paymentStatus', ['unpaid', 'partial']] },
                { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] },
                0
              ]
            }
          }
        }
      },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customerInfo' } },
      { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'payments',
          let: { custId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', userId] },
                    { $eq: ['$customer', '$$custId'] },
                    { $gte: ['$date', start] },
                    { $lte: ['$date', end] }
                  ]
                }
              }
            },
            { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
          ],
          as: 'paymentInfo'
        }
      },
      {
        $project: {
          customerId: '$_id',
          name: { $ifNull: ['$customerInfo.name', 'Unknown Customer'] },
          phone: { $ifNull: ['$customerInfo.phone', ''] },
          address: { $ifNull: ['$customerInfo.address', ''] },
          ordersCount: 1,
          totalBilled: 1,
          totalCollected: { $ifNull: [{ $arrayElemAt: ['$paymentInfo.totalCollected', 0] }, 0] },
          outstanding: 1,
          casesSold: 1
        }
      }
    ]),

    // 10. Monthly Trends: Last 6 Months (Revenue, Collections, Expenses)
    (async () => {
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const [trendOrders, trendPayments, trendExpenses] = await Promise.all([
        Order.aggregate([
          { $match: { user: userId, createdAt: { $gte: sixMonthsAgo }, status: { $ne: 'cancelled' } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Kolkata' } },
              revenue: { $sum: '$totalAmount' }
            }
          }
        ]),
        Payment.aggregate([
          { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'Asia/Kolkata' } },
              collected: { $sum: '$amount' }
            }
          }
        ]),
        Expense.aggregate([
          { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'Asia/Kolkata' } },
              expenses: { $sum: '$amount' }
            }
          }
        ])
      ]);

      // Combine trend months
      const monthMap = {};
      const addEntry = (list, key) => {
        for (const item of list) {
          if (!monthMap[item._id]) {
            monthMap[item._id] = { month: item._id, revenue: 0, collected: 0, expenses: 0 };
          }
          monthMap[item._id][key] = item[key] || 0;
        }
      };
      addEntry(trendOrders, 'revenue');
      addEntry(trendPayments, 'collected');
      addEntry(trendExpenses, 'expenses');

      return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
    })()
  ]);

  // Financial Metric Calculations
  const totalRevenue = overviewAgg[0]?.totalRevenue || 0;
  const ordersCount = overviewAgg[0]?.ordersCount || 0;
  const totalCases = overviewAgg[0]?.totalCases || 0;
  const totalBottles = overviewAgg[0]?.totalBottles || 0;
  const periodOutstanding = overviewAgg[0]?.periodOutstanding || 0;

  const totalCollected = paymentAgg[0]?.totalCollected || 0;
  const paymentsCount = paymentAgg[0]?.paymentsCount || 0;

  const totalExpenses = expenseAgg[0]?.totalExpenses || 0;
  const paidExpenses = expenseAgg[0]?.paidExpenses !== undefined ? expenseAgg[0].paidExpenses : totalExpenses;
  const expensesCount = expenseAgg[0]?.expensesCount || 0;

  // Accrual Spread = Revenue - Expenses
  const operatingProfit = totalRevenue - totalExpenses;

  // Net Cashflow = Confirmed Payments Received - Paid Expenses
  const netCashflow = totalCollected - paidExpenses;

  // Collection Rate
  const collectionRate = totalRevenue > 0
    ? Math.min(100, Math.round((totalCollected / totalRevenue) * 100))
    : (totalCollected > 0 ? 100 : 0);

  // Previous period values for delta badges
  const prevRevenue = prevOverviewAgg[0]?.totalRevenue || 0;
  const prevCollected = prevPaymentAgg[0]?.totalCollected || 0;
  const prevExpenses = prevExpenseAgg[0]?.totalExpenses || 0;
  const prevPaidExpenses = prevExpenseAgg[0]?.paidExpenses !== undefined
    ? prevExpenseAgg[0].paidExpenses
    : prevExpenses;
  const prevNetCashflow = prevCollected - prevPaidExpenses;

  // Percentage shares for products
  const productShare = productPerformance.map(p => ({
    productName: p._id || 'Standard',
    size: p.size || '',
    cases: p.cases || 0,
    bottles: p.bottles || 0,
    revenue: p.revenue || 0,
    volumeShare: totalCases > 0 ? Math.round((p.cases / totalCases) * 100) : 0
  }));

  // Percentage shares for expenses
  const categoryShare = expenseCategories.map(c => ({
    category: c._id || 'other',
    total: c.total || 0,
    count: c.count || 0,
    share: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 100) : 0
  }));

  res.json({
    period: {
      type,
      start,
      end,
      label,
    },
    overview: {
      totalRevenue,
      totalCollected,
      totalExpenses,
      paidExpenses,
      netCashflow,
      operatingProfit,
      periodOutstanding,
      collectionRate,
      ordersCount,
      totalCases,
      totalBottles,
      paymentsCount,
      expensesCount,
    },
    previousOverview: {
      totalRevenue: prevRevenue,
      totalCollected: prevCollected,
      totalExpenses: prevExpenses,
      netCashflow: prevNetCashflow,
    },
    expenseCategories: categoryShare,
    productPerformance: productShare,
    topCustomers: topCustomersRaw,
    monthlyTrends: monthlyTrendsRaw,
  });
});

module.exports = router;
