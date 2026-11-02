const express = require('express');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const router = express.Router();

router.get('/', async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Today's orders
  const todayOrders = await Order.find({ user: userId, createdAt: { $gte: startOfDay, $lte: endOfDay } });
  const todaysSales = todayOrders.reduce((s, o) => s + o.totalAmount, 0);
  const todaysCases = todayOrders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + (l.cases || 0), 0), 0);
  const todaysBottles = todayOrders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0), 0);

  // This month payments received
  const monthPayments = await Payment.find({ user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } });
  const totalReceived = monthPayments.reduce((s, p) => s + p.amount, 0);

  // Pending balance (any unpaid / partial order, delivery status removed)
  const pendingOrders = await Order.find({
    user: userId,
    paymentStatus: { $in: ['unpaid', 'partial'] },
  }).populate('customer', 'name phone address');
  const pendingBalance = pendingOrders.reduce((s, o) => s + Math.max(0, o.totalAmount - (o.paidAmount || 0)), 0);
  const pendingCustomerIds = new Set(pendingOrders.map(o => (o.customer?._id || o.customer)?.toString()));

  // Customer pending dues grouped
  const customerDuesMap = {};
  for (const o of pendingOrders) {
    const custId = o.customer?._id?.toString() || o.customer?.toString();
    if (!custId || !o.customer?.name) continue;
    if (!customerDuesMap[custId]) {
      customerDuesMap[custId] = {
        customer: o.customer,
        totalDue: 0,
        ordersCount: 0,
        orders: [],
      };
    }
    const due = Math.max(0, o.totalAmount - (o.paidAmount || 0));
    customerDuesMap[custId].totalDue += due;
    customerDuesMap[custId].ordersCount += 1;
    customerDuesMap[custId].orders.push({
      orderNumber: o.orderNumber,
      due,
      createdAt: o.createdAt,
    });
  }
  const pendingCustomersList = Object.values(customerDuesMap)
    .sort((a, b) => b.totalDue - a.totalDue)
    .slice(0, 5);

  // This month expenses
  const monthExpenses = await Expense.find({ user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } });
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // Estimated profit = received - expenses
  const estimatedProfit = totalReceived - totalExpenses;

  // Total orders value this month
  const monthOrders = await Order.find({ user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } });
  const totalOrdersValue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalCasesMonth = monthOrders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + (l.cases || 0), 0), 0);
  const totalBottlesMonth = monthOrders.reduce((s, o) => s + (o.lines || []).reduce((ss, l) => ss + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0), 0);

  // Daily sales chart (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailySales = await Order.aggregate([
    { $match: { user: userId, createdAt: { $gte: thirtyDaysAgo } } },
    { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$totalAmount' },
        cases: { $sum: { $sum: '$lines.cases' } },
      }
    },
    { $sort: { _id: 1 } },
  ]);

  // Product sales breakdown (this month)
  const productSales = await Order.aggregate([
    { $match: { user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $unwind: '$lines' },
    { $group: { _id: '$lines.size', totalCases: { $sum: '$lines.cases' }, totalValue: { $sum: '$lines.subtotal' } } },
  ]);

  // Payment status breakdown (this month)
  const paidThisMonth = monthOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
  const pendingThisMonth = monthOrders.reduce((s, o) => s + Math.max(0, o.totalAmount - (o.paidAmount || 0)), 0);

  // Recent orders (latest 6)
  const recentOrders = await Order.find({ user: userId })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 })
    .limit(6);

  // Recent payments
  const recentPayments = await Payment.find({ user: userId })
    .populate('customer', 'name')
    .populate('order', 'orderNumber')
    .sort({ date: -1 })
    .limit(5);

  // Recent expenses
  const recentExpenses = await Expense.find({ user: userId })
    .sort({ date: -1 })
    .limit(5);

  // Top customers by order value this month
  const topCustomers = await Order.aggregate([
    { $match: { user: userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: '$customer', totalValue: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
    { $sort: { totalValue: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customerInfo' } },
    { $unwind: '$customerInfo' },
    { $project: { name: '$customerInfo.name', totalValue: 1, orderCount: 1 } },
  ]);

  // Expense category breakdown
  const expenseByCategory = await Expense.aggregate([
    { $match: { user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);

  res.json({
    kpis: {
      todaysSales,
      todaysCases,
      todaysBottles,
      todayOrdersCount: todayOrders.length,
      totalReceived,
      paymentsCountMonth: monthPayments.length,
      pendingBalance,
      pendingCustomers: pendingCustomerIds.size,
      totalExpenses,
      estimatedProfit,
      totalOrdersValue,
      totalOrdersCountMonth: monthOrders.length,
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
      pendingCustomersList,
      pendingOrders: pendingOrders.slice(0, 5),
    },
  });
});

// Monthly report
router.get('/monthly-report', async (req, res) => {
  const { month, year } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);
  const userId = req.user.id;

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
