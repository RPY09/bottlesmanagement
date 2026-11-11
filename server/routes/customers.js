const express = require('express');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const router = express.Router();

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

const parsePage = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res, next) => {
  try {
    const { search, type, page, limit } = req.query;
    const userId = req.user?._id || req.user?.id;
    const query = { user: userId };

    if (type) query.type = type;

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegExp(search.trim()), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { address: regex }];
    }

    const hasPagination = Object.prototype.hasOwnProperty.call(req.query, 'page') || Object.prototype.hasOwnProperty.call(req.query, 'limit');
    const baseQuery = Customer.find(query)
      .select('name phone address notes isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const customers = await baseQuery;
      return res.json(customers);
    }

    const safePage = parsePage(page);
    const safeLimit = parseLimit(limit);
    const skip = (safePage - 1) * safeLimit;
    const [customers, total] = await Promise.all([
      baseQuery.skip(skip).limit(safeLimit),
      Customer.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return res.json({ items: customers, pagination: { page: safePage, limit: safeLimit, total, totalPages, hasNextPage: safePage < totalPages } });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);
  const customerId = new mongoose.Types.ObjectId(req.params.id);

  const customerQuery = Customer.findOne({ _id: customerId, user: userId })
    .select('_id name phone address notes isActive createdAt')
    .lean();

  // Limit recent order history to 50 items to prevent heap bloat on long-time customers
  const orderQuery = Order.find({ customer: customerId, user: userId })
    .select('_id orderNumber lines.productName lines.size lines.cases lines.bottlesPerCase lines.pricePerBottle lines.subtotal totalAmount paidAmount status paymentStatus notes createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Calculate customer lifetime totals entirely inside MongoDB aggregation
  const summaryQuery = Order.aggregate([
    { $match: { customer: customerId, user: userId, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalValue: { $sum: '$totalAmount' },
        totalPaid: { $sum: { $ifNull: ['$paidAmount', 0] } },
        pending: { $sum: { $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0] } },
      },
    },
  ]);

  const [customer, orders, summaryRows] = await Promise.all([customerQuery, orderQuery, summaryQuery]);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const { totalOrders = 0, totalValue = 0, totalPaid = 0, pending = 0 } = summaryRows[0] || {};
  res.json({
    customer,
    orders,
    summary: {
      totalOrders,
      totalValue,
      totalPaid,
      pending,
    },
  });
});

router.post('/', async (req, res) => {
  const customer = await Customer.create({ ...req.body, user: req.user.id });
  res.status(201).json(customer);
});

router.put('/:id', async (req, res) => {
  const customer = await Customer.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, { returnDocument: 'after' });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json(customer);
});

router.delete('/:id', async (req, res) => {
  await Customer.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  res.json({ message: 'Customer deleted' });
});

module.exports = router;
